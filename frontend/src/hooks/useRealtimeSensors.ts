import { useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import { DashboardSummary, SensorDevice } from '../types/sensor';
import { getToken } from '../utils/authHelpers';

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

  async function fetchAll() {
    setLoading(true);
    try {
      const [summaryRes, mq2Res, tempRes] = await Promise.all([
        api.get<DashboardSummary>('/dashboard/summary'),
        api.get<SensorDevice[]>(`/sensors/mq2${queryParams ? `?${queryParams}` : ''}`),
        api.get<SensorDevice[]>(`/sensors/temperature${queryParams ? `?${queryParams}` : ''}`),
      ]);
      setSummary(summaryRes.data);
      setMq2(mq2Res.data);
      setTemperature(tempRes.data);
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
        void fetchAll();
      }
    };

    return () => {
      socket.close();
    };
  }, [queryParams]);

  return { summary, mq2, temperature, loading, refresh: fetchAll };
}
