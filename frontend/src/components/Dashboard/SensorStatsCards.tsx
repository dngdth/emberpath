import { Layers, Radio, ShieldCheck, ShieldAlert } from 'lucide-react';
import { DashboardSummary } from '../../types/sensor';

interface SensorStatsCardsProps {
  floorsCount: number;
  summary: DashboardSummary | null;
  isDark: boolean;
}

export function SensorStatsCards({ floorsCount, summary, isDark }: SensorStatsCardsProps) {
  const totalSensorsCount = (summary?.total_mq2 || 0) + (summary?.total_temperature || 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      {/* Card 1: Floors */}
      <div
        className={`rounded-xl border p-5 flex items-center gap-4 transition-all duration-300 ${
          isDark ? 'bg-[#1E293B] border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div
          className={`p-3.5 rounded-xl ${
            isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-600/10 text-blue-600'
          }`}
        >
          <Layers size={22} />
        </div>
        <div>
          <span className={`block text-xs opacity-75 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Số Tầng
          </span>
          <span className="text-3xl font-extrabold font-mono tracking-tight">
            {floorsCount || '--'}
          </span>
        </div>
      </div>

      {/* Card 2: Total Sensors */}
      <div
        className={`rounded-xl border p-5 flex items-center gap-4 transition-all duration-300 ${
          isDark ? 'bg-[#1E293B] border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div
          className={`p-3.5 rounded-xl ${
            isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-700/10 text-indigo-700'
          }`}
        >
          <Radio size={22} className="animate-pulse" />
        </div>
        <div>
          <span className={`block text-xs opacity-75 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Tổng số Cảm biến
          </span>
          <span className="text-3xl font-extrabold font-mono tracking-tight">
            {totalSensorsCount || '--'}
          </span>
        </div>
      </div>

      {/* Card 3: Safe Sensors Count */}
      <div
        className={`rounded-xl border p-5 flex items-center gap-4 transition-all duration-300 ${
          isDark ? 'bg-[#1E293B] border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div
          className={`p-3.5 rounded-xl ${
            isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-500/10 text-emerald-600'
          }`}
        >
          <ShieldCheck size={22} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <span className={`text-xs opacity-75 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Cảm biến An toàn
            </span>
          </div>
          <span
            className={`text-3xl font-extrabold font-mono tracking-tight ${
              isDark ? 'text-emerald-400' : 'text-emerald-600'
            }`}
          >
            {summary?.safe_count ?? '--'}
          </span>
        </div>
      </div>

      {/* Card 4: Danger Sensors Count */}
      <div
        className={`rounded-xl border p-5 flex items-center gap-4 transition-all duration-300 ${
          isDark ? 'bg-[#1E293B] border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div
          className={`p-3.5 rounded-xl ${
            isDark ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-500/10 text-rose-600'
          }`}
        >
          <ShieldAlert
            size={22}
            className={summary?.danger_count && summary.danger_count > 0 ? 'animate-bounce' : ''}
          />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <span className={`text-xs opacity-75 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Cảm biến Nguy hiểm
            </span>
            {summary?.danger_count && summary.danger_count > 0 ? (
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
            ) : null}
          </div>
          <span
            className={`text-3xl font-extrabold font-mono tracking-tight ${
              isDark ? 'text-rose-400' : 'text-rose-600'
            }`}
          >
            {summary?.danger_count ?? '--'}
          </span>
        </div>
      </div>
    </div>
  );
}
