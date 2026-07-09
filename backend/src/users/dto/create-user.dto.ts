import {
    IsBoolean,
    IsEmail,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    MinLength,
    Matches,
} from 'class-validator';
import { UserRole } from '../user.entity';

export class CreateUserDto {
    @IsEmail()
    email: string;

    @IsNotEmpty()
    @MinLength(8, { message: 'Password must be at least 8 characters' })
    @Matches(/((?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]))/, {
        message: 'Password must contain uppercase, lowercase, number and special character',
    })
    password: string;

    @IsEnum(UserRole)
    role: UserRole;

    @IsOptional()
    @IsBoolean()
    readOnly?: boolean;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    /** Required when role is STAFF — creates linked staff_profiles row */
    @IsOptional()
    @IsString()
    firstName?: string;

    @IsOptional()
    @IsString()
    lastName?: string;

    @IsOptional()
    @IsString()
    middleName?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    ilccsNumber?: string;

    @IsOptional()
    @IsString()
    lcaNumber?: string;
}
