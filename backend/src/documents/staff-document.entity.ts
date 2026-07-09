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

export enum StaffDocumentType {
  PASSPORT = 'PASSPORT',
  DRIVING_LICENCE = 'DRIVING_LICENCE',
  RIGHT_TO_WORK = 'RIGHT_TO_WORK',
  BRP = 'BRP',
  VISA = 'VISA',
  DBS_CERTIFICATE = 'DBS_CERTIFICATE',
  DBS_DECLARATION = 'DBS_DECLARATION',
  ADDRESS_PROOF = 'ADDRESS_PROOF',
  HMRC = 'HMRC',
  P45 = 'P45',
  P60 = 'P60',
  CONTRACT = 'CONTRACT',
  OTHER = 'OTHER',
}

@Entity('staff_documents')
export class StaffDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'staffId' })
  staffId: string;

  @ManyToOne(() => StaffProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'staffId' })
  staff: StaffProfile;

  @Column({ name: 'documentType', length: 40 })
  documentType: StaffDocumentType;

  @Column({ name: 'fileName', length: 512 })
  fileName: string;

  @Column({ name: 'filePath', length: 1024 })
  filePath: string;

  @Column({ name: 'issueDate', type: 'date', nullable: true })
  issueDate: string | null;

  @Index()
  @Column({ name: 'expiryDate', type: 'date', nullable: true })
  expiryDate: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'uploadedBy', type: 'uuid', nullable: true })
  uploadedBy: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'uploadedBy' })
  uploadedByUser: User | null;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;
}
