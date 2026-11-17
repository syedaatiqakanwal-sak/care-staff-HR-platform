export type DocumentExpiryStatus = 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'NO_EXPIRY';

export type StaffDocumentType =
  | 'PASSPORT'
  | 'DRIVING_LICENCE'
  | 'RIGHT_TO_WORK'
  | 'SHARE_CODE'
  | 'FURTHER_RIGHT_TO_WORK'
  | 'FURTHER_SHARE_CODE'
  | 'BRP'
  | 'VISA'
  | 'DBS_CERTIFICATE'
  | 'DBS_DECLARATION'
  | 'ADDRESS_PROOF'
  | 'ADDRESS_PROOF_1'
  | 'ADDRESS_PROOF_2'
  | 'NATIONAL_INSURANCE'
  | 'UNIVERSITY_TEMS_LETTER'
  | 'HMRC'
  | 'P45'
  | 'P60'
  | 'CONTRACT'
  | 'OTHER';

export interface StaffDocumentDto {
  id: string;
  staffId: string;
  documentType: StaffDocumentType;
  fileName: string;
  filePath: string;
  issueDate: string | null;
  expiryDate: string | null;
  notes: string | null;
  expiryStatus: DocumentExpiryStatus;
  daysUntilExpiry: number | null;
  createdAt: string;
}

export interface DbsRecordDto {
  id: string;
  staffId: string;
  dbsNumber: string;
  issueDate: string | null;
  renewalDate: string | null;
  nextDeclarationDate: string | null;
  updateServiceStatus: boolean;
  certificateDocumentId: string | null;
  dbsCertificateNumber?: string | null;
  enrolledDate?: string | null;
  dateForNextChecking?: string | null;
  nextCheckDueDate?: string | null;
  renewalStatus?: DocumentExpiryStatus;
  daysUntilRenewal?: number | null;
}

export const DOCUMENT_TYPE_OPTIONS: { value: StaffDocumentType; label: string }[] = [
  { value: 'PASSPORT', label: 'Passport' },
  { value: 'DRIVING_LICENCE', label: 'Full Driving Licence' },
  { value: 'RIGHT_TO_WORK', label: 'Right to work' },
  { value: 'SHARE_CODE', label: 'Share code document' },
  { value: 'FURTHER_RIGHT_TO_WORK', label: 'Further right to work' },
  { value: 'FURTHER_SHARE_CODE', label: 'Further share code document' },
  { value: 'NATIONAL_INSURANCE', label: 'National Insurance Number' },
  { value: 'ADDRESS_PROOF_1', label: 'Proof of Address 1' },
  { value: 'ADDRESS_PROOF_2', label: 'Proof of Address 2' },
  { value: 'VISA', label: 'Visa Where Applicable' },
  { value: 'UNIVERSITY_TEMS_LETTER', label: 'University Tems Letter' },
  { value: 'BRP', label: 'BRP' },
  { value: 'ADDRESS_PROOF', label: 'Proof of address' },
  { value: 'DBS_CERTIFICATE', label: 'DBS certificate' },
  { value: 'DBS_DECLARATION', label: 'DBS declaration form' },
  { value: 'HMRC', label: 'HMRC' },
  { value: 'P45', label: 'P45' },
  { value: 'P60', label: 'P60' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'OTHER', label: 'Other' },
];

const FURTHER_UPLOAD_HIDDEN_TYPES = new Set<StaffDocumentType>([
  'PASSPORT',
  'RIGHT_TO_WORK',
  'SHARE_CODE',
  'FURTHER_RIGHT_TO_WORK',
  'FURTHER_SHARE_CODE',
  'DBS_CERTIFICATE',
  'DBS_DECLARATION',
  'ADDRESS_PROOF',
]);

export const FURTHER_DOCUMENT_TYPE_OPTIONS = DOCUMENT_TYPE_OPTIONS.filter(
  (opt) => !FURTHER_UPLOAD_HIDDEN_TYPES.has(opt.value),
);

export function documentTypeLabel(type: string): string {
  return DOCUMENT_TYPE_OPTIONS.find((opt) => opt.value === type)?.label ?? type.replace(/_/g, ' ');
}
