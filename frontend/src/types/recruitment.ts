export interface RecruitmentRecordDto {
  id: string;
  staffId: string;
  interviewRecorded: boolean;
  interviewRecordedDate: string | null;
  offerLetterIssued: boolean;
  offerLetterIssuedDate: string | null;
  contractIssued: boolean;
  contractIssuedDate: string | null;
  contractSigned: boolean;
  contractSignedDate: string | null;
  inductionCompleted: boolean;
  inductionCompletedDate: string | null;
  shadowStarted: boolean;
  shadowStartDate: string | null;
  shadowEndDate: string | null;
  notes: string | null;
}

export type RecruitmentChecklistKey =
  | 'interviewRecorded'
  | 'offerLetterIssued'
  | 'contractIssued'
  | 'contractSigned'
  | 'inductionCompleted'
  | 'shadowStarted';
