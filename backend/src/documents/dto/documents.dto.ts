import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { StaffDocumentType } from '../staff-document.entity';

export class CreateStaffDocumentDto {
  @IsEnum(StaffDocumentType)
  documentType: StaffDocumentType;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;
}

export class CreateDbsRecordDto {
  @IsString()
  @MaxLength(64)
  dbsNumber: string;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsDateString()
  renewalDate?: string;

  @IsOptional()
  @IsDateString()
  nextDeclarationDate?: string;

  @IsOptional()
  @IsBoolean()
  updateServiceStatus?: boolean;

  @IsOptional()
  @IsUUID()
  certificateDocumentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  dbsCertificateNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  enrolledDate?: string;
}

export class UpdateDbsRecordDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  dbsNumber?: string;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsDateString()
  renewalDate?: string;

  @IsOptional()
  @IsDateString()
  nextDeclarationDate?: string | null;

  @IsOptional()
  @IsBoolean()
  updateServiceStatus?: boolean;

  @IsOptional()
  @IsUUID()
  certificateDocumentId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  dbsCertificateNumber?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  enrolledDate?: string | null;
}

export class UpdateRightToWorkDto {
  @IsOptional()
  @IsDateString()
  visaExpiryDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  shareCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  rightToWorkStatus?: string | null;
}
