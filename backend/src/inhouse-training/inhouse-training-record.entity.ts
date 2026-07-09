import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

@Entity('inhouse_training_records')
export class InHouseTrainingRecord {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @Column({ name: 'staffId', type: 'varchar', length: 255 })
    staffId: string;

    @Column({ name: 'templateId', type: 'uuid', nullable: true })
    templateId: string | null;

    @Column({ type: 'text' })
    title: string;

    @Column({ name: 'group', type: 'varchar', length: 255 })
    group: string;

    @Column({ name: 'sortOrder', type: 'int', default: 0 })
    sortOrder: number;

    @Column({ name: 'enrollmentDate', type: 'date', nullable: true })
    enrollmentDate: string | null;

    @Column({ name: 'completionDate', type: 'date', nullable: true })
    completionDate: string | null;

    // 'enrolled' | 'progressing' | 'completed' | null (not started)
    @Column({ type: 'varchar', length: 50, nullable: true })
    status: string | null;

    @Column({ name: 'documentPath', type: 'varchar', length: 500, nullable: true })
    documentPath: string | null;

    @Column({ name: 'documentName', type: 'varchar', length: 255, nullable: true })
    documentName: string | null;

    @CreateDateColumn({ name: 'createdAt' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updatedAt' })
    updatedAt: Date;
}
