
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('vle_credentials')
export class VleCredential {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    username: string;

    @Column()
    password: string;

    @Column({ default: 'https://vle.inspirelondoncollege.com/login/index.php' })
    loginUrl: string;

    @OneToOne(() => User, (user) => user.vleCredential, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column()
    userId: string; // Foreign key

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
