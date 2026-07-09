import { StaffDocumentType } from '../documents/staff-document.entity';

export const PAYROLL_DOCUMENT_TYPES: StaffDocumentType[] = [
  StaffDocumentType.HMRC,
  StaffDocumentType.P45,
  StaffDocumentType.P60,
];

export function isPayrollDocumentType(type: string): boolean {
  return PAYROLL_DOCUMENT_TYPES.includes(type as StaffDocumentType);
}
