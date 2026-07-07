import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum CourseCategory {
    MANDATORY = 'mandatory',
    ADDITIONAL = 'additional',
    SPECIALIST = 'specialist',
    OTHER = 'other'
}

@Entity('courses')
export class Course {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    title: string;

    @Column()
    month: number; // 0 for 'TBD' or just number

    @Column()
    provider: string;

    @Column()
    duration: string;

    @Column('simple-array')
    categories: string[];

    @Column('simple-array', { nullable: true })
    subModules: string[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
