import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import Redis from 'ioredis';
import {
  BackupLog,
  BackupStatus,
  BackupType,
} from './entities/backup-log.entity';
import { BackupSettings } from './entities/backup-settings.entity';
import { BackupR2Service } from './backup-r2.service';

const execAsync = promisify(exec);

const REDIS_LOCK_KEY = 'backup:running';
const REDIS_LOCK_TTL_SEC = 30 * 60; // 30 minutes

@Injectable()
export class BackupService implements OnModuleDestroy {
  private readonly logger = new Logger(BackupService.name);
  private redis: Redis | null = null;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(BackupLog)
    private readonly logRepo: Repository<BackupLog>,
    @InjectRepository(BackupSettings)
    private readonly settingsRepo: Repository<BackupSettings>,
    private readonly r2: BackupR2Service,
  ) {}

  onModuleDestroy() {
    if (this.redis) {
      this.redis.disconnect();
      this.redis = null;
    }
  }

  private getRedis(): Redis {
    if (this.redis) return this.redis;
    const url = this.config.get<string>('REDIS_URL');
    if (!url) {
      throw new ServiceUnavailableException('REDIS_URL is not configured');
    }
    this.redis = new Redis(url, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      lazyConnect: false,
    });
    return this.redis;
  }

  getBackupDir(): string {
    const base =
      this.config.get<string>('BACKUP_DIR') ||
      path.join(process.cwd(), 'backups');
    const dir = path.join(base, 'database');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  private formatTimestamp(date = new Date()): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
      `_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`
    );
  }

  buildFilename(type: BackupType, date = new Date()): string {
    return `backup_${type}_${this.formatTimestamp(date)}.sql`;
  }

  async getSettings(): Promise<BackupSettings> {
    let settings = await this.settingsRepo.find({ take: 1 }).then((r) => r[0]);
    if (!settings) {
      settings = await this.settingsRepo.save(
        this.settingsRepo.create({
          dailyEnabled: true,
          weeklyEnabled: true,
          monthlyEnabled: true,
          maxDaily: 30,
          maxWeekly: 12,
          maxMonthly: 12,
          r2Enabled: false,
          r2AutoUpload: false,
          deleteLocalAfterR2: false,
        }),
      );
    }
    return settings;
  }

  async updateSettings(
    patch: Partial<BackupSettings>,
  ): Promise<BackupSettings> {
    const settings = await this.getSettings();
    Object.assign(settings, patch);
    return this.settingsRepo.save(settings);
  }

  async listLogs(limit = 50): Promise<BackupLog[]> {
    return this.logRepo.find({
      order: { createdAt: 'DESC' },
      take: Math.min(Math.max(limit, 1), 200),
    });
  }

  async getLog(id: string): Promise<BackupLog> {
    const log = await this.logRepo.findOne({ where: { id } });
    if (!log) throw new NotFoundException('Backup log not found');
    return log;
  }

  /**
   * Acquire Redis lock backup:running (NX + EX 30m).
   * Returns true if lock acquired.
   */
  async acquireLock(): Promise<boolean> {
    const redis = this.getRedis();
    const result = await redis.set(
      REDIS_LOCK_KEY,
      String(Date.now()),
      'EX',
      REDIS_LOCK_TTL_SEC,
      'NX',
    );
    return result === 'OK';
  }

  async releaseLock(): Promise<void> {
    try {
      const redis = this.getRedis();
      await redis.del(REDIS_LOCK_KEY);
    } catch (err: any) {
      this.logger.warn(`Failed to release backup lock: ${err?.message || err}`);
    }
  }

  async isLockHeld(): Promise<boolean> {
    try {
      const redis = this.getRedis();
      const v = await redis.get(REDIS_LOCK_KEY);
      return v != null;
    } catch {
      return false;
    }
  }

  /**
   * Run pg_dump, persist log, apply retention, optional R2 upload.
   */
  async runBackup(
    type: BackupType,
    triggeredBy: string,
  ): Promise<BackupLog> {
    const locked = await this.acquireLock();
    if (!locked) {
      const log = await this.logRepo.save(
        this.logRepo.create({
          type,
          status: BackupStatus.FAILED,
          triggeredBy,
          errorMessage: 'Another backup is already running (lock: backup:running)',
        }),
      );
      return log;
    }

    const filename = this.buildFilename(type);
    const dir = this.getBackupDir();
    const absPath = path.join(dir, filename);

    let log = await this.logRepo.save(
      this.logRepo.create({
        type,
        status: BackupStatus.RUNNING,
        filename,
        triggeredBy,
      }),
    );

    try {
      await this.executePgDump(absPath);

      const stat = fs.statSync(absPath);
      log.sizeBytes = String(stat.size);
      log.status = BackupStatus.SUCCESS;

      const settings = await this.getSettings();

      if (settings.r2Enabled && settings.r2AutoUpload) {
        try {
          const key = await this.r2.upload(absPath, filename);
          log.r2Uploaded = true;
          log.r2Key = key;
          if (settings.deleteLocalAfterR2) {
            fs.unlinkSync(absPath);
          }
        } catch (r2Err: any) {
          this.logger.error(`R2 upload failed: ${r2Err?.message || r2Err}`);
          log.errorMessage = `Local backup OK; R2 upload failed: ${r2Err?.message || r2Err}`;
        }
      }

      log = await this.logRepo.save(log);
      await this.applyRetention(settings);
      return log;
    } catch (err: any) {
      this.logger.error(`Backup failed: ${err?.message || err}`);
      if (fs.existsSync(absPath)) {
        try {
          fs.unlinkSync(absPath);
        } catch {
          /* ignore */
        }
      }
      log.status = BackupStatus.FAILED;
      log.errorMessage = err?.message || String(err);
      log.filename = null;
      return this.logRepo.save(log);
    } finally {
      await this.releaseLock();
    }
  }

  private async executePgDump(absPath: string): Promise<void> {
    const host = this.config.get<string>('DB_HOST') || 'localhost';
    const port = String(this.config.get<string | number>('DB_PORT') || '5432');
    const username = this.config.get<string>('DB_USERNAME');
    const password = this.config.get<string>('DB_PASSWORD');
    const database = this.config.get<string>('DB_NAME');

    if (!username || !database) {
      throw new Error('DB_USERNAME and DB_NAME are required for pg_dump');
    }

    // Escape single quotes for shell safety; password via env (not argv).
    const q = (s: string) => `'${String(s).replace(/'/g, `'\\''`)}'`;
    const cmd = [
      `pg_dump`,
      `-h`,
      q(host),
      `-p`,
      q(port),
      `-U`,
      q(username),
      `-d`,
      q(database),
      `-F`,
      `p`,
      `--no-owner`,
      `--no-acl`,
      `-f`,
      q(absPath),
    ].join(' ');

    await execAsync(cmd, {
      env: {
        ...process.env,
        PGPASSWORD: password || '',
      },
      maxBuffer: 64 * 1024 * 1024,
      timeout: 25 * 60 * 1000,
    });

    if (!fs.existsSync(absPath) || fs.statSync(absPath).size === 0) {
      throw new Error('pg_dump completed but output file is missing or empty');
    }
  }

  /**
   * Keep last N successful local daily/weekly/monthly files (defaults 30 / 12 / 12).
   * Deletes older successful dump files of that type from disk.
   */
  async applyRetention(settings?: BackupSettings): Promise<void> {
    const cfg = settings || (await this.getSettings());
    await this.retainType(BackupType.DAILY, cfg.maxDaily ?? 30);
    await this.retainType(BackupType.WEEKLY, cfg.maxWeekly ?? 12);
    await this.retainType(BackupType.MONTHLY, cfg.maxMonthly ?? 12);
  }

  private async retainType(type: BackupType, keep: number): Promise<void> {
    const successes = await this.logRepo.find({
      where: { type, status: BackupStatus.SUCCESS },
      order: { createdAt: 'DESC' },
    });

    const excess = successes.slice(Math.max(keep, 0));
    const dir = this.getBackupDir();

    for (const row of excess) {
      if (row.filename) {
        const p = path.join(dir, row.filename);
        if (fs.existsSync(p)) {
          try {
            fs.unlinkSync(p);
            this.logger.log(`Retention deleted local file ${row.filename}`);
          } catch (err: any) {
            this.logger.warn(
              `Retention could not delete ${row.filename}: ${err?.message}`,
            );
          }
        }
      }
    }
  }

  async uploadLogToR2(logId: string): Promise<BackupLog> {
    const log = await this.getLog(logId);
    if (log.status !== BackupStatus.SUCCESS || !log.filename) {
      throw new ServiceUnavailableException(
        'Only successful backups with a local filename can be uploaded',
      );
    }
    const absPath = path.join(this.getBackupDir(), log.filename);
    if (!fs.existsSync(absPath)) {
      throw new NotFoundException('Local backup file not found on disk');
    }
    const key = await this.r2.upload(absPath, log.filename);
    log.r2Uploaded = true;
    log.r2Key = key;

    const settings = await this.getSettings();
    if (settings.deleteLocalAfterR2) {
      fs.unlinkSync(absPath);
    }
    return this.logRepo.save(log);
  }

  /** Resolve a local dump path with path-jail under backups/database. */
  resolveLocalFile(filename: string): string {
    const base = path.resolve(this.getBackupDir());
    const safeName = path.basename(filename);
    const abs = path.resolve(base, safeName);
    if (!abs.startsWith(base + path.sep) && abs !== base) {
      throw new NotFoundException('Invalid backup filename');
    }
    if (!fs.existsSync(abs)) {
      throw new NotFoundException('Backup file not found on disk');
    }
    return abs;
  }

  async deleteBackupByFilename(filename: string): Promise<{ deleted: boolean; logId?: string }> {
    const safeName = path.basename(filename);
    const abs = path.join(this.getBackupDir(), safeName);
    const base = path.resolve(this.getBackupDir());
    const resolved = path.resolve(abs);
    if (!resolved.startsWith(base + path.sep) && resolved !== base) {
      throw new NotFoundException('Invalid backup filename');
    }

    const log = await this.logRepo.findOne({ where: { filename: safeName } });
    if (fs.existsSync(resolved)) {
      fs.unlinkSync(resolved);
    }
    if (log) {
      await this.logRepo.remove(log);
      return { deleted: true, logId: log.id };
    }
    if (!fs.existsSync(resolved) && !log) {
      throw new NotFoundException('Backup not found');
    }
    return { deleted: true };
  }

  async deleteBackupByLogId(logId: string): Promise<{ deleted: boolean }> {
    const log = await this.getLog(logId);
    if (log.filename) {
      const abs = path.join(this.getBackupDir(), path.basename(log.filename));
      if (fs.existsSync(abs)) {
        fs.unlinkSync(abs);
      }
    }
    await this.logRepo.remove(log);
    return { deleted: true };
  }
}
