import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiToken } from './api-token.entity';
import * as crypto from 'crypto';

@Injectable()
export class ApiTokensService {
    constructor(
        @InjectRepository(ApiToken)
        private apiTokenRepository: Repository<ApiToken>,
    ) {}

    async createToken(userId: string, name: string, scopes: string[] = [], expiresInDays?: number): Promise<{ token: string; apiToken: ApiToken }> {
        // Generate a secure random token (64 hex characters = 32 bytes)
        const token = crypto.randomBytes(32).toString('hex');
        
        // Hash the token for storage
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        // Calculate expiration date if provided
        const expiresAt = expiresInDays 
            ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
            : null;

        // Create and save the token
        const apiToken = this.apiTokenRepository.create({
            userId,
            name,
            tokenHash,
            scopes,
            expiresAt,
        });

        await this.apiTokenRepository.save(apiToken);

        // Return the plain token ONCE (never stored in plain text)
        return { token, apiToken };
    }

    async findAllByUser(userId: string): Promise<ApiToken[]> {
        return this.apiTokenRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
    }

    async findOne(id: string, userId: string): Promise<ApiToken> {
        const apiToken = await this.apiTokenRepository.findOne({
            where: { id, userId },
        });

        if (!apiToken) {
            throw new NotFoundException('API token not found');
        }

        return apiToken;
    }

    async deleteToken(id: string, userId: string): Promise<void> {
        const apiToken = await this.findOne(id, userId);
        await this.apiTokenRepository.remove(apiToken);
    }
}
