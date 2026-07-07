import { IsString, IsOptional, IsEmail, IsDate, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateStaffDto {
    @IsOptional()
    @IsString()
    firstName?: string;

    @IsOptional()
    @IsString()
    middleName?: string;

    @IsOptional()
    @IsString()
    lastName?: string;

    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    phoneNumber?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    department?: string;

    @IsOptional()
    @IsString()
    employmentStatus?: string;

    @IsOptional()
    @IsString()
    ilccsNumber?: string;

    @IsOptional()
    @IsString()
    lcaNumber?: string;

    @IsOptional()
    @IsString()
    niNumber?: string;

    @IsOptional()
    @IsString()
    townOfBirth?: string;

    @IsOptional()
    @IsString()
    countyOfBirth?: string;

    @IsOptional()
    @IsString()
    nationalityAtBirth?: string;

    @IsOptional()
    @IsString()
    currentNationality?: string;

    @IsOptional()
    @IsDate()
    @Type(() => Date)
    inductionDate?: Date;

    @IsOptional()
    @IsDate()
    @Type(() => Date)
    rapidInductionDate?: Date;

    @IsOptional()
    @IsDate()
    @Type(() => Date)
    dateOfBirth?: Date;
}
