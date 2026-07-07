import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { StaffProfile } from './staff-profile.entity';

@Entity('review_forms')
export class ReviewForm {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => StaffProfile, { onDelete: 'CASCADE' })
    @JoinColumn()
    staff: StaffProfile;

    @Column()
    formType: string; // 'review', 'appraisal', 'supervision'

    @Column()
    formSubType: string; // 'Second Month', '4th Month', etc.

    @Column()
    staffName: string;

    @Column({ type: 'date', nullable: true })
    startDate: string;

    @Column({ type: 'date' })
    dateOfReview: string;

    @Column({ type: 'text', nullable: true })
    documentationComments: string;

    @Column({ nullable: true })
    jobPerformanceGrade: string;

    @Column({ type: 'text', nullable: true })
    jobPerformanceReason: string;

    @Column({ nullable: true })
    trainingDevelopmentGrade: string;

    @Column({ type: 'text', nullable: true })
    trainingDevelopmentReason: string;

    @Column({ nullable: true })
    communicationSkillsGrade: string;

    @Column({ type: 'text', nullable: true })
    communicationSkillsReason: string;

    @Column({ nullable: true })
    attendancePunctualityGrade: string;

    @Column({ type: 'text', nullable: true })
    attendancePunctualityReason: string;

    @Column({ nullable: true })
    recommendedForReview: string; // 'YES' or 'NO'

    @Column({ type: 'text', nullable: true })
    reviewReasons: string;

    @Column({ nullable: true })
    careStaffSignature: string;

    @Column({ type: 'date', nullable: true })
    careStaffDate: string;

    @Column({ nullable: true })
    reviewerSignature: string;

    @Column({ type: 'date', nullable: true })
    reviewerDate: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
