import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

export enum CertificateStatus {
    PENDING = 'Pending',
    COMPLETED = 'Completed',
}

@Entity('certificates')
export class Certificate {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    courseName: string;

    // Added to store specific sub-module/topic name for 'Other' courses
    @Column({ nullable: true })
    subModule: string;

    @Column()
    provider: string;

    @Column({ type: 'int', default: 1 })
    monthNumber: number;

    @Column({
        type: 'enum',
        enum: CertificateStatus,
        default: CertificateStatus.PENDING,
    })
    status: CertificateStatus;

    @Column({ nullable: true })
    issuedAt: Date;

    @Column({ nullable: true, unique: true })
    registrationNo: string;

    @Column({ nullable: true }) // Generated UUID code for verification
    verificationCode: string;

    @Column({ nullable: true, select: false }) // Private file path
    filePath: string;

    @ManyToOne(() => User, (user) => user.certifications)
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column()
    userId: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
