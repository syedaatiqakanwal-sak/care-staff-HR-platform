import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import type { DbsRecordDto, StaffDocumentDto } from '../types/documents';

export function useStaffDocuments(targetUserId: string | undefined) {
  const [documents, setDocuments] = useState<StaffDocumentDto[]>([]);
  const [dbs, setDbs] = useState<DbsRecordDto | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!targetUserId) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    try {
      const [docRes, dbsRes] = await Promise.all([
        axios.get(`/api/v1/staff/${targetUserId}/documents`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`/api/v1/staff/${targetUserId}/dbs`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      setDocuments(docRes.data?.documents ?? []);
      setDbs(dbsRes.data?.dbs ?? null);
    } catch (e) {
      console.error('Failed to load documents', e);
      setDocuments([]);
      setDbs(null);
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { documents, dbs, loading, refetch: fetchAll };
}
