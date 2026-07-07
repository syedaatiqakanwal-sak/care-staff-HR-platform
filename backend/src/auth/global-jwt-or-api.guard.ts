import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ApiTokenGuard } from '../api-tokens/api-token.guard';
import { UserRole } from '../users/user.entity';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class GlobalJwtOrApiGuard implements CanActivate {
  constructor(private readonly apiTokenGuard: ApiTokenGuard) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request?.headers?.authorization;

    // Keep existing behavior for truly public routes with no token.
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return true;
    }

    const bearerToken = authHeader.slice(7);

    // JWT token: let existing JWT guards/strategy handle it.
    if (bearerToken.includes('.')) {
      return true;
    }

    // API token: validate once globally and expose request context.
    await this.apiTokenGuard.canActivate(context);

    if (!request.user && request.apiToken?.user) {
      request.user = {
        ...request.apiToken.user,
        isApiToken: true,
        role: request.apiToken.user.role || UserRole.ADMIN,
      };
    }

    // Keep original API token so ApiTokenGuard-protected routes can still validate it.
    request.originalApiToken = bearerToken;

    // Bridge API token to JWT-only guards without changing controller decorators.
    const secret = process.env.JWT_SECRET;
    if (secret) {
      const userId = request.tokenUserId || request.apiToken?.userId || request.user?.id || request.user?.userId;
      const role = request.user?.role || UserRole.ADMIN;
      const syntheticJwt = jwt.sign({ sub: userId, role }, secret, { expiresIn: '60m' });
      request.headers.authorization = `Bearer ${syntheticJwt}`;
    }

    return true;
  }
}
