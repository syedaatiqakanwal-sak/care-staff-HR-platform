import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';

const READ_ONLY_SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class ReadOnlyGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const method = (request.method as string).toUpperCase();
        if (READ_ONLY_SAFE_METHODS.has(method)) {
            return true;
        }

        if (request.user?.isApiToken) {
            return true;
        }

        if (request.user?.readOnly === true) {
            throw new ForbiddenException('Read-only account cannot modify data');
        }

        return true;
    }
}
