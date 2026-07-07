import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('api_tokens')
export class ApiToken {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'user_id' })
    @Index()
    userId: string;

    @Column({ length: 100 })
    name: string;

    @Column({ name: 'token_hash', length: 64, unique: true })
    @Index()
    tokenHash: string;

    @Column({ type: 'text', array: true, default: '{}' })
    scopes: string[];

    @Column({ name: 'last_used_at', type: 'timestamp', nullable: true })
    lastUsedAt: Date | null;

    @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
    expiresAt: Date | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
