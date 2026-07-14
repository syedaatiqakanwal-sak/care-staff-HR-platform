export type DocumentExpiryStatus = 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'NO_EXPIRY';

export type StaffDocumentType =
  | 'PASSPORT'
  | 'DRIVING_LICENCE'
  | 'RIGHT_TO_WORK'
  | 'BRP'
  | 'VISA'
  | 'DBS_CERTIFICATE'
  | 'DBS_DECLARATION'
  | 'ADDRESS_PROOF'
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
  renewalStatus?: DocumentExpiryStatus;
  daysUntilRenewal?: number | null;
}

export const DOCUMENT_TYPE_OPTIONS: { value: StaffDocumentType; label: string }[] = [
  { value: 'PASSPORT', label: 'Passport' },
  { value: 'DRIVING_LICENCE', label: 'Driving licence' },
  { value: 'RIGHT_TO_WORK', label: 'Right to work' },
  { value: 'BRP', label: 'BRP' },
  { value: 'VISA', label: 'Visa' },
  { value: 'DBS_CERTIFICATE', label: 'DBS certificate' },
  { value: 'DBS_DECLARATION', label: 'DBS declaration form' },
  { value: 'ADDRESS_PROOF', label: 'Proof of address' },
  { value: 'HMRC', label: 'HMRC' },
  { value: 'P45', label: 'P45' },
  { value: 'P60', label: 'P60' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'OTHER', label: 'Other' },
];
