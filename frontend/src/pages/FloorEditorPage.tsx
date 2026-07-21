import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { floorsApi, FloorPlanSavePayload } from '../services/backend';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { CanvasEditor } from '../components/MapEditor/CanvasEditor';
import { EditorHeader } from '../components/MapEditor/EditorHeader';
import { LeftSidebar } from '../components/MapEditor/LeftSidebar';
import { RightSidebar } from '../components/MapEditor/RightSidebar';
import { ConfirmModal } from '../components/MapEditor/ConfirmModal';
import { FloorRenameModal } from '../components/MapEditor/FloorRenameModal';
import { useEditorState } from '../hooks/useEditorState';
import { useHistory } from '../hooks/useHistory';
import { useSelection } from '../hooks/useSelection';
import { useZoomPan } from '../hooks/useZoomPan';
import { useRealtimeSensors } from '../hooks/useRealtimeSensors';
import { exportPlanToJson, importPlanFromJson } from '../utils/serialization';
import { FloorItem, FloorPlanObject, SafePathResult } from '../types/editor';
import {
  Eye,
  Activity,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
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

  // Auto-collapse sidebars on mobile to prevent overlapping
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        if (showLeftPanel && showRightPanel) {
          setShowRightPanel(false);
        }
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [showLeftPanel, showRightPanel]);

  const toggleLeftPanel = useCallback(() => {
    if (!showLeftPanel && window.innerWidth < 768) {
      setShowRightPanel(false);
    }
    setShowLeftPanel((prev) => !prev);
  }, [showLeftPanel]);

  const toggleRightPanel = useCallback(() => {
    if (!showRightPanel && window.innerWidth < 768) {
      setShowLeftPanel(false);
    }
    setShowRightPanel((prev) => !prev);
  }, [showRightPanel]);

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
  const [safePath, setSafePath] = useState<SafePathResult | null>(null);

  // Modals visibility states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [floorToDelete, setFloorToDelete] = useState<FloorItem | null>(null);

  // Rename modal visibility
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [floorToRename, setFloorToRename] = useState<FloorItem | null>(null); // null means adding

  // Base line from floor below states
  const [belowObjects, setBelowObjects] = useState<FloorPlanObject[]>([]);
  const [showBelowBaseline, setShowBelowBaseline] = useState<boolean>(true);

  // Resizer state for left panel Floor section height
  const [leftPanelFloorHeight, setLeftPanelFloorHeight] = useState<number>(() => {
    const saved = localStorage.getItem('leftPanelFloorHeight');
    return saved ? parseInt(saved, 10) : 200;
  });
  const isResizingRef = useRef<boolean>(false);

  const handleResizerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    const startY = e.clientY;
    const startHeight = leftPanelFloorHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const deltaY = moveEvent.clientY - startY;
      const newHeight = Math.max(100, Math.min(500, startHeight + deltaY));
      setLeftPanelFloorHeight(newHeight);
      localStorage.setItem('leftPanelFloorHeight', String(newHeight));
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.body.classList.remove('select-none');
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    document.body.classList.add('select-none');
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [leftPanelFloorHeight]);

  const [canvasWidth, setCanvasWidth] = useState<number>(1600);
  const [canvasHeight, setCanvasHeight] = useState<number>(1000);
  const [canvasShape, setCanvasShape] = useState<'rect' | 'l-shape' | 'polygon'>('rect');

  const canvasWidthRef = useRef<number>(1600);
  const canvasHeightRef = useRef<number>(1000);
  const canvasShapeRef = useRef<'rect' | 'l-shape' | 'polygon'>('rect');

  useEffect(() => {
    canvasWidthRef.current = canvasWidth;
  }, [canvasWidth]);
  useEffect(() => {
    canvasHeightRef.current = canvasHeight;
  }, [canvasHeight]);
  useEffect(() => {
    canvasShapeRef.current = canvasShape;
  }, [canvasShape]);

  // Editor engine hooks
  const history = useHistory<FloorPlanObject[]>([]);
  const zoomPan = useZoomPan(canvasWidth, canvasHeight);
  const selection = useSelection();
  const editor = useEditorState(history.state, history.set);

  // Keep a stable ref to history.state to prevent stale state issues in deferred saves
  const objectsRef = useRef<FloorPlanObject[]>(history.state);
  const floorDraftsRef = useRef<Map<number, FloorPlanSavePayload>>(new Map());
  const loadedFloorIdRef = useRef<number | null>(null);
  useEffect(() => {
    objectsRef.current = history.state;
  }, [history.state]);

  // Preserve every opened floor while the user moves around the building.
  useEffect(() => {
    const floorId = loadedFloorIdRef.current;
    if (!floorId || floorId !== activeFloorId) return;
    floorDraftsRef.current.set(floorId, {
      objects: history.state,
      canvas_width: canvasWidth,
      canvas_height: canvasHeight,
      canvas_shape: canvasShape,
    });
  }, [activeFloorId, history.state, canvasWidth, canvasHeight, canvasShape]);

  // Save the complete building with a deferred callback to prevent text-area blur races.
  const savePlan = useCallback(async () => {
    if (!activeFloorId || floors.length === 0) return;
    setSaving(true);

    // Force blur on the active element (e.g. inline textarea) to trigger state updates
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    // Delay slightly to let React finish batching the state updates
    setTimeout(async () => {
      try {
        floorDraftsRef.current.set(activeFloorId, {
          objects: objectsRef.current,
          canvas_width: canvasWidthRef.current,
          canvas_height: canvasHeightRef.current,
          canvas_shape: canvasShapeRef.current,
        });

        const missingFloors = floors.filter((floor) => !floorDraftsRef.current.has(floor.id));
        const remotePlans = await Promise.all(
          missingFloors.map((floor) => floorsApi.getPlan(floor.id)),
        );
        for (const plan of remotePlans) {
          floorDraftsRef.current.set(plan.floor_id, {
            objects: plan.objects,
            canvas_width: plan.canvas_width ?? 1600,
            canvas_height: plan.canvas_height ?? 1000,
            canvas_shape: plan.canvas_shape ?? 'rect',
          });
        }

        const savedPlans = await floorsApi.saveBuildingPlans(
          floors.map((floor) => ({
            floor_id: floor.id,
            ...floorDraftsRef.current.get(floor.id)!,
          })),
        );
        for (const plan of savedPlans) {
          floorDraftsRef.current.set(plan.floor_id, {
            objects: plan.objects,
            canvas_width: plan.canvas_width ?? 1600,
            canvas_height: plan.canvas_height ?? 1000,
            canvas_shape: plan.canvas_shape ?? 'rect',
          });
        }
        setToast(`Đã lưu toàn bộ tòa nhà (${savedPlans.length} tầng)`);
      } catch (err) {
        console.error('Failed to save plan:', err);
        alert('Không thể lưu toàn bộ sơ đồ tòa nhà. Không có tầng nào được lưu một phần.');
      } finally {
        setSaving(false);
      }
    }, 100);
  }, [activeFloorId, floors]);

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
      const cached = floorDraftsRef.current.get(floorBelow.id);
      if (cached) {
        setBelowObjects(cached.objects);
        return;
      }
      floorsApi.getPlan(floorBelow.id)
        .then((plan) => {
          setBelowObjects(plan.objects);
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
      const activeEl = document.activeElement;
      const isInput = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.getAttribute('contenteditable') === 'true'
      );
      if (isInput) return;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void savePlan();
      }
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
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'x') {
        event.preventDefault();
        editor.cutObjects(selection.selectedIds);
        selection.clearSelection();
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
      if (event.key === 'Escape') {
        event.preventDefault();
        editor.setActiveTool('select');
        selection.clearSelection();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editor, history, selection, editMode, savePlan]);

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
      if (obj.type === 'sensor' || obj.type === 'mq2' || obj.type === 'temp') {
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

  const findSafePath = useCallback(async (startId: string, endId: string) => {
    if (!activeFloorId) return;
    try {
      const path = await floorsApi.findPath(activeFloorId, startId, endId);
      setSafePath(path);
      selection.clearSelection();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Không thể tìm thấy đường đi an toàn.');
    }
  }, [activeFloorId, selection]);

  useEffect(() => {
    if (editMode) return; // Automatic pathfinding disabled in Edit Mode

    const dangerNode = history.state.find((object) =>
      (['sensor', 'mq2', 'temp'].includes(object.type)
        && (dangerDeviceIds.has(object.id) || object.nodeStatus === 'danger'))
      || (object.type === 'room' && dangerRooms.has(object.id))
    );
    if (dangerNode && activeFloorId) {
      floorsApi.findPath(activeFloorId, dangerNode.id)
        .then((path) => {
          setSafePath(path);
        })
        .catch(() => {
          setSafePath(null);
        });
    } else {
      setSafePath(null);
    }
  }, [activeFloorId, editMode, dangerDeviceIds, dangerRooms, history.state]);

  // Load floors list
  async function loadFloors() {
    setLoading(true);
    try {
      const data = await floorsApi.list();
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
      let draft = floorDraftsRef.current.get(floorId);
      if (!draft) {
        const data = await floorsApi.getPlan(floorId);
        draft = {
          objects: data.objects,
          canvas_width: data.canvas_width ?? 1600,
          canvas_height: data.canvas_height ?? 1000,
          canvas_shape: data.canvas_shape ?? 'rect',
        };
        floorDraftsRef.current.set(floorId, draft);
      }
      loadedFloorIdRef.current = floorId;
      setCanvasWidth(draft.canvas_width);
      setCanvasHeight(draft.canvas_height);
      setCanvasShape(draft.canvas_shape);
      history.reset(draft.objects);
      selection.clearSelection();
      setTimeout(() => {
        zoomPan.resetView(editorViewport);
        zoomPan.setPosition({ x: 80, y: 60 });
      }, 30);
    } finally {
      setLoading(false);
    }
  }

  const handleToolPick = useCallback((type: string) => {
    editor.setActiveTool(type);
  }, [editor]);

  // Modal CRUD triggers
  const triggerDeleteFloor = useCallback((floor: FloorItem) => {
    setFloorToDelete(floor);
    setDeleteModalOpen(true);
  }, []);

  const confirmDeleteFloor = useCallback(async () => {
    if (!floorToDelete) return;
    try {
      await floorsApi.remove(floorToDelete.id);
      floorDraftsRef.current.delete(floorToDelete.id);
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
  }, [floorToDelete, activeFloorId, floors]);

  const triggerRenameFloor = useCallback((floor: FloorItem) => {
    setFloorToRename(floor);
    setRenameModalOpen(true);
  }, []);

  const triggerAddFloor = useCallback(() => {
    setFloorToRename(null);
    setRenameModalOpen(true);
  }, []);

  const handleSaveFloorName = useCallback(async (name: string) => {
    if (floorToRename) {
      try {
        const data = await floorsApi.rename(floorToRename.id, name);
        setFloors((current) => current.map((f) => (f.id === floorToRename.id ? data : f)));
        setToast('Đã đổi tên tầng thành công');
      } catch (err) {
        alert('Không thể đổi tên tầng.');
      }
    } else {
      try {
        const data = await floorsApi.create(name);
        setFloors((current) => [...current, data]);
        setActiveFloorId(data.id);
        setToast('Đã tạo tầng mới thành công');
      } catch (err) {
        alert('Không thể tạo tầng mới.');
      }
    }
    setRenameModalOpen(false);
    setFloorToRename(null);
  }, [floorToRename]);

  const handleContextAction = useCallback((action: string, objectId: string) => {
    if (action === 'select') {
      editor.setActiveTool('select');
      return;
    }

    if (action === 'connect_nodes' && selection.selectedIds.length === 2) {
      editor.createConnector(selection.selectedIds[0], selection.selectedIds[1]);
      selection.clearSelection();
      return;
    }

    if (action === 'find_path' && selection.selectedIds.length === 2) {
      void findSafePath(selection.selectedIds[0], selection.selectedIds[1]);
      return;
    }

    if (action === 'delete_multiple') {
      try {
        const ids = JSON.parse(objectId) as string[];
        editor.removeObjects(ids);
      } catch (err) {
        editor.removeObjects([objectId]);
      }
      selection.clearSelection();
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
  }, [editor, selection, history.state, findSafePath]);

  const handleExport = useCallback(() => {
    const blob = new Blob([exportPlanToJson(history.state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = `floor-${activeFloorId}-plan.json`;
    anchor.click();

    URL.revokeObjectURL(url);
    setFileMenuOpen(false);
  }, [activeFloorId, history.state]);

  const handleImport = useCallback(async () => {
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
  }, [history, selection, editorViewport, zoomPan]);

  const updateSelectedObject = useCallback((patch: Partial<FloorPlanObject>) => {
    if (!selectedObject) return;

    // Intercept ID change to keep selection active
    if (patch.id && patch.id !== selectedObject.id) {
      editor.updateObject(selectedObject.id, patch);
      selection.setSelectedIds([patch.id]);
    } else {
      editor.updateObject(selectedObject.id, patch);
    }
  }, [selectedObject, editor, selection]);

  const handleUpdateCanvasSize = useCallback((w: number, h: number) => {
    setCanvasWidth(w);
    setCanvasHeight(h);
  }, []);

  const handleCommitCanvasResize = useCallback((w: number, h: number, shiftX: number, shiftY: number) => {
    setCanvasWidth(w);
    setCanvasHeight(h);
    if (shiftX !== 0 || shiftY !== 0) {
      const updatedObjects = history.state.map((obj) => {
        if (obj.type === 'connector') return obj;
        return {
          ...obj,
          x: obj.x + shiftX,
          y: obj.y + shiftY,
        };
      });
      history.set(updatedObjects);
    }
  }, [history]);

  const handleStageChange = useCallback((patch: { scale?: number; position?: { x: number; y: number } }) => {
    if (patch.scale !== undefined) zoomPan.setScale(patch.scale);
    if (patch.position) zoomPan.setPosition(patch.position);
  }, [zoomPan]);

  const handleSelect = useCallback((id: string, append: boolean) => {
    if (append) {
      selection.toggleSelection(id);
    } else {
      selection.selectOne(id);
    }
  }, [selection]);

  const handleSelectionBox = useCallback((ids: string[]) => {
    selection.setSelectedIds(ids);
  }, [selection]);

  const handleAddCustomObject = useCallback((obj: FloorPlanObject | FloorPlanObject[]) => {
    const nextObjects = Array.isArray(obj) ? obj : [obj];
    history.set([...history.state, ...nextObjects]);
  }, [history]);

  const toggleSnap = useCallback(() => {
    editor.setSnapEnabled(!editor.snapEnabled);
  }, [editor]);

  const handleCanvasSizeChange = useCallback((w: number, h: number) => {
    setCanvasWidth(w);
    setCanvasHeight(h);
  }, []);

  const handleZoomIn = useCallback(() => {
    zoomPan.zoomIn(editorViewport);
  }, [zoomPan, editorViewport]);

  const handleZoomOut = useCallback(() => {
    zoomPan.zoomOut(editorViewport);
  }, [zoomPan, editorViewport]);

  const handleZoomFit = useCallback(() => {
    zoomPan.fitView(editorViewport);
  }, [zoomPan, editorViewport]);

  const handleZoomReset = useCallback(() => {
    zoomPan.resetView(editorViewport);
  }, [zoomPan, editorViewport]);

  const handleSetEditMode = useCallback((val: boolean) => {
    setEditMode(val);
    selection.clearSelection();
  }, [selection]);

  const handleClearSelection = useCallback(() => {
    selection.clearSelection();
  }, [selection]);

  return (
    <div
      className={clsx(
        'h-screen w-screen flex flex-col overflow-hidden transition-colors duration-300 relative',
        isDark ? 'bg-[#0F172A] text-slate-100' : 'bg-slate-50 text-slate-800'
      )}
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* 1. COMPACT INTEGRATED HEADER (FIGMA STYLE) */}
      <EditorHeader
        user={user}
        logout={logout}
        editMode={editMode}
        setEditMode={handleSetEditMode}
        isDark={isDark}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        undo={history.undo}
        redo={history.redo}
        savePlan={savePlan}
        fileMenuOpen={fileMenuOpen}
        setFileMenuOpen={setFileMenuOpen}
        handleExport={handleExport}
        handleImport={handleImport}
        fileMenuRef={fileMenuRef}
        clearSelection={handleClearSelection}
        activeTool={editor.activeTool}
        setActiveTool={editor.setActiveTool}
      />

      {/* 2. FULL CANVAS WORKSPACE WITH FLOATING SIDEBARS (FIGMA LAYOUT) */}
      <div className="flex-1 w-full relative overflow-hidden bg-slate-950">

        {/* BACKGROUND CANVAS - TAKES 100% SIZE */}
        <div className="absolute inset-0 z-10 w-full h-full">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 text-slate-450 bg-slate-950">
              <Activity className="animate-spin text-blue-500" size={28} />
              <span className="text-xs font-semibold">Đang nạp sơ đồ mặt bằng...</span>
            </div>
          ) : (
            <>
              <CanvasEditor
                canvasWidth={canvasWidth}
                canvasHeight={canvasHeight}
                floorId={activeFloorId}
                onUpdateCanvasSize={handleUpdateCanvasSize}
                onCommitCanvasResize={handleCommitCanvasResize}
                safePath={safePath}
                objects={history.state}
                selectedIds={selection.selectedIds}
                activeTool={editor.activeTool}
                scale={zoomPan.scale}
                position={zoomPan.position}
                snapEnabled={editor.snapEnabled}
                onViewportChange={setEditorViewport}
                onStageChange={handleStageChange}
                onAddObject={editor.addObject}
                onAddCustomObject={handleAddCustomObject}
                onSelect={handleSelect}
                onClearSelection={handleClearSelection}
                onSelectionBox={handleSelectionBox}
                onUpdateObject={editor.updateObject}
                onContextAction={handleContextAction}

                // Redesign Props
                editMode={editMode}
                belowObjects={belowObjects}
                showBelowBaseline={showBelowBaseline}
                sensors={allSensors}

                // Zoom Callbacks
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onFit={handleZoomFit}
                onReset={handleZoomReset}
              />
              {history.state.length === 0 && editMode && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-450 bg-transparent p-6 pointer-events-none select-none z-10">
                  <Activity className="text-blue-500 animate-pulse" size={32} />
                  <div className="text-center">
                    <span className="block font-black text-sm">Bản vẽ trống</span>
                    <span className="block text-[11px] opacity-70 mt-1 text-slate-500">
                      Hãy di chuyển chuột vào mép trái màn hình để bật Thư viện Token và kéo thả vào đây.
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* FLOATING HOVER SENSOR ZONE - LEFT */}
        <div className="absolute left-0 top-0 bottom-0 w-6 z-30 group flex items-center justify-start">
          <button
            onClick={toggleLeftPanel}
            className={clsx(
              'h-14 w-7 rounded-r-2xl border border-l-0 flex items-center justify-center transition-all duration-205 shadow-2xl backdrop-blur-md cursor-pointer',
              'opacity-100 md:opacity-0 md:group-hover:opacity-100 translate-x-0 md:-translate-x-3 md:group-hover:translate-x-0',
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
            onClick={toggleRightPanel}
            className={clsx(
              'h-14 w-7 rounded-l-2xl border border-r-0 flex items-center justify-center transition-all duration-205 shadow-2xl backdrop-blur-md cursor-pointer',
              'opacity-100 md:opacity-0 md:group-hover:opacity-100 translate-x-0 md:translate-x-3 md:group-hover:translate-x-0',
              isDark ? 'bg-slate-900/90 border-slate-800 text-slate-350 hover:text-white' : 'bg-white/90 border-slate-200 text-slate-700 hover:text-slate-950'
            )}
            title={showRightPanel ? 'Thu gọn panel phải' : 'Mở rộng panel phải'}
          >
            {showRightPanel ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>

        {/* FLOATING SIDEBAR LEFT: FLOORS LIST & TOKEN LIBRARY (FIGMA LAYERS STYLING) */}
        <LeftSidebar
          showLeftPanel={showLeftPanel}
          setShowLeftPanel={setShowLeftPanel}
          isDark={isDark}
          editMode={editMode}
          floors={floors}
          activeFloorId={activeFloorId}
          loading={loading}
          userRole={user?.role}
          setActiveFloorId={setActiveFloorId}
          onAddFloor={triggerAddFloor}
          onRenameFloor={triggerRenameFloor}
          onDeleteFloor={triggerDeleteFloor}
          leftPanelFloorHeight={leftPanelFloorHeight}
          onResizerMouseDown={handleResizerMouseDown}
          activeTool={editor.activeTool}
          onToolPick={handleToolPick}
          snapEnabled={editor.snapEnabled}
          onToggleSnap={toggleSnap}
          floorBelow={floorBelow}
          showBelowBaseline={showBelowBaseline}
          setShowBelowBaseline={setShowBelowBaseline}
        />

        {/* FLOATING SIDEBAR RIGHT: PROPERTIES / INSPECTOR (FIGMA INSPECTOR STYLING) */}
        <RightSidebar
          showRightPanel={showRightPanel}
          setShowRightPanel={setShowRightPanel}
          isDark={isDark}
          editMode={editMode}
          selectedObject={selectedObject}
          updateSelectedObject={updateSelectedObject}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          onCanvasSizeChange={handleCanvasSizeChange}
          floors={floors}
          objects={history.state}
          allSensors={allSensors}
          dangerRooms={dangerRooms}
          activeFloorName={activeFloor?.name}
        />
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
