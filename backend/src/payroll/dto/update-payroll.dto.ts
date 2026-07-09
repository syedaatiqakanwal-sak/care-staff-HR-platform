import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PayType } from '../pay-type.enum';

export class UpdatePayrollDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  salaryOrRate?: string | null;

  @IsOptional()
  @IsEnum(PayType)
  payType?: PayType | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  contractType?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  pensionStatus?: string | null;

  /** Plaintext bank details — encrypted before persistence. Omit to leave unchanged. */
  @IsOptional()
  @IsString()
  @MinLength(1)
  bankDetails?: string | null;

  @IsOptional()
  @IsString()
  payrollNotes?: string | null;
}
