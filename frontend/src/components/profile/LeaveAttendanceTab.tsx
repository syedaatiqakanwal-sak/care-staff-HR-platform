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
  Box,
  ThemeIcon,
  Tabs,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Calendar, Check, X, ClipboardList, Clock3, Plane } from 'lucide-react';
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

const BRAND_GREEN = '#139639';
const BRAND_BLUE = '#267FBA';

interface LeaveAttendanceTabProps {
  profile: { user?: { id: string }; id?: string };
}

const leaveStatusColor: Record<string, string> = {
  REQUESTED: 'yellow',
  APPROVED: 'green',
  REJECTED: 'red',
};

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
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
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

  const year = balance?.year ?? new Date().getFullYear();
  const showForms = canRequestLeave || canRecordAttendance;
  const availableToBook = balance?.availableToBook ?? balance?.remainingDays ?? 0;
  const pendingDays = balance?.pendingDays ?? 0;
  const filteredLeave = leaveRecords.filter((row) => {
    if (typeFilter !== 'ALL' && row.leaveType !== typeFilter) return false;
    if (statusFilter !== 'ALL' && row.status !== statusFilter) return false;
    return true;
  });

  return (
    <Stack gap="lg">
      {/* 1) Balance overview — data only */}
      <Paper
        p={{ base: 'md', sm: 'lg' }}
        radius="lg"
        withBorder
        style={{ borderColor: 'rgba(19, 150, 57, 0.15)' }}
      >
        <Group justify="space-between" align="flex-start" mb="md" wrap="wrap">
          <Group gap="sm">
            <ThemeIcon size={36} radius="md" variant="light" color="green">
              <Plane size={18} />
            </ThemeIcon>
            <Box>
              <Title order={4} fw={800}>
                Annual leave balance
              </Title>
              <Text size="sm" c="dimmed">
                Calendar year {year}
              </Text>
            </Box>
          </Group>
          <Badge size="lg" color="green" variant="light" radius="sm">
            {availableToBook} days available to book
          </Badge>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          <Box
            p="md"
            style={{
              background: 'rgba(38, 127, 186, 0.06)',
              borderRadius: 12,
              border: '1px solid rgba(38, 127, 186, 0.12)',
            }}
          >
            <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb={4}>
              Allowance
            </Text>
            <Text size="28px" fw={900} lh={1} c={BRAND_BLUE}>
              {balance?.allowanceDays ?? 0}
            </Text>
            <Text size="xs" c="dimmed" mt={6}>
              days entitled
            </Text>
          </Box>
          <Box
            p="md"
            style={{
              background: 'rgba(100, 116, 139, 0.06)',
              borderRadius: 12,
              border: '1px solid rgba(100, 116, 139, 0.12)',
            }}
          >
            <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb={4}>
              Used
            </Text>
            <Text size="28px" fw={900} lh={1}>
              {balance?.usedDays ?? 0}
            </Text>
            <Text size="xs" c="dimmed" mt={6}>
              approved leave
            </Text>
          </Box>
          <Box
            p="md"
            style={{
              background: 'rgba(19, 150, 57, 0.06)',
              borderRadius: 12,
              border: '1px solid rgba(19, 150, 57, 0.14)',
            }}
          >
            <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb={4}>
              Remaining
            </Text>
            <Text size="28px" fw={900} lh={1} c={BRAND_GREEN}>
              {availableToBook}
            </Text>
            <Text size="xs" c="dimmed" mt={6}>
              available to book
              {pendingDays > 0 ? ` · ${pendingDays} pending` : ''}
            </Text>
          </Box>
        </SimpleGrid>

        {canApprove && (
          <Group
            mt="md"
            pt="md"
            gap="sm"
            align="flex-end"
            wrap="wrap"
            style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}
          >
            <NumberInput
              label="Annual allowance"
              description="HR only — days entitled this year"
              value={allowanceEdit}
              onChange={setAllowanceEdit}
              min={0}
              max={365}
              w={180}
              size="sm"
            />
            <Button size="sm" variant="light" color="green" onClick={saveAllowance}>
              Update allowance
            </Button>
          </Group>
        )}
      </Paper>

      {/* 2) Approval queue — managers */}
      {canApprove && pendingQueue.length > 0 && (
        <Paper p={{ base: 'md', sm: 'lg' }} radius="lg" withBorder>
          <Group gap="sm" mb="md">
            <ThemeIcon size={32} radius="md" variant="light" color="orange">
              <ClipboardList size={16} />
            </ThemeIcon>
            <Box>
              <Title order={4} fw={800}>
                Approval queue
              </Title>
              <Text size="sm" c="dimmed">
                {pendingQueue.length} request{pendingQueue.length === 1 ? '' : 's'} waiting
              </Text>
            </Box>
          </Group>
          <Table.ScrollContainer minWidth={800}>
            <Table striped highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
              <Table.Thead>
                <Table.Tr>
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
                      <Badge variant="light" color="blue" size="sm">
                        {row.leaveType}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {new Date(row.startDate).toLocaleDateString('en-GB')} –{' '}
                        {new Date(row.endDate).toLocaleDateString('en-GB')}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={700}>
                        {row.days}
                      </Text>
                    </Table.Td>
                    <Table.Td maw={220}>
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

      {/* 3) Action forms — side by side, separate from records */}
      {showForms && (
        <SimpleGrid cols={{ base: 1, md: canRequestLeave && canRecordAttendance ? 2 : 1 }} spacing="md">
          {canRequestLeave && (
            <Paper p={{ base: 'md', sm: 'lg' }} radius="lg" withBorder h="100%">
              <Group gap="sm" mb="md">
                <ThemeIcon size={32} radius="md" variant="light" color="blue">
                  <Calendar size={16} />
                </ThemeIcon>
                <Box>
                  <Title order={5} fw={800}>
                    {isSelf ? 'Request leave' : 'Submit leave'}
                  </Title>
                  <Text size="xs" c="dimmed">
                    {isSelf ? 'Sent to HR for approval' : 'On behalf of this staff member'}
                  </Text>
                </Box>
              </Group>
              <Stack gap="sm">
                <Select
                  label="Leave type"
                  data={[...LEAVE_TYPE_OPTIONS]}
                  value={leaveType}
                  onChange={(v) => setLeaveType((v as LeaveType) || 'ANNUAL')}
                />
                <Group grow align="flex-start">
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
                  placeholder="Optional notes for HR"
                  value={reason}
                  onChange={(e) => setReason(e.currentTarget.value)}
                  minRows={2}
                  autosize
                />
                <Button
                  mt="xs"
                  leftSection={<Calendar size={16} />}
                  color="blue"
                  loading={savingLeave}
                  onClick={submitLeaveRequest}
                >
                  Submit leave request
                </Button>
              </Stack>
            </Paper>
          )}

          {canRecordAttendance && (
            <Paper p={{ base: 'md', sm: 'lg' }} radius="lg" withBorder h="100%">
              <Group gap="sm" mb="md">
                <ThemeIcon size={32} radius="md" variant="light" color="green">
                  <Clock3 size={16} />
                </ThemeIcon>
                <Box>
                  <Title order={5} fw={800}>
                    Record attendance
                  </Title>
                  <Text size="xs" c="dimmed">
                    HR daily attendance entry
                  </Text>
                </Box>
              </Group>
              <Stack gap="sm">
                <Group grow align="flex-start">
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
                  placeholder="Optional"
                  value={attNotes}
                  onChange={(e) => setAttNotes(e.currentTarget.value)}
                />
                <Checkbox
                  mt={4}
                  label="Return-to-work interview completed"
                  checked={returnToWork}
                  onChange={(e) => setReturnToWork(e.currentTarget.checked)}
                />
                <Button mt="xs" loading={savingAttendance} color="green" onClick={saveAttendance}>
                  Save attendance
                </Button>
              </Stack>
            </Paper>
          )}
        </SimpleGrid>
      )}

      {/* 4) Records — tabbed data view, not stacked under forms */}
      <Paper p={{ base: 'md', sm: 'lg' }} radius="lg" withBorder>
        <Tabs defaultValue="leave" variant="pills" radius="md">
          <Tabs.List mb="md">
            <Tabs.Tab value="leave" leftSection={<Plane size={14} />}>
              Leave history
              <Badge ml={8} size="sm" variant="light" color="gray">
                {filteredLeave.length}
              </Badge>
            </Tabs.Tab>
            <Tabs.Tab value="attendance" leftSection={<Clock3 size={14} />}>
              Attendance
              <Badge ml={8} size="sm" variant="light" color="gray">
                {attendance.length}
              </Badge>
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="leave">
            <Group align="flex-end" mb="md" wrap="wrap">
              <Select
                label="Type"
                data={[
                  { value: 'ALL', label: 'All types' },
                  ...LEAVE_TYPE_OPTIONS,
                ]}
                value={typeFilter}
                onChange={(value) => setTypeFilter(value || 'ALL')}
                w={180}
                size="sm"
              />
              <Select
                label="Status"
                data={[
                  { value: 'ALL', label: 'All statuses' },
                  { value: 'REQUESTED', label: 'Requested' },
                  { value: 'APPROVED', label: 'Approved' },
                  { value: 'REJECTED', label: 'Rejected' },
                ]}
                value={statusFilter}
                onChange={(value) => setStatusFilter(value || 'ALL')}
                w={180}
                size="sm"
              />
              {(typeFilter !== 'ALL' || statusFilter !== 'ALL') && (
                <Button
                  size="sm"
                  variant="subtle"
                  color="gray"
                  onClick={() => {
                    setTypeFilter('ALL');
                    setStatusFilter('ALL');
                  }}
                >
                  Clear filters
                </Button>
              )}
            </Group>
            {leaveRecords.length === 0 ? (
              <Center py="xl">
                <Text c="dimmed" size="sm">
                  No leave records yet.
                </Text>
              </Center>
            ) : filteredLeave.length === 0 ? (
              <Center py="xl">
                <Text c="dimmed" size="sm">
                  No leave records match these filters.
                </Text>
              </Center>
            ) : (
              <Table.ScrollContainer minWidth={700}>
                <Table striped highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Type</Table.Th>
                      <Table.Th>Dates</Table.Th>
                      <Table.Th>Days</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>Reason</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {filteredLeave.map((row) => (
                      <Table.Tr key={row.id}>
                        <Table.Td>
                          <Badge variant="outline" color="blue" size="sm">
                            {row.leaveType}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">
                            {new Date(row.startDate).toLocaleDateString('en-GB')} –{' '}
                            {new Date(row.endDate).toLocaleDateString('en-GB')}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={700}>
                            {row.days}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge color={leaveStatusColor[row.status] || 'gray'} variant="light">
                            {row.status}
                          </Badge>
                        </Table.Td>
                        <Table.Td maw={260}>
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
              <Center py="xl">
                <Stack gap={6} align="center">
                  <Text c="dimmed" size="sm">
                    No attendance records in the last 90 days.
                  </Text>
                  {isStaffPortalRole() && isSelf && !canRecordAttendance && (
                    <Text size="xs" c="dimmed">
                      Contact HR to update attendance records.
                    </Text>
                  )}
                </Stack>
              </Center>
            ) : (
              <Table.ScrollContainer minWidth={700}>
                <Table striped highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
                  <Table.Thead>
                    <Table.Tr>
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
                          <Text size="sm" fw={600}>
                            {new Date(row.date).toLocaleDateString('en-GB')}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            variant="light"
                            color={
                              row.status === 'PRESENT'
                                ? 'green'
                                : row.status === 'ABSENT'
                                  ? 'red'
                                  : 'orange'
                            }
                            size="sm"
                          >
                            {row.status}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{row.returnToWorkCompleted ? 'Yes' : 'No'}</Text>
                        </Table.Td>
                        <Table.Td maw={280}>
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
          </Tabs.Panel>
        </Tabs>
      </Paper>
    </Stack>
  );
}
