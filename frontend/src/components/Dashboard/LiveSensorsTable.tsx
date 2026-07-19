import { useState, useMemo, useEffect } from 'react';
import { Search, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { SensorDevice } from '../../types/sensor';

interface LiveSensorsTableProps {
  sensors: SensorDevice[];
  loading: boolean;
  isDark: boolean;
  search: string;
  onSearchChange: (val: string) => void;
  onFocusSensor: (roomName: string | null) => void;
}

export function LiveSensorsTable({
  sensors,
  loading,
  isDark,
  search,
  onSearchChange,
  onFocusSensor,
}: LiveSensorsTableProps) {
  // Distinct locations for the filter dropdown
  const uniqueLocations = useMemo(() => {
    const locations = new Set<string>();
    sensors.forEach((s) => {
      if (s.room_name) {
        locations.add(s.room_name);
      } else {
        locations.add('Lobby');
      }
    });
    return Array.from(locations).sort();
  }, [sensors]);

  // Frontend filtering states
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Reset filters when the sensors array changes drastically (e.g. floor switch)
  const locationsHash = uniqueLocations.join(',');
  useEffect(() => {
    setFilterLocation('all');
    setFilterStatus('all');
  }, [locationsHash]);

  // Sorting state
  const [sortField, setSortField] = useState<'threshold' | 'status' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const filteredAndSortedSensors = useMemo(() => {
    // 1. Filter
    let result = sensors.filter((sensor) => {
      // Location filter
      const loc = sensor.room_name || 'Lobby';
      if (filterLocation !== 'all' && loc !== filterLocation) {
        return false;
      }

      // Status filter
      if (filterStatus !== 'all') {
        const isDanger = sensor.latest_status === 'danger';
        const isWarning =
          sensor.latest_status === 'safe' &&
          sensor.latest_value >= sensor.threshold * 0.8;
        const isSafe =
          sensor.latest_status === 'safe' &&
          sensor.latest_value < sensor.threshold * 0.8;

        if (filterStatus === 'danger' && !isDanger) return false;
        if (filterStatus === 'warning' && !isWarning) return false;
        if (filterStatus === 'safe' && !isSafe) return false;
      }

      return true;
    });

    // 2. Sort
    if (sortField) {
      result = [...result].sort((a, b) => {
        let valA = 0;
        let valB = 0;

        if (sortField === 'threshold') {
          valA = a.threshold;
          valB = b.threshold;
        } else if (sortField === 'status') {
          // Severity ranking: safe (0) < warning (1) < danger (2)
          const getSeverity = (s: typeof a) => {
            if (s.latest_status === 'danger') return 2;
            if (s.latest_status === 'safe' && s.latest_value >= s.threshold * 0.8) return 1;
            return 0;
          };
          valA = getSeverity(a);
          valB = getSeverity(b);
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [sensors, filterLocation, filterStatus, sortField, sortDirection]);

  const handleSort = (field: 'threshold' | 'status') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (field: 'threshold' | 'status') => {
    if (sortField !== field) {
      return <ArrowUpDown size={12} className="inline ml-1 opacity-40" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp size={12} className="inline ml-1 text-blue-500 font-bold" />
    ) : (
      <ArrowDown size={12} className="inline ml-1 text-blue-500 font-bold" />
    );
  };

  return (
    <div
      className={`rounded-xl border shadow-soft overflow-hidden transition-colors duration-300 ${
        isDark ? 'bg-[#1E293B] border-slate-800' : 'bg-white border-slate-200'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between border-b px-6 py-4 transition-colors duration-300 border-inherit">
        <div>
          <h2 className="text-base font-extrabold tracking-tight">BẢNG DỮ LIỆU & CẢNH BÁO LIVE</h2>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Cập nhật dữ liệu tức thời và danh sách cảnh báo thời gian thực từ cảm biến
          </p>
        </div>

        {/* Filters and search area */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Table search filter */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="Tìm cảm biến, vị trí..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className={`w-48 pl-9 pr-4 py-1.5 text-xs rounded-xl border outline-none transition duration-200 ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-500 focus:border-slate-700'
                  : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500'
              }`}
            />
          </div>

          {/* Location selector dropdown */}
          <select
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className={`text-xs font-semibold rounded-xl border px-3 py-1.5 outline-none transition duration-200 ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-100 hover:border-slate-700'
                : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
            }`}
          >
            <option value="all">Tất cả vị trí</option>
            {uniqueLocations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>

          {/* Status selector dropdown */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={`text-xs font-semibold rounded-xl border px-3 py-1.5 outline-none transition duration-200 ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-100 hover:border-slate-700'
                : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
            }`}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="safe">✅ An toàn (Safe)</option>
            <option value="warning">⚡ Cảnh báo (Warning)</option>
            <option value="danger">⚠️ Nguy hiểm (Danger)</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr
              className={`text-[10px] font-bold uppercase tracking-wider border-b transition-colors duration-300 ${
                isDark ? 'bg-slate-950/30 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              <th className="py-3 px-6">Mã Cảm Biến</th>
              <th className="py-3 px-6">Tên Cảm Biến</th>
              <th className="py-3 px-6">Vị Trí</th>
              <th className="py-3 px-6 text-right">Giá Trị</th>
              <th
                className="py-3 px-6 text-right cursor-pointer select-none hover:text-blue-500 transition-colors"
                onClick={() => handleSort('threshold')}
              >
                Ngưỡng An Toàn {renderSortIcon('threshold')}
              </th>
              <th
                className="py-3 px-6 text-center cursor-pointer select-none hover:text-blue-500 transition-colors"
                onClick={() => handleSort('status')}
              >
                Trạng Thái {renderSortIcon('status')}
              </th>
              <th className="py-3 px-6">Cập Nhật Cuối</th>
              <th className="py-3 px-6 text-center">Hành Động</th>
            </tr>
          </thead>
          <tbody
            className={`divide-y text-xs transition-colors duration-300 ${
              isDark ? 'divide-slate-800' : 'divide-slate-200/80'
            }`}
          >
            {loading ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  <RefreshCw className="animate-spin inline mr-2 text-blue-500" size={16} />
                  Đang nạp dữ liệu cảm biến mới...
                </td>
              </tr>
            ) : filteredAndSortedSensors.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  Không tìm thấy dữ liệu cảm biến nào khớp với bộ lọc.
                </td>
              </tr>
            ) : (
              filteredAndSortedSensors.map((sensor) => {
                const isDanger = sensor.latest_status === 'danger';
                const isWarning =
                  sensor.latest_status === 'safe' && sensor.latest_value >= sensor.threshold * 0.8;

                return (
                  <tr
                    key={sensor.id}
                    className={`transition-colors hover:bg-slate-500/5 ${
                      isDanger ? 'bg-rose-500/5 text-rose-500' : isWarning ? 'bg-amber-500/5 text-amber-500' : ''
                    }`}
                  >
                    <td className="py-3 px-6 font-mono font-bold">{sensor.device_id}</td>
                    <td className="py-3 px-6 font-medium">{sensor.name}</td>
                    <td className="py-3 px-6 font-medium">{sensor.room_name || 'Lobby'}</td>
                    <td className="py-3 px-6 text-right font-mono font-extrabold text-[13px]">
                      {sensor.latest_value} {sensor.unit}
                    </td>
                    <td className="py-3 px-6 text-right font-mono opacity-80">
                      {sensor.threshold} {sensor.unit}
                    </td>
                    <td className="py-3 px-6 text-center">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold tracking-wider ${
                          isDanger
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
                            : isWarning
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {isDanger ? '⚠️ Danger' : isWarning ? '⚡ Warning' : '✅ Safe'}
                      </span>
                    </td>
                    <td className="py-3 px-6 opacity-75 font-mono text-[11px]">
                      {sensor.last_seen_at ? new Date(sensor.last_seen_at).toLocaleTimeString() : '--'}
                    </td>
                    <td className="py-3 px-6 text-center">
                      <button
                        onClick={() => onFocusSensor(sensor.room_name)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition ${
                          isDark
                            ? 'bg-slate-900 border border-slate-800 hover:bg-slate-800 text-blue-400'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-blue-600'
                        }`}
                      >
                        Xem chi tiết
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
