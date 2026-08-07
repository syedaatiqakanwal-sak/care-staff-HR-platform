import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('backup_settings')
export class BackupSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'daily_enabled', type: 'boolean', default: true })
  dailyEnabled: boolean;

  @Column({ name: 'weekly_enabled', type: 'boolean', default: true })
  weeklyEnabled: boolean;

  @Column({ name: 'monthly_enabled', type: 'boolean', default: true })
  monthlyEnabled: boolean;

  @Column({ name: 'max_daily', type: 'int', default: 30 })
  maxDaily: number;

  @Column({ name: 'max_weekly', type: 'int', default: 12 })
  maxWeekly: number;

  @Column({ name: 'max_monthly', type: 'int', default: 12 })
  maxMonthly: number;

  @Column({ name: 'r2_enabled', type: 'boolean', default: false })
  r2Enabled: boolean;

  @Column({ name: 'r2_auto_upload', type: 'boolean', default: false })
  r2AutoUpload: boolean;

  @Column({ name: 'delete_local_after_r2', type: 'boolean', default: false })
  deleteLocalAfterR2: boolean;
}
