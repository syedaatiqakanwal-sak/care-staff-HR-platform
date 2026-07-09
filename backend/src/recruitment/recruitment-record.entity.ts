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

@Entity('recruitment_records')
export class RecruitmentRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'staffId' })
  staffId: string;

  @ManyToOne(() => StaffProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'staffId' })
  staff: StaffProfile;

  @Column({ default: false })
  interviewRecorded: boolean;

  @Column({ type: 'date', nullable: true })
  interviewRecordedDate: string | null;

  @Column({ default: false })
  offerLetterIssued: boolean;

  @Column({ type: 'date', nullable: true })
  offerLetterIssuedDate: string | null;

  @Column({ default: false })
  contractIssued: boolean;

  @Column({ type: 'date', nullable: true })
  contractIssuedDate: string | null;

  @Column({ default: false })
  contractSigned: boolean;

  @Column({ type: 'date', nullable: true })
  contractSignedDate: string | null;

  @Column({ default: false })
  inductionCompleted: boolean;

  @Column({ type: 'date', nullable: true })
  inductionCompletedDate: string | null;

  @Column({ default: false })
  shadowStarted: boolean;

  @Column({ type: 'date', nullable: true })
  shadowStartDate: string | null;

  /** Auto-set to shadowStartDate + 14 days when shadow starts */
  @Column({ type: 'date', nullable: true })
  shadowEndDate: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
