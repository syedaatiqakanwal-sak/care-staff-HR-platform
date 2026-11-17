export const THIRD_MONTH_SUBTYPE = '3rd Month';
export const SIXTH_MONTH_SUBTYPE = '6 Month';
export const EIGHTH_MONTH_SUBTYPE = '8 Month';
export const NINTH_MONTH_SUBTYPE = '9 Month';
export const GENERAL_PROGRESS_SUBTYPE = 'General Employment Progress Review';

export const DEFAULT_RECOMMEND_LABEL = 'Recommended for further period of review';

export const NINTH_MONTH_DOC_LABEL =
    'Check that all employment, training and staff documentation is complete and up to date.';

export const THIRD_MONTH_DOC_LABEL =
    'Check that all employment, training and staff documentation is complete and up to date. Add comments where required:';

export const THIRD_MONTH_GRADE_INSTRUCTION =
    'For the following areas, please grade each section from 1- 4 (1 poor, 2 below average, 3 good and 4 excellent) and explain your reason for the scoring.';

export const SIXTH_MONTH_GRADE_INSTRUCTION =
    'For the following areas please grade each section from 1-4 (1 poor, 2 below average, 3 good and 4 excellent) and explain your reason for the scoring.';

export const THIRD_MONTH_REASON_LABEL = 'Reason for the scoring:';

export type GradeSlot = 'job' | 'training' | 'communication' | 'attendance' | 'extra1' | 'extra2' | 'extra3' | 'extra4';

export type EmploymentReviewLayout = {
    docLabel: string;
    instruction: string;
    reasonLabel: string;
    reasonsLabel: string;
    recommendLabel?: string;
    grades: { label: string; slot: GradeSlot }[];
};

export const EMPLOYMENT_REVIEW_LAYOUTS: Record<string, EmploymentReviewLayout> = {
    [THIRD_MONTH_SUBTYPE]: {
        docLabel: THIRD_MONTH_DOC_LABEL,
        instruction: THIRD_MONTH_GRADE_INSTRUCTION,
        reasonLabel: THIRD_MONTH_REASON_LABEL,
        reasonsLabel: 'State reasons, and period of review:',
        grades: [
            { label: 'Overall work performance', slot: 'job' },
            { label: 'Quality and safety of care provided', slot: 'training' },
            { label: 'Following care plans, risk assessments and policies', slot: 'communication' },
            { label: 'Safeguarding awareness and reporting', slot: 'attendance' },
            { label: 'Communication with service users and families', slot: 'extra1' },
            { label: 'Attendance and timekeeping', slot: 'extra2' },
        ],
    },
    [SIXTH_MONTH_SUBTYPE]: {
        docLabel: THIRD_MONTH_DOC_LABEL,
        instruction: SIXTH_MONTH_GRADE_INSTRUCTION,
        reasonLabel: THIRD_MONTH_REASON_LABEL,
        reasonsLabel: 'State reasons and period of review:',
        grades: [
            { label: 'Overall work performance', slot: 'job' },
            { label: 'Training and competency', slot: 'training' },
            { label: 'Quality and safety of care provided', slot: 'communication' },
            { label: 'Following care plans, risk assessments and policies', slot: 'attendance' },
            { label: 'Team-working and communication', slot: 'extra1' },
            { label: 'Attendance performance', slot: 'extra2' },
        ],
    },
    [EIGHTH_MONTH_SUBTYPE]: {
        docLabel: THIRD_MONTH_DOC_LABEL,
        instruction: SIXTH_MONTH_GRADE_INSTRUCTION,
        reasonLabel: THIRD_MONTH_REASON_LABEL,
        reasonsLabel: 'State reasons, and period of review:',
        grades: [
            { label: 'Overall work performance', slot: 'job' },
            { label: 'Quality and safety of care provided', slot: 'training' },
            { label: 'Professional conduct and reliability', slot: 'communication' },
            { label: 'Communication with service users and families', slot: 'attendance' },
            { label: 'Safeguarding awareness and reporting', slot: 'extra1' },
            { label: 'Attendance and timekeeping', slot: 'extra2' },
        ],
    },
    [NINTH_MONTH_SUBTYPE]: {
        docLabel: NINTH_MONTH_DOC_LABEL,
        instruction: SIXTH_MONTH_GRADE_INSTRUCTION,
        reasonLabel: THIRD_MONTH_REASON_LABEL,
        reasonsLabel: 'State reasons, and period of review:',
        grades: [
            { label: 'Overall work performance', slot: 'job' },
            { label: 'Quality and safety of care provided', slot: 'training' },
            { label: 'Person-centred care, dignity and respect', slot: 'communication' },
            { label: 'Training and competency', slot: 'attendance' },
            { label: 'Team-working and communication with colleagues', slot: 'extra1' },
            { label: 'Record keeping and documentation', slot: 'extra2' },
            { label: 'Professional conduct and boundaries', slot: 'extra3' },
            { label: 'Reliability and willingness to take responsibility', slot: 'extra4' },
        ],
    },
    [GENERAL_PROGRESS_SUBTYPE]: {
        docLabel: 'Check that all documentation is complete and add comments here:',
        instruction: SIXTH_MONTH_GRADE_INSTRUCTION,
        reasonLabel: THIRD_MONTH_REASON_LABEL,
        reasonsLabel: 'State reasons, and period of review:',
        recommendLabel: 'Recommended for a further period of review',
        grades: [
            { label: 'Job Performance', slot: 'job' },
            { label: 'Training and Development', slot: 'training' },
            { label: 'Communication Skills', slot: 'communication' },
            { label: 'Attendance and Punctuality', slot: 'attendance' },
        ],
    },
};

export function getEmploymentReviewLayout(formSubType: string): EmploymentReviewLayout | null {
    return EMPLOYMENT_REVIEW_LAYOUTS[formSubType] || null;
}

export function isThirdMonthReview(formSubType: string) {
    return formSubType === THIRD_MONTH_SUBTYPE;
}

export type ThirdMonthExtra = {
    familiesGrade: string;
    familiesComment: string;
    timekeepingGrade: string;
    timekeepingComment: string;
    extra3Grade: string;
    extra3Comment: string;
    extra4Grade: string;
    extra4Comment: string;
};

export const emptyThirdMonthExtra = (): ThirdMonthExtra => ({
    familiesGrade: '',
    familiesComment: '',
    timekeepingGrade: '',
    timekeepingComment: '',
    extra3Grade: '',
    extra3Comment: '',
    extra4Grade: '',
    extra4Comment: '',
});

type StoredDoc = {
    kind: 'third-month' | 'employment-review';
    documentation: string;
    familiesGrade: string;
    familiesComment: string;
    timekeepingGrade: string;
    timekeepingComment: string;
    extra3Grade: string;
    extra3Comment: string;
    extra4Grade: string;
    extra4Comment: string;
};

export function packThirdMonthDocumentation(documentation: string, extra: ThirdMonthExtra): string {
    const payload: StoredDoc = {
        kind: 'employment-review',
        documentation: documentation || '',
        familiesGrade: extra.familiesGrade || '',
        familiesComment: extra.familiesComment || '',
        timekeepingGrade: extra.timekeepingGrade || '',
        timekeepingComment: extra.timekeepingComment || '',
        extra3Grade: extra.extra3Grade || '',
        extra3Comment: extra.extra3Comment || '',
        extra4Grade: extra.extra4Grade || '',
        extra4Comment: extra.extra4Comment || '',
    };
    return JSON.stringify(payload);
}

export function unpackThirdMonthDocumentation(raw: string | null | undefined): {
    documentation: string;
    extra: ThirdMonthExtra;
} {
    const extra = emptyThirdMonthExtra();
    if (!raw) return { documentation: '', extra };
    if (!raw.trim().startsWith('{')) return { documentation: raw, extra };
    try {
        const parsed = JSON.parse(raw) as Partial<StoredDoc>;
        if (parsed.kind !== 'third-month' && parsed.kind !== 'employment-review') return { documentation: raw, extra };
        return {
            documentation: parsed.documentation || '',
            extra: {
                familiesGrade: parsed.familiesGrade || '',
                familiesComment: parsed.familiesComment || '',
                timekeepingGrade: parsed.timekeepingGrade || '',
                timekeepingComment: parsed.timekeepingComment || '',
                extra3Grade: parsed.extra3Grade || '',
                extra3Comment: parsed.extra3Comment || '',
                extra4Grade: parsed.extra4Grade || '',
                extra4Comment: parsed.extra4Comment || '',
            },
        };
    } catch {
        return { documentation: raw, extra };
    }
}
