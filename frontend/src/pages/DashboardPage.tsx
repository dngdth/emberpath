import { useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { FloorItem } from '../types/editor';
import { DashboardSummaryCards } from '../components/DashboardSummary';
import { SensorList } from '../components/SensorList';
import { useRealtimeSensors } from '../hooks/useRealtimeSensors';

export function DashboardPage() {
  const { user, logout } = useAuthStore();
  const [floors, setFloors] = useState<FloorItem[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const { summary, mq2, temperature, loading } = useRealtimeSensors(selectedFloor, search);

  useEffect(() => {
    api.get<FloorItem[]>('/floors').then((response) => {
      setFloors(response.data);
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#f2e4dc] p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[28px] border border-[#e2c6bb] bg-[#ead9cf] p-6 shadow-[0_8px_24px_rgba(122,43,29,0.08)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-[#b33a2f]">Building Dashboard</p>
              <h1 className="mt-2 text-3xl font-bold text-[#a5261f]">{user?.building.name}</h1>
              <p className="mt-1 text-[#8a5a4b]">Xin chào {user?.name} • role: {user?.role}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm tên cảm biến..."
                className="w-56"
              />

              <select
                value={selectedFloor ?? ''}
                onChange={(e) => setSelectedFloor(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Tất cả tầng</option>
                {floors.map((floor) => (
                  <option key={floor.id} value={floor.id}>
                    {floor.name}
                  </option>
                ))}
              </select>

              <a
                href="/editor"
                className="rounded-2xl bg-[#c94132] px-4 py-3 font-semibold text-white hover:bg-[#b23326]"
              >
                Mở floor editor
              </a>

              <button
                onClick={logout}
                className="rounded-2xl border border-[#d0a999] bg-[#fff8f3] px-4 py-3 text-[#8b241e] hover:bg-[#f7e8df]"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <DashboardSummaryCards summary={summary} />

        {loading && (
          <div className="rounded-2xl border border-[#dfb9a8] bg-[#fff8f3] px-4 py-3 text-sm text-[#8a5a4b]">
            Đang tải dữ liệu cảm biến...
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-2">
          <SensorList title="MQ2 / cảm biến khí gas - khói" sensors={mq2} />
          <SensorList title="Temperature sensor / cảm biến nhiệt" sensors={temperature} />
        </div>
      </div>
    </div>
  );
}