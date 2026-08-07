import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsBoolean()
  dailyEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  weeklyEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  monthlyEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  maxDaily?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(104)
  maxWeekly?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  maxMonthly?: number;

  @IsOptional()
  @IsBoolean()
  r2Enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  r2AutoUpload?: boolean;

  @IsOptional()
  @IsBoolean()
  deleteLocalAfterR2?: boolean;
}
