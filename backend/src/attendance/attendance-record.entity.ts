import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { StaffProfile } from '../staff/staff-profile.entity';
import { AttendanceStatus } from './attendance-status.enum';

@Entity('attendance_records')
export class AttendanceRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'staffId' })
  staffId: string;

  @ManyToOne(() => StaffProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'staffId' })
  staff: StaffProfile;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'enum', enum: AttendanceStatus, default: AttendanceStatus.PRESENT })
  status: AttendanceStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ default: false })
  returnToWorkCompleted: boolean;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;
}
