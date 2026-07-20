import React from 'react';
import { PropertyPanel } from './PropertyPanel';
import { MonitorInfoSection } from './MonitorInfoSection';
import { FloorItem, FloorPlanObject } from '../../types/editor';
import { SensorDevice } from '../../types/sensor';
import clsx from 'clsx';

interface RightSidebarProps {
  showRightPanel: boolean;
  setShowRightPanel: (val: boolean) => void;
  isDark: boolean;
  editMode: boolean;
  selectedObject: FloorPlanObject | null;
  updateSelectedObject: (patch: Partial<FloorPlanObject>) => void;
  canvasWidth: number;
  canvasHeight: number;
  onCanvasSizeChange: (w: number, h: number) => void;
  floors: FloorItem[];
  objects: FloorPlanObject[];
  allSensors: SensorDevice[];
  dangerRooms: Set<string>;
  activeFloorName?: string;
}

export const RightSidebar: React.FC<RightSidebarProps> = React.memo(({
  showRightPanel,
  setShowRightPanel,
  isDark,
  editMode,
  selectedObject,
  updateSelectedObject,
  canvasWidth,
  canvasHeight,
  onCanvasSizeChange,
  floors,
  objects,
  allSensors,
  dangerRooms,
  activeFloorName,
}) => {
  return (
    <aside
      className={clsx(
        'absolute right-4 top-4 bottom-4 w-80 max-w-[calc(100vw-32px)] z-20 overflow-hidden backdrop-blur-md rounded-2xl border transition-all duration-300 flex flex-col',
        isDark ? 'border-slate-700/70 bg-slate-900/98 shadow-[0_4px_30px_rgba(0,0,0,0.6)]' : 'border-slate-200/80 bg-white/90 shadow-2xl',
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
          <PropertyPanel
            object={selectedObject}
            onChange={updateSelectedObject}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            onCanvasSizeChange={onCanvasSizeChange}
            floors={floors}
          />
        ) : (
          <MonitorInfoSection
            selectedObject={selectedObject}
            objects={objects}
            sensors={allSensors}
            dangerRooms={dangerRooms}
            activeFloorName={activeFloorName}
            isDark={isDark}
          />
        )}
      </div>
    </aside>
  );
});

RightSidebar.displayName = 'RightSidebar';
export default RightSidebar;
