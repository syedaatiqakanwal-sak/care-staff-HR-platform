export type LeaveType = 'ANNUAL' | 'SICK' | 'UNPAID' | 'EMERGENCY';
export type LeaveStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED';
export type AttendanceStatus = 'PRESENT' | 'LATE' | 'NO_SHOW' | 'ABSENT';

export interface LeaveBalanceDto {
  allowanceDays: number;
  usedDays: number;
  remainingDays: number;
  year: number;
}

export interface LeaveRecordDto {
  id: string;
  staffId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  status: LeaveStatus;
  reason: string | null;
  approvedBy: string | null;
  days: number;
  createdAt: string;
  updatedAt: string;
  staffName?: string;
  staffUserId?: string;
  approverEmail?: string;
}

export interface AttendanceRecordDto {
  id: string;
  staffId: string;
  date: string;
  status: AttendanceStatus;
  notes: string | null;
  returnToWorkCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export const LEAVE_TYPE_OPTIONS = [
  { value: 'ANNUAL', label: 'Annual leave' },
  { value: 'SICK', label: 'Sick leave' },
  { value: 'UNPAID', label: 'Unpaid leave' },
  { value: 'EMERGENCY', label: 'Emergency leave' },
] as const;

export const ATTENDANCE_STATUS_OPTIONS = [
  { value: 'PRESENT', label: 'Present' },
  { value: 'LATE', label: 'Late' },
  { value: 'NO_SHOW', label: 'No show' },
  { value: 'ABSENT', label: 'Absent' },
] as const;
