import { useMemo } from 'react';
import {
  Box,
  Center,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { User } from 'lucide-react';

type StaffMember = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  ilccsNumber: string;
};

type StaffListProps = {
  staff: StaffMember[];
  onSelect: (staff: StaffMember) => void;
};

export const StaffList = ({ staff, onSelect }: StaffListProps) => {
  const grouped = useMemo(() => {
    const groups = new Map<string, StaffMember[]>();

    for (const s of staff) {
      const firstLetter = (s.firstName || s.lastName || 'Other').charAt(0).toUpperCase();
      if (!groups.has(firstLetter)) {
        groups.set(firstLetter, []);
      }
      groups.get(firstLetter)!.push(s);
    }

    // Sort groups alphabetically
    const sortedGroups = Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    // Sort staff within each group
    sortedGroups.forEach(([_, members]) => {
      members.sort((a, b) => {
        const aName = `${a.firstName} ${a.lastName}`.toLowerCase();
        const bName = `${b.firstName} ${b.lastName}`.toLowerCase();
        return aName.localeCompare(bName);
      });
    });

    return sortedGroups;
  }, [staff]);

  if (staff.length === 0) {
    return (
      <Center py="xl">
        <Text c="dimmed">No staff members found.</Text>
      </Center>
    );
  }

  return (
    <ScrollArea.Autosize mah="60vh" type="auto">
      <Stack gap="md">
        {grouped.map(([letter, members]) => (
          <Box key={letter}>
            <Title order={4} size="sm" fw={700} mb="sm" c="dimmed" tt="uppercase">
              {letter}
            </Title>
            <Stack gap="xs">
              {members.map((s) => (
                <Paper
                  key={s.id}
                  p={{ base: 'sm', md: 'md' }}
                  radius="md"
                  withBorder
                  style={{
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateX(4px)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(19, 150, 57, 0.15)';
                    e.currentTarget.style.borderColor = 'rgba(19, 150, 57, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateX(0)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = '';
                  }}
                  onClick={() => onSelect(s)}
                >
                  <Group gap="sm" wrap="wrap">
                    <Box
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        backgroundColor: 'rgba(19, 150, 57, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <User size={20} color="var(--mantine-color-brandBlue-6)" />
                    </Box>
                    <Box style={{ flex: 1 }}>
                      <Text fw={700} size="sm">
                        {s.firstName} {s.lastName}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {s.email}
                        {s.ilccsNumber && ` • ${s.ilccsNumber}`}
                      </Text>
                    </Box>
                  </Group>
                </Paper>
              ))}
            </Stack>
          </Box>
        ))}
      </Stack>
    </ScrollArea.Autosize>
  );
};
