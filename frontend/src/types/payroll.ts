export type PayType = 'SALARY' | 'HOURLY';

export interface PayrollInfoDto {
  id: string;
  staffId: string;
  salaryOrRate: string | null;
  payType: PayType | null;
  contractType: string | null;
  pensionStatus: string | null;
  bankDetailsMasked: string | null;
  hasBankDetails: boolean;
  payrollNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export const PAY_TYPE_OPTIONS = [
  { value: 'SALARY', label: 'Salary' },
  { value: 'HOURLY', label: 'Hourly rate' },
] as const;

export const PAYROLL_DOC_TYPES = [
  { value: 'HMRC', label: 'HMRC' },
  { value: 'P45', label: 'P45' },
  { value: 'P60', label: 'P60' },
] as const;
