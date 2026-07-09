export type HrCaseNoteCategory =
  | 'POSITIVE_FEEDBACK'
  | 'COMPLAINT'
  | 'INVESTIGATION'
  | 'DISCIPLINARY'
  | 'GRIEVANCE'
  | 'RETURN_TO_WORK'
  | 'SICKNESS'
  | 'CONDUCT'
  | 'SAFEGUARDING';

export interface HrCaseNoteDto {
  id: string;
  staffId: string;
  category: HrCaseNoteCategory;
  title: string;
  body: string;
  confidential: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  authorEmail?: string;
}

export const HR_NOTE_CATEGORIES: { value: HrCaseNoteCategory; label: string }[] = [
  { value: 'POSITIVE_FEEDBACK', label: 'Positive feedback' },
  { value: 'COMPLAINT', label: 'Complaint' },
  { value: 'INVESTIGATION', label: 'Investigation' },
  { value: 'DISCIPLINARY', label: 'Disciplinary' },
  { value: 'GRIEVANCE', label: 'Grievance' },
  { value: 'RETURN_TO_WORK', label: 'Return to work' },
  { value: 'SICKNESS', label: 'Sickness' },
  { value: 'CONDUCT', label: 'Conduct' },
  { value: 'SAFEGUARDING', label: 'Safeguarding' },
];
