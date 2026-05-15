import { Flame, Thermometer } from 'lucide-react';
import clsx from 'clsx';
import { SensorDevice } from '../../types/sensor';

export function SensorCard({ sensor }: { sensor: SensorDevice }) {
  const isDanger = sensor.latest_status === 'danger';
  const Icon = sensor.sensor_type === 'mq2' ? Flame : Thermometer;

  return (
    <div
      className={clsx(
        'rounded-2xl border p-4 shadow-sm',
        isDanger
          ? 'border-[#e4a39a] bg-[#fdeceb]'
          : 'border-[#b7ddc4] bg-[#edf8f0]',
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-[#8f241e]">{sensor.name}</div>
          <div className="text-xs text-[#9a6d5d]">{sensor.device_id}</div>
        </div>

        <div
          className={clsx(
            'rounded-xl p-2',
            isDanger ? 'bg-[#f6c7c1] text-[#b23326]' : 'bg-[#caebd5] text-[#1f7a45]',
          )}
        >
          <Icon size={18} />
        </div>
      </div>

      <div className="space-y-2 text-sm text-[#8a5a4b]">
        <div className="flex justify-between">
          <span>Vị trí</span>
          <span>{sensor.room_name || '—'}</span>
        </div>

        <div className="flex justify-between">
          <span>Giá trị</span>
          <span className="font-semibold text-[#7c2d23]">
            {sensor.latest_value} {sensor.unit}
          </span>
        </div>

        <div className="flex justify-between">
          <span>Ngưỡng</span>
          <span>
            {sensor.threshold} {sensor.unit}
          </span>
        </div>

        <div className="flex justify-between">
          <span>Trạng thái</span>
          <span className={isDanger ? 'badge-danger' : 'badge-safe'}>
            {isDanger ? 'Danger' : 'Safe'}
          </span>
        </div>
      </div>
    </div>
  );
}