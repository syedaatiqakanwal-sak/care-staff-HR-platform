import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('inhouse_training_templates')
export class InHouseTrainingTemplate {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'text' })
    title: string;

    @Column({ name: 'group', type: 'varchar', length: 255 })
    group: string;

    @Column({ name: 'sortOrder', type: 'int', default: 0 })
    sortOrder: number;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @CreateDateColumn({ name: 'createdAt' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updatedAt' })
    updatedAt: Date;
}
