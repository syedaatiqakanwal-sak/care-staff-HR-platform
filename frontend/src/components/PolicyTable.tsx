import { useState } from 'react';
import {
  ActionIcon,
  Box,
  Center,
  Group,
  Paper,
  ScrollArea,
  Table,
  Text,
  Tooltip,
} from '@mantine/core';
import { ChevronDown, ChevronUp } from 'lucide-react';

type PolicyAnalyticsRow = {
  policyId: string;
  policyTitle: string;
  date: string;
  totalOpens: number;
  firstOpen: string;
  lastClose: string | null;
  totalDurationSec: number;
  details: Array<{
    openedAt: string;
    closedAt: string | null;
    durationSec: number | null;
  }>;
};

type PolicyTableProps = {
  data: PolicyAnalyticsRow[];
};

function formatDuration(totalSeconds: number | null): string {
  if (totalSeconds === null || totalSeconds === 0) return 'Downloaded';
  const s = Math.max(0, totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  if (h > 0) {
    return `${h} hour${h > 1 ? 's' : ''} ${m} min${m !== 1 ? 's' : ''} ${sec} sec${sec !== 1 ? 's' : ''}`;
  }
  if (m > 0) {
    return `${m} min${m !== 1 ? 's' : ''} ${sec} sec${sec !== 1 ? 's' : ''}`;
  }
  return `${sec} sec${sec !== 1 ? 's' : ''}`;
}

function formatTime(d: string | null | undefined): string {
  if (!d) return '-';
  return new Date(d).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export const PolicyTable = ({ data }: PolicyTableProps) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (key: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedRows(newExpanded);
  };

  if (data.length === 0) {
    return (
      <Center py="xl">
        <Text c="dimmed">No policy reading data available for this staff member.</Text>
      </Center>
    );
  }

  return (
    <ScrollArea.Autosize
      mah="60vh"
      type="auto"
      viewportProps={{ style: { minWidth: 560 } }}
    >
      <Table
        highlightOnHover
        verticalSpacing="xs"
        horizontalSpacing="xs"
        fz="xs"
        style={{ minWidth: 560 }}
      >
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Policy</Table.Th>
            <Table.Th>Date</Table.Th>
            <Table.Th>Opens</Table.Th>
            <Table.Th>Total Duration</Table.Th>
            <Table.Th>First Open</Table.Th>
            <Table.Th>Last Close</Table.Th>
            <Table.Th style={{ width: 50 }}></Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {data.map((row) => {
            const key = `${row.policyId}_${row.date}`;
            const isExpanded = expandedRows.has(key);

            return (
              <>
                <Table.Tr
                  key={key}
                  style={{
                    cursor: 'pointer',
                  }}
                  onClick={() => toggleRow(key)}
                >
                  <Table.Td>
                    <Text fw={700} size="sm">
                      {row.policyTitle}
                    </Text>
                  </Table.Td>
                  <Table.Td>{formatDate(row.date)}</Table.Td>
                  <Table.Td>
                    <Text fw={600}>{row.totalOpens}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text fw={600}>{formatDuration(row.totalDurationSec)}</Text>
                  </Table.Td>
                  <Table.Td>{formatTime(row.firstOpen)}</Table.Td>
                  <Table.Td>{formatTime(row.lastClose)}</Table.Td>
                  <Table.Td>
                    <Tooltip label={isExpanded ? 'Collapse' : 'Expand details'}>
                      <ActionIcon
                        variant="subtle"
                        color="brandBlue"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRow(key);
                        }}
                        style={{
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s',
                        }}
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </ActionIcon>
                    </Tooltip>
                  </Table.Td>
                </Table.Tr>
                {isExpanded && (
                  <Table.Tr>
                    <Table.Td colSpan={7}>
                      <Paper p="md" radius="md" withBorder bg="gray.0">
                        <Text fw={700} size="sm" mb="sm">
                          Session Details
                        </Text>
                        <ScrollArea.Autosize type="auto" viewportProps={{ style: { minWidth: 360 } }}>
                          <Table fz="xs" horizontalSpacing="xs">
                            <Table.Thead>
                              <Table.Tr>
                                <Table.Th>Time</Table.Th>
                                <Table.Th>Duration</Table.Th>
                              </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                              {row.details.map((detail, idx) => (
                                <Table.Tr key={idx}>
                                  <Table.Td>
                                    {formatTime(detail.openedAt)}
                                    {detail.closedAt && ` - ${formatTime(detail.closedAt)}`}
                                  </Table.Td>
                                  <Table.Td>{formatDuration(detail.durationSec)}</Table.Td>
                                </Table.Tr>
                              ))}
                            </Table.Tbody>
                          </Table>
                        </ScrollArea.Autosize>
                      </Paper>
                    </Table.Td>
                  </Table.Tr>
                )}
              </>
            );
          })}
        </Table.Tbody>
      </Table>
    </ScrollArea.Autosize>
  );
};
