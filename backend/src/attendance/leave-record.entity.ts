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
import { User } from '../users/user.entity';
import { LeaveType } from './leave-type.enum';
import { LeaveStatus } from './leave-status.enum';

@Entity('leave_records')
export class LeaveRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'staffId' })
  staffId: string;

  @ManyToOne(() => StaffProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'staffId' })
  staff: StaffProfile;

  @Column({ type: 'enum', enum: LeaveType })
  leaveType: LeaveType;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date' })
  endDate: string;

  @Index()
  @Column({ type: 'enum', enum: LeaveStatus, default: LeaveStatus.REQUESTED })
  status: LeaveStatus;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ name: 'approvedBy', nullable: true })
  approvedBy: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'approvedBy' })
  approver: User | null;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;
}
