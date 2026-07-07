import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { StaffProfile } from '../staff/staff-profile.entity';
import { Policy } from './policy.entity';

@Entity('policy_notifications')
export class PolicyNotification {
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

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

