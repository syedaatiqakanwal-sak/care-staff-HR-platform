export type EmploymentStatus = 'APPLICANT' | 'ON_SHADOW' | 'ACTIVE' | 'LEAVER';

export const EMPLOYMENT_STATUS_OPTIONS: { value: EmploymentStatus; label: string }[] = [
  { value: 'APPLICANT', label: 'Applicant' },
  { value: 'ON_SHADOW', label: 'On shadow' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'LEAVER', label: 'Leaver' },
];

export function employmentStatusLabel(status?: string | null): string {
  switch (status) {
    case 'APPLICANT':
      return 'Applicant';
    case 'ON_SHADOW':
      return 'On shadow';
    case 'ACTIVE':
      return 'Active';
    case 'LEAVER':
      return 'Leaver';
    case 'Active':
      return 'Active';
    case 'Left':
      return 'Leaver';
    default:
      return status ? String(status).replace(/_/g, ' ') : 'Active';
  }
}

export function employmentStatusBadgeColor(status?: string | null): string {
  switch (status) {
    case 'APPLICANT':
      return 'yellow';
    case 'ON_SHADOW':
      return 'violet';
    case 'ACTIVE':
    case 'Active':
      return 'green';
    case 'LEAVER':
    case 'Left':
      return 'gray';
    default:
      return 'blue';
  }
}
