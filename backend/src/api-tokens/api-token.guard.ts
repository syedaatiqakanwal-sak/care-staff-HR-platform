import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiToken } from './api-token.entity';
import * as crypto from 'crypto';

@Injectable()
export class ApiTokenGuard implements CanActivate {
    constructor(
        @InjectRepository(ApiToken)
        private apiTokenRepository: Repository<ApiToken>,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        
        // Extract Bearer token from Authorization header
        const authHeader = request.headers.authorization;
        const fallbackApiToken = request.originalApiToken;
        if ((!authHeader || !authHeader.startsWith('Bearer ')) && !fallbackApiToken) {
            throw new UnauthorizedException('Missing or invalid Authorization header. Expected: Bearer <token>');
        }

        const token = fallbackApiToken || authHeader.substring(7); // Remove 'Bearer ' prefix
        
        // Hash the token with SHA-256
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        // Look up token in database
        const apiToken = await this.apiTokenRepository.findOne({
            where: { tokenHash },
            relations: ['user'],
        });

        if (!apiToken) {
            throw new UnauthorizedException('Invalid API token');
        }

        // Check if token is expired
        if (apiToken.expiresAt && apiToken.expiresAt < new Date()) {
            throw new ForbiddenException('API token has expired');
        }

        // Update last_used_at
        apiToken.lastUsedAt = new Date();
        await this.apiTokenRepository.save(apiToken);

        // Attach token info to request (for use in controllers)
        request.tokenUserId = apiToken.userId;
        request.tokenScopes = apiToken.scopes || [];
        request.apiToken = apiToken;

        return true;
    }
}
