import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { EmploymentStatus } from './employment-status.enum';

@Entity('staff_profiles')
export class StaffProfile {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    firstName: string;

    @Column({ nullable: true })
    lastName?: string;

    @Column({ nullable: true })
    phoneNumber: string;

    @Column({ nullable: true })
    ilccsNumber: string;

    @Column({ nullable: true })
    department: string;

    @Column({ nullable: true })
    lcaNumber: string;

    @Column({ name: 'ni_number', nullable: true, default: null })
    niNumber: string;

    @Column({ type: 'varchar', nullable: true, default: null })
    townOfBirth: string | null;

    @Column({ type: 'varchar', nullable: true, default: null })
    countyOfBirth: string | null;

    @Column({ type: 'varchar', nullable: true, default: null })
    countryOfBirth: string | null;

    @Column({ type: 'varchar', nullable: true, default: null })
    nationalityAtBirth: string | null;

    @Column({ type: 'varchar', nullable: true, default: null })
    currentNationality: string | null;

    @Column({ nullable: true })
    middleName: string;

    @Column({ type: 'varchar', length: 30, nullable: true })
    gender: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true, default: null })
    nextOfKinName: string | null;

    @Column({ type: 'varchar', length: 30, nullable: true, default: null })
    nextOfKinNumber: string | null;

    @Column({ type: 'varchar', length: 50, nullable: true, default: null })
    passportNumber: string | null;

    @Column({ type: 'date', nullable: true, default: null })
    passportExpiry: Date | null;

    @Column({ type: 'boolean', nullable: true, default: null })
    isUkNational: boolean | null;

    @Column({ type: 'boolean', nullable: true, default: null })
    isEeaNational: boolean | null;

    @Column({ type: 'varchar', length: 100, nullable: true, default: null })
    visaType: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true, default: null })
    visaOrBrpNumber: string | null;

    @Column({
        type: 'enum',
        enum: EmploymentStatus,
        default: EmploymentStatus.ACTIVE,
    })
    employmentStatus: EmploymentStatus;

    @Column({ nullable: true })
    title: string;

    @Column({ nullable: true })
    dateOfBirth: Date;

    @Column({ nullable: true })
    inductionDate: Date;

    @Column({ nullable: true })
    rapidInductionDate: Date;

    @Column({ nullable: true })
    profilePicture: string; // Path to profile picture file

    @Column({ type: 'date', nullable: true })
    visaExpiryDate: Date | null;

    @Column({ name: 'start_date', type: 'date', nullable: true })
    startDate: Date | null;

    @Column({ type: 'varchar', length: 64, nullable: true })
    shareCode: string | null;

    @Column({ type: 'varchar', length: 120, nullable: true })
    rightToWorkStatus: string | null;

    @Column({ name: 'share_code_generated_date', type: 'date', nullable: true })
    shareCodeGeneratedDate: Date | null;

    @Column({ name: 'right_to_work_check_completed', type: 'boolean', default: false })
    rightToWorkCheckCompleted: boolean;

    @Column({ name: 'right_to_work_check_date', type: 'date', nullable: true })
    rightToWorkCheckDate: Date | null;

    @Column({ name: 'right_to_work_check_expiry_date', type: 'date', nullable: true })
    rightToWorkCheckExpiryDate: Date | null;

    @Column({ name: 'address_gap_notified_at', type: 'timestamp', nullable: true })
    addressGapNotifiedAt: Date | null;

    /** Calendar-year annual leave entitlement (days). Balance computed from approved ANNUAL leave_records. */
    @Column({ name: 'annualLeaveAllowanceDays', type: 'int', default: 28 })
    annualLeaveAllowanceDays: number;

    @OneToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn()
    user: User;
}
