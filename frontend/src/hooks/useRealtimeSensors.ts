import { useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import { DashboardSummary, SensorDevice } from '../types/sensor';
import { getToken } from '../utils/authHelpers';

// Danh sach device_id that tu ESP32 (khop voi buoi1.ino)
const REAL_DEVICE_IDS = new Set([
  'temp-master', 'mq2-master',
  'temp-sat-1', 'mq2-sat-1',
  'temp-sat-2', 'mq2-sat-2',
  'temp-sat-3', 'mq2-sat-3'
]);

export function useRealtimeSensors(selectedFloor?: number | null, search?: string) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [mq2, setMq2] = useState<SensorDevice[]>([]);
  const [temperature, setTemperature] = useState<SensorDevice[]>([]);
  const [loading, setLoading] = useState(true);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedFloor) params.set('floor_id', String(selectedFloor));
    if (search) params.set('search', search);
    return params.toString();
  }, [selectedFloor, search]);

  // Fetch am tham - khong set loading (WebSocket background refresh)
  async function refreshData() {
    const [summaryRes, mq2Res, tempRes] = await Promise.all([
      api.get<DashboardSummary>('/dashboard/summary'),
      api.get<SensorDevice[]>(`/sensors/mq2${queryParams ? `?${queryParams}` : ''}`),
      api.get<SensorDevice[]>(`/sensors/temperature${queryParams ? `?${queryParams}` : ''}`),
    ]);
    setSummary(summaryRes.data);
    setMq2(mq2Res.data.filter((s) => REAL_DEVICE_IDS.has(s.device_id)));
    setTemperature(tempRes.data.filter((s) => REAL_DEVICE_IDS.has(s.device_id)));
  }

  // Fetch co loading - dung lan dau hoac khi doi bo loc
  async function fetchAll() {
    setLoading(true);
    try {
      await refreshData();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchAll();
  }, [queryParams]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    const base = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
    const wsUrl = base.replace('http', 'ws') + `/ws/sensors?token=${token}`;
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === 'sensor_tick') {
        void refreshData(); // am tham, khong set loading
      }
    };

    return () => {
      socket.close();
    };
  }, [queryParams]);

  return { summary, mq2, temperature, loading, refresh: fetchAll };
}
