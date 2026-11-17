import {
    IsString,
    IsOptional,
    IsEmail,
    IsEnum,
    IsInt,
    Min,
    IsBoolean,
    IsDateString,
    ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { EmploymentStatus } from '../employment-status.enum';

/** JSON/HTML forms send date strings; treat empty as null. */
const EmptyDateToNull = () =>
    Transform(({ value }) => (value === '' || value === undefined ? null : value));

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
    @IsString()
    passportIssuingAuthority?: string | null;

    @IsOptional()
    @EmptyDateToNull()
    @ValidateIf((_, v) => v !== null && v !== undefined)
    @IsDateString({}, { message: 'passportExpiry must be a valid date (YYYY-MM-DD)' })
    passportExpiry?: string | null;

    @IsOptional()
    @Transform(({ value }) => {
        if (value === '' || value === null || value === undefined) return null;
        if (value === true || value === 'true' || value === 1 || value === '1') return true;
        if (value === false || value === 'false' || value === 0 || value === '0') return false;
        return value;
    })
    @ValidateIf((_, v) => v !== null && v !== undefined)
    @IsBoolean()
    isUkNational?: boolean | null;

    @IsOptional()
    @Transform(({ value }) => {
        if (value === '' || value === null || value === undefined) return null;
        if (value === true || value === 'true' || value === 1 || value === '1') return true;
        if (value === false || value === 'false' || value === 0 || value === '0') return false;
        return value;
    })
    @ValidateIf((_, v) => v !== null && v !== undefined)
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
    @EmptyDateToNull()
    @ValidateIf((_, v) => v !== null && v !== undefined)
    @IsDateString({}, { message: 'startDate must be a valid date (YYYY-MM-DD)' })
    startDate?: string | null;

    @IsOptional()
    @EmptyDateToNull()
    @ValidateIf((_, v) => v !== null && v !== undefined)
    @IsDateString({}, { message: 'inductionDate must be a valid date (YYYY-MM-DD)' })
    inductionDate?: string | null;

    @IsOptional()
    @EmptyDateToNull()
    @ValidateIf((_, v) => v !== null && v !== undefined)
    @IsDateString({}, { message: 'rapidInductionDate must be a valid date (YYYY-MM-DD)' })
    rapidInductionDate?: string | null;

    @IsOptional()
    @EmptyDateToNull()
    @ValidateIf((_, v) => v !== null && v !== undefined)
    @IsDateString({}, { message: 'dateOfBirth must be a valid date (YYYY-MM-DD)' })
    dateOfBirth?: string | null;

    @IsOptional()
    @EmptyDateToNull()
    @ValidateIf((_, v) => v !== null && v !== undefined)
    @IsDateString({}, { message: 'visaExpiryDate must be a valid date (YYYY-MM-DD)' })
    visaExpiryDate?: string | null;

    @IsOptional()
    @IsString()
    shareCode?: string | null;

    @IsOptional()
    @IsString()
    rightToWorkStatus?: string | null;

    @IsOptional()
    @EmptyDateToNull()
    @ValidateIf((_, v) => v !== null && v !== undefined)
    @IsDateString({}, { message: 'shareCodeGeneratedDate must be a valid date (YYYY-MM-DD)' })
    shareCodeGeneratedDate?: string | null;

    @IsOptional()
    @Transform(({ value }) => {
        if (value === true || value === 'true' || value === 1 || value === '1') return true;
        if (value === false || value === 'false' || value === 0 || value === '0') return false;
        return Boolean(value);
    })
    @IsBoolean()
    rightToWorkCheckCompleted?: boolean;

    @IsOptional()
    @EmptyDateToNull()
    @ValidateIf((_, v) => v !== null && v !== undefined)
    @IsDateString({}, { message: 'rightToWorkCheckDate must be a valid date (YYYY-MM-DD)' })
    rightToWorkCheckDate?: string | null;

    @IsOptional()
    @EmptyDateToNull()
    @ValidateIf((_, v) => v !== null && v !== undefined)
    @IsDateString({}, { message: 'rightToWorkCheckExpiryDate must be a valid date (YYYY-MM-DD)' })
    rightToWorkCheckExpiryDate?: string | null;

    @IsOptional()
    @Transform(({ value }) => {
        if (value === '' || value === null || value === undefined) return null;
        if (value === true || value === 'true' || value === 1 || value === '1') return true;
        if (value === false || value === 'false' || value === 0 || value === '0') return false;
        return value;
    })
    @ValidateIf((_, v) => v !== null && v !== undefined)
    @IsBoolean()
    furtherIsUkNational?: boolean | null;

    @IsOptional()
    @Transform(({ value }) => {
        if (value === '' || value === null || value === undefined) return null;
        if (value === true || value === 'true' || value === 1 || value === '1') return true;
        if (value === false || value === 'false' || value === 0 || value === '0') return false;
        return value;
    })
    @ValidateIf((_, v) => v !== null && v !== undefined)
    @IsBoolean()
    furtherIsEeaNational?: boolean | null;

    @IsOptional()
    @IsString()
    furtherVisaType?: string | null;

    @IsOptional()
    @IsString()
    furtherVisaOrBrpNumber?: string | null;

    @IsOptional()
    @EmptyDateToNull()
    @ValidateIf((_, v) => v !== null && v !== undefined)
    @IsDateString({}, { message: 'furtherVisaExpiryDate must be a valid date (YYYY-MM-DD)' })
    furtherVisaExpiryDate?: string | null;

    @IsOptional()
    @EmptyDateToNull()
    @ValidateIf((_, v) => v !== null && v !== undefined)
    @IsDateString({}, { message: 'furtherShareCodeGeneratedDate must be a valid date (YYYY-MM-DD)' })
    furtherShareCodeGeneratedDate?: string | null;

    @IsOptional()
    @Transform(({ value }) => {
        if (value === true || value === 'true' || value === 1 || value === '1') return true;
        if (value === false || value === 'false' || value === 0 || value === '0') return false;
        return Boolean(value);
    })
    @IsBoolean()
    furtherRightToWorkCheckCompleted?: boolean;

    @IsOptional()
    @EmptyDateToNull()
    @ValidateIf((_, v) => v !== null && v !== undefined)
    @IsDateString({}, { message: 'furtherRightToWorkCheckDate must be a valid date (YYYY-MM-DD)' })
    furtherRightToWorkCheckDate?: string | null;

    @IsOptional()
    @EmptyDateToNull()
    @ValidateIf((_, v) => v !== null && v !== undefined)
    @IsDateString({}, { message: 'furtherRightToWorkCheckExpiryDate must be a valid date (YYYY-MM-DD)' })
    furtherRightToWorkCheckExpiryDate?: string | null;

    @IsOptional()
    @Transform(({ value }) =>
        value === '' || value === null || value === undefined ? undefined : Number(value),
    )
    @IsInt()
    @Min(0)
    annualLeaveAllowanceDays?: number;
}
