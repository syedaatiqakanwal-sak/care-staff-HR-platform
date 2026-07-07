import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from './course.entity';
import { CreateCourseDto } from './dto/create-course.dto';

@Injectable()
export class CoursesService {
    constructor(
        @InjectRepository(Course)
        private coursesRepository: Repository<Course>,
    ) { }

    async create(createCourseDto: CreateCourseDto): Promise<Course> {
        const course = this.coursesRepository.create(createCourseDto);
        return this.coursesRepository.save(course);
    }

    async findAll(): Promise<Course[]> {
        return this.coursesRepository.find({
            order: { createdAt: 'DESC' }
        });
    }

    async findOne(id: string): Promise<Course | null> {
        return this.coursesRepository.findOne({ where: { id } });
    }

    async update(id: string, updateCourseDto: CreateCourseDto): Promise<Course | null> {
        await this.coursesRepository.update(id, updateCourseDto);
        return this.findOne(id);
    }

    async remove(id: string): Promise<void> {
        await this.coursesRepository.delete(id);
    }

    // Optional: Seed method if we want to migrate static data
}
