import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
    ) { }

    async findByEmail(email: string): Promise<User | null> {
        return this.usersRepository.findOne({
            where: { email },
            select: ['id', 'email', 'password', 'role', 'isActive', 'readOnly'],
        });
    }

    async findForReset(email: string): Promise<User | null> {
        return this.usersRepository.findOne({
            where: { email },
            select: ['id', 'email', 'resetOtp', 'resetOtpExpiry'],
        });
    }

    async create(userData: Partial<User>): Promise<User> {
        const user = this.usersRepository.create(userData);
        return this.usersRepository.save(user);
    }

    // Helper for duplicate checks, etc.
    async exists(email: string): Promise<boolean> {
        const count = await this.usersRepository.count({ where: { email } });
        return count > 0;
    }

    async update(id: string, data: Partial<User>): Promise<User | null> {
        await this.usersRepository.update(id, data);
        return this.usersRepository.findOne({ where: { id } });
    }

    async findById(id: string): Promise<User | null> {
        return this.usersRepository.findOne({
            where: { id },
            select: ['id', 'email', 'role', 'isActive', 'readOnly', 'lastLoginAt', 'createdAt', 'updatedAt'],
        });
    }

    async findAllSummaries(): Promise<Partial<User>[]> {
        return this.usersRepository.find({
            select: ['id', 'email', 'role', 'isActive', 'readOnly', 'lastLoginAt', 'createdAt'],
            order: { createdAt: 'DESC' },
        });
    }
}
