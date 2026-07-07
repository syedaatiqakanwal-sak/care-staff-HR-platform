import { IsISO8601, IsOptional } from 'class-validator';

export class UpdatePolicySessionDto {
  @IsISO8601()
  endTime: string;

  // Optional - backend recalculates from timestamps for security
  @IsOptional()
  durationSeconds?: number;

  // Optional - backend sets status to COMPLETED automatically
  @IsOptional()
  status?: 'COMPLETED';
}

