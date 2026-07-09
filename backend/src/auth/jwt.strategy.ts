import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '../users/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET') ,
        });
    }

    async validate(payload: { sub: string; role: UserRole; readOnly?: boolean }) {
        return {
            userId: payload.sub,
            role: payload.role,
            readOnly: Boolean(payload.readOnly),
        };
    }
}
