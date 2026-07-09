import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { StaffProfile } from '../staff/staff-profile.entity';
import { PayType } from './pay-type.enum';

@Entity('payroll_info')
export class PayrollInfo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'staffId', unique: true })
  staffId: string;

  @OneToOne(() => StaffProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'staffId' })
  staff: StaffProfile;

  @Column({ name: 'salaryOrRate', type: 'varchar', length: 64, nullable: true })
  salaryOrRate: string | null;

  @Column({ type: 'enum', enum: PayType, nullable: true })
  payType: PayType | null;

  @Column({ name: 'contractType', type: 'varchar', length: 120, nullable: true })
  contractType: string | null;

  @Column({ name: 'pensionStatus', type: 'varchar', length: 120, nullable: true })
  pensionStatus: string | null;

  @Column({ name: 'bankDetailsEncrypted', type: 'text', nullable: true })
  bankDetailsEncrypted: string | null;

  @Column({ name: 'payrollNotes', type: 'text', nullable: true })
  payrollNotes: string | null;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;
}
