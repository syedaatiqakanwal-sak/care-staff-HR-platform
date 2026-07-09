import { IsOptional, IsString, IsIn, ValidateIf } from 'class-validator';

export class UpdateInHouseTrainingDto {
    @IsOptional()
    @ValidateIf((_, value) => value !== null)
    @IsString()
    enrollmentDate?: string | null;

    @IsOptional()
    @ValidateIf((_, value) => value !== null)
    @IsString()
    completionDate?: string | null;

    @IsOptional()
    @ValidateIf((_, value) => value !== null)
    @IsIn(['enrolled', 'progressing', 'completed'])
    status?: string | null;
}
