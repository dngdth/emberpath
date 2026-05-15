import { Copy, CopyPlus, Move, Redo2, Save, Search, Undo2, ZoomIn, ZoomOut } from 'lucide-react';

type Props = {
  onSelect: () => void;
  onPan: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onReset: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onExport: () => void;
  onLoad: () => void;
  canUndo: boolean;
  canRedo: boolean;
  activeTool: string;
};

export function EditorToolbar(props: Props) {
  const buttonClass =
    'rounded-xl border border-[#d8b1a1] bg-[#fff8f3] px-3 py-2 text-sm text-[#8b241e] hover:border-[#c94132] hover:text-[#b23326] hover:bg-[#f9ece5]';

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[24px] border border-[#e2c6bb] bg-[#ead9cf] p-3 shadow-[0_8px_24px_rgba(122,43,29,0.06)]">
      <button className={buttonClass} onClick={props.onSelect}>
        <Search size={16} className="inline" /> Select
      </button>
      <button className={buttonClass} onClick={props.onPan}>
        <Move size={16} className="inline" /> Pan
      </button>
      <button className={buttonClass} onClick={props.onZoomIn}>
        <ZoomIn size={16} className="inline" /> Zoom in
      </button>
      <button className={buttonClass} onClick={props.onZoomOut}>
        <ZoomOut size={16} className="inline" /> Zoom out
      </button>
      <button className={buttonClass} onClick={props.onFit}>Fit screen</button>
      <button className={buttonClass} onClick={props.onReset}>Reset view</button>
      <button className={buttonClass} disabled={!props.canUndo} onClick={props.onUndo}>
        <Undo2 size={16} className="inline" /> Undo
      </button>
      <button className={buttonClass} disabled={!props.canRedo} onClick={props.onRedo}>
        <Redo2 size={16} className="inline" /> Redo
      </button>
      <button className={buttonClass} onClick={props.onSave}>
        <Save size={16} className="inline" /> Save
      </button>
      <button className={buttonClass} onClick={props.onExport}>
        <CopyPlus size={16} className="inline" /> Export JSON
      </button>
      <button className={buttonClass} onClick={props.onLoad}>
        <Copy size={16} className="inline" /> Load JSON
      </button>

      <div className="ml-auto rounded-xl bg-[#fff8f3] px-3 py-2 text-xs font-medium text-[#8a5a4b]">
        Mode: {props.activeTool}
      </div>
    </div>
  );
}