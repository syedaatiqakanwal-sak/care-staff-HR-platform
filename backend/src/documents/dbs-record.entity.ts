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
import { StaffDocument } from './staff-document.entity';

@Entity('dbs_records')
export class DbsRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'staffId' })
  staffId: string;

  @ManyToOne(() => StaffProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'staffId' })
  staff: StaffProfile;

  @Column({ name: 'dbsNumber', length: 64 })
  dbsNumber: string;

  @Column({ name: 'issueDate', type: 'date', nullable: true })
  issueDate: string | null;

  @Index()
  @Column({ name: 'renewalDate', type: 'date', nullable: true })
  renewalDate: string | null;

  @Column({ name: 'lastDeclarationDate', type: 'date', nullable: true })
  lastDeclarationDate: string | null;

  @Column({ name: 'nextDeclarationDate', type: 'date', nullable: true })
  nextDeclarationDate: string | null;

  @Column({ name: 'lastDeclarationReminderSentAt', type: 'timestamp', nullable: true })
  lastDeclarationReminderSentAt: Date | null;

  @Column({ name: 'updateServiceStatus', default: false })
  updateServiceStatus: boolean;

  @Column({ name: 'certificateDocumentId', type: 'uuid', nullable: true })
  certificateDocumentId: string | null;

  @ManyToOne(() => StaffDocument, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'certificateDocumentId' })
  certificateDocument: StaffDocument | null;

  @Column({ type: 'varchar', nullable: true })
  dbsCertificateNumber: string | null;

  @Column({ type: 'varchar', nullable: true })
  enrolledDate: string | null;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;
}
