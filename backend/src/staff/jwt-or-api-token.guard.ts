import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { ApiTokenGuard } from '../api-tokens/api-token.guard';
import { UserRole } from '../users/user.entity';
import { IS_PUBLIC_KEY } from '../auth/public.decorator';

const REST_API_SCOPES = new Set(['rest', '*', 'full']);

function isN8nAutomationPath(request: { url?: string; path?: string; originalUrl?: string }): boolean {
    const path = `${request.originalUrl || ''} ${request.url || ''} ${request.path || ''}`;
    return path.includes('/api/n8n') || /\/n8n(\/|$)/.test(path);
}

@Injectable()
export class JwtOrApiTokenGuard implements CanActivate {
    private readonly jwtGuard = new (AuthGuard('jwt'))();

    constructor(
        private readonly apiTokenGuard: ApiTokenGuard,
        private readonly reflector: Reflector,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            return true;
        }

        const request = context.switchToHttp().getRequest();

        // Already authenticated in this request (e.g. controller-level guard after global)
        if (request.user?.userId || request.user?.id) {
            return true;
        }

        try {
            const jwtResult = await Promise.resolve(
                this.jwtGuard.canActivate(context)
            );
            if (jwtResult) {
                return true;
            }
        } catch {
            // JWT failed, try API token
        }

        try {
            const apiTokenResult = await this.apiTokenGuard.canActivate(context);
            if (apiTokenResult) {
                if (request.apiToken) {
                    const tokenUser = request.apiToken.user || {};
                    const ownerRole = tokenUser.role || UserRole.STAFF;
                    const scopes: string[] = request.tokenScopes || [];
                    // N8n-scoped tokens must not access general REST (privilege escalation fix)
                    if (!isN8nAutomationPath(request) && !scopes.some((s) => REST_API_SCOPES.has(s))) {
                        throw new ForbiddenException(
                            'API token lacks rest/full scope for this endpoint. Use an n8n path or a token with rest scope.',
                        );
                    }
                    request.user = {
                        ...tokenUser,
                        id: request.tokenUserId || tokenUser.id,
                        userId: request.tokenUserId || tokenUser.id,
                        // Honor token owner's real role — never elevate to ADMIN
                        role: ownerRole,
                        readOnly: tokenUser.readOnly === true,
                        isApiToken: true,
                        scopes,
                    };
                }
                return true;
            }
        } catch (err) {
            if (err instanceof ForbiddenException) {
                throw err;
            }
            // API token also failed
        }

        // Returning false yields Nest's generic "Forbidden resource" (403).
        // Auth failure should be 401 Unauthorized instead.
        throw new UnauthorizedException('Authentication required');
    }
}
