import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum BackupType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  MANUAL = 'manual',
}

export enum BackupStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
}

@Entity('backup_logs')
export class BackupLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  type: BackupType;

  @Column({ type: 'varchar', length: 20, default: BackupStatus.PENDING })
  status: BackupStatus;

  @Column({ type: 'varchar', length: 512, nullable: true })
  filename: string | null;

  @Column({ name: 'size_bytes', type: 'bigint', nullable: true })
  sizeBytes: string | null;

  @Column({ name: 'triggered_by', type: 'varchar', length: 64, nullable: true })
  triggeredBy: string | null;

  @Column({ name: 'r2_uploaded', type: 'boolean', default: false })
  r2Uploaded: boolean;

  @Column({ name: 'r2_key', type: 'varchar', length: 1024, nullable: true })
  r2Key: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
