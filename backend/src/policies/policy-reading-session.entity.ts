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
import { Policy } from './policy.entity';

export enum PolicyReadingStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

@Entity('policy_reading_sessions')
export class PolicyReadingSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  staffId: string;

  @ManyToOne(() => StaffProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'staffId' })
  staff: StaffProfile;

  @Index()
  @Column()
  policyId: string;

  @ManyToOne(() => Policy, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'policyId' })
  policy: Policy;

  @Column({ type: 'int' })
  policyVersion: number;

  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  endTime: Date | null;

  @Column({ type: 'int', nullable: true })
  totalDurationSeconds: number | null;

  @Index(['staffId', 'policyId', 'date'])
  @Column({ type: 'date' })
  date: string;

  @Column()
  day: string;

  @Column({
    type: 'enum',
    enum: PolicyReadingStatus,
    default: PolicyReadingStatus.IN_PROGRESS,
  })
  status: PolicyReadingStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

