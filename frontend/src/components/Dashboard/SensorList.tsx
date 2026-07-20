import { SensorDevice } from '../../types/sensor';
import { SensorCard } from './SensorCard';

export function SensorList({ title, sensors }: { title: string; sensors: SensorDevice[] }) {
  return (
    <div className="rounded-xl border border-[#e2c6bb] bg-[#fff8f3] shadow-[0_8px_24px_rgba(122,43,29,0.06)] flex h-[480px] flex-col overflow-hidden">
      <div className="border-b border-[#ecd2c6] px-5 py-4">
        <h3 className="text-lg font-semibold text-[#a5261f]">{title}</h3>
        <p className="text-sm text-[#8a5a4b]">Scroll riêng cho danh sách dài</p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-5">
        {sensors.length ? (
          sensors.map((sensor) => <SensorCard key={sensor.id} sensor={sensor} />)
        ) : (
          <div className="rounded-xl border border-dashed border-[#dfb9a8] p-6 text-center text-sm text-[#8a5a4b]">
            Không có cảm biến phù hợp bộ lọc.
          </div>
        )}
      </div>
    </div>
  );
}