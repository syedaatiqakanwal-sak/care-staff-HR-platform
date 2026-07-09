import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { HrCaseNoteCategory } from '../hr-case-note-category.enum';

export class CreateHrCaseNoteDto {
  @IsEnum(HrCaseNoteCategory)
  category: HrCaseNoteCategory;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @IsString()
  @MinLength(1)
  body: string;

  @IsOptional()
  @IsBoolean()
  confidential?: boolean;
}

export class UpdateHrCaseNoteDto {
  @IsOptional()
  @IsEnum(HrCaseNoteCategory)
  category?: HrCaseNoteCategory;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  body?: string;

  @IsOptional()
  @IsBoolean()
  confidential?: boolean;
}

export class HrCaseNoteIdParamDto {
  @IsUUID()
  noteId: string;
}
