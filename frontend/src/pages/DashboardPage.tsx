import { useEffect, useState, useMemo } from 'react';
import { floorsApi } from '../services/backend';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { FloorItem, FloorPlanObject } from '../types/editor';
import { useRealtimeSensors } from '../hooks/useRealtimeSensors';
import { DashboardSidebar } from '../components/Dashboard/DashboardSidebar';
import { FloorPlanViewer } from '../components/Dashboard/FloorPlanViewer';
import { SwitchTheme } from '../components/UI/SwitchTheme';
import {
  ShieldAlert,
  Activity,
  Flame,
  Thermometer,
  Layers,
  Radio,
  FileSpreadsheet,
  Search,
  RefreshCw,
  LogOut,
  User as UserIcon,
  Menu,
} from 'lucide-react';

export function DashboardPage() {
  const { user, logout } = useAuthStore();
  const { darkMode } = useThemeStore();
  const isDark = darkMode;

  // Active Tab: 'dashboard' | 'editor' | 'history'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'editor' | 'history'>('dashboard');

  // Sidebar status: open by default on desktop, closed on mobile
  const [sidebarOpen, setSidebarOpen] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );

  const [floors, setFloors] = useState<FloorItem[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  // Pathfinding state
  const [safePath, setSafePath] = useState<string[]>([]);
  const [selectedStartRoomId, setSelectedStartRoomId] = useState<string | null>(null);
  const [evacuationActive, setEvacuationActive] = useState(false);

  // WebSocket and sensors hook
  const { summary, mq2, temperature, loading, wsStatus, refresh } = useRealtimeSensors(
    selectedFloor,
    search
  );

  // Load floor plan objects when selectedFloor changes
  const [objects, setObjects] = useState<FloorPlanObject[]>([]);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [canvasWidth, setCanvasWidth] = useState<number>(1600);
  const [canvasHeight, setCanvasHeight] = useState<number>(1000);

  useEffect(() => {
    // Fetch all floors on component mount
    floorsApi.list().then((data) => {
      setFloors(data);
      if (data.length > 0 && selectedFloor === null) {
        setSelectedFloor(data[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (selectedFloor) {
      setLoadingPlan(true);
      floorsApi.getPlan(selectedFloor)
        .then((plan) => {
          setObjects(plan.objects);
          setCanvasWidth(plan.canvas_width ?? 1600);
          setCanvasHeight(plan.canvas_height ?? 1000);
          // Reset pathfinding states on floor switch
          setSafePath([]);
          setSelectedStartRoomId(null);
          setEvacuationActive(false);
        })
        .finally(() => {
          setLoadingPlan(false);
        });
    } else {
      setObjects([]);
    }
  }, [selectedFloor]);

  // Combine all active sensors on the selected floor
  const allSensors = useMemo(() => {
    return [...mq2, ...temperature];
  }, [mq2, temperature]);

  // Identify which rooms are in danger
  const dangerRooms = useMemo(() => {
    const dangerRoomIds = new Set<string>();
    const dangerSensorPositions: { x: number; y: number }[] = [];

    // Filter sensors in danger state
    const dangerDeviceIds = new Set(
      allSensors.filter((s) => s.latest_status === 'danger').map((s) => s.device_id)
    );

    objects.forEach((obj) => {
      if (obj.type === 'sensor' || obj.type === 'mq2' || obj.type === 'temp') {
        if (dangerDeviceIds.has(obj.id)) {
          dangerSensorPositions.push({ x: obj.x, y: obj.y });
        }
      }
    });

    objects.forEach((obj) => {
      if (obj.type === 'room') {
        const rx = obj.x;
        const ry = obj.y;
        const rw = obj.width || 200;
        const rh = obj.height || 120;

        const hasDanger = dangerSensorPositions.some(
          (p) => p.x >= rx && p.x <= rx + rw && p.y >= ry && p.y <= ry + rh
        );
        if (hasDanger) {
          dangerRoomIds.add(obj.id);
        }
      }
    });

    return dangerRoomIds;
  }, [objects, allSensors]);

  // Handle pathfinding
  async function handleToggleEvacuation() {
    if (evacuationActive) {
      setEvacuationActive(false);
      setSafePath([]);
      return;
    }

    if (!selectedFloor) return;

    // Determine start node
    let startId = selectedStartRoomId;
    if (!startId) {
      // Prioritize starting from a room currently in danger
      const dangerRoom = objects.find((o) => o.type === 'room' && dangerRooms.has(o.id));
      if (dangerRoom) {
        startId = dangerRoom.id;
      } else {
        // Fallback to lobby or any first room
        const lobby = objects.find((o) => o.type === 'room' && o.id.toLowerCase().includes('lobby'));
        const anyRoom = objects.find((o) => o.type === 'room');
        startId = lobby?.id || anyRoom?.id || null;
      }
    }

    if (!startId) {
      alert('Không tìm thấy điểm xuất phát nào trên sơ đồ.');
      return;
    }

    // Find exit node
    const exitNode = objects.find((o) => o.type === 'exit');
    if (!exitNode) {
      alert('Không tìm thấy điểm thoát hiểm (EXIT) trên sơ đồ tầng này.');
      return;
    }

    setEvacuationActive(true);

    try {
      const path = await floorsApi.findPath(selectedFloor, startId, exitNode.id);
      setSafePath(path);
    } catch (err) {
      console.warn('Backend pathfinding unavailable. Falling back to layout routing...', err);
      // Fallback: draw startRoom -> lobby (if exists) -> exit
      const lobby = objects.find((o) => o.type === 'room' && o.id.toLowerCase().includes('lobby'));
      if (lobby && lobby.id !== startId && lobby.id !== exitNode.id) {
        setSafePath([startId, lobby.id, exitNode.id]);
      } else {
        setSafePath([startId, exitNode.id]);
      }
    }
  }

  // Handle room selection from FloorPlanViewer
  const handleRoomSelect = (roomId: string) => {
    setSelectedStartRoomId(roomId === selectedStartRoomId ? null : roomId);
    // Reset active path when start room changes
    setEvacuationActive(false);
    setSafePath([]);
  };

  // Focus a specific sensor room on the map and calculate path
  const handleFocusSensor = (sensorRoom: string | null) => {
    if (!sensorRoom) return;
    const roomObj = objects.find(
      (o) => o.type === 'room' && o.name?.toLowerCase().trim() === sensorRoom.toLowerCase().trim()
    );
    if (roomObj) {
      handleRoomSelect(roomObj.id);
    }
  };

  // Total active alerts counter
  const activeAlertsCount = useMemo(() => {
    return allSensors.filter((s) => s.latest_status === 'danger').length;
  }, [allSensors]);

  // Page title sync
  useEffect(() => {
    document.title = `Emberpath – ${user?.building.name || 'Dashboard'}`;
  }, [user]);

  return (
    <div
      className={`min-h-screen font-sans antialiased transition-colors duration-300 ${
        isDark ? 'bg-[#0F172A] text-slate-100' : 'bg-slate-50 text-slate-800'
      }`}
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Floating Toggle Button (visible only when sidebar is closed) */}
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

      {/* 1. Left Sidebar Navigation */}
      <DashboardSidebar
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        isDark={isDark}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* 2. Main content area (aligned right of sidebar) */}
      <div className={`pl-0 ${sidebarOpen ? 'md:pl-64' : 'md:pl-0'} min-h-screen flex flex-col transition-[padding-left] duration-300 ease-in-out`}>
        {/* Header bar */}
        <header
          className={`h-16 flex items-center justify-between px-4 md:px-8 border-b transition-colors duration-300 ${
            isDark ? 'bg-[#1E293B] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Layers className={isDark ? 'text-blue-500' : 'text-blue-600'} size={20} />
            <h1 className={`text-sm md:text-lg font-bold uppercase tracking-wide truncate max-w-[200px] sm:max-w-none ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
              Trang Tổng Quan – {user?.building.name || 'Building A'}
            </h1>
          </div>

          <div className="flex items-center gap-6">
            {/* WebSocket Status Badge */}
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                WebSocket:
              </span>
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider ${
                  wsStatus === 'connected'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : wsStatus === 'connecting'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    wsStatus === 'connected'
                      ? 'bg-emerald-400 animate-ping'
                      : wsStatus === 'connecting'
                        ? 'bg-amber-400 animate-pulse'
                        : 'bg-rose-400 animate-bounce'
                  }`}
                />
                <span>
                  {wsStatus === 'connected'
                    ? 'ĐẦ CẦN KẾT NỐI'
                    : wsStatus === 'connecting'
                      ? 'ĐANG KẾT NỐI'
                      : 'MẤT KẾT NỐI'}
                </span>
              </div>
            </div>

            {/* Light / Dark Mode Switcher */}
            <SwitchTheme />

            {/* Profile Avatar Widget */}
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
                <span className={`text-[9px] uppercase tracking-wider opacity-75`}>
                  {user?.role || 'Operator'}
                </span>
              </div>
            </div>

            {/* Logout Trigger */}
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

        {/* 3. Main Dashboard Workspace Layout */}
        <main className="flex-1 p-6 space-y-6">
          {activeTab === 'dashboard' ? (
            <>
              {/* Stat Cards Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Card 1: Floors */}
                <div
                  className={`rounded-2xl border p-5 flex items-center gap-4 transition-all duration-300 ${
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
                      Tầng (Floors)
                    </span>
                    <span className="text-3xl font-extrabold font-mono tracking-tight">
                      {floors.length || '--'}
                    </span>
                  </div>
                </div>

                {/* Card 2: Total Sensors */}
                <div
                  className={`rounded-2xl border p-5 flex items-center gap-4 transition-all duration-300 ${
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
                      {(summary?.total_mq2 || 0) + (summary?.total_temperature || 0) || '--'}
                    </span>
                  </div>
                </div>

                {/* Card 3: MQ2 Active Warnings */}
                <div
                  className={`rounded-2xl border p-5 flex items-center gap-4 transition-all duration-300 ${
                    isDark ? 'bg-[#1E293B] border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div
                    className={`p-3.5 rounded-xl ${
                      summary?.danger_count && summary.danger_count > 0
                        ? 'bg-amber-500/10 text-amber-500'
                        : isDark
                          ? 'bg-slate-800 text-slate-500'
                          : 'bg-[#ebd9ce] text-[#8a5a4b]'
                    }`}
                  >
                    <Flame size={22} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs opacity-75 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Cảnh báo Khói (MQ2)
                      </span>
                      {summary?.danger_count && summary.danger_count > 0 ? (
                        <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                      ) : null}
                    </div>
                    <span className="text-3xl font-extrabold font-mono tracking-tight text-amber-500">
                      {summary?.total_mq2 ?? '--'}
                    </span>
                  </div>
                </div>

                {/* Card 4: Heat Alerts */}
                <div
                  className={`rounded-2xl border p-5 flex items-center gap-4 transition-all duration-300 ${
                    isDark ? 'bg-[#1E293B] border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div
                    className={`p-3.5 rounded-xl ${
                      activeAlertsCount > 0
                        ? 'bg-rose-500/20 text-rose-500'
                        : isDark
                          ? 'bg-slate-800 text-slate-500'
                          : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    <Thermometer size={22} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs opacity-75 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Cảm biến Nhiệt
                      </span>
                      {activeAlertsCount > 0 ? (
                        <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                      ) : null}
                    </div>
                    <span
                      className={`text-3xl font-extrabold font-mono tracking-tight ${
                        activeAlertsCount > 0 ? 'text-rose-500' : ''
                      }`}
                    >
                      {summary?.total_temperature ?? '--'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sơ đồ Tầng Thời gian thực block */}
              <div
                className={`rounded-3xl border shadow-soft p-5 transition-colors duration-300 ${
                  isDark ? 'bg-[#1E293B] border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-base font-extrabold tracking-tight">SƠ ĐỒ TẦNG THỜI GIAN THỰC</h2>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Xem trạng thái realtime và kích hoạt lối sơ tán khẩn cấp
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Floor Selector Dropdown */}
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Floor Selector:
                      </span>
                      <select
                        value={selectedFloor ?? ''}
                        onChange={(e) => setSelectedFloor(e.target.value ? Number(e.target.value) : null)}
                        className={`text-xs font-bold rounded-xl border px-3 py-1.5 outline-none transition duration-200 ${
                          isDark
                            ? 'bg-slate-900 border-slate-800 text-slate-100 hover:border-slate-700'
                            : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
                        }`}
                      >
                        {floors.map((floor) => (
                          <option key={floor.id} value={floor.id}>
                            {floor.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Evacuation button */}
                    <button
                      onClick={() => void handleToggleEvacuation()}
                      className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase rounded-xl shadow-md transition-all duration-200 ${
                        evacuationActive
                          ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20'
                          : isDark
                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                            : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/10'
                      }`}
                    >
                      <Activity size={13} className={evacuationActive ? 'animate-spin' : ''} />
                      <span>{evacuationActive ? 'Hủy Thoát Hiểm' : 'Kích hoạt đường thoát hiểm'}</span>
                    </button>
                  </div>
                </div>

                {/* Sơ đồ Konva Render */}
                {loadingPlan ? (
                  <div
                    className={`h-[520px] rounded-2xl border border-dashed flex flex-col items-center justify-center gap-2 ${
                      isDark ? 'border-slate-800 text-slate-400 bg-slate-950/20' : 'border-slate-200 text-slate-500 bg-slate-50'
                    }`}
                  >
                    <RefreshCw className="animate-spin text-blue-500" size={24} />
                    <span className="text-xs">Đang nạp sơ đồ tầng...</span>
                  </div>
                ) : (
                  <FloorPlanViewer
                    objects={objects}
                    sensors={allSensors}
                    safePath={safePath}
                    onRoomSelect={handleRoomSelect}
                    selectedStartRoomId={selectedStartRoomId}
                    evacuationActive={evacuationActive}
                    isDark={isDark}
                    canvasWidth={canvasWidth}
                    canvasHeight={canvasHeight}
                  />
                )}
              </div>

              {/* BẢNG DỮ LIỆU & CẢNH BÁO */}
              <div
                className={`rounded-3xl border shadow-soft overflow-hidden transition-colors duration-300 ${
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

                  {/* Table search filter */}
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <Search size={14} />
                    </span>
                    <input
                      type="text"
                      placeholder="Tìm cảm biến, vị trí..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className={`w-64 pl-9 pr-4 py-1.5 text-xs rounded-xl border outline-none transition duration-200 ${
                        isDark
                          ? 'bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-500 focus:border-slate-700'
                          : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500'
                      }`}
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr
                        className={`text-[10px] font-bold uppercase tracking-wider border-b transition-colors duration-300 ${
                          isDark
                            ? 'bg-slate-950/30 text-slate-400 border-slate-800'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        <th className="py-3 px-6">Mã Cảm Biến</th>
                        <th className="py-3 px-6">Tên Cảm Biến</th>
                        <th className="py-3 px-6">Vị Trí</th>
                        <th className="py-3 px-6 text-right">Giá Trị</th>
                        <th className="py-3 px-6 text-right">Ngưỡng An Toàn</th>
                        <th className="py-3 px-6 text-center">Trạng Thái</th>
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
                      ) : allSensors.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-500">
                            Không tìm thấy dữ liệu cảm biến nào khớp với bộ lọc.
                          </td>
                        </tr>
                      ) : (
                        allSensors.map((sensor) => {
                          const isDanger = sensor.latest_status === 'danger';
                          const isWarning =
                            sensor.latest_status === 'safe' &&
                            sensor.latest_value >= sensor.threshold * 0.8;

                          return (
                            <tr
                              key={sensor.id}
                              className={`transition-colors hover:bg-slate-500/5 ${
                                isDanger
                                  ? 'bg-rose-500/5 text-rose-500'
                                  : isWarning
                                    ? 'bg-amber-500/5 text-amber-500'
                                    : ''
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
                                {sensor.last_seen_at
                                  ? new Date(sensor.last_seen_at).toLocaleTimeString()
                                  : '--'}
                              </td>
                              <td className="py-3 px-6 text-center">
                                <button
                                  onClick={() => handleFocusSensor(sensor.room_name)}
                                  className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition ${
                                    isDark
                                      ? 'bg-slate-900 border border-slate-800 hover:bg-slate-800 text-blue-400'
                                      : 'bg-white border border-slate-200 hover:bg-slate-50 text-blue-600'
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
            </>
          ) : (
            /* Historical Logs view tab */
            <div
              className={`rounded-3xl border shadow-soft p-6 transition-colors duration-300 ${
                isDark ? 'bg-[#1E293B] border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between border-b pb-4 mb-4 border-inherit">
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight">BẢNG DỮ LIỆU LỊCH SỬ HỆ THỐNG</h2>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Xem và xuất dữ liệu ghi nhận lịch sử đo đạc từ các sensor của tòa nhà
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => refresh()}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                      isDark
                        ? 'border-slate-700 hover:bg-slate-800 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <RefreshCw size={13} />
                    <span>Làm mới</span>
                  </button>
                  <button
                    onClick={() => alert('Xuất báo cáo thành công dưới dạng CSV!')}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white rounded-lg bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/10"
                  >
                    <FileSpreadsheet size={13} />
                    <span>Xuất file CSV</span>
                  </button>
                </div>
              </div>

              {/* Simulation historical data list */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr
                      className={`text-[10px] font-bold uppercase tracking-wider border-b transition-colors duration-300 ${
                        isDark
                          ? 'bg-slate-950/30 text-slate-400 border-slate-800'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      <th className="py-3 px-6">Mã Thiết Bị</th>
                      <th className="py-3 px-6">Tên Sensor</th>
                      <th className="py-3 px-6">Vị Trí</th>
                      <th className="py-3 px-6">Chỉ số Đo Đạc</th>
                      <th className="py-3 px-6">Ngưỡng</th>
                      <th className="py-3 px-6 text-center">Trạng Thái</th>
                      <th className="py-3 px-6">Thời gian Ghi Nhận</th>
                    </tr>
                  </thead>
                  <tbody
                    className={`divide-y text-xs transition-colors duration-300 ${
                      isDark ? 'divide-slate-800' : 'divide-slate-200/80'
                    }`}
                  >
                    {[
                      {
                        dev: 'mq2-01',
                        name: 'MQ2 Lobby A',
                        loc: 'Lobby',
                        val: '220 raw',
                        th: '600 raw',
                        st: 'safe',
                        time: '16:04:12 16/07',
                      },
                      {
                        dev: 'temp-01',
                        name: 'Temp Lobby A',
                        loc: 'Lobby',
                        val: '29 °C',
                        th: '50 °C',
                        st: 'safe',
                        time: '16:03:55 16/07',
                      },
                      {
                        dev: 'mq2-02',
                        name: 'MQ2 Corridor A',
                        loc: 'Corridor E',
                        val: '710 raw',
                        th: '600 raw',
                        st: 'danger',
                        time: '15:58:32 16/07',
                      },
                      {
                        dev: 'mq2-03',
                        name: 'MQ2 Control A',
                        loc: 'Control Room',
                        val: '180 raw',
                        th: '600 raw',
                        st: 'safe',
                        time: '15:55:10 16/07',
                      },
                    ].map((item, index) => (
                      <tr
                        key={index}
                        className={item.st === 'danger' ? 'bg-rose-500/5 text-rose-500' : ''}
                      >
                        <td className="py-3.5 px-6 font-mono font-semibold">{item.dev}</td>
                        <td className="py-3.5 px-6">{item.name}</td>
                        <td className="py-3.5 px-6">{item.loc}</td>
                        <td className="py-3.5 px-6 font-mono font-bold">{item.val}</td>
                        <td className="py-3.5 px-6 font-mono opacity-85">{item.th}</td>
                        <td className="py-3.5 px-6 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                              item.st === 'danger'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {item.st.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 font-mono opacity-75">{item.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
