import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, OneToOne } from 'typeorm';
import { Certificate } from '../certificates/certificate.entity';
import { VleCredential } from '../vle-credentials/vle-credential.entity';

export enum UserRole {
    ADMIN = 'ADMIN',
    MANAGER = 'MANAGER',
    HR = 'HR',
    SUPERVISOR = 'SUPERVISOR',
    STAFF = 'STAFF',
}

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    email: string;

    @Column({ select: false }) // Password hidden by default
    password: string;

    @Column({
        type: 'enum',
        enum: UserRole,
        default: UserRole.STAFF,
    })
    role: UserRole;

    @Column({ default: true })
    isActive: boolean;

    @Column({ default: false })
    readOnly: boolean;

    @Column({ nullable: true })
    lastLoginAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({ nullable: true, select: false })
    resetOtp: string;

    @Column({ nullable: true, select: false })
    resetOtpExpiry: Date;

    @OneToMany(() => Certificate, (cert) => cert.user)
    certifications: Certificate[];

    @OneToOne(() => VleCredential, (vle) => vle.user)
    vleCredential: VleCredential;
}
