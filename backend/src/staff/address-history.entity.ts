import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { StaffProfile } from './staff-profile.entity';

@Entity('address_history')
export class AddressHistory {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    staffId: string;

    @ManyToOne(() => StaffProfile, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'staffId' })
    staffProfile: StaffProfile;

    @Column({ type: 'varchar', nullable: true })
    line1: string | null;

    @Column({ nullable: true })
    line2: string; // Optional

    @Column()
    town: string;

    @Column()
    postcode: string;

    @Column({ type: 'date' })
    dateFrom: string;

    @Column({ type: 'date' })
    dateTo: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
