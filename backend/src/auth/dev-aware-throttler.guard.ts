import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class DevAwareThrottlerGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const isDevelopment = (process.env.NODE_ENV || '').toLowerCase() === 'development';
    const isAdminLogin =
      request?.method === 'POST' &&
      typeof request?.originalUrl === 'string' &&
      request.originalUrl.endsWith('/api/v1/auth/login/admin');

    // Keep throttling in production; bypass only dev admin login.
    if (isDevelopment && isAdminLogin) {
      return true;
    }

    return super.canActivate(context);
  }
}
