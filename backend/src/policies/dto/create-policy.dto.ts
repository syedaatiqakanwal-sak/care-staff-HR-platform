import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreatePolicyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    if (value === 'true' || value === true || value === '1') return true;
    if (value === 'false' || value === false || value === '0') return false;
    return value;
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

