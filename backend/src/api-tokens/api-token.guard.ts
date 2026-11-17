import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiToken } from './api-token.entity';
import * as crypto from 'crypto';

/** Debounce lastUsedAt writes to reduce hot-row contention (M8). */
const LAST_USED_MIN_INTERVAL_MS = 60_000;

@Injectable()
export class ApiTokenGuard implements CanActivate {
    constructor(
        @InjectRepository(ApiToken)
        private apiTokenRepository: Repository<ApiToken>,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();

        // Skip re-validation if global JwtOrApiTokenGuard already attached this token
        if (request.apiToken && request.tokenUserId) {
            return true;
        }
        
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

        // Debounced last_used_at update (avoid 2x write per request under dual guards)
        const now = Date.now();
        const last = apiToken.lastUsedAt ? apiToken.lastUsedAt.getTime() : 0;
        if (now - last >= LAST_USED_MIN_INTERVAL_MS) {
            await this.apiTokenRepository.update(
                { id: apiToken.id },
                { lastUsedAt: new Date(now) },
            );
            apiToken.lastUsedAt = new Date(now);
        }

        // Attach token info to request (for use in controllers)
        request.tokenUserId = apiToken.userId;
        request.tokenScopes = apiToken.scopes || [];
        request.apiToken = apiToken;

        return true;
    }
}
