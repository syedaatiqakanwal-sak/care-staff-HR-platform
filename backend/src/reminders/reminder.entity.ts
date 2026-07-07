import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('reminders')
export class Reminder {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'user_id' })
    userId: string;

    @Column({ length: 50, nullable: true })
    type: string;

    @Column({ type: 'text', nullable: true })
    message: string;

    @Column({ name: 'scheduled_at', type: 'timestamp' })
    @Index()
    scheduledAt: Date;

    @Column({ default: false })
    sent: boolean;

    @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
    sentAt: Date | null;

    @Column({ type: 'jsonb', default: '{}' })
    metadata: Record<string, any>;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
