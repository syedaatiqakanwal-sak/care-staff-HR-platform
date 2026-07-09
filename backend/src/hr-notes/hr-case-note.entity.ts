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
import { HrCaseNoteCategory } from './hr-case-note-category.enum';

@Entity('hr_case_notes')
export class HrCaseNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'staffId' })
  staffId: string;

  @ManyToOne(() => StaffProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'staffId' })
  staff: StaffProfile;

  @Column({
    type: 'enum',
    enum: HrCaseNoteCategory,
  })
  category: HrCaseNoteCategory;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ default: true })
  confidential: boolean;

  @Column({ name: 'createdBy' })
  createdBy: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'createdBy' })
  author: User;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;
}
