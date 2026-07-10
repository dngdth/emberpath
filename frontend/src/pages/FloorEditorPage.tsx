import { useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { CanvasEditor } from '../components/CanvasEditor';
import { EditorSidebar } from '../components/Sidebar';
import { EditorToolbar } from '../components/Toolbar';
import { useEditorState } from '../hooks/useEditorState';
import { useHistory } from '../hooks/useHistory';
import { useSelection } from '../hooks/useSelection';
import { useZoomPan } from '../hooks/useZoomPan';
import { exportPlanToJson, importPlanFromJson } from '../utils/serialization';
import { FloorItem, FloorPlanObject, FloorPlanResponse, ObjectType } from '../types/editor';

export function FloorEditorPage() {
  const { user, logout } = useAuthStore();
  const [floors, setFloors] = useState<FloorItem[]>([]);
  const [activeFloorId, setActiveFloorId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [editorViewport, setEditorViewport] = useState({ width: 1200, height: 780 });
  const [safePath, setSafePath] = useState<string[]>([]);

  const history = useHistory<FloorPlanObject[]>([]);
  const zoomPan = useZoomPan();
  const selection = useSelection();
  const editor = useEditorState(history.state, history.set);

  const selectedObject = useMemo(
    () => history.state.find((object) => selection.selectedIds[0] === object.id) ?? null,
    [history.state, selection.selectedIds],
  );

  useEffect(() => {
    void loadFloors();
  }, []);

  useEffect(() => {
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
  }, [editor, history, selection]);

  useEffect(() => {
    if (!activeFloorId) return;
    void loadPlan(activeFloorId);
  }, [activeFloorId]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function loadFloors() {
    setLoading(true);
    const { data } = await api.get<FloorItem[]>('/floors');
    setFloors(data);
    setActiveFloorId((current) => current ?? data[0]?.id ?? null);
    setLoading(false);
  }

  async function loadPlan(floorId: number) {
    setLoading(true);
    const { data } = await api.get<FloorPlanResponse>(`/floors/${floorId}/plan`);
    history.reset(data.objects);
    selection.clearSelection();
    setLoading(false);

    setTimeout(() => {
  zoomPan.resetView(editorViewport);
  zoomPan.setPosition({ x: 80, y: 60 });
}, 30);
  }

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

  async function handleAddFloor() {
    const name = window.prompt('Tên tầng mới', `Tầng ${floors.length + 1}`);
    if (!name) return;

    const { data } = await api.post<FloorItem>('/floors', { name });
    setFloors((current) => [...current, data]);
    setActiveFloorId(data.id);
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
    }
  }

  function updateSelectedObject(patch: Partial<FloorPlanObject>) {
    if (!selectedObject) return;
    editor.updateObject(selectedObject.id, patch);
  }

  return (
    <div className="min-h-screen bg-[#f2e4dc] p-4 md:p-6">
      <div className="mx-auto max-w-[1820px] space-y-4">
        <header className="rounded-[28px] border border-[#e2c7bb] bg-[#ead9cf] px-6 py-5 shadow-[0_8px_24px_rgba(122,43,29,0.08)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#b33a2f]">Map Editor</p>
              <h1 className="mt-2 text-3xl font-bold text-[#a5261f]">
                Thiết kế sơ đồ tòa nhà — {user?.building.name}
              </h1>
              <p className="mt-1 text-[#8a5a4b]">
                Tông màu đồng bộ, zoom theo viewport, giữ Space hoặc dùng Pan để kéo canvas.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <a
                href="/dashboard"
                className="rounded-2xl bg-[#c94132] px-4 py-3 font-semibold text-white hover:bg-[#b23326]"
              >
                Về dashboard
              </a>
              <button
                onClick={logout}
                className="rounded-2xl border border-[#d0a999] bg-[#fff8f3] px-4 py-3 font-medium text-[#8b241e] hover:bg-[#f7e8df]"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <EditorToolbar
  activeTool={editor.activeTool}
  onSelect={() => editor.setActiveTool('select')}
  onPan={() => editor.setActiveTool('pan')}
  onZoomIn={() => zoomPan.zoomIn(editorViewport)}
  onZoomOut={() => zoomPan.zoomOut(editorViewport)}
  onFit={() => zoomPan.fitView(editorViewport)}
  onReset={() => zoomPan.resetView(editorViewport)}
  onUndo={history.undo}
  onRedo={history.redo}
  onSave={savePlan}
  onExport={handleExport}
  onLoad={() => void handleImport()}
  canUndo={history.canUndo}
  canRedo={history.canRedo}
/>

        <div className="grid gap-4 xl:grid-cols-[250px_1fr]">
          <EditorSidebar
            floors={floors}
            activeFloorId={activeFloorId}
            onFloorChange={setActiveFloorId}
            onAddFloor={() => void handleAddFloor()}
            activeTool={editor.activeTool}
            onToolPick={handleToolPick}
            selectedObject={selectedObject}
            onObjectChange={updateSelectedObject}
            snapEnabled={editor.snapEnabled}
            onToggleSnap={() => editor.setSnapEnabled(!editor.snapEnabled)}
          />

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[#e2c6bb] bg-[#fff8f3] px-4 py-3 text-sm text-[#8a5a4b] shadow-[0_8px_24px_rgba(122,43,29,0.06)]">
              <div className="font-medium">
                {loading ? 'Đang tải sơ đồ...' : `Floor đang chỉnh: ${floors.find((item) => item.id === activeFloorId)?.name ?? 'N/A'}`}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => zoomPan.centerView(editorViewport)}
                  className="rounded-xl border border-[#d8b1a1] bg-[#fff4ee] px-3 py-2 font-medium text-[#962b24] hover:bg-[#f9e6dc]"
                >
                  Căn giữa
                </button>
                <button
                  onClick={() => void savePlan()}
                  className="rounded-xl bg-[#c94132] px-3 py-2 font-medium text-white hover:bg-[#b23326]"
                >
                  {saving ? 'Đang lưu...' : 'Save JSON'}
                </button>
                {safePath.length > 0 && (
                  <button
                    onClick={() => setSafePath([])}
                    className="rounded-xl bg-[#22c55e] px-3 py-2 font-medium text-white hover:bg-[#16a34a]"
                  >
                    Xóa đường đi
                  </button>
                )}
                <button
                  onClick={handleExport}
                  className="rounded-xl border border-[#d8b1a1] bg-[#fff8f3] px-3 py-2 text-[#8b241e] hover:bg-[#f7e8df]"
                >
                  Export JSON
                </button>
                <button
                  onClick={() => void handleImport()}
                  className="rounded-xl border border-[#d8b1a1] bg-[#fff8f3] px-3 py-2 text-[#8b241e] hover:bg-[#f7e8df]"
                >
                  Load JSON
                </button>
              </div>
            </div>

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
            />
          </div>
        </div>

        {toast && (
          <div className="fixed bottom-4 right-4 rounded-2xl bg-[#c94132] px-4 py-3 font-medium text-white shadow-2xl">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}