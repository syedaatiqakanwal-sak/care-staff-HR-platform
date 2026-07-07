import { IsString, IsUUID, IsDateString, IsObject, IsOptional } from 'class-validator';

export class CreatePlanDto {
    @IsUUID()
    userId: string;

    @IsString()
    planType: string;

    @IsDateString()
    startDate: string;

    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;
}
