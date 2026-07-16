import { useMemo } from 'react';
import { FloorPlanObject } from '../../types/editor';
import { SensorDevice } from '../../types/sensor';
import { Shield, ShieldAlert, AlertTriangle, Activity } from 'lucide-react';

interface MonitorInfoSectionProps {
  selectedObject: FloorPlanObject | null;
  objects: FloorPlanObject[];
  sensors: SensorDevice[];
  dangerRooms: Set<string>;
  activeFloorName?: string;
  isDark: boolean;
}

export function MonitorInfoSection({
  selectedObject,
  objects,
  sensors,
  dangerRooms,
  activeFloorName = 'N/A',
  isDark,
}: MonitorInfoSectionProps) {
  
  // Overall statistics
  const roomCount = useMemo(() => objects.filter((o) => o.type === 'room').length, [objects]);
  const sensorCount = useMemo(() => objects.filter((o) => o.type === 'mq2' || o.type === 'temp').length, [objects]);
  const dangerCount = dangerRooms.size;

  // Filter list of danger sensors
  const dangerDeviceIds = useMemo(() => {
    return new Set(sensors.filter((s) => s.latest_status === 'danger').map((s) => s.device_id));
  }, [sensors]);

  const warningDeviceIds = useMemo(() => {
    return new Set(
      sensors
        .filter((s) => s.latest_status === 'safe' && s.latest_value >= s.threshold * 0.8)
        .map((s) => s.device_id)
    );
  }, [sensors]);

  const sensorValues = useMemo(() => {
    const map = new Map<string, { val: number; unit: string }>();
    sensors.forEach((s) => {
      map.set(s.device_id, { val: s.latest_value, unit: s.unit });
    });
    return map;
  }, [sensors]);

  if (!selectedObject) {
    // Floor overview
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          {dangerCount > 0 ? (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 animate-pulse">
              <ShieldAlert size={18} />
            </div>
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <Shield size={18} />
            </div>
          )}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wide">Trạng thái Tầng</h4>
            <span className={`text-[11px] font-extrabold ${dangerCount > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
              {dangerCount > 0 ? '⚠️ EMERGENCY STATE' : '✅ HỆ THỐNG AN TOÀN'}
            </span>
          </div>
        </div>

        <div className={`rounded-2xl border p-4 space-y-3 transition-colors duration-300 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex justify-between items-center text-xs">
            <span className="opacity-75">Tên khu vực:</span>
            <span className="font-bold">{activeFloorName}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="opacity-75">Tổng số phòng:</span>
            <span className="font-bold">{roomCount}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="opacity-75">Tổng cảm biến:</span>
            <span className="font-bold">{sensorCount}</span>
          </div>
          {dangerCount > 0 && (
            <div className="flex justify-between items-center text-xs text-rose-500 font-bold">
              <span>Khu vực sự cố:</span>
              <span>{dangerCount} phòng</span>
            </div>
          )}
        </div>

        <div className="text-[10px] opacity-60 leading-relaxed text-center">
          Nhấp chọn một thiết bị cảm biến hoặc khu vực phòng trên sơ đồ để xem các chỉ số live.
        </div>
      </div>
    );
  }

  // Sensor node detail view
  if (selectedObject.type === 'mq2' || selectedObject.type === 'temp') {
    const live = sensors.find((s) => s.device_id === selectedObject.id);
    const isDanger = live?.latest_status === 'danger';
    const isWarning = live?.latest_status === 'safe' && live.latest_value >= live.threshold * 0.8;

    return (
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">{selectedObject.type === 'mq2' ? '💨' : '🌡️'}</span>
            <div>
              <h4 className="font-bold text-xs">{selectedObject.name || 'Sensor'}</h4>
              <span className="text-[10px] font-mono opacity-50 block">{selectedObject.id}</span>
            </div>
          </div>
        </div>

        <div className={`rounded-2xl border p-4 space-y-4 transition-colors duration-300 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="text-center">
            <span className="block text-[10px] opacity-75 uppercase font-bold tracking-wide">Chỉ số hiện tại</span>
            <span className={`text-3xl font-black font-mono block mt-1 ${
              isDanger ? 'text-rose-500 animate-pulse' : isWarning ? 'text-amber-500' : 'text-emerald-500'
            }`}>
              {live ? `${live.latest_value} ${live.unit}` : '--'}
            </span>
          </div>

          <div className="border-t border-slate-800/10 dark:border-slate-800 pt-3 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="opacity-75">Ngưỡng an toàn:</span>
              <span className="font-bold font-mono">{live?.threshold} {live?.unit}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-75">Trạng thái:</span>
              <span className={`font-extrabold uppercase ${isDanger ? 'text-rose-500' : isWarning ? 'text-amber-500' : 'text-emerald-500'}`}>
                {isDanger ? '⚠️ Danger' : isWarning ? '⚡ Warning' : '✅ Safe'}
              </span>
            </div>
            {live?.last_seen_at && (
              <div className="flex justify-between text-[11px] opacity-70">
                <span>Cập nhật cuối:</span>
                <span className="font-mono">{new Date(live.last_seen_at).toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Room detail view
  if (selectedObject.type === 'room') {
    const isRoomDanger = dangerRooms.has(selectedObject.id);
    const roomSensors = sensors.filter(
      (s) =>
        s.room_name &&
        selectedObject.name &&
        s.room_name.toLowerCase().trim() === selectedObject.name.toLowerCase().trim()
    );

    return (
      <div className="space-y-4">
        <div>
          <h4 className="font-bold text-xs uppercase tracking-wider text-blue-500">Phòng / Khu vực</h4>
          <h3 className="text-base font-black tracking-tight mt-1">{selectedObject.name || 'Room'}</h3>
          <span className="text-[9px] font-mono opacity-50 block">{selectedObject.id}</span>
        </div>

        {isRoomDanger && (
          <div className="rounded-2xl border border-rose-500/35 bg-rose-500/10 p-3 flex items-start gap-2 text-rose-500">
            <AlertTriangle size={16} className="shrink-0 mt-0.5 animate-bounce" />
            <div className="text-[11px] leading-relaxed">
              <strong className="block">CẢNH BÁO NGUY HIỂM!</strong>
              Phát hiện mức độ đo nhiệt độ hoặc khí vượt ngưỡng an toàn trong phòng. Vui lòng di tản ngay.
            </div>
          </div>
        )}

        <div className="space-y-2">
          <span className="block text-[10px] font-bold opacity-75 uppercase tracking-wider">Cảm biến trong phòng</span>
          {roomSensors.length === 0 ? (
            <div className={`text-[10px] opacity-50 py-4 text-center border border-dashed rounded-xl ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              Không có cảm biến nào liên kết
            </div>
          ) : (
            <div className="space-y-1.5">
              {roomSensors.map((s) => {
                const danger = s.latest_status === 'danger';
                const warn = s.latest_status === 'safe' && s.latest_value >= s.threshold * 0.8;
                return (
                  <div
                    key={s.id}
                    className={`flex justify-between items-center rounded-xl p-2.5 border text-xs ${
                      danger
                        ? 'border-rose-500 bg-rose-500/10 text-rose-500 font-bold'
                        : warn
                          ? 'border-amber-500 bg-amber-500/10 text-amber-500'
                          : isDark
                            ? 'border-slate-800 bg-slate-900/60'
                            : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <span className="truncate max-w-[140px]">{s.name}</span>
                    <span className="font-mono font-bold">
                      {s.latest_value} {s.unit}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Other objects (door, stairs, labels)
  return (
    <div className="text-center py-6 text-xs opacity-50">
      Phần tử loại <strong>{selectedObject.type}</strong> không có dữ liệu đo đạc trực tiếp.
    </div>
  );
}
export default MonitorInfoSection;
