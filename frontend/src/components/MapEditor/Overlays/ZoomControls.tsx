import React from 'react';
import clsx from 'clsx';

interface ZoomControlsProps {
  scale: number;
  isDark: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onReset: () => void;
}

export const ZoomControls: React.FC<ZoomControlsProps> = React.memo(({
  scale,
  isDark,
  onZoomIn,
  onZoomOut,
  onFit,
  onReset,
}) => {
  return (
    <div
      className={clsx(
        'absolute left-1/2 bottom-4 -translate-x-1/2 z-10 flex items-center gap-1.5 p-1.5 rounded-2xl border shadow-xl backdrop-blur-md select-none transition-colors duration-300',
        isDark ? 'bg-slate-900/90 border-slate-800 text-slate-350' : 'bg-white/90 border-slate-200 text-slate-700'
      )}
    >
      <button
        onClick={onZoomIn}
        className={clsx(
          'rounded-lg font-bold hover:bg-black/10 transition active:scale-95 text-xs flex items-center justify-center h-7 w-7',
          isDark ? 'hover:text-white' : 'hover:text-slate-900'
        )}
        title="Zoom In"
      >
        +
      </button>
      <span className="text-[10px] font-bold px-1 min-w-[36px] text-center font-mono">
        {Math.round(scale * 100)}%
      </span>
      <button
        onClick={onZoomOut}
        className={clsx(
          'rounded-lg font-bold hover:bg-black/10 transition active:scale-95 text-xs flex items-center justify-center h-7 w-7',
          isDark ? 'hover:text-white' : 'hover:text-slate-900'
        )}
        title="Zoom Out"
      >
        -
      </button>
      <span className={clsx('h-4 w-px', isDark ? 'bg-slate-805' : 'bg-slate-200')} />
      <button
        onClick={onFit}
        className={clsx(
          'px-2 py-1 rounded-lg text-[10px] font-bold hover:bg-black/10 transition active:scale-95 h-7 flex items-center justify-center',
          isDark ? 'hover:text-white' : 'hover:text-slate-900'
        )}
      >
        Fit
      </button>
      <button
        onClick={onReset}
        className={clsx(
          'px-2 py-1 rounded-lg text-[10px] font-bold hover:bg-black/10 transition active:scale-95 h-7 flex items-center justify-center',
          isDark ? 'hover:text-white' : 'hover:text-slate-900'
        )}
      >
        100%
      </button>
    </div>
  );
});

ZoomControls.displayName = 'ZoomControls';
export default ZoomControls;
