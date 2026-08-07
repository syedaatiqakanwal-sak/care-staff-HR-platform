import { IsEnum, IsOptional } from 'class-validator';
import { BackupType } from '../entities/backup-log.entity';

export class CreateBackupDto {
  /** Manual triggers default to `manual`. Scheduler uses daily/weekly/monthly. */
  @IsOptional()
  @IsEnum(BackupType)
  type?: BackupType;
}
