import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '../user.entity';

export class UpdateUserRoleDto {
    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole;

    @IsOptional()
    @IsBoolean()
    readOnly?: boolean;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
