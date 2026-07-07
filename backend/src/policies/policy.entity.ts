import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('policies')
export class Policy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  title: string;

  @Column({ type: 'text', default: '' })
  description: string;

  // Relative path under backend/uploads/policies
  @Column()
  filePath: string;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ default: true })
  isActive: boolean;

  @Column()
  createdBy: string; // admin userId

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

