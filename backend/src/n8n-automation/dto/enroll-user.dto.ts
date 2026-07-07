import { IsString, IsEmail, IsUUID } from 'class-validator';

export class EnrollUserDto {
    @IsEmail()
    email: string;

    @IsString()
    name: string;

    @IsUUID()
    planId: string;
}
