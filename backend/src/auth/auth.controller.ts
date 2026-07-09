import { Controller, Post, Body, UseGuards, Get, Request, UnauthorizedException } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import { Public } from './public.decorator';
import { UserRole } from '../users/user.entity';
import { LoginDto, RegisterDto } from './auth.dto';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Throttle({ default: { ttl: 900000, limit: 20 } })
    @Public()
    @Post('login/admin')
    async loginAdmin(@Body() req: LoginDto) {
        const user = await this.authService.validateUser(req.email, req.password, UserRole.ADMIN);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials or access denied');
        }
        return this.authService.login(user);
    }

    @Throttle({ default: { ttl: 900000, limit: 5 } })
    @Public()
    @Post('login/staff')
    async loginStaff(@Body() req: LoginDto) {
        const user = await this.authService.validateUser(req.email, req.password, UserRole.STAFF);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials or access denied');
        }
        return this.authService.login(user);
    }

    @SkipThrottle()
    @Public()
    @Post('register')
    async register(@Body() req: RegisterDto) {
        return this.authService.register(req);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('profile')
    getProfile(@Request() req) {
        return req.user;
    }

    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles(UserRole.ADMIN)
    @Get('admin')
    getAdmin(@Request() req) {
        return { message: 'This is admin content', user: req.user };
    }

    @Throttle({ default: { ttl: 900000, limit: 5 } })
    @Public()
    @Post('login/management')
    async loginManagement(@Body() req: LoginDto) {
        return this.authService.loginManagement(req);
    }

    @Throttle({ default: { ttl: 900000, limit: 5 } })
    @Public()
    @Post('forgot-password')
    async forgotPassword(@Body() body: { email: string }) {
        return this.authService.forgotPassword(body.email);
    }

    @Throttle({ default: { ttl: 900000, limit: 10 } })
    @Public()
    @Post('verify-otp')
    async verifyOtp(@Body() body: { email: string, otp: string }) {
        return this.authService.verifyOtp(body.email, body.otp);
    }

    @Throttle({ default: { ttl: 900000, limit: 5 } })
    @Public()
    @Post('reset-password')
    async resetPassword(@Body() body: { email: string, otp: string, newPassword: string }) {
        return this.authService.resetPassword(body.email, body.otp, body.newPassword);
    }
}
