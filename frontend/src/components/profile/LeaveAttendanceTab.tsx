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
  Divider,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Calendar, Check, X } from 'lucide-react';
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
        <Loader size="sm" />
      </Center>
    );
  }

  return (
    <Stack gap="xl">
      <Paper p="xl" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Title order={4}>Annual leave balance ({balance?.year ?? new Date().getFullYear()})</Title>
          <Badge size="lg" color="brandGreen.6" variant="light">
            {balance?.remainingDays ?? 0} days remaining
          </Badge>
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          <Paper p="md" withBorder radius="md">
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
              Allowance
            </Text>
            <Text size="xl" fw={900}>
              {balance?.allowanceDays ?? 0}
            </Text>
          </Paper>
          <Paper p="md" withBorder radius="md">
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
              Used (approved annual)
            </Text>
            <Text size="xl" fw={900}>
              {balance?.usedDays ?? 0}
            </Text>
          </Paper>
          <Paper p="md" withBorder radius="md">
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
              Remaining
            </Text>
            <Text size="xl" fw={900} c="brandGreen.7">
              {balance?.remainingDays ?? 0}
            </Text>
          </Paper>
        </SimpleGrid>
        <Text size="xs" c="dimmed" mt="sm">
          Entitlement is set per employee; used days are calculated from approved annual leave in
          this calendar year.
        </Text>
        {canApprove && (
          <Group mt="md" align="flex-end">
            <NumberInput
              label="Edit annual allowance (days)"
              value={allowanceEdit}
              onChange={setAllowanceEdit}
              min={0}
              max={365}
              maw={200}
            />
            <Button variant="light" color="brandBlue" onClick={saveAllowance}>
              Save allowance
            </Button>
          </Group>
        )}
      </Paper>

      {canApprove && pendingQueue.length > 0 && (
        <Paper p="xl" radius="md" withBorder>
          <Title order={4} mb="md">
            Approval queue ({pendingQueue.length})
          </Title>
          <Table striped highlightOnHover>
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
                  <Table.Td>{row.staffName || '—'}</Table.Td>
                  <Table.Td>{row.leaveType}</Table.Td>
                  <Table.Td>
                    {new Date(row.startDate).toLocaleDateString('en-GB')} –{' '}
                    {new Date(row.endDate).toLocaleDateString('en-GB')}
                  </Table.Td>
                  <Table.Td>{row.days}</Table.Td>
                  <Table.Td>{row.reason || '—'}</Table.Td>
                  <Table.Td>
                    <Group gap="xs">
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
        </Paper>
      )}

      {canRequestLeave && (
        <Paper p="xl" radius="md" withBorder>
          <Title order={4} mb="md">
            {isSelf ? 'Request leave' : 'Submit leave on behalf of staff'}
          </Title>
          <Stack gap="md" maw={480}>
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
              color="brandBlue"
              loading={savingLeave}
              onClick={submitLeaveRequest}
            >
              Submit leave request
            </Button>
          </Stack>
        </Paper>
      )}

      <Paper p="xl" radius="md" withBorder>
        <Title order={4} mb="md">
          Leave history
        </Title>
        {leaveRecords.length === 0 ? (
          <Text c="dimmed" fs="italic">
            No leave records.
          </Text>
        ) : (
          <Table striped>
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
              {leaveRecords.map((row) => (
                <Table.Tr key={row.id}>
                  <Table.Td>{row.leaveType}</Table.Td>
                  <Table.Td>
                    {new Date(row.startDate).toLocaleDateString('en-GB')} –{' '}
                    {new Date(row.endDate).toLocaleDateString('en-GB')}
                  </Table.Td>
                  <Table.Td>{row.days}</Table.Td>
                  <Table.Td>
                    <Badge color={leaveStatusColor[row.status] || 'gray'}>{row.status}</Badge>
                  </Table.Td>
                  <Table.Td>{row.reason || '—'}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Paper>

      <Paper p="xl" radius="md" withBorder>
        <Title order={4} mb="md">
          Attendance
        </Title>
        {canRecordAttendance && (
          <>
            <Stack gap="md" maw={480} mb="lg">
              <Text size="sm" fw={600}>
                Record attendance (HR)
              </Text>
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
              />
              <Button loading={savingAttendance} color="brandGreen.6" onClick={saveAttendance}>
                Save attendance
              </Button>
            </Stack>
            <Divider mb="md" />
          </>
        )}
        {attendance.length === 0 ? (
          <Text c="dimmed" fs="italic">
            No attendance records in the last 90 days.
          </Text>
        ) : (
          <Table striped>
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
                  <Table.Td>{new Date(row.date).toLocaleDateString('en-GB')}</Table.Td>
                  <Table.Td>{row.status}</Table.Td>
                  <Table.Td>{row.returnToWorkCompleted ? 'Yes' : 'No'}</Table.Td>
                  <Table.Td>{row.notes || '—'}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
        {isStaffPortalRole() && isSelf && !canRecordAttendance && (
          <Text size="xs" c="dimmed" mt="sm">
            Contact HR to update attendance records.
          </Text>
        )}
      </Paper>
    </Stack>
  );
}
