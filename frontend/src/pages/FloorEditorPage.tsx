import { useEffect, useMemo, useState, useRef } from 'react';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { CanvasEditor } from '../components/MapEditor/CanvasEditor';
import { FloorListSection } from '../components/MapEditor/FloorListSection';
import { MonitorInfoSection } from '../components/MapEditor/MonitorInfoSection';
import { TokenLibrary } from '../components/MapEditor/TokenLibrary';
import { PropertyPanel } from '../components/MapEditor/PropertyPanel';
import { ConfirmModal } from '../components/MapEditor/ConfirmModal';
import { FloorRenameModal } from '../components/MapEditor/FloorRenameModal';
import { useEditorState } from '../hooks/useEditorState';
import { useHistory } from '../hooks/useHistory';
import { useSelection } from '../hooks/useSelection';
import { useZoomPan } from '../hooks/useZoomPan';
import { useRealtimeSensors } from '../hooks/useRealtimeSensors';
import { exportPlanToJson, importPlanFromJson } from '../utils/serialization';
import { FloorItem, FloorPlanObject, FloorPlanResponse, ObjectType } from '../types/editor';
import {
  Layers,
  ArrowLeft,
  LogOut,
  RotateCcw,
  Eye,
  Activity,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Undo2,
  Redo2,
  Save,
  Download,
  Upload,
  MousePointer,
  Hand,
} from 'lucide-react';
import { SwitchTheme } from '../components/UI/SwitchTheme';
import clsx from 'clsx';

export function FloorEditorPage() {
  const { user, logout } = useAuthStore();
  const { darkMode } = useThemeStore();
  const isDark = darkMode;

  // Edit Mode state
  const [editMode, setEditMode] = useState<boolean>(user?.role === 'admin_building');

  // Figma Style Sidebar floating toggle states
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);

  // Dropdown active state
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const fileMenuRef = useRef<HTMLDivElement>(null);

  // Floors CRUD states
  const [floors, setFloors] = useState<FloorItem[]>([]);
  const [activeFloorId, setActiveFloorId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [editorViewport, setEditorViewport] = useState({ width: 1200, height: 780 });
  const [safePath, setSafePath] = useState<string[]>([]);

  // Modals visibility states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [floorToDelete, setFloorToDelete] = useState<FloorItem | null>(null);

  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [floorToRename, setFloorToRename] = useState<FloorItem | null>(null); // null means adding

  // Base line from floor below states
  const [belowObjects, setBelowObjects] = useState<FloorPlanObject[]>([]);
  const [showBelowBaseline, setShowBelowBaseline] = useState<boolean>(true);

  // Editor engine hooks
  const history = useHistory<FloorPlanObject[]>([]);
  const zoomPan = useZoomPan();
  const selection = useSelection();
  const editor = useEditorState(history.state, history.set);

  // Load live sensor data for monitoring
  const { summary, mq2, temperature, loading: sensorsLoading, wsStatus } = useRealtimeSensors(
    activeFloorId
  );

  const allSensors = useMemo(() => {
    return [...mq2, ...temperature];
  }, [mq2, temperature]);

  // Selected object helper
  const selectedObject = useMemo(
    () => history.state.find((object) => selection.selectedIds[0] === object.id) ?? null,
    [history.state, selection.selectedIds],
  );

  // Sort floors logically by index
  const sortedFloors = useMemo(() => {
    return [...floors].sort((a, b) => a.order_index - b.order_index);
  }, [floors]);

  // Active Floor Item
  const activeFloor = useMemo(() => {
    return floors.find((f) => f.id === activeFloorId) || null;
  }, [floors, activeFloorId]);

  // Find floor directly below active floor
  const floorBelow = useMemo(() => {
    if (!activeFloor) return null;
    const activeIdx = sortedFloors.findIndex((f) => f.id === activeFloor.id);
    return activeIdx > 0 ? sortedFloors[activeIdx - 1] : null;
  }, [sortedFloors, activeFloor]);

  // Fetch plan of floor below when active floor changes
  useEffect(() => {
    if (floorBelow) {
      api.get<FloorPlanResponse>(`/floors/${floorBelow.id}/plan`)
        .then((res) => {
          setBelowObjects(res.data.objects);
        })
        .catch((err) => {
          console.error('Failed to load floor below plan', err);
          setBelowObjects([]);
        });
    } else {
      setBelowObjects([]);
    }
  }, [floorBelow]);

  // Sync safety triggers for operators
  useEffect(() => {
    if (user && user.role !== 'admin_building') {
      setEditMode(false); // Operators are strictly viewing/monitoring
    }
  }, [user]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (fileMenuRef.current && !fileMenuRef.current.contains(event.target as Node)) {
        setFileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync window keyboard shortcuts (only in Edit mode)
  useEffect(() => {
    if (!editMode) return;

    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        history.undo();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        history.redo();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        const ids = editor.duplicateObjects(selection.selectedIds);
        selection.setSelectedIds(ids);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
        event.preventDefault();
        editor.copyObjects(selection.selectedIds);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') {
        event.preventDefault();
        const ids = editor.pasteObjects();
        selection.setSelectedIds(ids);
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        editor.removeObjects(selection.selectedIds);
        selection.clearSelection();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editor, history, selection, editMode]);

  useEffect(() => {
    void loadFloors();
  }, []);

  useEffect(() => {
    if (!activeFloorId) return;
    void loadPlan(activeFloorId);
  }, [activeFloorId]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Automatically find path when in emergency state (Monitor Mode only)
  const dangerDeviceIds = useMemo(() => {
    return new Set(allSensors.filter((s) => s.latest_status === 'danger').map((s) => s.device_id));
  }, [allSensors]);

  const dangerRooms = useMemo(() => {
    const rooms = new Set<string>();
    const dangerPositions: { x: number; y: number }[] = [];

    history.state.forEach((obj) => {
      if (obj.type === 'mq2' || obj.type === 'temp') {
        if (dangerDeviceIds.has(obj.id)) {
          dangerPositions.push({ x: obj.x, y: obj.y });
        }
      }
    });

    history.state.forEach((obj) => {
      if (obj.type === 'room') {
        const rx = obj.x;
        const ry = obj.y;
        const rw = obj.width || 240;
        const rh = obj.height || 140;

        const hasDanger = dangerPositions.some(
          (p) => p.x >= rx && p.x <= rx + rw && p.y >= ry && p.y <= ry + rh
        );
        if (hasDanger) {
          rooms.add(obj.id);
        }
      }
    });

    return rooms;
  }, [history.state, dangerDeviceIds]);

  useEffect(() => {
    if (editMode) return; // Automatic pathfinding disabled in Edit Mode

    const exitNode = history.state.find((o) => o.type === 'exit');
    if (!exitNode) {
      setSafePath([]);
      return;
    }

    const dangerRoom = history.state.find((o) => o.type === 'room' && dangerRooms.has(o.id));
    if (dangerRoom && activeFloorId) {
      api.get<string[]>(`/floors/${activeFloorId}/path?start_node_id=${dangerRoom.id}&end_node_id=${exitNode.id}`)
        .then(({ data }) => {
          setSafePath(data);
        })
        .catch(() => {
          // Fallback route
          const lobby = history.state.find((o) => o.type === 'room' && o.id.toLowerCase().includes('lobby'));
          if (lobby) {
            setSafePath([dangerRoom.id, lobby.id, exitNode.id]);
          } else {
            setSafePath([dangerRoom.id, exitNode.id]);
          }
        });
    } else {
      setSafePath([]);
    }
  }, [activeFloorId, editMode, dangerRooms, history.state]);

  // Load floors list
  async function loadFloors() {
    setLoading(true);
    try {
      const { data } = await api.get<FloorItem[]>('/floors');
      setFloors(data);
      setActiveFloorId((current) => current ?? data[0]?.id ?? null);
    } finally {
      setLoading(false);
    }
  }

  // Load floor plan
  async function loadPlan(floorId: number) {
    setLoading(true);
    try {
      const { data } = await api.get<FloorPlanResponse>(`/floors/${floorId}/plan`);
      history.reset(data.objects);
      selection.clearSelection();
      setTimeout(() => {
        zoomPan.resetView(editorViewport);
        zoomPan.setPosition({ x: 80, y: 60 });
      }, 30);
    } finally {
      setLoading(false);
    }
  }

  // Save current floor plan
  async function savePlan() {
    if (!activeFloorId) return;
    setSaving(true);
    try {
      await api.put(`/floors/${activeFloorId}/plan`, { objects: history.state });
      setToast('Đã lưu sơ đồ thành công');
    } finally {
      setSaving(false);
    }
  }

  function handleToolPick(type: ObjectType) {
    editor.setActiveTool(type);
  }

  // Modal CRUD triggers
  function triggerDeleteFloor(floor: FloorItem) {
    setFloorToDelete(floor);
    setDeleteModalOpen(true);
  }

  async function confirmDeleteFloor() {
    if (!floorToDelete) return;
    try {
      await api.delete(`/floors/${floorToDelete.id}`);
      setFloors((current) => current.filter((f) => f.id !== floorToDelete.id));
      if (activeFloorId === floorToDelete.id) {
        const remaining = floors.filter((f) => f.id !== floorToDelete.id);
        setActiveFloorId(remaining[0]?.id || null);
      }
      setToast(`Đã xóa ${floorToDelete.name}`);
    } catch (err) {
      alert('Không thể xóa tầng này.');
    } finally {
      setDeleteModalOpen(false);
      setFloorToDelete(null);
    }
  }

  function triggerRenameFloor(floor: FloorItem) {
    setFloorToRename(floor);
    setRenameModalOpen(true);
  }

  function triggerAddFloor() {
    setFloorToRename(null);
    setRenameModalOpen(true);
  }

  async function handleSaveFloorName(name: string) {
    if (floorToRename) {
      try {
        const { data } = await api.patch<FloorItem>(`/floors/${floorToRename.id}`, { name });
        setFloors((current) => current.map((f) => (f.id === floorToRename.id ? data : f)));
        setToast('Đã đổi tên tầng thành công');
      } catch (err) {
        alert('Không thể đổi tên tầng.');
      }
    } else {
      try {
        const { data } = await api.post<FloorItem>('/floors', { name });
        setFloors((current) => [...current, data]);
        setActiveFloorId(data.id);
        setToast('Đã tạo tầng mới thành công');
      } catch (err) {
        alert('Không thể tạo tầng mới.');
      }
    }
    setRenameModalOpen(false);
    setFloorToRename(null);
  }

  function handleContextAction(action: string, objectId: string) {
    if (action === 'connect_nodes' && selection.selectedIds.length === 2) {
      editor.createConnector(selection.selectedIds[0], selection.selectedIds[1]);
      selection.clearSelection();
      return;
    }

    if (action === 'find_path' && selection.selectedIds.length === 2) {
      void findSafePath(selection.selectedIds[0], selection.selectedIds[1]);
      return;
    }

    const object = history.state.find((item) => item.id === objectId);
    if (!object) return;

    if (action === 'rename') {
      const nextName = window.prompt('Rename object', object.name || '');
      if (nextName !== null) editor.updateObject(objectId, { name: nextName });
    }

    if (action === 'duplicate') {
      const ids = editor.duplicateObjects([objectId]);
      selection.setSelectedIds(ids);
    }

    if (action === 'delete') {
      editor.removeObjects([objectId]);
      selection.clearSelection();
    }

    if (action === 'front') editor.bringToFront(objectId);
    if (action === 'back') editor.sendToBack(objectId);
    if (action === 'lock') editor.updateObject(objectId, { locked: !object.locked });
  }

  async function findSafePath(startId: string, endId: string) {
    if (!activeFloorId) return;
    try {
      const { data } = await api.get<string[]>(`/floors/${activeFloorId}/path?start_node_id=${startId}&end_node_id=${endId}`);
      setSafePath(data);
      selection.clearSelection();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Không thể tìm thấy đường đi an toàn.');
    }
  }

  function handleExport() {
    const blob = new Blob([exportPlanToJson(history.state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = `floor-${activeFloorId}-plan.json`;
    anchor.click();

    URL.revokeObjectURL(url);
    setFileMenuOpen(false);
  }

  async function handleImport() {
    const raw = window.prompt('Paste floor-plan JSON');
    if (!raw) return;

    try {
      const objects = importPlanFromJson(raw);
      history.set(objects);
      selection.clearSelection();
      setToast('Đã import JSON');

      setTimeout(() => {
        zoomPan.resetView(editorViewport);
        zoomPan.setPosition({ x: 80, y: 60 });
      }, 30);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import failed';
      alert(message);
    } finally {
      setFileMenuOpen(false);
    }
  }

  function updateSelectedObject(patch: Partial<FloorPlanObject>) {
    if (!selectedObject) return;
    
    // Intercept ID change to keep selection active
    if (patch.id && patch.id !== selectedObject.id) {
      editor.updateObject(selectedObject.id, patch);
      selection.setSelectedIds([patch.id]);
    } else {
      editor.updateObject(selectedObject.id, patch);
    }
  }

  return (
    <div
      className={clsx(
        'h-screen w-screen flex flex-col overflow-hidden transition-colors duration-300 relative',
        isDark ? 'bg-[#0F172A] text-slate-100' : 'bg-slate-50 text-slate-800'
      )}
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      
      {/* 1. COMPACT INTEGRATED HEADER (FIGMA STYLE) */}
      <header
        className={clsx(
          'flex items-center justify-between px-4 py-3 border-b shrink-0 h-14 transition-colors duration-300 z-30 select-none',
          isDark ? 'border-slate-850 bg-[#1E293B]' : 'border-slate-200 bg-white'
        )}
      >
        {/* Left Section: Back link, building name */}
        <div className="flex items-center gap-3">
          <a
            href="/dashboard"
            className={clsx(
              'p-2 rounded-xl border transition hover:scale-105 active:scale-95',
              isDark
                ? 'border-slate-800 bg-slate-900 text-slate-450 hover:bg-slate-850 hover:text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-55'
            )}
            title="Về Dashboard"
          >
            <ArrowLeft size={15} />
          </a>

          <div>
            <h1 className="text-xs font-black tracking-tight leading-tight uppercase opacity-90">
              {user?.building.name}
            </h1>
          </div>
        </div>

        {/* Center Section: Compact tools switchers, standalone save, action dropdowns */}
        <div className="flex items-center gap-3">
          {editMode ? (
            <>
              {/* Minimalist Switcher (Select vs Pan icons only - Figma Style) */}
              <div
                className={clsx(
                  'flex items-center border rounded-xl overflow-hidden shadow-sm',
                  isDark ? 'border-slate-850 bg-slate-900/60' : 'border-slate-200 bg-white'
                )}
              >
                <button
                  onClick={() => {
                    editor.setActiveTool('select');
                    selection.clearSelection();
                  }}
                  className={clsx(
                    'p-2.5 transition text-inherit flex items-center justify-center h-8 w-9',
                    editor.activeTool === 'select'
                      ? 'bg-blue-600 text-white shadow-inner font-bold'
                      : isDark
                        ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
                        : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                  )}
                  title="Con trỏ chọn (V)"
                >
                  <MousePointer size={13} />
                </button>
                <span className={`h-4 w-px ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                <button
                  onClick={() => {
                    editor.setActiveTool('pan');
                    selection.clearSelection();
                  }}
                  className={clsx(
                    'p-2.5 transition text-inherit flex items-center justify-center h-8 w-9',
                    editor.activeTool === 'pan'
                      ? 'bg-blue-600 text-white shadow-inner font-bold'
                      : isDark
                        ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
                        : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                  )}
                  title="Di chuyển canvas (H)"
                >
                  <Hand size={13} />
                </button>
              </div>

              {/* History Undo / Redo */}
              <div className={clsx('flex items-center border rounded-xl overflow-hidden', isDark ? 'border-slate-855 bg-slate-900/60' : 'border-slate-200 bg-white')}>
                <button
                  onClick={history.undo}
                  disabled={!history.canUndo}
                  className="p-2 hover:bg-black/10 transition disabled:opacity-30 disabled:cursor-not-allowed text-inherit"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 size={13} />
                </button>
                <span className={`h-4 w-px ${isDark ? 'bg-slate-805' : 'bg-slate-200'}`} />
                <button
                  onClick={history.redo}
                  disabled={!history.canRedo}
                  className="p-2 hover:bg-black/10 transition disabled:opacity-30 disabled:cursor-not-allowed text-inherit"
                  title="Redo (Ctrl+Y)"
                >
                  <Redo2 size={13} />
                </button>
              </div>

              {/* Standalone Save button */}
              <button
                onClick={() => void savePlan()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm active:scale-95 shrink-0 h-8"
                title="Lưu sơ đồ thiết kế vào hệ thống (Ctrl+S)"
              >
                <Save size={13} />
                <span>Lưu sơ đồ</span>
              </button>

              {/* Export/Import JSON Dropdown */}
              <div className="relative font-sans" ref={fileMenuRef}>
                <button
                  onClick={() => setFileMenuOpen(!fileMenuOpen)}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-sm select-none h-8',
                    isDark
                      ? 'border-slate-800 bg-slate-900 text-slate-100 hover:bg-slate-855'
                      : 'border-slate-200 bg-white text-slate-850 hover:bg-slate-55'
                  )}
                >
                  <span>Xuất/Nhập</span>
                  <ChevronDown size={12} className="opacity-60" />
                </button>

                {fileMenuOpen && (
                  <div
                    className={clsx(
                      'absolute right-0 mt-1.5 w-44 rounded-2xl border p-1.5 shadow-2xl z-40 transition-colors duration-200',
                      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                    )}
                  >
                    <button
                      onClick={handleExport}
                      className={clsx(
                        'flex items-center gap-2.5 w-full rounded-xl px-3 py-2 text-left text-xs font-bold transition',
                        isDark ? 'text-slate-350 hover:bg-slate-800 hover:text-white' : 'text-slate-700 hover:bg-slate-55'
                      )}
                    >
                      <Download size={13} />
                      <span>Xuất File JSON</span>
                    </button>
                    <button
                      onClick={() => void handleImport()}
                      className={clsx(
                        'flex items-center gap-2.5 w-full rounded-xl px-3 py-2 text-left text-xs font-bold transition',
                        isDark ? 'text-slate-350 hover:bg-slate-800 hover:text-white' : 'text-slate-700 hover:bg-slate-55'
                      )}
                    >
                      <Upload size={13} />
                      <span>Nạp File JSON</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            // Monitor status text
            <span className="text-xs font-bold text-emerald-500 uppercase flex items-center gap-1.5 select-none animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Chế độ giám sát live</span>
            </span>
          )}
        </div>

        {/* Right Section: Mode switch, Theme switch, Profile */}
        <div className="flex items-center gap-2 md:gap-3.5">
          {/* Mode Switch Toggle */}
          <div className="flex items-center gap-1 rounded-xl p-1 bg-slate-950/20 border border-slate-800/10 dark:border-slate-800">
            {user?.role === 'admin_building' ? (
              <>
                <button
                  onClick={() => {
                    setEditMode(true);
                    selection.clearSelection();
                  }}
                  className={clsx(
                    'flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-extrabold transition-all',
                    editMode ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  )}
                >
                  <span>EDIT</span>
                </button>
                <button
                  onClick={() => {
                    setEditMode(false);
                    selection.clearSelection();
                  }}
                  className={clsx(
                    'flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-extrabold transition-all',
                    !editMode ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  )}
                >
                  <span>MONITOR</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-1 px-2.5 py-1 text-[9px] font-extrabold text-slate-400">
                <Eye size={10} className="text-emerald-500" />
                <span>GIÁM SÁT</span>
              </div>
            )}
          </div>

          <SwitchTheme />

          <button
            onClick={logout}
            className={clsx(
              'p-2 rounded-xl border transition',
              isDark
                ? 'border-slate-850 hover:bg-rose-955/20 hover:text-rose-450 hover:border-rose-900 text-slate-400'
                : 'border-slate-200 bg-white hover:bg-slate-55 text-slate-700'
            )}
            title="Đăng xuất"
          >
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* 2. FULL CANVAS WORKSPACE WITH FLOATING SIDEBARS (FIGMA LAYOUT) */}
      <div className="flex-1 w-full relative overflow-hidden bg-slate-950">
        
        {/* BACKGROUND CANVAS - TAKES 100% SIZE */}
        <div className="absolute inset-0 z-10 w-full h-full">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 text-slate-450 bg-slate-950">
              <Activity className="animate-spin text-blue-500" size={28} />
              <span className="text-xs font-semibold">Đang nạp sơ đồ mặt bằng...</span>
            </div>
          ) : history.state.length === 0 && editMode ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-400 bg-slate-950 p-6">
              <Activity className="text-blue-500 animate-pulse" size={32} />
              <div className="text-center">
                <span className="block font-black text-sm">Bản vẽ trống</span>
                <span className="block text-[11px] opacity-70 mt-1 text-slate-500">
                  Hãy di chuyển chuột vào mép trái màn hình để bật Thư viện Token và kéo thả vào đây.
                </span>
              </div>
            </div>
          ) : (
            <CanvasEditor
              safePath={safePath}
              objects={history.state}
              selectedIds={selection.selectedIds}
              activeTool={editor.activeTool}
              panMode={editor.activeTool === 'pan'}
              scale={zoomPan.scale}
              position={zoomPan.position}
              snapEnabled={editor.snapEnabled}
              onViewportChange={setEditorViewport}
              onStageChange={(patch) => {
                if (patch.scale !== undefined) zoomPan.setScale(patch.scale);
                if (patch.position) zoomPan.setPosition(patch.position);
              }}
              onAddObject={editor.addObject}
              onSelect={(id, append) => (append ? selection.toggleSelection(id) : selection.selectOne(id))}
              onClearSelection={selection.clearSelection}
              onSelectionBox={selection.setSelectedIds}
              onUpdateObject={editor.updateObject}
              onContextAction={handleContextAction}
              
              // Redesign Props
              editMode={editMode}
              belowObjects={belowObjects}
              showBelowBaseline={showBelowBaseline}
              sensors={allSensors}

              // Zoom Callbacks
              onZoomIn={() => zoomPan.zoomIn(editorViewport)}
              onZoomOut={() => zoomPan.zoomOut(editorViewport)}
              onFit={() => zoomPan.fitView(editorViewport)}
              onReset={() => zoomPan.resetView(editorViewport)}
            />
          )}
        </div>

        {/* FLOATING HOVER SENSOR ZONE - LEFT */}
        <div className="absolute left-0 top-0 bottom-0 w-6 z-30 group flex items-center justify-start">
          <button
            onClick={() => setShowLeftPanel(!showLeftPanel)}
            className={clsx(
              'h-14 w-7 rounded-r-2xl border border-l-0 flex items-center justify-center transition-all duration-205 shadow-2xl backdrop-blur-md cursor-pointer',
              'opacity-0 group-hover:opacity-100 -translate-x-3 group-hover:translate-x-0',
              isDark ? 'bg-slate-900/90 border-slate-800 text-slate-350 hover:text-white' : 'bg-white/90 border-slate-200 text-slate-700 hover:text-slate-950'
            )}
            title={showLeftPanel ? 'Thu gọn sidebar trái' : 'Mở rộng sidebar trái'}
          >
            {showLeftPanel ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
          </button>
        </div>

        {/* FLOATING HOVER SENSOR ZONE - RIGHT */}
        <div className="absolute right-0 top-0 bottom-0 w-6 z-30 group flex items-center justify-end">
          <button
            onClick={() => setShowRightPanel(!showRightPanel)}
            className={clsx(
              'h-14 w-7 rounded-l-2xl border border-r-0 flex items-center justify-center transition-all duration-205 shadow-2xl backdrop-blur-md cursor-pointer',
              'opacity-0 group-hover:opacity-100 translate-x-3 group-hover:translate-x-0',
              isDark ? 'bg-slate-900/90 border-slate-800 text-slate-350 hover:text-white' : 'bg-white/90 border-slate-200 text-slate-700 hover:text-slate-950'
            )}
            title={showRightPanel ? 'Thu gọn panel phải' : 'Mở rộng panel phải'}
          >
            {showRightPanel ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>

        {/* FLOATING SIDEBAR LEFT: FLOORS LIST & TOKEN LIBRARY (FIGMA LAYERS STYLING) */}
        <aside
          className={clsx(
            'absolute left-4 top-4 bottom-4 w-72 z-20 overflow-hidden shadow-2xl backdrop-blur-md rounded-2xl border transition-all duration-300 flex flex-col',
            isDark ? 'border-slate-800/80 bg-slate-900/90' : 'border-slate-200/80 bg-white/90',
            showLeftPanel ? 'translate-x-0 opacity-100' : '-translate-x-96 opacity-0 pointer-events-none'
          )}
        >
          {/* Panel Header */}
          <div className="p-4 border-b border-slate-800/10 dark:border-slate-800/50 shrink-0 flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest opacity-75">Layers / Tầng</span>
            <button
              onClick={() => setShowLeftPanel(false)}
              className="text-[10px] font-bold text-slate-400 hover:text-slate-100"
            >
              Ẩn
            </button>
          </div>

          {/* Section 1: Floors list scroll container */}
          <div className="p-4 border-b border-slate-800/10 dark:border-slate-800/50 max-h-[300px] overflow-y-auto scrollbar-thin">
            <FloorListSection
              floors={floors}
              activeFloorId={activeFloorId}
              loading={loading}
              userRole={user?.role}
              isDark={isDark}
              onFloorSelect={setActiveFloorId}
              onAddFloor={triggerAddFloor}
              onRenameFloor={triggerRenameFloor}
              onDeleteFloor={triggerDeleteFloor}
            />
          </div>

          {/* Section 2: Token Library (Edit mode only) */}
          {editMode && (
            <div className="p-4 flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="mb-2.5 flex items-center justify-between shrink-0 select-none">
                <span className="text-[10px] font-extrabold uppercase tracking-widest opacity-75">Assets / Thư viện</span>
                <button
                  onClick={() => editor.setSnapEnabled(!editor.snapEnabled)}
                  className={`rounded-lg border px-2 py-0.5 text-[9px] font-extrabold transition ${
                    editor.snapEnabled
                      ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                      : isDark
                        ? 'border-slate-800 bg-slate-950 text-slate-400'
                        : 'border-slate-200 bg-slate-50 text-slate-500'
                  }`}
                >
                  Lưới: {editor.snapEnabled ? 'Bật' : 'Tắt'}
                </button>
              </div>
              <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin">
                <TokenLibrary activeTool={editor.activeTool} onSelect={handleToolPick} />
              </div>
            </div>
          )}

          {/* Under baseline toggle if exists */}
          {floorBelow && (
            <div className="p-3 border-t border-slate-800/10 dark:border-slate-800/50 bg-slate-950/20 shrink-0">
              <button
                onClick={() => setShowBelowBaseline(!showBelowBaseline)}
                className={clsx(
                  'w-full rounded-xl border px-3 py-2 text-left font-bold text-[10px] uppercase transition flex items-center justify-between',
                  showBelowBaseline
                    ? 'border-indigo-500/20 bg-indigo-500/10 text-indigo-400'
                    : isDark
                      ? 'border-slate-800 bg-slate-950 text-slate-400'
                      : 'border-slate-200 bg-slate-50 text-slate-500'
                )}
                title={`Nét đứt mờ tầng dưới (${floorBelow.name})`}
              >
                <span>Nét đứt tầng {floorBelow.name}</span>
                <span>{showBelowBaseline ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          )}
        </aside>

        {/* FLOATING SIDEBAR RIGHT: PROPERTIES / INSPECTOR (FIGMA INSPECTOR STYLING) */}
        <aside
          className={clsx(
            'absolute right-4 top-4 bottom-4 w-80 z-20 overflow-hidden shadow-2xl backdrop-blur-md rounded-2xl border transition-all duration-300 flex flex-col',
            isDark ? 'border-slate-800/80 bg-slate-900/90' : 'border-slate-200/80 bg-white/90',
            showRightPanel ? 'translate-x-0 opacity-100' : 'translate-x-96 opacity-0 pointer-events-none'
          )}
        >
          {/* Panel Header */}
          <div className="p-4 border-b border-slate-800/10 dark:border-slate-800/50 shrink-0 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider opacity-75">
              {editMode ? 'Properties' : 'Monitor Inspect'}
            </h3>
            <button
              onClick={() => setShowRightPanel(false)}
              className="text-[10px] font-bold text-slate-400 hover:text-slate-100"
            >
              Ẩn
            </button>
          </div>
          {/* Properties body scroll container */}
          <div className="p-4 overflow-y-auto flex-1 scrollbar-thin">
            {editMode ? (
              <PropertyPanel object={selectedObject} onChange={updateSelectedObject} />
            ) : (
              <MonitorInfoSection
                selectedObject={selectedObject}
                objects={history.state}
                sensors={allSensors}
                dangerRooms={dangerRooms}
                activeFloorName={activeFloor?.name}
                isDark={isDark}
              />
            )}
          </div>
        </aside>
      </div>

      {/* Confirms & Modals */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Xác nhận xóa tầng?"
        message={`Bạn có chắc muốn xóa "${floorToDelete?.name || ''}" không? Sơ đồ mặt bằng cùng toàn bộ cảm biến của tầng này sẽ bị xóa vễn viễn.`}
        confirmText="Xóa tầng"
        cancelText="Hủy"
        onConfirm={confirmDeleteFloor}
        onCancel={() => {
          setDeleteModalOpen(false);
          setFloorToDelete(null);
        }}
      />

      <FloorRenameModal
        isOpen={renameModalOpen}
        title={floorToRename ? 'Đổi tên tầng' : 'Tạo tầng mới'}
        initialName={floorToRename?.name || ''}
        confirmText={floorToRename ? 'Cập nhật' : 'Tạo mới'}
        cancelText="Hủy"
        onSave={handleSaveFloorName}
        onCancel={() => {
          setRenameModalOpen(false);
          setFloorToRename(null);
        }}
      />

      {/* Global Toast Message */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-55 rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white shadow-2xl flex items-center gap-2 animate-bounce text-xs">
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
export default FloorEditorPage;