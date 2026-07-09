import {
  IsBoolean,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';

export class UpdateRecruitmentDto {
  @IsOptional()
  @IsBoolean()
  interviewRecorded?: boolean;

  @IsOptional()
  @IsDateString()
  interviewRecordedDate?: string | null;

  @IsOptional()
  @IsBoolean()
  offerLetterIssued?: boolean;

  @IsOptional()
  @IsDateString()
  offerLetterIssuedDate?: string | null;

  @IsOptional()
  @IsBoolean()
  contractIssued?: boolean;

  @IsOptional()
  @IsDateString()
  contractIssuedDate?: string | null;

  @IsOptional()
  @IsBoolean()
  contractSigned?: boolean;

  @IsOptional()
  @IsDateString()
  contractSignedDate?: string | null;

  @IsOptional()
  @IsBoolean()
  inductionCompleted?: boolean;

  @IsOptional()
  @IsDateString()
  inductionCompletedDate?: string | null;

  @IsOptional()
  @IsBoolean()
  shadowStarted?: boolean;

  @IsOptional()
  @IsDateString()
  shadowStartDate?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
