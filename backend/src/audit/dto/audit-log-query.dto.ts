import { IsOptional, IsString, IsUUID, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class AuditLogQueryDto {
  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsUUID()
  entityId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
