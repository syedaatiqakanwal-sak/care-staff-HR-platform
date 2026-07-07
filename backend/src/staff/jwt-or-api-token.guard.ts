import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { ApiTokenGuard } from '../api-tokens/api-token.guard';
import { UserRole } from '../users/user.entity';
import { IS_PUBLIC_KEY } from '../auth/public.decorator';

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
                const request = context.switchToHttp().getRequest();
                if (request.apiToken) {
                    const tokenUser = request.apiToken.user || {};
                    request.user = {
                        ...tokenUser,
                        id: request.tokenUserId || tokenUser.id,
                        userId: request.tokenUserId || tokenUser.id,
                        // Enforce admin role for API token automation paths.
                        role: UserRole.ADMIN,
                        isApiToken: true,
                    };
                }
                return true;
            }
        } catch {
            // API token also failed
        }

        return false;
    }
}
