import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

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
    nationalityAtBirth: string | null;

    @Column({ type: 'varchar', nullable: true, default: null })
    currentNationality: string | null;

    @Column({ nullable: true })
    middleName: string;

    @Column({ nullable: true })
    employmentStatus: string;

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

    @OneToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn()
    user: User;
}
