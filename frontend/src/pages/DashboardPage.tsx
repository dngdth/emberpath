import { useEffect, useState, useMemo } from 'react';
import { floorsApi } from '../services/backend';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { FloorItem, FloorPlanObject, SafePathResult } from '../types/editor';
import { SensorDevice } from '../types/sensor';
import { physicalSensorNodeId, sensorDeviceMatchesNode } from '../utils/sensorIdentity';

import { useRealtimeSensors } from '../hooks/useRealtimeSensors';
import { DashboardSidebar } from '../components/Dashboard/DashboardSidebar';
import { FloorPlanViewer } from '../components/Dashboard/FloorPlanViewer';
import { SwitchTheme } from '../components/UI/SwitchTheme';
import { SensorStatsCards } from '../components/Dashboard/SensorStatsCards';
import { LiveSensorsTable } from '../components/Dashboard/LiveSensorsTable';
import {
  Activity,
  Layers,
  LogOut,
  Menu,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export function DashboardPage() {
  const { user, logout } = useAuthStore();
  const { darkMode } = useThemeStore();
  const isDark = darkMode;

  // Sidebar status: open by default on desktop, closed on mobile
  const [sidebarOpen, setSidebarOpen] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );

  const [floors, setFloors] = useState<FloorItem[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const currentFloorIndex = floors.findIndex((f) => f.id === selectedFloor);

  const handlePrevFloor = () => {
    if (currentFloorIndex > 0) {
      setSelectedFloor(floors[currentFloorIndex - 1].id);
    }
  };

  const handleNextFloor = () => {
    if (currentFloorIndex < floors.length - 1 && currentFloorIndex !== -1) {
      setSelectedFloor(floors[currentFloorIndex + 1].id);
    }
  };

  // Pathfinding state
  const [safePath, setSafePath] = useState<SafePathResult | null>(null);
  const [selectedStartRoomId, setSelectedStartRoomId] = useState<string | null>(null);
  const [evacuationActive, setEvacuationActive] = useState(false);

  // WebSocket and sensors hook
  const { summary, mq2, temperature, dangerSensors, loading, refresh } = useRealtimeSensors(
    selectedFloor,
    search
  );

  const [pendingFocusSensorId, setPendingFocusSensorId] = useState<string | null>(null);

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
          setSelectedStartRoomId(null);
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
    const activeDangerSensors = allSensors.filter((s) => s.latest_status === 'danger');

    objects.forEach((obj) => {
      if (obj.type === 'sensor' || obj.type === 'mq2' || obj.type === 'temp') {
        if (activeDangerSensors.some((sensor) => sensorDeviceMatchesNode(sensor.device_id, obj.id))) {
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

  const dangerStateKey = useMemo(() => {
    const physicalNodes = new Set(
      dangerSensors
        .filter((sensor) => sensor.floor_id !== null)
        .map((sensor) => `${sensor.floor_id}:${physicalSensorNodeId(sensor.device_id)}`)
    );
    return [...physicalNodes].sort().join('|');
  }, [dangerSensors]);

  const primaryDangerSensor = useMemo(() => {
    return (
      dangerSensors.find((sensor) => sensor.floor_id === selectedFloor)
      ?? dangerSensors.find((sensor) => sensor.floor_id !== null)
      ?? null
    );
  }, [dangerSensors, selectedFloor]);
  const primaryDangerFloorId = primaryDangerSensor?.floor_id ?? null;
  const primaryDangerDeviceId = primaryDangerSensor?.device_id ?? null;

  // A live safe/danger transition immediately activates or recalculates the
  // building-wide guidance field. Stale requests cannot overwrite a newer route.
  useEffect(() => {
    if (!dangerStateKey || primaryDangerFloorId === null || !primaryDangerDeviceId) {
      setEvacuationActive(false);
      setSafePath(null);
      return;
    }

    let cancelled = false;
    setEvacuationActive(true);

    floorsApi.findPath(primaryDangerFloorId, primaryDangerDeviceId)
      .then((path) => {
        if (!cancelled) setSafePath(path);
      })
      .catch(() => {
        if (!cancelled) setSafePath(null);
      });

    return () => {
      cancelled = true;
    };
  }, [dangerStateKey, primaryDangerFloorId, primaryDangerDeviceId]);

  // Handle pathfinding
  async function handleToggleEvacuation() {
    if (evacuationActive) {
      if (dangerStateKey) return;
      setEvacuationActive(false);
      setSafePath(null);
      return;
    }

    if (!selectedFloor) return;

    // Determine the node from which the evacuation gradient should be followed.
    let startId = selectedStartRoomId;
    if (!startId) {
      const activeDangerSensors = allSensors.filter((sensor) => sensor.latest_status === 'danger');
      const sensorTypes = new Set(['sensor', 'mq2', 'temp']);
      const dangerNode = objects.find((object) =>
        sensorTypes.has(object.type)
        && (
          activeDangerSensors.some((sensor) => sensorDeviceMatchesNode(sensor.device_id, object.id))
          || object.nodeStatus === 'danger'
        )
      );
      if (dangerNode) {
        startId = dangerNode.id;
      } else {
        const firstSensor = objects.find((object) => sensorTypes.has(object.type));
        const lobby = objects.find((o) => o.type === 'room' && o.id.toLowerCase().includes('lobby'));
        const anyRoom = objects.find((o) => o.type === 'room');
        startId = firstSensor?.id || lobby?.id || anyRoom?.id || null;
      }
    }

    if (!startId) {
      alert('Không tìm thấy điểm xuất phát nào trên sơ đồ.');
      return;
    }

    setEvacuationActive(true);

    try {
      const path = await floorsApi.findPath(selectedFloor, startId);
      setSafePath(path);
    } catch (err: any) {
      setEvacuationActive(false);
      setSafePath(null);
      alert(err.response?.data?.detail || 'Không thể tạo trường chỉ dẫn trên mạng dây LED.');
    }
  }

  // Handle room selection from FloorPlanViewer
  const handleRoomSelect = (roomId: string) => {
    setSelectedStartRoomId(roomId === selectedStartRoomId ? null : roomId);
    // Reset active path when start room changes
    setEvacuationActive(false);
    setSafePath(null);
  };

  // Helper to find which room contains a sensor (by checking coordinate bounding box)
  const findRoomForSensor = (sensorObj: FloorPlanObject, planObjects: FloorPlanObject[]) => {
    const rooms = planObjects.filter(o => o.type === 'room');
    for (const room of rooms) {
      const rx = room.x;
      const ry = room.y;
      const rw = room.width || 200;
      const rh = room.height || 120;
      if (sensorObj.x >= rx && sensorObj.x <= rx + rw && sensorObj.y >= ry && sensorObj.y <= ry + rh) {
        return room;
      }
    }
    return null;
  };

  // React to floor plan objects loading when pendingFocusSensorId is set
  useEffect(() => {
    if (objects.length > 0 && pendingFocusSensorId) {
      const sensorObj = objects.find(o => sensorDeviceMatchesNode(pendingFocusSensorId, o.id));
      if (sensorObj) {
        const roomObj = findRoomForSensor(sensorObj, objects);
        if (roomObj) {
          setSelectedStartRoomId(roomObj.id);
        } else {
          setSelectedStartRoomId(sensorObj.id);
        }
        setEvacuationActive(false);
        setSafePath(null);
      }
      setPendingFocusSensorId(null);
    }
  }, [objects, pendingFocusSensorId]);

  // Handle clicking a danger sensor from the floating panel
  const handleSelectDangerSensor = (sensor: SensorDevice) => {
    if (sensor.floor_id === null) return;

    if (sensor.floor_id !== selectedFloor) {
      setPendingFocusSensorId(sensor.device_id);
      setSelectedFloor(sensor.floor_id);
    } else {
      // already on the current floor, focus immediately
      const sensorObj = objects.find(o => sensorDeviceMatchesNode(sensor.device_id, o.id));
      if (sensorObj) {
        const roomObj = findRoomForSensor(sensorObj, objects);
        if (roomObj) {
          handleRoomSelect(roomObj.id);
        } else {
          setSelectedStartRoomId(sensorObj.id);
        }
      }
    }
  };

  // Focus a specific sensor room on the map and calculate path (called from historical table)
  const handleFocusSensor = (sensorRoom: string | null) => {
    if (!sensorRoom) return;
    const roomObj = objects.find(
      (o) => o.type === 'room' && o.name?.toLowerCase().trim() === sensorRoom.toLowerCase().trim()
    );
    if (roomObj) {
      handleRoomSelect(roomObj.id);
    }
  };


  // Page title sync
  useEffect(() => {
    document.title = `Emberpath – ${user?.building.name || 'Dashboard'}`;
  }, [user]);

  return (
    <div
      className={`min-h-screen font-sans antialiased transition-colors duration-300 ${isDark ? 'bg-[#0F172A] text-slate-100' : 'bg-slate-50 text-slate-800'
        }`}
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Floating Toggle Button (visible only when sidebar is closed) */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className={`fixed bottom-6 left-6 z-40 p-3.5 rounded-full shadow-2xl border transition-all duration-300 hover:scale-110 active:scale-95 hover:shadow-blue-500/25 ${isDark
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
        isDark={isDark}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpen={() => setSidebarOpen(true)}
      />

      {/* 2. Main content area (aligned right of sidebar) */}
      <div className={`pl-0 ${sidebarOpen ? 'md:pl-64' : 'md:pl-0'} min-h-screen flex flex-col transition-[padding-left] duration-300 ease-in-out`}>
        {/* Header bar */}
        <header
          className={`h-16 flex items-center justify-between px-4 md:px-8 border-b transition-colors duration-300 ${isDark ? 'bg-[#1E293B] border-slate-800' : 'bg-white border-slate-200'
            }`}
        >
          <div className="flex items-center gap-2">
            <Layers className={isDark ? 'text-blue-500' : 'text-blue-600'} size={20} />
            <h1 className={`text-sm md:text-lg font-bold uppercase tracking-wide truncate max-w-[200px] sm:max-w-none ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
              Trang Tổng Quan – {user?.building.name || 'Building A'}
            </h1>
          </div>

          <div className="flex items-center gap-6">

            {/* Light / Dark Mode Switcher */}
            <SwitchTheme />

            {/* Profile Avatar Widget */}
            <div
              className={`flex items-center gap-3 px-3 py-1.5 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
            >
              <div
                className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold text-white ${isDark ? 'bg-blue-600 shadow-md' : 'bg-blue-600'
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
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${isDark
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
          {/* Stat Cards Row */}
          <SensorStatsCards floorsCount={floors.length} summary={summary} isDark={isDark} />

          {/* Sơ đồ Tầng Thời gian thực block */}
          <div
            className={`rounded-xl border shadow-soft p-5 transition-colors duration-300 ${isDark ? 'bg-[#1E293B] border-slate-800' : 'bg-white border-slate-200'
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
                    Sơ đồ tầng:
                  </span>
                  <button
                    onClick={handlePrevFloor}
                    disabled={currentFloorIndex <= 0}
                    className={`p-1.5 rounded-xl border transition-all duration-200 ${
                      currentFloorIndex <= 0
                        ? 'opacity-40 cursor-not-allowed border-transparent text-slate-400'
                        : isDark
                          ? 'bg-slate-900 border-slate-800 text-slate-100 hover:border-slate-700 hover:bg-slate-800'
                          : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                    title="Tầng trước"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <select
                    value={selectedFloor ?? ''}
                    onChange={(e) => setSelectedFloor(e.target.value ? Number(e.target.value) : null)}
                    className={`text-xs font-bold rounded-xl border px-3 py-1.5 outline-none transition duration-200 ${isDark
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
                  <button
                    onClick={handleNextFloor}
                    disabled={currentFloorIndex === -1 || currentFloorIndex >= floors.length - 1}
                    className={`p-1.5 rounded-xl border transition-all duration-200 ${
                      currentFloorIndex === -1 || currentFloorIndex >= floors.length - 1
                        ? 'opacity-40 cursor-not-allowed border-transparent text-slate-400'
                        : isDark
                          ? 'bg-slate-900 border-slate-800 text-slate-100 hover:border-slate-700 hover:bg-slate-800'
                          : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                    title="Tầng tiếp theo"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>

                {/* Evacuation button */}
                <button
                  onClick={() => void handleToggleEvacuation()}
                  disabled={evacuationActive && Boolean(dangerStateKey)}
                  title={evacuationActive && dangerStateKey ? 'Đường thoát hiểm đang được duy trì tự động khi còn nguy hiểm' : undefined}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase rounded-xl shadow-md transition-all duration-200 ${evacuationActive
                    ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20'
                    : isDark
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                      : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/10'
                    }`}
                >
                  <Activity size={13} className={evacuationActive ? 'animate-spin' : ''} />
                  <span>
                    {evacuationActive
                      ? dangerStateKey ? 'Đang tự động chỉ đường' : 'Hủy Thoát Hiểm'
                      : 'Kích hoạt đường thoát hiểm'}
                  </span>
                </button>
              </div>
            </div>

            {/* Sơ đồ Konva Render */}
            {loadingPlan ? (
              <div
                className={`h-[520px] rounded-xl border border-dashed flex flex-col items-center justify-center gap-2 ${isDark ? 'border-slate-800 text-slate-400 bg-slate-950/20' : 'border-slate-200 text-slate-500 bg-slate-50'
                  }`}
              >
                <RefreshCw className="animate-spin text-blue-500" size={24} />
                <span className="text-xs">Đang nạp sơ đồ tầng...</span>
              </div>
            ) : (
              <FloorPlanViewer
                floorId={selectedFloor}
                objects={objects}
                sensors={allSensors}
                safePath={safePath}
                onRoomSelect={handleRoomSelect}
                selectedStartRoomId={selectedStartRoomId}
                evacuationActive={evacuationActive}
                isDark={isDark}
                canvasWidth={canvasWidth}
                canvasHeight={canvasHeight}
                dangerSensors={dangerSensors}
                floors={floors}
                onSelectDangerSensor={handleSelectDangerSensor}
              />
            )}
          </div>

          {/* BẢNG DỮ LIỆU & CẢNH BÁO LIVE */}
          <LiveSensorsTable
            sensors={allSensors}
            loading={loading}
            isDark={isDark}
            search={search}
            onSearchChange={setSearch}
            onFocusSensor={handleFocusSensor}
          />
        </main>
      </div>
    </div>
  );
}
