import { Plus } from 'lucide-react';
import { FloorItem, FloorPlanObject, ObjectType } from '../../types/editor';
import { FloorTabs } from './FloorTabs';
import { PropertyPanel } from './PropertyPanel';
import { TokenLibrary } from './TokenLibrary';
import { useThemeStore } from '../../store/themeStore';

interface Props {
  floors: FloorItem[];
  activeFloorId: number | null;
  onFloorChange: (id: number) => void;
  onAddFloor: () => void;
  activeTool: string;
  onToolPick: (type: ObjectType) => void;
  selectedObject: FloorPlanObject | null;
  onObjectChange: (patch: Partial<FloorPlanObject>) => void;
  snapEnabled: boolean;
  onToggleSnap: () => void;
}

export function EditorSidebar(props: Props) {
  const { darkMode } = useThemeStore();
  const isDark = darkMode;

  return (
    <div className="space-y-3">
      {/* Floors Section */}
      <div
        className={`rounded-[20px] border p-3 shadow-soft transition-colors duration-300 ${
          isDark ? 'border-slate-800 bg-[#1E293B] text-slate-100' : 'border-slate-200 bg-white text-slate-800'
        }`}
      >
        <div className="mb-2 flex items-center justify-between">
          <h3 className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            Tầng
          </h3>
          <button
            onClick={props.onAddFloor}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-bold text-white transition ${
              isDark ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-900 hover:bg-slate-800'
            }`}
          >
            <Plus size={13} className="inline mr-1" /> Thêm
          </button>
        </div>

        <FloorTabs floors={props.floors} activeFloorId={props.activeFloorId} onChange={props.onFloorChange} />
      </div>

      {/* Token Library Section */}
      <div
        className={`rounded-[20px] border p-3 shadow-soft transition-colors duration-300 ${
          isDark ? 'border-slate-800 bg-[#1E293B] text-slate-100' : 'border-slate-200 bg-white text-slate-800'
        }`}
      >
        <div className="mb-2 flex items-center justify-between">
          <h3 className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            Token library
          </h3>
          <button
            onClick={props.onToggleSnap}
            className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${
              isDark
                ? 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Snap: {props.snapEnabled ? 'On' : 'Off'}
          </button>
        </div>

        <TokenLibrary activeTool={props.activeTool} onSelect={props.onToolPick} />
      </div>

      {/* Properties Section */}
      <div
        className={`rounded-[20px] border p-3 shadow-soft transition-colors duration-300 ${
          isDark ? 'border-slate-800 bg-[#1E293B] text-slate-100' : 'border-slate-200 bg-white text-slate-800'
        }`}
      >
        <h3 className={`mb-2 text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
          Properties
        </h3>
        <PropertyPanel object={props.selectedObject} onChange={props.onObjectChange} />
      </div>
    </div>
  );
}
export default EditorSidebar;