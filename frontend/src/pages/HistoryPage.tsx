import { useEffect, useState, useMemo, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useRealtimeSensors } from '../hooks/useRealtimeSensors';
import { DashboardSidebar } from '../components/Dashboard/DashboardSidebar';
import { SwitchTheme } from '../components/UI/SwitchTheme';
import { floorsApi, sensorsApi } from '../services/backend';
import { FloorItem, FloorPlanObject } from '../types/editor';
import { SensorReading } from '../types/sensor';
import { FloorPlanViewer } from '../components/Dashboard/FloorPlanViewer';
import { formatVietnamDateTime, parseApiDate } from '../utils/dateTime';
import {
  Layers,
  LogOut,
  RefreshCw,
  FileSpreadsheet,
  Menu,
  Flame,
  Thermometer,
  Calendar,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Map,
  Filter,
  Activity,
  ShieldCheck,
  Clock,
} from 'lucide-react';

export function HistoryPage() {
  const { user, logout } = useAuthStore();
  const { darkMode } = useThemeStore();
  const isDark = darkMode;

  // Sidebar status: open by default on desktop, closed on mobile
  const [sidebarOpen, setSidebarOpen] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );

  // Floors and layout objects state
  const [floors, setFloors] = useState<FloorItem[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [objects, setObjects] = useState<FloorPlanObject[]>([]);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [canvasWidth, setCanvasWidth] = useState<number>(1600);
  const [canvasHeight, setCanvasHeight] = useState<number>(1000);
  const [showMap, setShowMap] = useState(false);

  // History query parameters
  const [filterStatus, setFilterStatus] = useState<string>(''); // '' (Tất cả) | 'safe' | 'danger'
  const [selectedRoomName, setSelectedRoomName] = useState<string>(''); // '' (Tất cả)
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Chart hover & time range state
  const [chartTimeRange, setChartTimeRange] = useState<'1h' | '6h' | '12h' | '24h' | 'all'>('24h');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Load floors on mount
  useEffect(() => {
    floorsApi.list().then((data) => {
      setFloors(data);
      if (data.length > 0 && selectedFloor === null) {
        setSelectedFloor(data[0].id);
      }
    });
    document.title = `Emberpath – Lịch sử dữ liệu`;
  }, []);

  // Fetch floor plan layout objects when floor changes
  useEffect(() => {
    if (selectedFloor) {
      setLoadingPlan(true);
      floorsApi.getPlan(selectedFloor)
        .then((plan) => {
          setObjects(plan.objects);
          setCanvasWidth(plan.canvas_width ?? 1600);
          setCanvasHeight(plan.canvas_height ?? 1000);
        })
        .catch(console.error)
        .finally(() => {
          setLoadingPlan(false);
        });
    } else {
      setObjects([]);
    }
  }, [selectedFloor]);

  // Hook for live/websocket sensor events (passed to map viewer)
  const { mq2: liveMq2, temperature: liveTemp, dangerSensors } = useRealtimeSensors(selectedFloor);
  const allLiveSensors = useMemo(() => [...liveMq2, ...liveTemp], [liveMq2, liveTemp]);

  // Get physical room/node names
  const roomNames = useMemo(() => {
    const names = new Set<string>();
    allLiveSensors.forEach((s) => {
      if (s.room_name) names.add(s.room_name);
    });
    readings.forEach((r) => {
      if (r.room_name) names.add(r.room_name);
    });
    return Array.from(names);
  }, [allLiveSensors, readings]);

  // Reset selected node if it belongs to a different floor
  useEffect(() => {
    if (selectedRoomName && roomNames.length > 0 && !roomNames.includes(selectedRoomName)) {
      setSelectedRoomName('');
    }
  }, [selectedFloor, roomNames, selectedRoomName]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedFloor, filterStatus, selectedRoomName]);

  // Fetch sensor history logs
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await sensorsApi.historyReadings({
        floorId: selectedFloor,
        status: filterStatus || null,
        roomName: selectedRoomName || null,
        limit: 1000, // Load a strong chunk for client-side filtering and chart plotting
      });
      setReadings(data);
    } catch (e) {
      console.error('Error fetching history:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [selectedFloor, filterStatus, selectedRoomName]);

  // Group individual sensor readings by Node & Time (nearest second) to show them together
  const groupedReadings = useMemo(() => {
    const groups: Record<string, {
      roomName: string;
      floorId: number | null;
      createdAt: string;
      tempVal?: number;
      tempStatus?: 'safe' | 'danger';
      mq2Val?: number;
      mq2Status?: 'safe' | 'danger';
      isDanger: boolean;
    }> = {};

    readings.forEach((r) => {
      const date = parseApiDate(r.created_at);
      const timeSecs = Math.floor(date.getTime() / 1000);
      const key = `${r.room_name || 'Chưa xác định'}_${timeSecs}`;

      if (!groups[key]) {
        groups[key] = {
          roomName: r.room_name || 'Chưa xác định',
          floorId: r.floor_id,
          createdAt: r.created_at,
          isDanger: false,
        };
      }

      if (r.sensor_type === 'temp') {
        groups[key].tempVal = r.value;
        groups[key].tempStatus = r.status as 'safe' | 'danger';
        if (r.status === 'danger') groups[key].isDanger = true;
      } else if (r.sensor_type === 'mq2') {
        groups[key].mq2Val = r.value;
        groups[key].mq2Status = r.status as 'safe' | 'danger';
        if (r.status === 'danger') groups[key].isDanger = true;
      }
    });

    return Object.values(groups).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [readings]);

  // Calculate Metrics from loaded data
  const stats = useMemo(() => {
    const temps = readings.filter((r) => r.sensor_type === 'temp').map((r) => r.value);
    const mq2s = readings.filter((r) => r.sensor_type === 'mq2').map((r) => r.value);
    const dangers = readings.filter((r) => r.status === 'danger').length;

    const avgTemp = temps.length > 0 ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1) : '-';
    const avgMq2 = mq2s.length > 0 ? Math.round(mq2s.reduce((a, b) => a + b, 0) / mq2s.length) : '-';

    return {
      total: readings.length,
      danger: dangers,
      avgTemp,
      avgMq2,
    };
  }, [readings]);

  // Client side pagination
  const pageCount = Math.ceil(groupedReadings.length / itemsPerPage);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return groupedReadings.slice(start, start + itemsPerPage);
  }, [groupedReadings, currentPage]);

  const activeChartRoom = useMemo(() => {
    if (selectedRoomName) return selectedRoomName;
    return roomNames.length > 0 ? roomNames[0] : '';
  }, [selectedRoomName, roomNames]);

  // Chart Data preparation: Filtered by time range and sorted oldest-to-newest for selected node
  const chartData = useMemo(() => {
    if (!activeChartRoom) return [];

    const nodeReadings = readings.filter((r) => r.room_name === activeChartRoom);
    if (nodeReadings.length === 0) return [];

    // Latest reading timestamp for relative range calculation
    const latestTs = Math.max(...nodeReadings.map((r) => parseApiDate(r.created_at).getTime()));

    // Cutoff time based on time frame
    const cutoffTime = (() => {
      switch (chartTimeRange) {
        case '1h':
          return latestTs - 1 * 3600 * 1000;
        case '6h':
          return latestTs - 6 * 3600 * 1000;
        case '12h':
          return latestTs - 12 * 3600 * 1000;
        case '24h':
          return latestTs - 24 * 3600 * 1000;
        case 'all':
        default:
          return 0;
      }
    })();

    const filteredReadings = nodeReadings.filter(
      (r) => parseApiDate(r.created_at).getTime() >= cutoffTime
    );

    const groups: Record<string, { time: string; mq2?: number; temp?: number }> = {};

    filteredReadings.forEach((r) => {
      const t = r.created_at;
      if (!groups[t]) {
        groups[t] = { time: t };
      }
      if (r.sensor_type === 'mq2') {
        groups[t].mq2 = r.value;
      } else if (r.sensor_type === 'temp') {
        groups[t].temp = r.value;
      }
    });

    const sorted = Object.values(groups).sort(
      (a, b) => parseApiDate(a.time).getTime() - parseApiDate(b.time).getTime()
    );

    // Smooth sampling up to 60 points max for clean SVG presentation
    if (sorted.length <= 60) return sorted;
    const step = Math.ceil(sorted.length / 60);
    return sorted.filter((_, idx) => idx % step === 0 || idx === sorted.length - 1);
  }, [readings, activeChartRoom, chartTimeRange]);

  // CSV Exporter
  const exportToCSV = () => {
    if (groupedReadings.length === 0) {
      alert('Không có dữ liệu để xuất!');
      return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
    csvContent += 'Thời gian,Vị trí (Node),Nhiệt độ (°C),Trạng thái Nhiệt,Khói (MQ2),Trạng thái Khói,Cảnh báo\n';

    groupedReadings.forEach((row) => {
      const timeStr = formatVietnamDateTime(row.createdAt).replace(',', '');
      const room = row.roomName;
      const temp = row.tempVal !== undefined ? `${row.tempVal}` : '-';
      const tempSt = row.tempStatus || '-';
      const mq2 = row.mq2Val !== undefined ? `${row.mq2Val}` : '-';
      const mq2St = row.mq2Status || '-';
      const warning = row.isDanger ? 'NGUY HIỂM' : 'AN TOÀN';

      csvContent += `"${timeStr}","${room}",${temp},"${tempSt}",${mq2},"${mq2St}","${warning}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);

    const floorLabel = selectedFloor ? `Tang_${selectedFloor}` : 'Tat_ca_tang';
    const dateLabel = new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `Emberpath_Lich_su_${floorLabel}_${dateLabel}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // SVG Chart sizing & projection calculations
  const width = 800;
  const height = 280;
  const paddingLeft = 55;
  const paddingRight = 55;
  const paddingTop = 30;
  const paddingBottom = 40;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const maxMq2 = Math.max(1000, ...chartData.map((d) => d.mq2 || 0), 650);
  const maxTemp = Math.max(80, ...chartData.map((d) => d.temp || 0), 55);

  const getX = (index: number) => {
    if (chartData.length <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (index / (chartData.length - 1)) * chartWidth;
  };

  const getYMq2 = (val: number) => {
    return height - paddingBottom - (val / maxMq2) * chartHeight;
  };

  const getYTemp = (val: number) => {
    return height - paddingBottom - (val / maxTemp) * chartHeight;
  };

  // SVG Drawing Paths
  const mq2Path = useMemo(() => {
    const pts = chartData
      .map((d, i) => (d.mq2 !== undefined ? `${getX(i)},${getYMq2(d.mq2)}` : null))
      .filter((p) => p !== null);
    return pts.length > 0 ? `M ${pts.join(' L ')}` : '';
  }, [chartData, maxMq2]);

  const mq2AreaPath = useMemo(() => {
    const pts = chartData
      .map((d, i) => (d.mq2 !== undefined ? `${getX(i)},${getYMq2(d.mq2)}` : null))
      .filter((p) => p !== null);
    if (pts.length === 0) return '';
    const bottomY = height - paddingBottom;
    return `M ${getX(0)},${bottomY} L ${pts.join(' L ')} L ${getX(chartData.length - 1)},${bottomY} Z`;
  }, [chartData, maxMq2]);

  const tempPath = useMemo(() => {
    const pts = chartData
      .map((d, i) => (d.temp !== undefined ? `${getX(i)},${getYTemp(d.temp)}` : null))
      .filter((p) => p !== null);
    return pts.length > 0 ? `M ${pts.join(' L ')}` : '';
  }, [chartData, maxTemp]);

  const tempAreaPath = useMemo(() => {
    const pts = chartData
      .map((d, i) => (d.temp !== undefined ? `${getX(i)},${getYTemp(d.temp)}` : null))
      .filter((p) => p !== null);
    if (pts.length === 0) return '';
    const bottomY = height - paddingBottom;
    return `M ${getX(0)},${bottomY} L ${pts.join(' L ')} L ${getX(chartData.length - 1)},${bottomY} Z`;
  }, [chartData, maxTemp]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (chartData.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    const xRatio = (mouseX - paddingLeft) / chartWidth;
    let index = Math.round(xRatio * (chartData.length - 1));
    if (index < 0) index = 0;
    if (index >= chartData.length) index = chartData.length - 1;

    setHoveredIndex(index);
  };

  const hoveredDataPoint = hoveredIndex !== null ? chartData[hoveredIndex] : null;

  return (
    <div
      className={`min-h-screen font-sans antialiased transition-colors duration-300 ${
        isDark ? 'bg-[#0F172A] text-slate-100' : 'bg-slate-50 text-slate-800'
      }`}
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Floating Toggle Sidebar Button */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className={`fixed bottom-6 left-6 z-40 p-3.5 rounded-full shadow-2xl border transition-all duration-300 hover:scale-110 active:scale-95 hover:shadow-blue-500/25 ${
            isDark
              ? 'bg-slate-800 border-slate-700 text-blue-400 hover:bg-slate-700 hover:text-blue-300 shadow-slate-950/80'
              : 'bg-white border-slate-200 text-blue-600 hover:bg-slate-50 hover:text-blue-500'
          }`}
          title="Mở sidebar"
        >
          <Menu size={22} />
        </button>
      )}

      {/* Left Sidebar Navigation */}
      <DashboardSidebar
        activeTab="history"
        isDark={isDark}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main workspace container */}
      <div
        className={`pl-0 ${
          sidebarOpen ? 'md:pl-64' : 'md:pl-0'
        } min-h-screen flex flex-col transition-[padding-left] duration-300 ease-in-out`}
      >
        {/* Header bar */}
        <header
          className={`h-16 flex items-center justify-between px-4 md:px-8 border-b transition-colors duration-300 ${
            isDark ? 'bg-[#1E293B] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Layers className={isDark ? 'text-blue-500' : 'text-blue-600'} size={20} />
            <h1
              className={`text-sm md:text-lg font-bold uppercase tracking-wide truncate max-w-[200px] sm:max-w-none ${
                isDark ? 'text-slate-100' : 'text-slate-800'
              }`}
            >
              Lịch sử đo đạc – {user?.building.name || 'Building A'}
            </h1>
          </div>

          <div className="flex items-center gap-6">
            <SwitchTheme />

            <div
              className={`flex items-center gap-3 px-3 py-1.5 rounded-xl border ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div
                className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold text-white ${
                  isDark ? 'bg-blue-600 shadow-md' : 'bg-blue-600'
                }`}
              >
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="text-left leading-none">
                <span className="block text-xs font-bold">{user?.name || 'User'}</span>
                <span className="text-[9px] uppercase tracking-wider opacity-75">
                  {user?.role || 'Operator'}
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                isDark
                  ? 'border-slate-800 hover:bg-rose-950/20 hover:text-rose-400 hover:border-rose-900'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
              title="Đăng xuất khỏi hệ thống"
            >
              <LogOut size={13} />
              <span>Đăng xuất</span>
            </button>
          </div>
        </header>

        {/* Dashboard Workspace */}
        <main className="flex-1 p-6 space-y-6">
          
          {/* A. Thẻ Thống Kê Nhanh (KPI Metrics Cards) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`p-4 rounded-2xl border shadow-soft transition-all duration-300 ${
              isDark ? 'bg-[#1E293B] border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold opacity-75">Tổng Lượt Đo</span>
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                  <Activity size={16} />
                </div>
              </div>
              <p className="text-xl md:text-2xl font-extrabold mt-2">{stats.total}</p>
              <p className="text-[10px] opacity-60 mt-1">Từ các cảm biến đang hoạt động</p>
            </div>

            <div className={`p-4 rounded-2xl border shadow-soft transition-all duration-300 ${
              isDark ? 'bg-[#1E293B] border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold opacity-75">Sự Kiện Cảnh Báo</span>
                <div className={`p-2 rounded-lg ${stats.danger > 0 ? 'bg-rose-500/10 text-rose-500 animate-pulse' : 'bg-emerald-500/10 text-emerald-500'}`}>
                  <AlertTriangle size={16} />
                </div>
              </div>
              <p className={`text-xl md:text-2xl font-extrabold mt-2 ${stats.danger > 0 ? 'text-rose-500' : ''}`}>{stats.danger}</p>
              <p className="text-[10px] opacity-60 mt-1">Lượt ghi nhận trạng thái DANGER</p>
            </div>

            <div className={`p-4 rounded-2xl border shadow-soft transition-all duration-300 ${
              isDark ? 'bg-[#1E293B] border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold opacity-75">Nhiệt Độ Trung Bình</span>
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-500">
                  <Thermometer size={16} />
                </div>
              </div>
              <p className="text-xl md:text-2xl font-extrabold mt-2 text-cyan-500">{stats.avgTemp} °C</p>
              <p className="text-[10px] opacity-60 mt-1">Ngưỡng cảnh báo: 50 °C</p>
            </div>

            <div className={`p-4 rounded-2xl border shadow-soft transition-all duration-300 ${
              isDark ? 'bg-[#1E293B] border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold opacity-75">Mức Khói Trung Bình</span>
                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                  <Flame size={16} />
                </div>
              </div>
              <p className="text-xl md:text-2xl font-extrabold mt-2 text-orange-500">{stats.avgMq2} ppm</p>
              <p className="text-[10px] opacity-60 mt-1">Ngưỡng cảnh báo: 600 ppm</p>
            </div>
          </div>

          {/* B. Thanh Bộ Lọc & Điều khiển */}
          <div className={`p-4 rounded-2xl border shadow-soft flex flex-wrap items-center justify-between gap-4 transition-colors duration-300 ${
            isDark ? 'bg-[#1E293B] border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                <Filter size={14} />
                <span>Bộ lọc:</span>
              </div>

              {/* Tầng */}
              <select
                value={selectedFloor || ''}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  setSelectedFloor(val);
                }}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-slate-200 focus:border-blue-500'
                    : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-blue-600'
                }`}
              >
                {floors.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>

              {/* Trạng thái */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-slate-200 focus:border-blue-500'
                    : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-blue-600'
                }`}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="safe">An toàn (Safe)</option>
                <option value="danger">Nguy hiểm (Danger)</option>
              </select>

              {/* Node thiết bị vật lý */}
              <select
                value={selectedRoomName}
                onChange={(e) => setSelectedRoomName(e.target.value)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-slate-200 focus:border-blue-500'
                    : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-blue-600'
                }`}
              >
                <option value="">Tất cả vị trí Node</option>
                {roomNames.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>

              {/* Show/Hide Map Trigger */}
              {selectedFloor && (
                <button
                  onClick={() => setShowMap(!showMap)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                    showMap
                      ? 'bg-blue-500/10 text-blue-500 border-blue-500/30'
                      : isDark
                        ? 'border-slate-800 hover:bg-slate-800'
                        : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Map size={13} />
                  <span>{showMap ? 'Ẩn bản đồ' : 'Xem bản đồ tầng'}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchHistory()}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                  isDark
                    ? 'border-slate-800 hover:bg-slate-800 text-slate-200'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
                disabled={loadingHistory}
              >
                <RefreshCw size={13} className={loadingHistory ? 'animate-spin' : ''} />
                <span>Tải lại</span>
              </button>

              <button
                onClick={exportToCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white rounded-xl bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/10 transition"
              >
                <FileSpreadsheet size={13} />
                <span>Xuất CSV</span>
              </button>
            </div>
          </div>

          {/* C. Sơ Đồ Cảm Biến Tầng Tương Tác (Floor Sensor Map) */}
          {showMap && selectedFloor && (
            <div className={`p-4 rounded-3xl border transition-all duration-300 ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-500">
                    Sơ đồ phân bố cảm biến tầng - Click vào một cảm biến để xem lịch sử đo
                  </h3>
                </div>
                <button
                  onClick={() => setShowMap(false)}
                  className="text-xs font-semibold text-rose-500 hover:underline"
                >
                  Ẩn sơ đồ
                </button>
              </div>
              <div className="h-[400px] w-full rounded-2xl overflow-hidden relative">
                {loadingPlan ? (
                  <div className="h-full w-full flex items-center justify-center">
                    <RefreshCw size={24} className="animate-spin text-blue-500" />
                  </div>
                ) : (
                  <FloorPlanViewer
                    floorId={selectedFloor}
                    objects={objects}
                    sensors={allLiveSensors}
                    safePath={null}
                    onRoomSelect={(sensorId) => {
                      const clicked = allLiveSensors.find(s => s.device_id === sensorId);
                      if (clicked && clicked.room_name) {
                        setSelectedRoomName(clicked.room_name);
                      }
                    }}
                    selectedStartRoomId={allLiveSensors.find(s => s.room_name === selectedRoomName)?.device_id || null}
                    evacuationActive={false}
                    isDark={isDark}
                    canvasWidth={canvasWidth}
                    canvasHeight={canvasHeight}
                    dangerSensors={dangerSensors}
                    floors={floors}
                  />
                )}
              </div>
            </div>
          )}

          {/* D. Biểu Đồ Trực Quan Xu Hướng MQ2 & Nhiệt Độ (Dual-Axis Chart) */}
          {activeChartRoom && (
            <div className={`p-6 rounded-3xl border shadow-soft transition-colors duration-300 relative ${
              isDark ? 'bg-[#1E293B] border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4 mb-4 border-inherit">
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                    <Activity size={16} className="text-blue-500" />
                    <span>Đồ Thị Xu Hướng Đo Đạc: {activeChartRoom}</span>
                  </h3>
                  <p className="text-[10px] opacity-60">
                    Vẽ sự tương quan giữa nồng độ khói (MQ2) và nhiệt độ của node cảm biến được chọn
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  {/* Khung giờ hiển thị đồ thị */}
                  <div
                    className={`flex items-center gap-1 p-1 rounded-xl border ${
                      isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
                    }`}
                  >
                    <Clock size={12} className="ml-1.5 mr-0.5 opacity-60" />
                    {(['1h', '6h', '12h', '24h', 'all'] as const).map((range) => (
                      <button
                        key={range}
                        type="button"
                        onClick={() => setChartTimeRange(range)}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                          chartTimeRange === range
                            ? 'bg-blue-600 text-white shadow-sm'
                            : isDark
                            ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                        }`}
                      >
                        {range === '1h'
                          ? '1 Giờ'
                          : range === '6h'
                          ? '6 Giờ'
                          : range === '12h'
                          ? '12 Giờ'
                          : range === '24h'
                          ? '24h qua'
                          : 'Tất cả'}
                      </button>
                    ))}
                  </div>

                  {/* Chú thích màu đường truyền */}
                  <div className="flex items-center gap-4 text-[10px] font-semibold">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-0.5 bg-orange-500 inline-block rounded-full"></span>
                      <span className="text-orange-500">Khói MQ2 (ppm)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-0.5 bg-cyan-500 inline-block rounded-full"></span>
                      <span className="text-cyan-500">Nhiệt độ (°C)</span>
                    </div>
                  </div>
                </div>
              </div>

              {chartData.length === 0 ? (
                <div className="h-64 w-full flex flex-col items-center justify-center border border-dashed rounded-2xl opacity-60">
                  <Flame size={36} className="text-slate-400 mb-2 animate-pulse" />
                  <span className="text-xs font-semibold">Chưa có đủ dữ liệu lịch sử của node này để vẽ biểu đồ</span>
                </div>
              ) : (
                <div className="relative w-full overflow-hidden">
                  <svg
                    ref={svgRef}
                    viewBox={`0 0 ${width} ${height}`}
                    className="w-full h-auto overflow-visible select-none"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    {/* Define Gradients */}
                    <defs>
                      <linearGradient id="mq2Grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f97316" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Gridlines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                      const y = height - paddingBottom - pct * chartHeight;
                      return (
                        <g key={i}>
                          <line
                            x1={paddingLeft}
                            y1={y}
                            x2={width - paddingRight}
                            y2={y}
                            stroke={isDark ? '#334155' : '#e2e8f0'}
                            strokeWidth={1}
                            strokeDasharray="4,4"
                            opacity={0.6}
                          />
                          {/* Y-Axis MQ2 Labels (Left side) */}
                          <text
                            x={paddingLeft - 8}
                            y={y + 3}
                            textAnchor="end"
                            fontSize={9}
                            fontWeight="semibold"
                            fill="#f97316"
                          >
                            {Math.round(pct * maxMq2)}
                          </text>
                          {/* Y-Axis Temp Labels (Right side) */}
                          <text
                            x={width - paddingRight + 8}
                            y={y + 3}
                            textAnchor="start"
                            fontSize={9}
                            fontWeight="semibold"
                            fill="#06b6d4"
                          >
                            {Math.round(pct * maxTemp)}
                          </text>
                        </g>
                      );
                    })}

                    {/* Threshold Dashed Warning Lines */}
                    {(() => {
                      const mq2ThreshY = getYMq2(600);
                      const tempThreshY = getYTemp(50);
                      return (
                        <>
                          {/* MQ2 Threshold Line */}
                          {mq2ThreshY >= paddingTop && mq2ThreshY <= height - paddingBottom && (
                            <g>
                              <line
                                x1={paddingLeft}
                                y1={mq2ThreshY}
                                x2={width - paddingRight}
                                y2={mq2ThreshY}
                                stroke="#ef4444"
                                strokeWidth={1.5}
                                strokeDasharray="3,3"
                              />
                              <text
                                x={paddingLeft + 10}
                                y={mq2ThreshY - 5}
                                fill="#ef4444"
                                fontSize={8}
                                fontWeight="bold"
                              >
                                NGƯỠNG MQ2 (600)
                              </text>
                            </g>
                          )}

                          {/* Temperature Threshold Line */}
                          {tempThreshY >= paddingTop && tempThreshY <= height - paddingBottom && (
                            <g>
                              <line
                                x1={paddingLeft}
                                y1={tempThreshY}
                                x2={width - paddingRight}
                                y2={tempThreshY}
                                stroke="#f43f5e"
                                strokeWidth={1.5}
                                strokeDasharray="3,3"
                              />
                              <text
                                x={width - paddingRight - 10}
                                y={tempThreshY - 5}
                                textAnchor="end"
                                fill="#f43f5e"
                                fontSize={8}
                                fontWeight="bold"
                              >
                                NGƯỠNG NHIỆT (50°C)
                              </text>
                            </g>
                          )}
                        </>
                      );
                    })()}

                    {/* X-Axis labels (Timestamps) */}
                    {chartData.map((d, i) => {
                      if (i % Math.ceil(chartData.length / 5) !== 0) return null;
                      const x = getX(i);
                      const date = parseApiDate(d.time);
                      const showDate = chartTimeRange === '24h' || chartTimeRange === 'all';
                      const hours = String(date.getHours()).padStart(2, '0');
                      const mins = String(date.getMinutes()).padStart(2, '0');
                      const label = showDate
                        ? `${date.getDate()}/${date.getMonth() + 1} ${hours}:${mins}`
                        : `${hours}:${mins}`;
                      return (
                        <text
                          key={i}
                          x={x}
                          y={height - paddingBottom + 16}
                          textAnchor="middle"
                          fontSize={9}
                          fill={isDark ? '#94a3b8' : '#64748b'}
                        >
                          {label}
                        </text>
                      );
                    })}

                    {/* Area Gradients */}
                    {mq2AreaPath && (
                      <path d={mq2AreaPath} fill="url(#mq2Grad)" className="transition-all duration-300" />
                    )}
                    {tempAreaPath && (
                      <path d={tempAreaPath} fill="url(#tempGrad)" className="transition-all duration-300" />
                    )}

                    {/* Lines */}
                    {mq2Path && (
                      <path
                        d={mq2Path}
                        fill="none"
                        stroke="#f97316"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="transition-all duration-300"
                      />
                    )}
                    {tempPath && (
                      <path
                        d={tempPath}
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="transition-all duration-300"
                      />
                    )}

                    {/* Hover Vertical Guide Line */}
                    {hoveredIndex !== null && (
                      <line
                        x1={getX(hoveredIndex)}
                        y1={paddingTop}
                        x2={getX(hoveredIndex)}
                        y2={height - paddingBottom}
                        stroke={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}
                        strokeWidth={1.5}
                      />
                    )}

                    {/* Interactive Circles on hover */}
                    {hoveredIndex !== null && hoveredDataPoint && (
                      <>
                        {hoveredDataPoint.mq2 !== undefined && (
                          <circle
                            cx={getX(hoveredIndex)}
                            cy={getYMq2(hoveredDataPoint.mq2)}
                            r={6}
                            fill="#f97316"
                            stroke={isDark ? '#1E293B' : 'white'}
                            strokeWidth={2}
                          />
                        )}
                        {hoveredDataPoint.temp !== undefined && (
                          <circle
                            cx={getX(hoveredIndex)}
                            cy={getYTemp(hoveredDataPoint.temp)}
                            r={6}
                            fill="#06b6d4"
                            stroke={isDark ? '#1E293B' : 'white'}
                            strokeWidth={2}
                          />
                        )}
                      </>
                    )}
                  </svg>

                  {/* HTML Tooltip Box overlaid on SVG */}
                  {hoveredIndex !== null && hoveredDataPoint && (
                    <div
                      className={`absolute pointer-events-none p-3.5 rounded-2xl border shadow-2xl backdrop-blur-md transition-all duration-150 z-30 ${
                        isDark
                          ? 'bg-slate-900/95 border-slate-800 text-slate-100'
                          : 'bg-white/95 border-slate-200 text-slate-800'
                      }`}
                      style={{
                        left: `${Math.min(
                          Math.max(10, (getX(hoveredIndex) / width) * 100),
                          82
                        )}%`,
                        top: '12%',
                        transform: 'translateX(-50%)',
                      }}
                    >
                      <p className="text-[10px] font-bold opacity-60 flex items-center gap-1">
                        <Calendar size={10} />
                        <span>{formatVietnamDateTime(hoveredDataPoint.time)}</span>
                      </p>
                      <p className="text-xs font-extrabold mt-1 text-blue-500">{selectedRoomName}</p>

                      <div className="mt-2 space-y-1.5 text-xs font-semibold">
                        {hoveredDataPoint.mq2 !== undefined && (
                          <div className="flex items-center justify-between gap-6">
                            <span className="text-orange-500">Khói MQ2:</span>
                            <span className="font-mono">{hoveredDataPoint.mq2} ppm</span>
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                              hoveredDataPoint.mq2 >= 600
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}>
                              {hoveredDataPoint.mq2 >= 600 ? 'NGUY HIỂM' : 'AN TOÀN'}
                            </span>
                          </div>
                        )}

                        {hoveredDataPoint.temp !== undefined && (
                          <div className="flex items-center justify-between gap-6">
                            <span className="text-cyan-500">Nhiệt độ:</span>
                            <span className="font-mono">{hoveredDataPoint.temp} °C</span>
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                              hoveredDataPoint.temp >= 50
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}>
                              {hoveredDataPoint.temp >= 50 ? 'NGUY HIỂM' : 'AN TOÀN'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* E. Bảng Dữ Liệu Lịch Sử Gom Nhóm */}
          <div className={`rounded-3xl border shadow-soft p-6 transition-colors duration-300 ${
            isDark ? 'bg-[#1E293B] border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="mb-4">
              <h2 className="text-sm font-extrabold tracking-wider uppercase">
                Bảng ghi nhận lịch sử đo đạc của node
              </h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Xem bảng thống kê giá trị Khói và Nhiệt độ gộp theo Node vật lý tại thời điểm ghi nhận
              </p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-inherit">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`text-[10px] font-bold uppercase tracking-wider border-b transition-colors duration-300 ${
                    isDark ? 'bg-slate-950/30 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}>
                    <th className="py-3.5 px-6">Thời gian Ghi Nhận</th>
                    <th className="py-3.5 px-6">Vị Trí Node Cảm Biến</th>
                    <th className="py-3.5 px-6">Nhiệt Độ (°C)</th>
                    <th className="py-3.5 px-6">Khói MQ2 (ppm)</th>
                    <th className="py-3.5 px-6 text-center">Trạng Thái Đo</th>
                  </tr>
                </thead>
                <tbody className={`divide-y text-xs transition-colors duration-300 ${
                  isDark ? 'divide-slate-800' : 'divide-slate-200/80'
                }`}>
                  {loadingHistory ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400">
                        <RefreshCw size={20} className="animate-spin inline-block mr-2" />
                        <span>Đang tải dữ liệu lịch sử...</span>
                      </td>
                    </tr>
                  ) : paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400">
                        Không tìm thấy bản ghi lịch sử nào khớp bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((item, index) => (
                      <tr
                        key={index}
                        onClick={() => setSelectedRoomName(item.roomName)}
                        className={`cursor-pointer transition-colors hover:bg-slate-500/5 ${
                          item.isDanger ? 'bg-rose-500/5 text-rose-500' : ''
                        } ${selectedRoomName === item.roomName ? (isDark ? 'bg-blue-500/10' : 'bg-blue-500/5') : ''}`}
                      >
                        <td className="py-3.5 px-6 font-mono font-medium">
                          {formatVietnamDateTime(item.createdAt)}
                        </td>
                        <td className="py-3.5 px-6 font-semibold flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${selectedRoomName === item.roomName ? 'bg-blue-500' : 'bg-transparent'}`}></span>
                          <span>{item.roomName}</span>
                        </td>
                        <td className="py-3.5 px-6 font-mono">
                          {item.tempVal !== undefined ? (
                            <span className={item.tempStatus === 'danger' ? 'font-bold text-rose-500' : ''}>
                              {item.tempVal} °C
                            </span>
                          ) : (
                            <span className="opacity-40">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-6 font-mono">
                          {item.mq2Val !== undefined ? (
                            <span className={item.mq2Status === 'danger' ? 'font-bold text-rose-500' : ''}>
                              {item.mq2Val} ppm
                            </span>
                          ) : (
                            <span className="opacity-40">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-6 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${
                            item.isDanger
                              ? 'bg-rose-500/20 text-rose-500 border-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30'
                          }`}>
                            {item.isDanger ? (
                              <>
                                <AlertTriangle size={10} className="animate-bounce" />
                                <span>NGUY HIỂM</span>
                              </>
                            ) : (
                              <>
                                <ShieldCheck size={10} />
                                <span>AN TOÀN</span>
                              </>
                            )}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination UI */}
            {pageCount > 1 && (
              <div className="flex items-center justify-between mt-4 border-t pt-4 border-inherit">
                <div className="text-[10px] opacity-60">
                  Hiển thị bản ghi {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, groupedReadings.length)} trong tổng số {groupedReadings.length}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={`p-1.5 rounded-lg border text-xs font-semibold transition-all disabled:opacity-30 ${
                      isDark ? 'border-slate-800 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  {[...Array(pageCount)].map((_, i) => {
                    const page = i + 1;
                    // Limit number of page buttons displayed
                    if (Math.abs(page - currentPage) > 2 && page !== 1 && page !== pageCount) {
                      if (page === 2 || page === pageCount - 1) {
                        return <span key={page} className="text-xs opacity-50 px-1">...</span>;
                      }
                      return null;
                    }
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : isDark
                              ? 'hover:bg-slate-800 text-slate-300'
                              : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(pageCount, prev + 1))}
                    disabled={currentPage === pageCount}
                    className={`p-1.5 rounded-lg border text-xs font-semibold transition-all disabled:opacity-30 ${
                      isDark ? 'border-slate-800 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
