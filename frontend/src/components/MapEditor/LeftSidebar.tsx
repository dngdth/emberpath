import React from 'react';
import { FloorListSection } from './FloorListSection';
import { TokenLibrary } from './TokenLibrary';
import { FloorItem, FloorPlanObject } from '../../types/editor';
import clsx from 'clsx';

interface LeftSidebarProps {
  showLeftPanel: boolean;
  setShowLeftPanel: (val: boolean) => void;
  isDark: boolean;
  editMode: boolean;
  floors: FloorItem[];
  activeFloorId: number | null;
  loading: boolean;
  userRole?: string;
  setActiveFloorId: (id: number | null) => void;
  onAddFloor: () => void;
  onRenameFloor: (floor: FloorItem) => void;
  onDeleteFloor: (floor: FloorItem) => void;
  leftPanelFloorHeight: number;
  onResizerMouseDown: (e: React.MouseEvent) => void;
  activeTool: string;
  onToolPick: (type: string) => void;
  snapEnabled: boolean;
  onToggleSnap: () => void;
  floorBelow: FloorItem | null;
  showBelowBaseline: boolean;
  setShowBelowBaseline: (val: boolean) => void;
  onAddCustomObject?: (obj: FloorPlanObject) => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = React.memo(({
  showLeftPanel,
  setShowLeftPanel,
  isDark,
  editMode,
  floors,
  activeFloorId,
  loading,
  userRole,
  setActiveFloorId,
  onAddFloor,
  onRenameFloor,
  onDeleteFloor,
  leftPanelFloorHeight,
  onResizerMouseDown,
  activeTool,
  onToolPick,
  snapEnabled,
  onToggleSnap,
  floorBelow,
  showBelowBaseline,
  setShowBelowBaseline,
  onAddCustomObject,
}) => {
  return (
    <aside
      className={clsx(
        'absolute left-4 top-4 bottom-4 w-72 max-w-[calc(100vw-32px)] z-20 overflow-hidden backdrop-blur-md rounded-2xl border transition-all duration-300 flex flex-col',
        isDark ? 'border-slate-700/70 bg-slate-900/98 shadow-[0_4px_30px_rgba(0,0,0,0.6)]' : 'border-slate-200/80 bg-white/90 shadow-2xl',
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
      <div
        className={clsx(
          'p-4 overflow-y-auto scrollbar-thin',
          editMode ? '' : 'flex-1'
        )}
        style={editMode ? { height: `${leftPanelFloorHeight}px` } : undefined}
      >
        <FloorListSection
          floors={floors}
          activeFloorId={activeFloorId}
          loading={loading}
          userRole={userRole}
          isDark={isDark}
          onFloorSelect={setActiveFloorId}
          onAddFloor={onAddFloor}
          onRenameFloor={onRenameFloor}
          onDeleteFloor={onDeleteFloor}
        />
      </div>

      {/* Resizer Handle */}
      {editMode && (
        <div
          onMouseDown={onResizerMouseDown}
          className="h-[5px] relative z-30 cursor-row-resize select-none bg-transparent hover:bg-blue-500/20 dark:hover:bg-blue-500/30 transition-colors flex items-center justify-center group"
          title="Kéo để thay đổi kích thước"
        >
          {/* Visible border line */}
          <div className="absolute inset-x-0 top-[2px] h-[1px] bg-slate-800/10 dark:bg-slate-800/50 group-hover:bg-blue-500/60 dark:group-hover:bg-blue-400/60 transition-colors" />
        </div>
      )}

      {/* Section 2: Token Library (Edit mode only) */}
      {editMode && (
        <div className="p-4 flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="mb-2.5 flex items-center justify-between shrink-0 select-none">
            <span className="text-[10px] font-extrabold uppercase tracking-widest opacity-75">Assets / Thư viện</span>
            <button
              onClick={onToggleSnap}
              className={`rounded-lg border px-2 py-0.5 text-[9px] font-extrabold transition ${
                snapEnabled
                  ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                  : isDark
                  ? 'border-slate-800 bg-slate-950 text-slate-400'
                  : 'border-slate-200 bg-slate-50 text-slate-500'
              }`}
            >
              Lưới: {snapEnabled ? 'Bật' : 'Tắt'}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin">
            <TokenLibrary activeTool={activeTool} onSelect={onToolPick} onAddCustomObject={onAddCustomObject} />
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
            <span>Nét đứt tầng dưới</span>
            <span>{showBelowBaseline ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      )}
    </aside>
  );
});

LeftSidebar.displayName = 'LeftSidebar';
export default LeftSidebar;
