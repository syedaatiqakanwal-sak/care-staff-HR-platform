import type { ReactNode } from 'react';
import { Badge, Box, Group, SimpleGrid, Stack, Table, Text } from '@mantine/core';

const BRAND = {
  personal: {
    accent: '#139639',
    accentDark: '#0e7a2d',
    soft: '#F4FBF6',
    line: '#D7E8DC',
    label: '#1B3D28',
  },
  professional: {
    accent: '#267FBA',
    accentDark: '#1a5f8a',
    soft: '#F3F8FC',
    line: '#D3E4F2',
    label: '#16324A',
  },
} as const;

const POSITION_APPLIED = 'Care Assistant (CARE Staff)';

const PERSONAL_CRITERIA = [
  'Dignity and respect',
  'Hard-working',
  'Honest and Trustworthy',
  'Compassion and empathy',
  'Motivation, commitment and attitude',
  'Attitude',
  'Relationship with others',
  'Caring and Friendly',
  'Ability to engage others',
];

const PROFESSIONAL_CRITERIA_A = [
  'Attendance Record',
  'Dignity and respect',
  'Compassion, empathy, ability to empower others',
  'Motivation, commitment and attitude to work',
  'Learning and development interest',
  'Team working ability',
  'Lone working. Ability to work on Own initiative',
];

const PROFESSIONAL_CRITERIA_B = [
  'Understanding and compliance with quality and safety',
  'Attitude',
  'Relationship with Colleagues & Peers',
  'Ability to engage with clients, service users & their families',
  'Overall contribution as a member of staff',
];

const PERSONAL_RATINGS = ['Excellent', 'Good', 'Average', 'Unable to comment'];
const PROFESSIONAL_RATINGS_A = ['Excellent', 'Good', 'Average', 'Unable to Comment'];
const PROFESSIONAL_RATINGS_B = ['Excellent', 'Good', 'Average', 'Unable to comment'];

function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'boolean') return false;
  return String(value).trim().length === 0;
}

function RadioMark({ selected, color }: { selected: boolean; color: string }) {
  return (
    <span
      aria-hidden
      style={{
        width: 18,
        height: 18,
        borderRadius: '50%',
        border: `2px solid ${selected ? color : '#C5CED6'}`,
        display: 'inline-grid',
        placeItems: 'center',
        background: '#fff',
        flexShrink: 0,
      }}
    >
      {selected && (
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: color,
          }}
        />
      )}
    </span>
  );
}

function Answer({
  label,
  value,
  multiline,
}: {
  label: string;
  value: unknown;
  multiline?: boolean;
}) {
  const empty = isBlank(value);
  return (
    <Box>
      <Text size="sm" fw={600} mb={6} c="#1A1D21" style={{ lineHeight: 1.4 }}>
        {label}
      </Text>
      <Box
        px={12}
        py={multiline ? 10 : 8}
        style={{
          minHeight: multiline ? 88 : 40,
          borderRadius: 6,
          border: `1px solid ${empty ? '#F0D3A8' : '#DEE2E6'}`,
          background: empty ? '#FFF9F2' : '#F8F9FA',
        }}
      >
        <Text
          size="sm"
          fw={empty ? 500 : 600}
          c={empty ? '#9A6B3A' : '#1A1D21'}
          fs={empty ? 'italic' : undefined}
          style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}
        >
          {empty ? 'Not provided' : String(value).trim()}
        </Text>
      </Box>
    </Box>
  );
}

function YesNoAnswer({
  label,
  value,
  color,
  detailsLabel,
  details,
}: {
  label: string;
  value: boolean | null | undefined;
  color: string;
  detailsLabel?: string;
  details?: unknown;
}) {
  const yes = value === true;
  const no = value === false;
  return (
    <Box>
      <Text size="sm" fw={600} mb={8} c="#1A1D21" style={{ lineHeight: 1.45 }}>
        {label}
      </Text>
      <Group gap="lg">
        <Group gap={8}>
          <RadioMark selected={yes} color={color} />
          <Text size="sm" fw={yes ? 700 : 500}>
            Yes
          </Text>
        </Group>
        <Group gap={8}>
          <RadioMark selected={no} color="#C0392B" />
          <Text size="sm" fw={no ? 700 : 500}>
            No
          </Text>
        </Group>
        {!yes && !no && (
          <Text size="sm" fs="italic" c="#9A6B3A">
            Not provided
          </Text>
        )}
      </Group>
      {detailsLabel && (yes || no) && (
        <Box mt="sm">
          <Answer label={detailsLabel} value={details} multiline />
        </Box>
      )}
    </Box>
  );
}

function ratingsMatch(stored: unknown, option: string): boolean {
  return String(stored || '').trim().toLowerCase() === option.trim().toLowerCase();
}

function CriteriaGrid({
  title,
  criteria,
  ratings,
  options,
  color,
}: {
  title: string;
  criteria: string[];
  ratings: Record<string, string>;
  options: string[];
  color: string;
}) {
  return (
    <Box>
      <Text size="sm" fw={600} mb="sm" c="#1A1D21">
        {title}
      </Text>
      <Box style={{ overflowX: 'auto' }}>
        <Table
          withTableBorder
          withColumnBorders
          verticalSpacing={8}
          horizontalSpacing="sm"
          style={{ minWidth: 640, borderColor: '#DEE2E6' }}
        >
          <Table.Thead>
            <Table.Tr style={{ background: '#F8F9FA' }}>
              <Table.Th style={{ color: '#1A1D21', fontWeight: 700 }}>Criteria</Table.Th>
              {options.map((option) => (
                <Table.Th
                  key={option}
                  style={{ color: '#1A1D21', fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap' }}
                >
                  {option}
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {criteria.map((criterion) => {
              const stored = ratings[criterion];
              const answered = !isBlank(stored);
              const known = options.some((option) => ratingsMatch(stored, option));
              return (
                <Table.Tr key={criterion} style={answered ? undefined : { background: '#FFF9F2' }}>
                  <Table.Td>
                    <Text size="sm" fw={600}>
                      {criterion}
                    </Text>
                    {!answered && (
                      <Text size="xs" fs="italic" c="#9A6B3A" mt={2}>
                        Not answered
                      </Text>
                    )}
                    {answered && !known && (
                      <Text size="xs" c="dimmed" mt={2}>
                        Recorded: {String(stored)}
                      </Text>
                    )}
                  </Table.Td>
                  {options.map((option) => (
                    <Table.Td key={option} style={{ textAlign: 'center' }}>
                      <RadioMark selected={ratingsMatch(stored, option)} color={color} />
                    </Table.Td>
                  ))}
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Box>
    </Box>
  );
}

function Section({ children }: { children: ReactNode }) {
  return (
    <Box px="lg" py="md" style={{ borderTop: '1px solid #E6EBF0' }}>
      {children}
    </Box>
  );
}

export type ReferenceSubmissionViewProps = {
  referenceType?: string | null;
  candidateName: string;
  refereeName?: string | null;
  refereeEmail?: string | null;
  submittedAtLabel: string;
  submissionData?: Record<string, any> | null;
};

export function ReferenceSubmissionView({
  referenceType,
  candidateName,
  refereeName,
  refereeEmail,
  submittedAtLabel,
  submissionData,
}: ReferenceSubmissionViewProps) {
  const isPersonal = referenceType === 'personal';
  const theme = isPersonal ? BRAND.personal : BRAND.professional;
  const typeTitle = isPersonal ? 'CHARACTER REFERENCE REQUEST FORM' : 'PROFESSIONAL REFERENCE REQUEST FORM';
  const data = submissionData || {};
  const ratings: Record<string, string> =
    data.criteriaRatings && typeof data.criteriaRatings === 'object' ? data.criteriaRatings : {};

  const currentCriteria = isPersonal
    ? PERSONAL_CRITERIA
    : [...PROFESSIONAL_CRITERIA_A, ...PROFESSIONAL_CRITERIA_B];
  const extraRatings = Object.keys(ratings).filter((key) => !currentCriteria.includes(key));

  const missing: string[] = [];
  const mark = (label: string, value: unknown) => {
    if (isBlank(value)) missing.push(label);
  };

  if (submissionData) {
    if (isPersonal) {
      mark('Relation to the Candidate', data.relationship);
      mark('How long have you known the Candidate', data.yearsKnown);
      mark("Views on the person's ability to work in this role", data.comments);
      mark('Comments', data.additionalComments);
      mark('Referee signature', data.signature);
      mark('Date', data.signatureDate);
      mark('Telephone No', data.telephone);
      mark('Your Position', data.position);
    } else {
      mark('Position(s) Held at your Organisation', data.positionHeld);
      mark('Employment start date', data.employmentStartDate);
      mark('Final Salary', data.finalSalary);
      mark('Employment end date', data.employmentEndDate);
      mark('Main Duties / Responsibilities', data.mainDuties);
      mark('Capacity in which Candidate is known', data.relationship);
      mark('How long have you known the Candidate', data.yearsKnown);
      mark('Reason for leaving', data.reasonForLeaving);
      mark('Performance management / safeguarding / disciplinary action', data.performanceManagement);
      if (data.performanceManagement === true) {
        mark('Performance management details', data.performanceManagementDetails);
      }
      mark('Would you employ the Candidate again', data.wouldEmployAgain);
      if (data.wouldEmployAgain === false) {
        mark('Reason you would not employ again', data.wouldEmployAgainDetails);
      }
      mark('Honest and trustworthy', data.honestTrustworthy);
      mark('Reliable / trustworthy in carrying out duties', data.reliableTrustworthy);
      mark('Attendance / timekeeping acceptable', data.attendanceTimekeeping);
      mark('Suitable person to undertake this post', data.suitableForPost);
      mark('Additional comments', data.additionalComments);
      mark('Referee signature', data.signature);
      mark('Date', data.signatureDate);
      mark('Company Name', data.companyName);
      mark('Company Address', data.companyAddress);
      mark('Telephone No', data.telephone);
      mark('Your Position', data.position);
    }
    currentCriteria.forEach((criterion) => {
      if (isBlank(ratings[criterion])) missing.push(criterion);
    });
  }

  return (
    <Box
      style={{
        border: `1px solid ${theme.line}`,
        borderRadius: 10,
        overflow: 'hidden',
        background: '#fff',
      }}
    >
      <Box
        px="lg"
        py="md"
        style={{
          background: `linear-gradient(135deg, ${theme.accent} 0%, ${theme.accentDark} 100%)`,
        }}
      >
        <Group justify="space-between" align="flex-end" wrap="wrap" gap="sm">
          <Box>
            <Text fw={800} c="white" size="xl" style={{ letterSpacing: '0.04em' }}>
              LETS CARE ALL
            </Text>
            <Text size="sm" c="rgba(255,255,255,0.92)" mt={2}>
              {typeTitle}
            </Text>
          </Box>
          <Stack gap={6} align="flex-end">
            <Text size="xs" c="white" fw={600}>
              Submitted {submittedAtLabel || 'date not available'}
            </Text>
            {submissionData && (
              <Badge
                variant="filled"
                color={missing.length > 0 ? 'orange' : 'teal'}
                style={{ background: missing.length > 0 ? '#E8A317' : '#0E7A4B' }}
              >
                {missing.length > 0 ? `${missing.length} left blank` : 'All fields completed'}
              </Badge>
            )}
          </Stack>
        </Group>
      </Box>

      <Box px="lg" py="md" style={{ background: theme.soft }}>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <Answer label="Name of Referee" value={refereeName} />
          <Answer label="Candidate Name" value={candidateName} />
          <Answer
            label={isPersonal ? 'Position Applied For' : 'Position Applied for'}
            value={POSITION_APPLIED}
          />
        </SimpleGrid>
        {isPersonal && (
          <Text size="sm" mt="md" c="#3C4650" style={{ lineHeight: 1.6 }}>
            The above person has applied for the Care Worker position and has named you as a character referee. I would be grateful if you could express your opinion on the suitability of the Candidate for the specified post. Your reply will be kept in line with Data Protection Policies and the General Data Protection Regulation.
          </Text>
        )}
      </Box>

      {!submissionData ? (
        <Section>
          <Text size="sm" fs="italic" c="#9A6B3A">
            No submission data available for this reference.
          </Text>
        </Section>
      ) : (
        <>
          <Section>
            {!isPersonal && (
              <Text fw={700} mb="md" c="#1A1D21">
                Reference Information
              </Text>
            )}
            <Stack gap="md">
              {!isPersonal && (
                <>
                  <Answer label="Position(s) Held at your Organisation" value={data.positionHeld} />
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <Answer label="Employment start date" value={data.employmentStartDate} />
                    <Answer label="Final Salary" value={data.finalSalary} />
                  </SimpleGrid>
                  <Answer label="Employment end date" value={data.employmentEndDate} />
                  <Answer label="Main Duties / Responsibilities" value={data.mainDuties} multiline />
                </>
              )}
              <Answer
                label={
                  isPersonal
                    ? 'Relation to the Candidate is known to you: i.e. Working Colleague, Study Fellow, Study & Work Colleague, etc.'
                    : 'Capacity in which Candidate is known (e.g, Employee, Co-Worker, Colleague)'
                }
                value={data.relationship}
              />
              <Answer
                label={
                  isPersonal
                    ? 'How long have you known the Candidate? i.e. Over 10 years or 5 Years Plus'
                    : 'How long have you known the Candidate?'
                }
                value={data.yearsKnown || data.howLongKnown}
              />
              {!isPersonal && <Answer label="Reason for leaving" value={data.reasonForLeaving} />}
            </Stack>
          </Section>

          {isPersonal && (
            <Section>
              <Answer
                label="Please state here your views on the person's ability to work in this role and detail:"
                value={data.comments}
                multiline
              />
            </Section>
          )}

          {!isPersonal && (
            <Section>
              <Stack gap="lg">
                <YesNoAnswer
                  label="Was the Candidate subject to any formal form of performance management/safeguarding / disciplinary action within the last 12 months? Please tick (✔ or X) Appropriate"
                  value={data.performanceManagement}
                  color={theme.accent}
                  detailsLabel={data.performanceManagement === true ? 'If yes, please give further details:' : undefined}
                  details={data.performanceManagementDetails}
                />
                <YesNoAnswer
                  label="Would you employ the Candidate again? Please tick (✔ or X) Appropriate"
                  value={data.wouldEmployAgain}
                  color={theme.accent}
                  detailsLabel={data.wouldEmployAgain === false ? 'If No, please give further details:' : undefined}
                  details={data.wouldEmployAgainDetails}
                />
              </Stack>
            </Section>
          )}

          <Section>
            <Text size="sm" fw={600} mb="md" c="#1A1D21" style={{ lineHeight: 1.5 }}>
              {isPersonal
                ? "Please advise on the following aspects of the Candidate's character (where applicable) by ticking the relevant box to indicate the level in each category, and add any comments you feel are appropriate."
                : "Please advise on the following aspects of the Candidate's Employment (where applicable) by ticking the relevant box to indicate the level in each category - please add any comments you feel appropriate."}
            </Text>
            <CriteriaGrid
              title={
                isPersonal
                  ? "Criteria: Assign (✔ or X) to the applicant's performance"
                  : "Criteria: Assign (✔ or X) to the Candidate's performance"
              }
              criteria={isPersonal ? PERSONAL_CRITERIA : PROFESSIONAL_CRITERIA_A}
              ratings={ratings}
              options={isPersonal ? PERSONAL_RATINGS : PROFESSIONAL_RATINGS_A}
              color={theme.accent}
            />
            {!isPersonal && (
              <Box mt="md">
                <CriteriaGrid
                  title="Criteria: Assign X to the Candidate's performance"
                  criteria={PROFESSIONAL_CRITERIA_B}
                  ratings={ratings}
                  options={PROFESSIONAL_RATINGS_B}
                  color={theme.accent}
                />
              </Box>
            )}
            {extraRatings.length > 0 && (
              <Stack gap={6} mt="md">
                <Text size="sm" fw={600}>
                  Other ratings saved on this submission
                </Text>
                {extraRatings.map((key) => (
                  <Group key={key} justify="space-between">
                    <Text size="sm">{key}</Text>
                    <Badge variant="light">{String(ratings[key])}</Badge>
                  </Group>
                ))}
              </Stack>
            )}
            {isPersonal && (
              <Box mt="md">
                <Answer label="Comments" value={data.additionalComments} multiline />
              </Box>
            )}
          </Section>

          {!isPersonal && (
            <Section>
              <Stack gap="lg">
                <YesNoAnswer
                  label="Did you find the applicant honest and trustworthy?"
                  value={data.honestTrustworthy}
                  color={theme.accent}
                />
                <YesNoAnswer
                  label="Did you find the Candidate to be reliable/trustworthy in carrying out their duties?"
                  value={data.reliableTrustworthy}
                  color={theme.accent}
                />
                <YesNoAnswer
                  label="Was the applicant's attendance/timekeeping acceptable?"
                  value={data.attendanceTimekeeping}
                  color={theme.accent}
                />
                <YesNoAnswer
                  label="Do you think the Candidate is a suitable person to undertake this post?"
                  value={data.suitableForPost}
                  color={theme.accent}
                />
              </Stack>
            </Section>
          )}

          {!isPersonal && (
            <Section>
              <Text size="sm" c="#3C4650" mb="sm" style={{ lineHeight: 1.5 }}>
                We welcome any additional comments you may have below. Please include anything not previously mentioned which would help or hinder this person's application to Lets Care All; please include any in-house training:
              </Text>
              <Answer
                label="Please provide any additional comments here (continue on an additional sheet if necessary):"
                value={data.additionalComments}
                multiline
              />
            </Section>
          )}

          {(data.recommendation === true || data.recommendation === false) && (
            <Section>
              <YesNoAnswer
                label="Would you recommend this candidate?"
                value={data.recommendation}
                color={theme.accent}
              />
            </Section>
          )}

          {!isPersonal && !isBlank(data.comments) && (
            <Section>
              <Answer label="Other comments recorded" value={data.comments} multiline />
            </Section>
          )}

          <Section>
            <Text fw={700} mb="md" c="#1A1D21">
              Signature
            </Text>
            <Stack gap="md">
              <Box>
                <Text size="sm" fw={600} mb={6} c="#1A1D21">
                  Referee Signature
                </Text>
                <Box
                  px={12}
                  py={10}
                  style={{
                    minHeight: 96,
                    borderRadius: 6,
                    border: `1px solid ${data.signature ? '#DEE2E6' : '#F0D3A8'}`,
                    background: data.signature ? '#fff' : '#FFF9F2',
                    display: 'inline-block',
                    minWidth: 280,
                    maxWidth: '100%',
                  }}
                >
                  {data.signature ? (
                    <img
                      src={data.signature}
                      alt="Referee signature"
                      style={{ display: 'block', maxWidth: 320, width: '100%', height: 'auto' }}
                    />
                  ) : (
                    <Text size="sm" fs="italic" c="#9A6B3A">
                      Not provided
                    </Text>
                  )}
                </Box>
              </Box>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <Answer label="Date" value={data.signatureDate} />
                <Answer label="Telephone No" value={data.telephone} />
                {!isPersonal && (
                  <>
                    <Answer label="Company Name" value={data.companyName} />
                    <Answer label="Company Address" value={data.companyAddress} multiline />
                  </>
                )}
                <Answer label="Email" value={refereeEmail} />
                <Answer label="Your Position" value={data.position} />
              </SimpleGrid>
            </Stack>
          </Section>

          <Section>
            <Box p="md" style={{ background: '#F7F7F7', borderRadius: 8 }}>
              <Text fw={700} mb="sm" c="#1A1D21">
                Privacy Notice
              </Text>
              <Stack gap="sm">
                <Text size="sm" c="#3C4650" style={{ lineHeight: 1.6 }}>
                  Individuals have a right under the General Data Protection Regulation to see copies of references received about them. Therefore, we cannot guarantee the complete confidentiality of any reference received.
                </Text>
                <Text size="sm" c="#3C4650" style={{ lineHeight: 1.6 }}>
                  We will only collect data for specified, explicit and legitimate use in relation to the recruitment process. By signing this document, you consent to the holding of the information contained.
                </Text>
                <Text size="sm" c="#3C4650" style={{ lineHeight: 1.6 }}>
                  We are required to keep this information within the Candidate's personnel file. We cannot estimate the exact period it will be held. When that period is over, we will delete your data.
                </Text>
                <Text size="sm" c="#3C4650" style={{ lineHeight: 1.6 }}>
                  We have privacy policies that you can request for further information. Please be assured that your data will be securely stored by the Data Protection Officer (DPO) and used only for the successful recruitment of the Candidate.
                </Text>
                <Text size="sm" c="#3C4650" style={{ lineHeight: 1.6 }}>
                  {isPersonal
                    ? "You have the right to have your data forgotten, to rectify or access your data, to restrict processing, to withdraw your consent, and to be kept informed about the processing of your data. If you would like to discuss this further or withdraw your consent at any time, don't hesitate to get in touch with us via email to the DPO at info@letscareall.org.uk"
                    : 'You have the right to have your data forgotten, to rectify or access your data, to restrict processing, to withdraw your consent, and to be kept informed about the processing of your data. If you would like to discuss this further or withdraw your consent at any time, please get in touch with us via email at DPO at info@letscareall.org.uk.'}
                </Text>
              </Stack>
            </Box>
          </Section>
        </>
      )}
    </Box>
  );
}
