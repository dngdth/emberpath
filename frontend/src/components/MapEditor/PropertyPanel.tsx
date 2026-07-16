import { useEffect, useMemo, useState } from 'react';
import { FloorPlanObject } from '../../types/editor';
import { useThemeStore } from '../../store/themeStore';
import api from '../../utils/api';
import clsx from 'clsx';
import { ToggleLeft, ToggleRight, Radio, Shield, Settings, Compass, Palette } from 'lucide-react';

type Props = {
  object: FloorPlanObject | null;
  onChange: (patch: Partial<FloorPlanObject>) => void;
};

interface SensorDeviceOption {
  device_id: string;
  name: string;
  sensor_type: 'mq2' | 'temp';
  room_name: string | null;
}

function updateNumber(
  value: string,
  key: keyof FloorPlanObject,
  onChange: (patch: Partial<FloorPlanObject>) => void,
) {
  const parsed = Number(value);
  if (!Number.isNaN(parsed)) {
    onChange({ [key]: parsed } as Partial<FloorPlanObject>);
  }
}

export function PropertyPanel({ object, onChange }: Props) {
  const { darkMode } = useThemeStore();
  const isDark = darkMode;

  const [physicalDevices, setPhysicalDevices] = useState<SensorDeviceOption[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  // Fetch real sensor devices from database for linking
  useEffect(() => {
    if (object && (object.type === 'mq2' || object.type === 'temp')) {
      setLoadingDevices(true);
      api.get<SensorDeviceOption[]>('/sensors/readings/live')
        .then((res) => {
          setPhysicalDevices(res.data);
        })
        .catch((err) => {
          console.error('Failed to load physical sensors list:', err);
        })
        .finally(() => {
          setLoadingDevices(false);
        });
    }
  }, [object?.type]);

  const labelClass = isDark ? 'text-slate-450' : 'text-slate-500';
  const sectionTitleClass = isDark ? 'text-blue-400' : 'text-blue-600';
  
  const disabledInputClass = isDark
    ? 'h-9 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 text-xs text-slate-500 cursor-not-allowed'
    : 'h-9 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 text-xs text-slate-450 cursor-not-allowed';

  const inputClass = isDark
    ? 'h-9 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 text-xs text-slate-100 focus:border-blue-500 transition outline-none'
    : 'h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-850 focus:border-blue-600 transition outline-none';

  // Filter options based on type
  const matchingPhysicalDevices = useMemo(() => {
    if (!object) return [];
    return physicalDevices.filter((d) => d.sensor_type === object.type);
  }, [physicalDevices, object?.type]);

  if (!object) {
    return (
      <div
        className={`rounded-2xl border border-dashed px-3 py-6 text-center text-xs ${
          isDark ? 'border-slate-800 text-slate-500 bg-slate-950/10' : 'border-slate-200 text-slate-450 bg-slate-50'
        }`}
      >
        Chọn một đối tượng trên sơ đồ thiết kế để cấu hình các thuộc tính.
      </div>
    );
  }

  const isLed = object.type === 'led';
  const isLabel = object.type === 'label';
  const isSensor = object.type === 'mq2' || object.type === 'temp';
  const showSize = object.type !== 'led' && object.type !== 'exit';
  const showText = object.type === 'room' || object.type === 'label' || object.type === 'exit';

  return (
    <div className={`space-y-4 text-xs ${isDark ? 'text-slate-350' : 'text-slate-700'}`}>
      
      {/* 1. CORE SECTION */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-500 mb-1">
          <Settings size={12} />
          <span>Thông tin chung</span>
        </div>

        {/* Real Sensor Link Option */}
        {isSensor ? (
          <div>
            <label className={clsx('mb-1.5 block font-bold', labelClass)}>
              Liên kết cảm biến thực tế
            </label>
            <select
              value={object.id}
              onChange={(e) => {
                const selectedDev = matchingPhysicalDevices.find(d => d.device_id === e.target.value);
                onChange({
                  id: e.target.value,
                  name: selectedDev ? selectedDev.name : object.name,
                });
              }}
              className={clsx(inputClass, 'font-mono text-[11px]')}
            >
              <option value={object.id}>Tự sinh: {object.id.slice(0, 16)}...</option>
              {matchingPhysicalDevices.map((d) => (
                <option key={d.device_id} value={d.device_id}>
                  {d.device_id} - {d.name} {d.room_name ? `(${d.room_name})` : ''}
                </option>
              ))}
            </select>
            <p className="text-[9px] opacity-60 mt-1">
              Liên kết ID để cảm biến nhận diện chỉ số đo đạc live từ Database.
            </p>
          </div>
        ) : (
          <div>
            <label className={clsx('mb-1 block font-bold', labelClass)}>ID Vật lý</label>
            <input value={object.id} disabled className={disabledInputClass} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={clsx('mb-1 block font-bold', labelClass)}>Loại đối tượng</label>
            <input value={object.type} disabled className={disabledInputClass} />
          </div>

          <div>
            <label className={clsx('mb-1 block font-bold', labelClass)}>Tên / Nhãn</label>
            <input
              value={object.name || ''}
              onChange={(e) => onChange({ name: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* 2. GEOMETRY SECTION */}
      <div className={`rounded-2xl border p-3 space-y-2.5 transition-colors duration-300 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-500">
          <Compass size={12} />
          <span>Kích thước & Tọa độ</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={clsx('mb-0.5 block text-[10px]', labelClass)}>Tọa độ X</label>
            <input
              value={object.x ?? 0}
              onChange={(e) => updateNumber(e.target.value, 'x', onChange)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={clsx('mb-0.5 block text-[10px]', labelClass)}>Tọa độ Y</label>
            <input
              value={object.y ?? 0}
              onChange={(e) => updateNumber(e.target.value, 'y', onChange)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={clsx('mb-0.5 block text-[10px]', labelClass)}>Góc xoay (°)</label>
            <input
              value={object.rotation ?? 0}
              onChange={(e) => updateNumber(e.target.value, 'rotation', onChange)}
              className={inputClass}
            />
          </div>

          {showSize && (
            <>
              <div>
                <label className={clsx('mb-0.5 block text-[10px]', labelClass)}>Chiều rộng (W)</label>
                <input
                  value={object.width ?? 0}
                  onChange={(e) => updateNumber(e.target.value, 'width', onChange)}
                  className={inputClass}
                />
              </div>

              <div className="col-start-2">
                <label className={clsx('mb-0.5 block text-[10px]', labelClass)}>Chiều cao (H)</label>
                <input
                  value={object.height ?? 0}
                  onChange={(e) => updateNumber(e.target.value, 'height', onChange)}
                  className={inputClass}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* 3. STYLE SECTION */}
      <div className={`rounded-2xl border p-3 space-y-2.5 transition-colors duration-300 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-500">
          <Palette size={12} />
          <span>Màu sắc & Định dạng</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={clsx('mb-0.5 block text-[10px]', labelClass)}>Màu sắc</label>
            <input
              value={object.color || ''}
              onChange={(e) => onChange({ color: e.target.value })}
              placeholder="#ffffff"
              className={inputClass}
            />
          </div>

          <div>
            <label className={clsx('mb-0.5 block text-[10px]', labelClass)}>Màu chữ</label>
            <input
              value={object.textColor || ''}
              onChange={(e) => onChange({ textColor: e.target.value })}
              placeholder="#000000"
              className={inputClass}
            />
          </div>

          {showText && (
            <div className="col-span-2">
              <label className={clsx('mb-0.5 block text-[10px]', labelClass)}>Kích thước Font</label>
              <input
                value={object.fontSize ?? 16}
                onChange={(e) => updateNumber(e.target.value, 'fontSize', onChange)}
                className={inputClass}
              />
            </div>
          )}

          {isLed && (
            <div className="col-span-2">
              <label className={clsx('mb-0.5 block text-[10px]', labelClass)}>Trạng thái Led</label>
              <select
                value={object.nodeStatus || 'safe'}
                onChange={(e) => onChange({ nodeStatus: e.target.value as 'safe' | 'danger' })}
                className={inputClass}
              >
                <option value="safe">✅ Safe (Xanh)</option>
                <option value="danger">🚨 Danger (Đỏ)</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* 4. VISIBILITY & LOCK SWITCHES */}
      <div className="flex gap-2 pt-1.5">
        <button
          onClick={() => onChange({ locked: !object.locked })}
          className={`flex flex-1 items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-xs font-bold transition select-none ${
            object.locked
              ? 'border-red-500/25 bg-red-500/10 text-red-500'
              : isDark
                ? 'border-slate-800 bg-slate-900 text-slate-350 hover:bg-slate-850'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          {object.locked ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
          <span>Khóa vị trí</span>
        </button>

        <button
          onClick={() => onChange({ visible: object.visible === false ? true : false })}
          className={`flex flex-1 items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-xs font-bold transition select-none ${
            object.visible !== false
              ? 'border-blue-500/20 bg-blue-500/10 text-blue-400'
              : isDark
                ? 'border-slate-800 bg-slate-900 text-slate-350 hover:bg-slate-850'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          {object.visible !== false ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
          <span>Hiển thị</span>
        </button>
      </div>

      {isLabel && (
        <div className={`rounded-xl px-3.5 py-2.5 text-[10px] leading-relaxed transition-colors duration-300 ${
          isDark ? 'bg-slate-900/40 text-slate-400' : 'bg-slate-50 text-slate-500'
        }`}>
          💡 <strong>Mẹo:</strong> Nhãn văn bản (Text Label) có thể kéo thả trực tiếp trên Canvas. Để chỉnh nội dung, hãy nhập vào ô "Tên / Nhãn".
        </div>
      )}
    </div>
  );
}
export default PropertyPanel;