import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Center,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Search, ArrowLeft, FileText } from 'lucide-react';
import axios from 'axios';
import { StaffList } from './StaffList';
import { PolicyTable } from './PolicyTable';

type StaffMember = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  ilccsNumber: string;
};

export const PolicyAnalytics = () => {
  const token = localStorage.getItem('token');
  const role = (localStorage.getItem('role') || '').toLowerCase();
  const canAccess = ['admin', 'manager', 'hr', 'supervisor'].includes(role);
  const isAdmin = canAccess;

  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analytics, setAnalytics] = useState<any[]>([]);

  useEffect(() => {
    if (!token || !isAdmin) return;
    fetchStaffList();
  }, [token, isAdmin]);

  const fetchStaffList = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await axios.get('/api/v1/policy-analytics/staff/list', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStaffList(res.data || []);
    } catch (err: any) {
      notifications.show({
        title: 'Error',
        message: err?.response?.data?.message || 'Failed to load staff list.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStaffSelect = async (staff: StaffMember) => {
    if (!token) return;
    setSelectedStaff(staff);
    setAnalyticsLoading(true);
    setAnalytics([]);
    try {
      const res = await axios.get(`/api/v1/policy-analytics/${staff.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAnalytics(res.data || []);
    } catch (err: any) {
      notifications.show({
        title: 'Error',
        message: err?.response?.data?.message || 'Failed to load policy analytics.',
        color: 'red',
      });
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleBack = () => {
    setSelectedStaff(null);
    setAnalytics([]);
  };

  const filteredStaff = useMemo(() => {
    if (!searchQuery.trim()) return staffList;
    const query = searchQuery.toLowerCase().trim();
    return staffList.filter(
      (s) =>
        s.firstName.toLowerCase().includes(query) ||
        s.lastName.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query) ||
        (s.ilccsNumber && s.ilccsNumber.toLowerCase().includes(query)),
    );
  }, [staffList, searchQuery]);

  if (!isAdmin) {
    return (
      <Center py="xl">
        <Text c="dimmed">Access denied. Admin only.</Text>
      </Center>
    );
  }

  if (selectedStaff) {
    return (
      <Box p={{ base: 'md', md: 'xl' }}>
        <Group justify="space-between" mb={{ base: 'md', md: 'lg' }} align="center" wrap="wrap">
          <Group gap="sm">
            <Button
              variant="subtle"
              leftSection={<ArrowLeft size={16} />}
              onClick={handleBack}
            >
              Back
            </Button>
            <Title order={2} fw={900}>
              Policy Analytics - {selectedStaff.firstName} {selectedStaff.lastName}
            </Title>
          </Group>
        </Group>

        <Paper p={{ base: 'md', md: 'xl' }} radius="xl" withBorder>
          {analyticsLoading ? (
            <Center py="xl">
              <Group gap="sm">
                <Loader size="sm" />
                <Text c="dimmed">Loading analytics...</Text>
              </Group>
            </Center>
          ) : (
            <PolicyTable data={analytics} />
          )}
        </Paper>
      </Box>
    );
  }

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Group justify="space-between" mb={{ base: 'md', md: 'lg' }} align="center" wrap="wrap">
        <Group gap="sm">
          <FileText size={22} />
          <Title order={2} fw={900}>Policy Analytics</Title>
        </Group>
      </Group>

      <Paper p={{ base: 'md', md: 'xl' }} radius="xl" withBorder>
        <Stack gap="md">
          <TextInput
            placeholder="Search staff by name, email, or ILCCS..."
            leftSection={<Search size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            mb="md"
            size="sm"
          />

          {loading ? (
            <Center py="xl">
              <Group gap="sm">
                <Loader size="sm" />
                <Text c="dimmed">Loading staff list...</Text>
              </Group>
            </Center>
          ) : (
            <StaffList staff={filteredStaff} onSelect={handleStaffSelect} />
          )}
        </Stack>
      </Paper>
    </Box>
  );
};
