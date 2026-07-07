import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class ScopesGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredScopes = this.reflector.get<string[]>('scopes', context.getHandler());
        
        if (!requiredScopes || requiredScopes.length === 0) {
            return true; // No scope requirements
        }

        const request = context.switchToHttp().getRequest();
        const tokenScopes: string[] = request.tokenScopes || [];

        // Check if all required scopes are present
        const hasAllScopes = requiredScopes.every(scope => tokenScopes.includes(scope));

        if (!hasAllScopes) {
            throw new ForbiddenException(
                `Missing required scopes: ${requiredScopes.join(', ')}. Token has: ${tokenScopes.join(', ') || 'none'}`
            );
        }

        return true;
    }
}
