import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'userId', type: 'uuid' })
  userId: string;

  @Column({ name: 'userRole', type: 'varchar', length: 32, nullable: true })
  userRole: string | null;

  @Column({ type: 'varchar', length: 64 })
  action: string;

  @Index()
  @Column({ name: 'entityType', type: 'varchar', length: 64 })
  entityType: string;

  @Column({ name: 'entityId', type: 'uuid', nullable: true })
  entityId: string | null;

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  @Column({ name: 'ipAddress', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Index()
  @CreateDateColumn({ name: 'createdAt', type: 'timestamptz' })
  createdAt: Date;
}
