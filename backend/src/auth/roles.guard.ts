import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../users/user.entity';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!requiredRoles) {
            return true;
        }
        const { user } = context.switchToHttp().getRequest();
        if (!user || !user.role) {
            return false;
        }
        // Normalize role comparison (handle both uppercase and lowercase)
        const userRole = typeof user.role === 'string' ? user.role.toUpperCase() : user.role;
        return requiredRoles.some((role) => {
            const normalizedRole = typeof role === 'string' ? role.toUpperCase() : role;
            return userRole === normalizedRole || userRole === role;
        });
    }
}
