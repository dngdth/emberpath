import { Copy, CopyPlus, Move, Redo2, Save, Search, Undo2, ZoomIn, ZoomOut } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';

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
  const { darkMode } = useThemeStore();
  const isDark = darkMode;

  const buttonClass = isDark
    ? 'rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-300 hover:border-slate-700 hover:text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition'
    : 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:border-slate-300 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition';

  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded-[24px] border p-3 shadow-soft transition-colors duration-300 ${
        isDark ? 'border-slate-800 bg-[#1E293B]' : 'border-slate-200 bg-white'
      }`}
    >
      <button className={buttonClass} onClick={props.onSelect}>
        <Search size={16} className="inline mr-1" /> Select
      </button>
      <button className={buttonClass} onClick={props.onPan}>
        <Move size={16} className="inline mr-1" /> Pan
      </button>
      <button className={buttonClass} onClick={props.onZoomIn}>
        <ZoomIn size={16} className="inline mr-1" /> Zoom in
      </button>
      <button className={buttonClass} onClick={props.onZoomOut}>
        <ZoomOut size={16} className="inline mr-1" /> Zoom out
      </button>
      <button className={buttonClass} onClick={props.onFit}>Fit screen</button>
      <button className={buttonClass} onClick={props.onReset}>Reset view</button>
      <button className={buttonClass} disabled={!props.canUndo} onClick={props.onUndo}>
        <Undo2 size={16} className="inline mr-1" /> Undo
      </button>
      <button className={buttonClass} disabled={!props.canRedo} onClick={props.onRedo}>
        <Redo2 size={16} className="inline mr-1" /> Redo
      </button>
      <button className={buttonClass} onClick={props.onSave}>
        <Save size={16} className="inline mr-1" /> Save
      </button>
      <button className={buttonClass} onClick={props.onExport}>
        <CopyPlus size={16} className="inline mr-1" /> Export JSON
      </button>
      <button className={buttonClass} onClick={props.onLoad}>
        <Copy size={16} className="inline mr-1" /> Load JSON
      </button>

      <div
        className={`ml-auto rounded-xl px-3 py-2 text-xs font-medium ${
          isDark ? 'bg-slate-950 text-slate-400' : 'bg-slate-100 text-slate-500'
        }`}
      >
        Mode: {props.activeTool}
      </div>
    </div>
  );
}
export default EditorToolbar;