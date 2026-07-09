import { IsString, IsOptional, IsEmail, IsDate, IsEnum, IsInt, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { EmploymentStatus } from '../employment-status.enum';

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
    @IsEnum(EmploymentStatus)
    employmentStatus?: EmploymentStatus;

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
    gender?: string | null;

    @IsOptional()
    @IsString()
    nextOfKinName?: string | null;

    @IsOptional()
    @IsString()
    nextOfKinNumber?: string | null;

    @IsOptional()
    @IsString()
    passportNumber?: string | null;

    @IsOptional()
    @IsDate()
    @Type(() => Date)
    passportExpiry?: Date | null;

    @IsOptional()
    @IsBoolean()
    isUkNational?: boolean | null;

    @IsOptional()
    @IsBoolean()
    isEeaNational?: boolean | null;

    @IsOptional()
    @IsString()
    visaType?: string | null;

    @IsOptional()
    @IsString()
    visaOrBrpNumber?: string | null;

    @IsOptional()
    @IsString()
    townOfBirth?: string;

    @IsOptional()
    @IsString()
    countyOfBirth?: string;

    @IsOptional()
    @IsString()
    countryOfBirth?: string;

    @IsOptional()
    @IsString()
    nationalityAtBirth?: string;

    @IsOptional()
    @IsString()
    currentNationality?: string;

    @IsOptional()
    @IsDate()
    @Type(() => Date)
    startDate?: Date | null;

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

    @IsOptional()
    @IsDate()
    @Type(() => Date)
    visaExpiryDate?: Date | null;

    @IsOptional()
    @IsString()
    shareCode?: string | null;

    @IsOptional()
    @IsString()
    rightToWorkStatus?: string | null;

    @IsOptional()
    @IsDate()
    @Type(() => Date)
    shareCodeGeneratedDate?: Date | null;

    @IsOptional()
    @IsBoolean()
    rightToWorkCheckCompleted?: boolean;

    @IsOptional()
    @IsDate()
    @Type(() => Date)
    rightToWorkCheckDate?: Date | null;

    @IsOptional()
    @IsDate()
    @Type(() => Date)
    rightToWorkCheckExpiryDate?: Date | null;

    @IsOptional()
    @IsInt()
    @Min(0)
    annualLeaveAllowanceDays?: number;
}
