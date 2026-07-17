import { useEffect, useMemo, useState } from 'react';
import { FloorPlanObject, FloorItem } from '../../types/editor';
import { useThemeStore } from '../../store/themeStore';
import { getDefaultSize } from '../../utils/geometryHelpers';
import { sensorsApi } from '../../services/backend';
import clsx from 'clsx';
import { ToggleLeft, ToggleRight, Radio, Shield, Settings, Compass, Palette } from 'lucide-react';

type Props = {
  object: FloorPlanObject | null;
  onChange: (patch: Partial<FloorPlanObject>) => void;
  canvasWidth?: number;
  canvasHeight?: number;
  onCanvasSizeChange?: (width: number, height: number) => void;
  floors?: FloorItem[];
};

interface DebouncedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string | number;
  onChange: (value: string) => void;
}

export function DebouncedInput({ value, onChange, ...props }: DebouncedInputProps) {
  const [localValue, setLocalValue] = useState(String(value));

  useEffect(() => {
    setLocalValue(String(value));
  }, [value]);

  const handleBlur = () => {
    if (localValue !== String(value)) {
      onChange(localValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <input
      {...props}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    />
  );
}

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

export function PropertyPanel({
  object,
  onChange,
  canvasWidth,
  canvasHeight,
  onCanvasSizeChange,
  floors,
}: Props) {
  const { darkMode } = useThemeStore();
  const isDark = darkMode;

  const [physicalDevices, setPhysicalDevices] = useState<SensorDeviceOption[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  // Fetch real sensor devices from database for linking
  useEffect(() => {
    if (object && (object.type === 'mq2' || object.type === 'temp')) {
      setLoadingDevices(true);
      sensorsApi.liveReadings()
        .then((readings) => {
          setPhysicalDevices(readings);
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
      <div className={`space-y-4 text-xs ${isDark ? 'text-slate-350' : 'text-slate-700'}`}>
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-500 mb-1">
            <Settings size={12} />
            <span>Thuộc tính Bản vẽ</span>
          </div>
          <div className={`rounded-2xl border p-3 space-y-2.5 transition-colors duration-300 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-500">
              <Compass size={12} />
              <span>Kích thước Trang thiết kế</span>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={clsx('mb-0.5 block text-[10px]', labelClass)}>Chiều rộng (px)</label>
                  <DebouncedInput
                    type="number"
                    value={canvasWidth ?? 1600}
                    onChange={(val) => {
                      const w = Math.max(400, Math.min(10000, Number(val) || 1600));
                      onCanvasSizeChange?.(w, canvasHeight ?? 1000);
                    }}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={clsx('mb-0.5 block text-[10px]', labelClass)}>Chiều cao (px)</label>
                  <DebouncedInput
                    type="number"
                    value={canvasHeight ?? 1000}
                    onChange={(val) => {
                      const h = Math.max(400, Math.min(10000, Number(val) || 1000));
                      onCanvasSizeChange?.(canvasWidth ?? 1600, h);
                    }}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
            <p className="text-[9px] opacity-60 mt-1 leading-relaxed">
              Kích thước của trang giấy thiết kế (Canvas). Bấm chọn các đối tượng như Nền tầng (Floor Base) hay Phòng để tùy biến hình dạng/tọa độ của chúng.
            </p>
          </div>
        </div>
        <div
          className={`rounded-2xl border border-dashed px-3 py-6 text-center text-[11px] ${
            isDark ? 'border-slate-800 text-slate-500 bg-slate-950/10' : 'border-slate-200 text-slate-450 bg-slate-50'
          }`}
        >
          Chọn một đối tượng trên sơ đồ thiết kế để cấu hình các thuộc tính chi tiết.
        </div>
      </div>
    );
  }

  const isLed = object.type === 'led';
  const isLabel = object.type === 'label';
  const isSensor = object.type === 'mq2' || object.type === 'temp';
  const showSize = object.type !== 'connector';
  const showText = object.type === 'room' || object.type === 'label' || object.type === 'exit' || object.type === 'floor_base';

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
            <DebouncedInput
              value={object.name || ''}
              onChange={(val) => onChange({ name: val })}
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
            <DebouncedInput
              value={object.x ?? 0}
              onChange={(val) => updateNumber(val, 'x', onChange)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={clsx('mb-0.5 block text-[10px]', labelClass)}>Tọa độ Y</label>
            <DebouncedInput
              value={object.y ?? 0}
              onChange={(val) => updateNumber(val, 'y', onChange)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={clsx('mb-0.5 block text-[10px]', labelClass)}>Góc xoay (°)</label>
            <DebouncedInput
              value={object.rotation ?? 0}
              onChange={(val) => updateNumber(val, 'rotation', onChange)}
              className={inputClass}
            />
          </div>

          {showSize && (
            <>
              <div>
                <label className={clsx('mb-0.5 block text-[10px]', labelClass)}>Chiều rộng (W)</label>
                <DebouncedInput
                  value={object.width ?? 0}
                  onChange={(val) => updateNumber(val, 'width', onChange)}
                  className={inputClass}
                />
              </div>

              <div className="col-start-2">
                <label className={clsx('mb-0.5 block text-[10px]', labelClass)}>Chiều cao (H)</label>
                <DebouncedInput
                  value={object.height ?? 0}
                  onChange={(val) => updateNumber(val, 'height', onChange)}
                  className={inputClass}
                />
              </div>
            </>
          )}

          {/* Room / Floor Base shape selector */}
          {(object.type === 'room' || object.type === 'floor_base') && (
            <div className="col-span-2">
              <label className={clsx('mb-0.5 block text-[10px] font-bold', labelClass)}>Hình dạng đối tượng</label>
              <select
                value={object.shapeType || 'rect'}
                onChange={(e) => {
                  const nextShape = e.target.value as 'rect' | 'polygon';
                  const size = getDefaultSize(object.type);
                  const nextPatch: Partial<FloorPlanObject> = { shapeType: nextShape };
                  if (nextShape === 'polygon') {
                    nextPatch.points = [
                      size.width * 0.25, 0,
                      size.width * 0.75, 0,
                      size.width, size.height * 0.5,
                      size.width * 0.75, size.height,
                      size.width * 0.25, size.height,
                      0, size.height * 0.5
                    ];
                  } else {
                    nextPatch.points = undefined;
                  }
                  onChange(nextPatch);
                }}
                className={inputClass}
              >
                <option value="rect">⏹️ Hình chữ nhật (Rect)</option>
                <option value="polygon">⬡ Hình đa giác (Polygon)</option>
              </select>
            </div>
          )}

          {/* Stairs / Elevator target floor linking */}
          {(object.type === 'stairs' || object.type === 'elevator') && (
            <div className="col-span-2">
              <label className={clsx('mb-0.5 block text-[10px] font-bold', labelClass)}>Tầng liên kết đích</label>
              <select
                value={object.target_floor_id || ''}
                onChange={(e) => onChange({ target_floor_id: e.target.value ? Number(e.target.value) : undefined })}
                className={inputClass}
              >
                <option value="">-- Không liên kết --</option>
                {floors?.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
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
            <div className="relative flex items-center">
              <div 
                className="absolute left-2 w-5 h-5 rounded-md border shadow-sm flex-shrink-0"
                style={{ 
                  backgroundColor: object.color || (isDark ? '#111827' : '#ffffff'),
                  borderColor: isDark ? '#334155' : '#cbd5e1' 
                }}
              >
                <input
                  type="color"
                  value={object.color && /^#[0-9A-F]{6}$/i.test(object.color) ? object.color : '#ffffff'}
                  onChange={(e) => onChange({ color: e.target.value })}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
              <DebouncedInput
                value={object.color || ''}
                onChange={(val) => onChange({ color: val })}
                placeholder="#ffffff"
                className={clsx(inputClass, 'pl-9 font-mono')}
              />
            </div>
          </div>

          <div>
            <label className={clsx('mb-0.5 block text-[10px]', labelClass)}>Màu chữ</label>
            <div className="relative flex items-center">
              <div 
                className="absolute left-2 w-5 h-5 rounded-md border shadow-sm flex-shrink-0"
                style={{ 
                  backgroundColor: object.textColor || (isDark ? '#f8fafc' : '#000000'),
                  borderColor: isDark ? '#334155' : '#cbd5e1' 
                }}
              >
                <input
                  type="color"
                  value={object.textColor && /^#[0-9A-F]{6}$/i.test(object.textColor) ? object.textColor : '#000000'}
                  onChange={(e) => onChange({ textColor: e.target.value })}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
              <DebouncedInput
                value={object.textColor || ''}
                onChange={(val) => onChange({ textColor: val })}
                placeholder="#000000"
                className={clsx(inputClass, 'pl-9 font-mono')}
              />
            </div>
          </div>

          {showText && (
            <div className="col-span-2">
              <label className={clsx('mb-0.5 block text-[10px]', labelClass)}>Kích thước Font</label>
              <DebouncedInput
                value={object.fontSize ?? 16}
                onChange={(val) => updateNumber(val, 'fontSize', onChange)}
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
