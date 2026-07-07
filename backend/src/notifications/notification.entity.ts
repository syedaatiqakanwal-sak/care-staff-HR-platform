import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('notifications')
export class Notification {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'user_id', nullable: true }) // Optional: Read-only access to ID if needed, but safer to omit or use insert:false
    private _userId: string;

    @Column()
    title: string;

    @Column()
    message: string;

    @Column({ default: false })
    isRead: boolean;

    @Column({ type: 'json', nullable: true })
    metadata: any; // Store extra data like { certificateId: '...', link: '...' }

    @CreateDateColumn()
    createdAt: Date;
}
