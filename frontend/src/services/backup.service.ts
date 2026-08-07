import axios from 'axios';

const BASE = '/api/v1/backup';

function authHeaders() {
  const token = localStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
}

export type BackupType = 'daily' | 'weekly' | 'monthly' | 'manual';
export type BackupStatus = 'pending' | 'running' | 'success' | 'failed';

export type BackupLog = {
  id: string;
  type: BackupType;
  status: BackupStatus;
  filename: string | null;
  sizeBytes: string | null;
  triggeredBy: string | null;
  r2Uploaded: boolean;
  r2Key: string | null;
  errorMessage: string | null;
  createdAt: string;
};

export type BackupSettings = {
  id: string;
  dailyEnabled: boolean;
  weeklyEnabled: boolean;
  monthlyEnabled: boolean;
  maxDaily: number;
  maxWeekly: number;
  maxMonthly: number;
  r2Enabled: boolean;
  r2AutoUpload: boolean;
  deleteLocalAfterR2: boolean;
};

export type BackupStatusResponse = {
  success: boolean;
  running: boolean;
  lockKey: string;
  backupDir: string;
  settings: BackupSettings;
};

export type R2File = {
  key: string;
  size?: number;
  lastModified?: string;
};

export type UpdateBackupSettingsPayload = Partial<{
  dailyEnabled: boolean;
  weeklyEnabled: boolean;
  monthlyEnabled: boolean;
  maxDaily: number;
  maxWeekly: number;
  maxMonthly: number;
  r2Enabled: boolean;
  r2AutoUpload: boolean;
  deleteLocalAfterR2: boolean;
}>;

export const backupService = {
  async getStatus(): Promise<BackupStatusResponse> {
    const res = await axios.get(`${BASE}/status`, { headers: authHeaders() });
    return res.data;
  },

  async getLogs(limit = 100): Promise<BackupLog[]> {
    const res = await axios.get(`${BASE}/logs`, {
      headers: authHeaders(),
      params: { limit },
    });
    return res.data.logs || [];
  },

  async getSettings(): Promise<BackupSettings> {
    const res = await axios.get(`${BASE}/settings`, { headers: authHeaders() });
    return res.data.settings;
  },

  async updateSettings(payload: UpdateBackupSettingsPayload): Promise<BackupSettings> {
    const res = await axios.patch(`${BASE}/settings`, payload, {
      headers: authHeaders(),
    });
    return res.data.settings;
  },

  async createBackup(type: BackupType = 'manual'): Promise<{ success: boolean; log: BackupLog }> {
    const res = await axios.post(
      BASE,
      { type },
      { headers: authHeaders() },
    );
    return res.data;
  },

  async downloadBackup(filename: string): Promise<void> {
    const res = await axios.get(`${BASE}/download/${encodeURIComponent(filename)}`, {
      headers: authHeaders(),
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  async deleteBackup(filename: string): Promise<void> {
    await axios.delete(`${BASE}/files/${encodeURIComponent(filename)}`, {
      headers: authHeaders(),
    });
  },

  async testR2Connection(): Promise<{
    success: boolean;
    ok: boolean;
    bucket: string;
    message: string;
  }> {
    const res = await axios.post(`${BASE}/r2/test`, {}, { headers: authHeaders() });
    return res.data;
  },

  async listR2Files(): Promise<R2File[]> {
    const res = await axios.get(`${BASE}/r2/files`, { headers: authHeaders() });
    return res.data.files || [];
  },

  async uploadToR2(logId: string): Promise<BackupLog> {
    const res = await axios.post(
      `${BASE}/logs/${encodeURIComponent(logId)}/upload-r2`,
      {},
      { headers: authHeaders() },
    );
    return res.data.log;
  },
};
