import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User, UserRole } from '../users/user.entity';
import { MANAGEMENT_LOGIN_ROLES } from '../users/role.utils';
import { StaffService } from '../staff/staff.service';
import { RegisterDto } from './auth.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private staffService: StaffService,
        private emailService: EmailService,
    ) { }

    async validateUser(
        email: string,
        pass: string,
        allowedRoles?: UserRole | UserRole[],
    ): Promise<Omit<User, 'password'> | null> {
        const normalizedEmail = email.toLowerCase().trim();
        const user = await this.usersService.findByEmail(normalizedEmail);

        if (!user) return null;

        if (allowedRoles !== undefined) {
            const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
            if (!roles.includes(user.role)) return null;
        }

        if (!user.isActive) return null;

        if (await bcrypt.compare(pass, user.password)) {
            const { password: _password, ...result } = user;
            return result;
        }
        return null;
    }

    /** Management portal: MANAGER, HR, SUPERVISOR (not ADMIN — use login/admin). */
    async loginManagement(loginDto: { email: string; password: string }) {
        const user = await this.validateUser(loginDto.email, loginDto.password, [
            UserRole.MANAGER,
            UserRole.HR,
            UserRole.SUPERVISOR,
        ]);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials or access denied');
        }
        return this.login(user);
    }

    async login(user: any) {
        // Update Last Login Timestamp
        await this.usersService.update(user.id, { lastLoginAt: new Date() });

        const readOnly = Boolean(user.readOnly);
        const payload = { sub: user.id, role: user.role, readOnly };

        let name = 'User';
        if (user.role === UserRole.STAFF) {
            try {
                const profile = await this.staffService.getProfileByUserId(user.id);
                name = `${profile.firstName} ${profile.lastName}`;
            } catch {
                name = 'Staff Member';
            }
        } else if (user.role === UserRole.ADMIN) {
            name = 'Admin';
        } else if (user.role === UserRole.MANAGER) {
            name = 'Manager';
        } else if (user.role === UserRole.HR) {
            name = 'HR';
        } else if (user.role === UserRole.SUPERVISOR) {
            name = 'Supervisor';
        } else if (MANAGEMENT_LOGIN_ROLES.includes(user.role)) {
            name = user.role.charAt(0) + user.role.slice(1).toLowerCase();
        }

        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                email: user.email,
                role: user.role.toLowerCase(),
                readOnly,
                name,
            },
        };
    }

    async register(registerDto: RegisterDto) {
        const { email, password, firstName, lastName, phone, ilccsNumber } = registerDto;

        const exists = await this.usersService.exists(email);
        if (exists) {
            throw new UnauthorizedException('Invalid request');
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = await this.usersService.create({
            email: email.toLowerCase().trim(),
            password: hashedPassword,
        });

        if (newUser.role === UserRole.STAFF) {
            await this.staffService.createProfile(
                newUser,
                firstName,
                lastName,
                phone,
                ilccsNumber
            );
        }

        const { password: _, ...result } = newUser;
        return result;
    }

    // --- Forgot Password Flow ---

    async forgotPassword(email: string) {
        const user = await this.usersService.findForReset(email.toLowerCase().trim());
        if (!user) {
            // Return success even if user not found to prevent email enumeration
            return { message: 'If the email exists, an OTP has been sent' };
        }

        // Generate 6-digit OTP
        const otp = crypto.randomInt(100000, 999999).toString();

        // Hash it
        const hashedOtp = await bcrypt.hash(otp, 10);

        // Expires in 15 minutes
        const expiry = new Date();
        expiry.setMinutes(expiry.getMinutes() + 15);

        await this.usersService.update(user.id, {
            resetOtp: hashedOtp,
            resetOtpExpiry: expiry
        });

        // Send Email via Nodemailer
        await this.emailService.sendOtp(email, otp);

        return { message: 'If the email exists, an OTP has been sent' };
    }

    async verifyOtp(email: string, otp: string) {
        const user = await this.usersService.findForReset(email);
        if (!user || !user.resetOtp || !user.resetOtpExpiry) {
            throw new UnauthorizedException('Invalid request');
        }

        if (new Date() > user.resetOtpExpiry) {
            throw new UnauthorizedException('OTP expired');
        }

        const isValid = await bcrypt.compare(otp, user.resetOtp);
        if (!isValid) {
            throw new UnauthorizedException('Invalid OTP');
        }

        return { message: 'OTP verified' };
    }

    async resetPassword(email: string, otp: string, newPassword: string) {
        // Re-verify strictly
        const user = await this.usersService.findForReset(email.toLowerCase().trim());
        if (!user || !user.resetOtp || !user.resetOtpExpiry) {
            throw new UnauthorizedException('Invalid request');
        }

        if (new Date() > user.resetOtpExpiry) {
            // Clear expired OTP to prevent further attempts
            await this.usersService.update(user.id, {
                resetOtp: null,
                resetOtpExpiry: null
            } as any);
            throw new UnauthorizedException('OTP expired');
        }

        const isValid = await bcrypt.compare(otp, user.resetOtp);
        if (!isValid) {
            throw new UnauthorizedException('Invalid OTP');
        }

        // Hash new password with stronger rounds
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update password and clear OTP immediately
        await this.usersService.update(user.id, {
            password: hashedPassword,
            resetOtp: null,
            resetOtpExpiry: null
        } as any);

        return { message: 'Password reset successfully' };
    }
}
