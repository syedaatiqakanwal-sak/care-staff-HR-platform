import { IsString, IsUUID, IsDateString, IsObject, IsOptional } from 'class-validator';

export class CreateReminderDto {
    @IsUUID()
    userId: string;

    @IsOptional()
    @IsString()
    type?: string;

    @IsOptional()
    @IsString()
    message?: string;

    @IsDateString()
    scheduledAt: string;

    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;
}
