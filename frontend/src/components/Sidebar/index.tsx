import { Plus } from 'lucide-react';
import { FloorItem, FloorPlanObject, ObjectType } from '../../types/editor';
import { FloorTabs } from '../FloorTabs';
import { PropertyPanel } from '../PropertyPanel';
import { TokenLibrary } from '../TokenLibrary';

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
  return (
    <div className="space-y-3">
      <div className="rounded-[20px] border border-[#e2c6bb] bg-[#ead9cf] p-3 shadow-[0_8px_24px_rgba(122,43,29,0.06)]">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#8f241e]">Tầng</h3>
          <button
            onClick={props.onAddFloor}
            className="rounded-lg bg-[#c94132] px-2.5 py-1.5 text-xs font-medium text-white hover:bg-[#b23326]"
          >
            <Plus size={13} className="inline" /> Thêm
          </button>
        </div>

        <FloorTabs floors={props.floors} activeFloorId={props.activeFloorId} onChange={props.onFloorChange} />
      </div>

      <div className="rounded-[20px] border border-[#e2c6bb] bg-[#fff8f3] p-3 shadow-[0_8px_24px_rgba(122,43,29,0.06)]">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#8f241e]">Token library</h3>
          <button
            onClick={props.onToggleSnap}
            className="rounded-lg border border-[#d8b1a1] bg-[#fff4ee] px-2.5 py-1.5 text-[11px] text-[#8a5a4b] hover:bg-[#f9e6dc]"
          >
            Snap: {props.snapEnabled ? 'On' : 'Off'}
          </button>
        </div>

        <TokenLibrary activeTool={props.activeTool} onSelect={props.onToolPick} />
      </div>

      <div className="rounded-[20px] border border-[#e2c6bb] bg-[#fff8f3] p-3 shadow-[0_8px_24px_rgba(122,43,29,0.06)]">
        <h3 className="mb-2 text-sm font-semibold text-[#8f241e]">Properties</h3>
        <PropertyPanel object={props.selectedObject} onChange={props.onObjectChange} />
      </div>
    </div>
  );
}