import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ShieldCheck, Flame, Thermometer, ChevronLeft, ChevronRight, Volume2, VolumeX } from 'lucide-react';
import { SensorDevice } from '../../types/sensor';
import { FloorItem } from '../../types/editor';

interface DangerSensorsPanelProps {
  dangerSensors: SensorDevice[];
  floors: FloorItem[];
  currentFloorId: number | null;
  onSelectSensor: (sensor: SensorDevice) => void;
  isDark: boolean;
}

// Bật/tắt mock tình huống nguy hiểm để test âm thanh & giao diện. Sửa thành false để tắt mock.
const ENABLE_MOCK_DANGER = false;

export function DangerSensorsPanel({
  dangerSensors,
  floors,
  currentFloorId,
  onSelectSensor,
  isDark,
}: DangerSensorsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const activeDangerSensors = ENABLE_MOCK_DANGER
    ? [
      {
        id: 'mock-sensor-1',
        name: 'Cảm biến Báo Khói (Mock Test)',
        sensor_type: 'mq2',
        latest_value: 620,
        unit: 'ppm',
        floor_id: currentFloorId || (floors[0]?.id ?? 1),
        latest_status: 'danger',
        device_id: 'mock-device-1',
        x: 100,
        y: 100,
      } as any,
    ]
    : dangerSensors;

  const dangerCount = activeDangerSensors.length;
  const isSafe = dangerCount === 0;

  // Synthesize warning beep sound using Web Audio API (no external file dependency)
  // Phát file âm thanh tùy chọn từ thư mục public và khuếch đại âm lượng
  const playAlarm = () => {
    try {
      const audio = new Audio('/censor-beep-1.mp3');

      // Tạo AudioContext để định tuyến và khuếch đại âm thanh vượt giới hạn 1.0 mặc định
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();

      const source = audioCtx.createMediaElementSource(audio);
      const gainNode = audioCtx.createGain();

      // Hệ số khuếch đại (ví dụ: 2.5 = 250% âm lượng). 
      // Lưu ý: Đặt quá cao có thể gây rè/vỡ tiếng (clipping) tùy thuộc vào file gốc.
      gainNode.gain.value = 2.5;

      source.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      // Phát âm thanh
      audio.play().catch(err => {
        console.warn('Trình duyệt chặn autoplay âm thanh khi chưa tương tác:', err);
      });

      // Giải phóng tài nguyên AudioContext sau khi âm thanh kết thúc
      audio.onended = () => {
        audioCtx.close().catch(() => { });
      };
    } catch (error) {
      console.warn('Không thể khuếch đại âm thanh, fallback về chế độ bình thường:', error);
      // Phương án dự phòng (fallback) nếu trình duyệt không hỗ trợ định tuyến Web Audio
      try {
        const audio = new Audio('/censor-beep-1.mp3');
        audio.volume = 1.0;
        audio.play().catch(() => { });
      } catch (fallbackError) {
        console.error(fallbackError);
      }
    }
  };


  useEffect(() => {
    if (isSafe || isMuted) return;

    // Play immediately
    playAlarm();

    // Repeat every 3 seconds
    const interval = setInterval(() => {
      playAlarm();
    }, 800);

    return () => clearInterval(interval);
  }, [isSafe, isMuted]);

  return (
    <div className="absolute top-0 right-0 bottom-0 z-20 w-[260px] pointer-events-none select-none overflow-visible">
      {/* Main Panel Sliding Body */}
      <motion.div
        animate={{ x: isOpen ? 0 : 260 }}
        transition={{ type: 'spring', damping: 24, stiffness: 150 }}
        className={`absolute top-0 bottom-0 right-0 w-[260px] border-l shadow-2xl flex flex-col pointer-events-auto ${isDark
          ? 'bg-[#1E293B]/95 border-slate-800 text-slate-100 backdrop-blur-md'
          : 'bg-white/95 border-slate-200 text-slate-800 backdrop-blur-md'
          }`}
      >
        {/* Toggle Button Container - Positioned absolutely relative to the panel, floating to its left */}
        <div className="absolute top-1/2 left-0 -translate-x-full -translate-y-1/2 pr-0 pointer-events-auto">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-l-xl shadow-lg border-y border-l transition-all duration-300 transform hover:scale-105 active:scale-95 ${isSafe
              ? isDark
                ? 'bg-lime-600/90 border-lime-700 text-lime-100 hover:bg-lime-600'
                : 'bg-lime-500/95 border-lime-400 text-white hover:bg-lime-600'
              : 'bg-rose-500 border-rose-400 text-white animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.6)]'
              }`}
            title={isSafe ? 'Hệ thống an toàn' : `${dangerCount} cảm biến nguy hiểm`}
          >
            {isSafe ? (
              <ShieldCheck size={18} className="shrink-0" />
            ) : (
              <AlertTriangle size={18} className="shrink-0 animate-bounce" />
            )}

            {!isSafe && (
              <span className="text-xs font-black bg-white text-rose-600 px-1.5 py-0.5 rounded-full min-w-[18px] text-center font-mono">
                {dangerCount}
              </span>
            )}

            {isOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Header */}
        <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800' : 'border-slate-100'
          }`}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider">CẢNH BÁO LIÊN TẦNG</span>
          </div>

          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-1 rounded-lg transition-colors duration-200 pointer-events-auto ${isMuted
              ? isDark
                ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
              : isDark
                ? 'hover:bg-slate-800 text-rose-400 hover:text-rose-300'
                : 'hover:bg-slate-100 text-rose-500 hover:text-rose-600'
              }`}
            title={isMuted ? 'Bật âm thanh cảnh báo' : 'Tắt âm thanh cảnh báo'}
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isSafe ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-3">
              <div className={`p-3 rounded-full bg-lime-500/15 text-lime-500 ${isDark ? 'shadow-[0_0_15px_rgba(132,204,22,0.1)]' : ''}`}>
                <ShieldCheck size={32} className="animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase text-lime-500">TẤT CẢ AN TOÀN</h4>
                <p className={`text-[10px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Mọi cảm biến hoạt động ở trạng thái bình thường.
                </p>
              </div>
            </div>
          ) : (
            activeDangerSensors.map((sensor) => {
              const SensorIcon = sensor.sensor_type === 'mq2' ? Flame : Thermometer;
              const floorName = floors.find((f) => f.id === sensor.floor_id)?.name || `Tầng ${sensor.floor_id}`;
              const isCurrentFloor = sensor.floor_id === currentFloorId;

              return (
                <button
                  key={sensor.id}
                  onClick={() => onSelectSensor(sensor)}
                  className={`w-full text-left p-3 rounded-xl border transition-all duration-200 flex flex-col gap-1.5 group hover:-translate-y-[1px] ${isCurrentFloor
                    ? isDark
                      ? 'bg-rose-950/30 border-rose-800/80 hover:border-rose-700'
                      : 'bg-rose-50 border-rose-200 hover:border-rose-300'
                    : isDark
                      ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                    }`}
                >
                  <div className="flex items-center justify-between gap-1 w-full">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`p-1 rounded-lg shrink-0 ${isDark ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-500/10 text-rose-600'
                        }`}>
                        <SensorIcon size={12} />
                      </span>
                      <span className="text-xs font-extrabold truncate group-hover:text-rose-500 transition-colors">
                        {sensor.name}
                      </span>
                    </div>
                    <span className={`text-[10px] shrink-0 font-bold px-2 py-0.5 rounded-full ${isCurrentFloor
                      ? 'bg-rose-500/25 text-rose-400 border border-rose-500/30'
                      : isDark
                        ? 'bg-slate-800 text-slate-300'
                        : 'bg-slate-200 text-slate-700'
                      }`}>
                      {floorName}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] w-full">
                    <span className={`font-mono font-bold flex items-center gap-1.5 ${isDark ? 'text-rose-400' : 'text-rose-600'
                      }`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping inline-block" />
                      {sensor.latest_value} {sensor.unit}
                    </span>
                    <span className={`text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 ${isDark ? 'text-blue-400' : 'text-blue-600'
                      }`}>
                      Xem vị trí &rarr;
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
}
export default DangerSensorsPanel;
