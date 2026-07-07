import { IsString, IsNotEmpty, IsOptional, IsDateString, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateReviewFormDto {
    @IsString()
    @IsNotEmpty()
    formType: string;

    @IsString()
    @IsNotEmpty()
    formSubType: string;

    @IsString()
    @IsNotEmpty()
    staffName: string;

    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
    @ValidateIf((o) => o.startDate !== undefined && o.startDate !== null && o.startDate !== '')
    @IsDateString()
    startDate?: string;

    @IsDateString()
    @IsNotEmpty()
    dateOfReview: string;

    @IsOptional()
    @IsString()
    documentationComments?: string;

    @IsOptional()
    @IsString()
    jobPerformanceGrade?: string;

    @IsOptional()
    @IsString()
    jobPerformanceReason?: string;

    @IsOptional()
    @IsString()
    trainingDevelopmentGrade?: string;

    @IsOptional()
    @IsString()
    trainingDevelopmentReason?: string;

    @IsOptional()
    @IsString()
    communicationSkillsGrade?: string;

    @IsOptional()
    @IsString()
    communicationSkillsReason?: string;

    @IsOptional()
    @IsString()
    attendancePunctualityGrade?: string;

    @IsOptional()
    @IsString()
    attendancePunctualityReason?: string;

    @IsOptional()
    @IsString()
    recommendedForReview?: string;

    @IsOptional()
    @IsString()
    reviewReasons?: string;

    @IsOptional()
    @IsString()
    careStaffSignature?: string;

    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
    @ValidateIf((o) => o.careStaffDate !== undefined && o.careStaffDate !== null && o.careStaffDate !== '')
    @IsDateString()
    careStaffDate?: string;

    @IsOptional()
    @IsString()
    reviewerSignature?: string;

    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
    @ValidateIf((o) => o.reviewerDate !== undefined && o.reviewerDate !== null && o.reviewerDate !== '')
    @IsDateString()
    reviewerDate?: string;
}
