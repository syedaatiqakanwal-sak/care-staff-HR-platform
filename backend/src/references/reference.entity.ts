import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { StaffProfile } from '../staff/staff-profile.entity';

export enum ReferenceStatus {
    PENDING = 'pending',
    OPENED = 'opened',
    SUBMITTED = 'submitted',
    COMPLETED = 'completed',
    FAILED = 'failed',
}

@Entity('references')
export class StaffReference {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => StaffProfile, (staff) => staff.id, { onDelete: 'CASCADE' })
    staff: StaffProfile;

    @Column()
    staffId: string;

    @Column()
    referenceType: string; // "personal" | "professional"

    @Column()
    name: string;

    @Column()
    email: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ nullable: true })
    relationship: string;

    @Column({ nullable: true })
    yearsKnown: string;

    @Column({ nullable: true, type: 'text' })
    message: string;

    // New secure token system fields
    @Column({ unique: true, nullable: true })
    token: string;

    @Column({
        type: 'enum',
        enum: ReferenceStatus,
        default: ReferenceStatus.PENDING,
    })
    status: ReferenceStatus;

    @Column({ nullable: true })
    openedAt: Date;

    @Column({ nullable: true })
    submittedAt: Date;

    @Column({ default: 0 })
    reminderCount: number;

    @Column({ type: 'timestamp', nullable: true })
    lastReminderSentAt: Date | null;

    @Column({ nullable: true })
    ipAddress: string;

    // Reference form submission data (stored as JSON)
    @Column({ type: 'jsonb', nullable: true })
    submissionData: {
        relationship?: string;
        yearsKnown?: string;
        comments?: string;
        recommendation?: boolean;
        signature?: string;
        signatureDate?: string;
        criteriaRatings?: Record<string, string>;
        additionalComments?: string;
        [key: string]: any;
    };

    // Legacy fields for backward compatibility
    @Column({ default: 'pending' })
    emailStatus: string; // "pending" | "sent" | "failed"

    @Column({ nullable: true })
    refereeName: string;

    @Column({ nullable: true })
    company: string;

    @Column({ type: 'date', nullable: true })
    initialContactDate: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
