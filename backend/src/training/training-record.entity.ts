import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

export enum TrainingStatus {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
}

@Entity('training_records')
export class TrainingRecord {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    userId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column()
    courseName: string;

    // New column to store the specific sub-module/topic (e.g. for "Other" category courses)
    @Column({ nullable: true })
    subModule: string;

    @Column({
        type: 'enum',
        enum: TrainingStatus,
        default: TrainingStatus.PENDING
    })
    status: TrainingStatus;

    @Column({ type: 'timestamp', nullable: true })
    enrollmentDate: Date | null;

    @Column({ type: 'timestamp', nullable: true })
    completedAt: Date | null;

    @Column({ type: 'timestamp', nullable: true })
    dueDate: Date | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
