import { useEffect, useMemo, useState } from 'react';
import { DashboardSummary, SensorDevice } from '../types/sensor';
import { getSensorsWebSocketUrl, sensorsApi } from '../services/backend';

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
  const [dangerSensors, setDangerSensors] = useState<SensorDevice[]>([]);
  const [loading, setLoading] = useState(true);

  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');

  const filters = useMemo(() => {
    return {
      floorId: selectedFloor,
      search,
    };
  }, [selectedFloor, search]);

  // Fetch am tham - khong set loading (WebSocket background refresh)
  async function refreshData() {
    const [summaryData, mq2Data, tempData, allMq2Data, allTempData] = await Promise.all([
      sensorsApi.dashboardSummary(),
      sensorsApi.mq2(filters),
      sensorsApi.temperature(filters),
      sensorsApi.mq2({ floorId: null }),
      sensorsApi.temperature({ floorId: null }),
    ]);
    setSummary(summaryData);
    setMq2(mq2Data.filter((s) => REAL_DEVICE_IDS.has(s.device_id)));
    setTemperature(tempData.filter((s) => REAL_DEVICE_IDS.has(s.device_id)));

    const allMq2Filtered = allMq2Data.filter((s) => REAL_DEVICE_IDS.has(s.device_id));
    const allTempFiltered = allTempData.filter((s) => REAL_DEVICE_IDS.has(s.device_id));
    const danger = [...allMq2Filtered, ...allTempFiltered].filter(s => s.latest_status === 'danger');
    setDangerSensors(danger);
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
  }, [filters]);

  useEffect(() => {
    const wsUrl = getSensorsWebSocketUrl();
    if (!wsUrl) return;
    const socketUrl = wsUrl;
    
    let socket: WebSocket | null = null;
    let reconnectTimeout: number | null = null;

    function connect() {
      setWsStatus('connecting');
      socket = new WebSocket(socketUrl);

      socket.onopen = () => {
        setWsStatus('connected');
      };

      socket.onmessage = (event) => {
        const payload = JSON.parse(event.data);
        if (payload.type === 'sensor_tick') {
          void refreshData(); // am tham, khong set loading
        }
      };

      socket.onclose = () => {
        setWsStatus('disconnected');
        // Auto reconnect after 3 seconds
        reconnectTimeout = window.setTimeout(() => {
          connect();
        }, 3000);
      };

      socket.onerror = () => {
        setWsStatus('disconnected');
      };
    }

    connect();

    return () => {
      if (socket) {
        // Remove close listener to prevent reconnect when unmounting
        socket.onclose = null;
        socket.close();
      }
      if (reconnectTimeout) {
        window.clearTimeout(reconnectTimeout);
      }
    };
  }, [filters]);

  return { summary, mq2, temperature, dangerSensors, loading, wsStatus, refresh: fetchAll };
}
