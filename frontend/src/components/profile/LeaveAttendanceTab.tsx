import {
  Paper,
  Title,
  Text,
  Stack,
  Button,
  Group,
  TextInput,
  Textarea,
  Select,
  Loader,
  Center,
  Badge,
  SimpleGrid,
  Table,
  NumberInput,
  Checkbox,
  Tabs,
  Box,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Calendar, Check, X, ClipboardList } from 'lucide-react';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { isManagementRole, canMutate, isStaffPortalRole } from '../../utils/roles';
import type {
  AttendanceRecordDto,
  AttendanceStatus,
  LeaveBalanceDto,
  LeaveRecordDto,
  LeaveType,
} from '../../types/attendance';
import {
  ATTENDANCE_STATUS_OPTIONS,
  LEAVE_TYPE_OPTIONS,
} from '../../types/attendance';

interface LeaveAttendanceTabProps {
  profile: { user?: { id: string }; id?: string };
}

const BRAND_GREEN = '#139639';
const BRAND_BLUE = '#267FBA';

const leaveStatusColor: Record<string, string> = {
  REQUESTED: 'yellow',
  APPROVED: 'green',
  REJECTED: 'red',
};

const attendanceStatusColor: Record<string, string> = {
  PRESENT: 'green',
  LATE: 'yellow',
  NO_SHOW: 'red',
  ABSENT: 'orange',
};

const leaveTypeLabel = (type: string) =>
  LEAVE_TYPE_OPTIONS.find((o) => o.value === type)?.label || type;

const attendanceStatusLabel = (status: string) =>
  ATTENDANCE_STATUS_OPTIONS.find((o) => o.value === status)?.label || status;

export function LeaveAttendanceTab({ profile }: LeaveAttendanceTabProps) {
  const targetUserId = profile.user?.id || profile.id;
  const storedUserId = localStorage.getItem('userId');
  const isSelf = Boolean(targetUserId && storedUserId && targetUserId === storedUserId);
  const canApprove = isManagementRole() && canMutate();
  const canRecordAttendance = canApprove;
  const canRequestLeave = isSelf || isManagementRole();

  const [balance, setBalance] = useState<LeaveBalanceDto | null>(null);
  const [leaveRecords, setLeaveRecords] = useState<LeaveRecordDto[]>([]);
  const [pendingQueue, setPendingQueue] = useState<LeaveRecordDto[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecordDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingLeave, setSavingLeave] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);

  const [leaveType, setLeaveType] = useState<LeaveType>('ANNUAL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [allowanceEdit, setAllowanceEdit] = useState<number | string>(28);

  const [attDate, setAttDate] = useState(new Date().toISOString().slice(0, 10));
  const [attStatus, setAttStatus] = useState<AttendanceStatus>('PRESENT');
  const [attNotes, setAttNotes] = useState('');
  const [returnToWork, setReturnToWork] = useState(false);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const refresh = useCallback(async () => {
    if (!targetUserId) return;
    setLoading(true);
    try {
      const [balRes, leaveRes, attRes] = await Promise.all([
        axios.get(`/api/v1/staff/${targetUserId}/leave/balance`, { headers }),
        axios.get(`/api/v1/staff/${targetUserId}/leave`, { headers }),
        axios.get(`/api/v1/staff/${targetUserId}/attendance`, { headers }),
      ]);
      setBalance(balRes.data);
      setLeaveRecords(leaveRes.data);
      setAttendance(attRes.data);
      setAllowanceEdit(balRes.data.allowanceDays ?? 28);

      if (canApprove) {
        const pendingRes = await axios.get('/api/v1/attendance/leave/pending', { headers });
        setPendingQueue(pendingRes.data);
      }
    } catch {
      notifications.show({ title: 'Error', message: 'Could not load leave & attendance', color: 'red' });
    } finally {
      setLoading(false);
    }
  }, [targetUserId, canApprove]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const submitLeaveRequest = async () => {
    if (!startDate || !endDate) {
      notifications.show({ title: 'Required', message: 'Select start and end dates', color: 'red' });
      return;
    }
    setSavingLeave(true);
    try {
      await axios.post(
        `/api/v1/staff/${targetUserId}/leave`,
        { leaveType, startDate, endDate, reason: reason.trim() || undefined },
        { headers },
      );
      notifications.show({ title: 'Submitted', message: 'Leave request sent for approval', color: 'green' });
      setReason('');
      refresh();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.message || 'Request failed'
        : 'Request failed';
      notifications.show({ title: 'Error', message: String(msg), color: 'red' });
    } finally {
      setSavingLeave(false);
    }
  };

  const handleApprove = async (leaveId: string, approve: boolean) => {
    try {
      await axios.post(`/api/v1/attendance/leave/${leaveId}/${approve ? 'approve' : 'reject'}`, {}, { headers });
      notifications.show({
        title: approve ? 'Approved' : 'Rejected',
        message: 'Leave request updated',
        color: approve ? 'green' : 'orange',
      });
      refresh();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.message || 'Action failed'
        : 'Action failed';
      notifications.show({ title: 'Error', message: String(msg), color: 'red' });
    }
  };

  const saveAllowance = async () => {
    try {
      const res = await axios.put(
        `/api/v1/staff/${targetUserId}/leave/allowance`,
        { annualLeaveAllowanceDays: Number(allowanceEdit) },
        { headers },
      );
      setBalance(res.data);
      notifications.show({ title: 'Saved', message: 'Annual allowance updated', color: 'green' });
    } catch {
      notifications.show({ title: 'Error', message: 'Could not update allowance', color: 'red' });
    }
  };

  const saveAttendance = async () => {
    setSavingAttendance(true);
    try {
      await axios.post(
        `/api/v1/staff/${targetUserId}/attendance`,
        {
          date: attDate,
          status: attStatus,
          notes: attNotes.trim() || undefined,
          returnToWorkCompleted: returnToWork,
        },
        { headers },
      );
      notifications.show({ title: 'Saved', message: 'Attendance recorded', color: 'green' });
      refresh();
    } catch {
      notifications.show({ title: 'Error', message: 'Could not save attendance', color: 'red' });
    } finally {
      setSavingAttendance(false);
    }
  };

  if (loading) {
    return (
      <Center py="xl">
        <Loader size="sm" color={BRAND_GREEN} />
      </Center>
    );
  }

  const showFormsRow = canRequestLeave || canRecordAttendance;
  const formCols =
    canRequestLeave && canRecordAttendance ? { base: 1, md: 2 } : { base: 1 };

  return (
    <Stack gap="lg">
      {/* 1) Balance overview — clean metrics */}
      <Paper
        p="lg"
        radius="md"
        style={{
          border: `1px solid ${BRAND_GREEN}22`,
          background: `linear-gradient(135deg, ${BRAND_GREEN}08 0%, ${BRAND_BLUE}08 100%)`,
        }}
      >
        <Group justify="space-between" align="flex-start" mb="md" wrap="wrap">
          <Box>
            <Title order={4} c={BRAND_GREEN}>
              Annual leave balance
            </Title>
            <Text size="sm" c="dimmed">
              Calendar year {balance?.year ?? new Date().getFullYear()}
            </Text>
          </Box>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          <Box
            p="md"
            style={{
              background: 'white',
              borderRadius: 12,
              borderLeft: `4px solid ${BRAND_BLUE}`,
            }}
          >
            <Text size="xs" c="dimmed" tt="uppercase" fw={700} style={{ letterSpacing: '0.04em' }}>
              Allowance
            </Text>
            <Text size="xl" fw={800} c={BRAND_BLUE} mt={4}>
              {balance?.allowanceDays ?? 0}
            </Text>
            <Text size="xs" c="dimmed">
              days entitled
            </Text>
          </Box>
          <Box
            p="md"
            style={{
              background: 'white',
              borderRadius: 12,
              borderLeft: `4px solid #d97706`,
            }}
          >
            <Text size="xs" c="dimmed" tt="uppercase" fw={700} style={{ letterSpacing: '0.04em' }}>
              Used
            </Text>
            <Text size="xl" fw={800} mt={4}>
              {balance?.usedDays ?? 0}
            </Text>
            <Text size="xs" c="dimmed">
              approved annual
            </Text>
          </Box>
          <Box
            p="md"
            style={{
              background: 'white',
              borderRadius: 12,
              borderLeft: `4px solid ${BRAND_GREEN}`,
            }}
          >
            <Text size="xs" c="dimmed" tt="uppercase" fw={700} style={{ letterSpacing: '0.04em' }}>
              Remaining
            </Text>
            <Text size="xl" fw={800} c={BRAND_GREEN} mt={4}>
              {balance?.remainingDays ?? 0}
            </Text>
            <Text size="xs" c="dimmed">
              days left
            </Text>
          </Box>
        </SimpleGrid>

        <Text size="xs" c="dimmed" mt="sm">
          Entitlement is set per employee; used days are calculated from approved annual leave in
          this calendar year.
        </Text>

        {/* Compact secondary row — HR allowance edit */}
        {canApprove && (
          <Group
            mt="md"
            gap="sm"
            align="flex-end"
            wrap="wrap"
            p="sm"
            style={{
              background: 'rgba(255,255,255,0.7)',
              borderRadius: 8,
              border: `1px solid ${BRAND_BLUE}22`,
            }}
          >
            <NumberInput
              label="Annual allowance"
              description="HR only"
              value={allowanceEdit}
              onChange={setAllowanceEdit}
              min={0}
              max={365}
              size="xs"
              maw={140}
            />
            <Button size="xs" variant="light" color="blue" onClick={saveAllowance}>
              Save allowance
            </Button>
          </Group>
        )}
      </Paper>

      {/* 2) Approval queue — own section for managers */}
      {canApprove && pendingQueue.length > 0 && (
        <Paper p="lg" radius="md" withBorder style={{ borderColor: `${BRAND_BLUE}33` }}>
          <Group justify="space-between" mb="md">
            <Title order={4} c={BRAND_BLUE}>
              Approval queue
            </Title>
            <Badge color="blue" variant="filled" size="lg">
              {pendingQueue.length} pending
            </Badge>
          </Group>
          <Table.ScrollContainer minWidth={720}>
            <Table striped highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr style={{ background: `${BRAND_BLUE}10` }}>
                  <Table.Th>Staff</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Dates</Table.Th>
                  <Table.Th>Days</Table.Th>
                  <Table.Th>Reason</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {pendingQueue.map((row) => (
                  <Table.Tr key={row.id}>
                    <Table.Td>
                      <Text size="sm" fw={600}>
                        {row.staffName || '—'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" color="blue">
                        {leaveTypeLabel(row.leaveType)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {new Date(row.startDate).toLocaleDateString('en-GB')} –{' '}
                        {new Date(row.endDate).toLocaleDateString('en-GB')}
                      </Text>
                    </Table.Td>
                    <Table.Td>{row.days}</Table.Td>
                    <Table.Td>
                      <Text size="sm" lineClamp={2}>
                        {row.reason || '—'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap">
                        <Button
                          size="xs"
                          color="green"
                          leftSection={<Check size={14} />}
                          onClick={() => handleApprove(row.id, true)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="xs"
                          color="red"
                          variant="light"
                          leftSection={<X size={14} />}
                          onClick={() => handleApprove(row.id, false)}
                        >
                          Reject
                        </Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Paper>
      )}

      {/* 3) Request leave + Record attendance — side by side */}
      {showFormsRow && (
        <SimpleGrid cols={formCols} spacing="md">
          {canRequestLeave && (
            <Paper p="lg" radius="md" withBorder style={{ borderColor: `${BRAND_BLUE}33` }}>
              <Title order={5} mb="md" c={BRAND_BLUE}>
                {isSelf ? 'Request leave' : 'Submit leave on behalf of staff'}
              </Title>
              <Stack gap="sm">
                <Select
                  label="Leave type"
                  data={[...LEAVE_TYPE_OPTIONS]}
                  value={leaveType}
                  onChange={(v) => setLeaveType((v as LeaveType) || 'ANNUAL')}
                />
                <Group grow>
                  <TextInput
                    label="Start date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.currentTarget.value)}
                  />
                  <TextInput
                    label="End date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.currentTarget.value)}
                  />
                </Group>
                <Textarea
                  label="Reason"
                  value={reason}
                  onChange={(e) => setReason(e.currentTarget.value)}
                  minRows={2}
                />
                <Button
                  leftSection={<Calendar size={16} />}
                  style={{ background: BRAND_BLUE }}
                  loading={savingLeave}
                  onClick={submitLeaveRequest}
                >
                  Submit leave request
                </Button>
              </Stack>
            </Paper>
          )}

          {canRecordAttendance && (
            <Paper p="lg" radius="md" withBorder style={{ borderColor: `${BRAND_GREEN}33` }}>
              <Title order={5} mb="md" c={BRAND_GREEN}>
                Record attendance
              </Title>
              <Stack gap="sm">
                <Group grow>
                  <TextInput
                    label="Date"
                    type="date"
                    value={attDate}
                    onChange={(e) => setAttDate(e.currentTarget.value)}
                  />
                  <Select
                    label="Status"
                    data={[...ATTENDANCE_STATUS_OPTIONS]}
                    value={attStatus}
                    onChange={(v) => setAttStatus((v as AttendanceStatus) || 'PRESENT')}
                  />
                </Group>
                <TextInput
                  label="Notes"
                  value={attNotes}
                  onChange={(e) => setAttNotes(e.currentTarget.value)}
                />
                <Checkbox
                  label="Return-to-work interview completed"
                  checked={returnToWork}
                  onChange={(e) => setReturnToWork(e.currentTarget.checked)}
                  color="green"
                />
                <Button
                  leftSection={<ClipboardList size={16} />}
                  style={{ background: BRAND_GREEN }}
                  loading={savingAttendance}
                  onClick={saveAttendance}
                >
                  Save attendance
                </Button>
              </Stack>
            </Paper>
          )}
        </SimpleGrid>
      )}

      {/* 4) Leave history + Attendance — tabbed records below forms */}
      <Paper p="lg" radius="md" withBorder>
        <Tabs defaultValue="leave" color="green">
          <Tabs.List mb="md">
            <Tabs.Tab value="leave" style={{ fontWeight: 600 }}>
              Leave history
              <Badge ml={8} size="sm" variant="light" color="blue">
                {leaveRecords.length}
              </Badge>
            </Tabs.Tab>
            <Tabs.Tab value="attendance" style={{ fontWeight: 600 }}>
              Attendance records
              <Badge ml={8} size="sm" variant="light" color="green">
                {attendance.length}
              </Badge>
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="leave">
            {leaveRecords.length === 0 ? (
              <Text c="dimmed" fs="italic" py="md">
                No leave records.
              </Text>
            ) : (
              <Table.ScrollContainer minWidth={640}>
                <Table striped highlightOnHover verticalSpacing="sm">
                  <Table.Thead>
                    <Table.Tr style={{ background: `${BRAND_BLUE}10` }}>
                      <Table.Th>Type</Table.Th>
                      <Table.Th>Dates</Table.Th>
                      <Table.Th>Days</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>Reason</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {leaveRecords.map((row) => (
                      <Table.Tr key={row.id}>
                        <Table.Td>
                          <Badge variant="light" color="blue">
                            {leaveTypeLabel(row.leaveType)}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">
                            {new Date(row.startDate).toLocaleDateString('en-GB')} –{' '}
                            {new Date(row.endDate).toLocaleDateString('en-GB')}
                          </Text>
                        </Table.Td>
                        <Table.Td>{row.days}</Table.Td>
                        <Table.Td>
                          <Badge color={leaveStatusColor[row.status] || 'gray'} variant="light">
                            {row.status}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" lineClamp={2}>
                            {row.reason || '—'}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="attendance">
            {attendance.length === 0 ? (
              <Text c="dimmed" fs="italic" py="md">
                No attendance records in the last 90 days.
              </Text>
            ) : (
              <Table.ScrollContainer minWidth={560}>
                <Table striped highlightOnHover verticalSpacing="sm">
                  <Table.Thead>
                    <Table.Tr style={{ background: `${BRAND_GREEN}10` }}>
                      <Table.Th>Date</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>RTW done</Table.Th>
                      <Table.Th>Notes</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {attendance.map((row) => (
                      <Table.Tr key={row.id}>
                        <Table.Td>
                          <Text size="sm">
                            {new Date(row.date).toLocaleDateString('en-GB')}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            color={attendanceStatusColor[row.status] || 'gray'}
                            variant="light"
                          >
                            {attendanceStatusLabel(row.status)}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            color={row.returnToWorkCompleted ? 'green' : 'gray'}
                            variant="light"
                          >
                            {row.returnToWorkCompleted ? 'Yes' : 'No'}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" lineClamp={2}>
                            {row.notes || '—'}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            )}
            {isStaffPortalRole() && isSelf && !canRecordAttendance && (
              <Text size="xs" c="dimmed" mt="sm">
                Contact HR to update attendance records.
              </Text>
            )}
          </Tabs.Panel>
        </Tabs>
      </Paper>
    </Stack>
  );
}
