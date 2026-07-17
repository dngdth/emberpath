import React from 'react';
import clsx from 'clsx';
import { FloorPlanObject } from '../../../types/editor';

interface SelectionToolbarProps {
  selectedObjects: FloorPlanObject[];
  isDark: boolean;
  onContextAction: (action: string, objectId: string) => void;
}

export const SelectionToolbar: React.FC<SelectionToolbarProps> = React.memo(({
  selectedObjects,
  isDark,
  onContextAction,
}) => {
  if (selectedObjects.length === 0) return null;

  return (
    <div
      className={clsx(
        'absolute left-1/2 top-4 z-20 flex -translate-x-1/2 gap-2 rounded-2xl border p-2 text-xs shadow-xl transition-colors duration-300 items-center',
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      )}
    >
      <span className="flex items-center px-1 font-semibold whitespace-nowrap">
        {selectedObjects.length} đã chọn
      </span>
      <button
        onClick={() => onContextAction('duplicate', selectedObjects[0].id)}
        className={clsx(
          'rounded-xl px-3 py-1.5 font-bold transition whitespace-nowrap',
          isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-750'
        )}
      >
        Nhân đôi
      </button>

      {selectedObjects.length === 2 && (
        <>
          <button
            onClick={() => onContextAction('connect_nodes', '')}
            className="rounded-xl bg-blue-600 px-3 py-1.5 font-bold text-white hover:bg-blue-700 transition whitespace-nowrap"
          >
            Kết nối các nút
          </button>
          <button
            onClick={() => onContextAction('find_path', '')}
            className="rounded-xl bg-emerald-600 px-3 py-1.5 font-bold text-white hover:bg-emerald-700 transition whitespace-nowrap"
          >
            Tìm đường đi an toàn
          </button>
        </>
      )}

      <button
        onClick={() => onContextAction('delete', selectedObjects[0].id)}
        className="rounded-xl bg-rose-600 px-3 py-1.5 font-bold text-white hover:bg-rose-700 active:scale-95 whitespace-nowrap"
      >
        Xóa
      </button>
    </div>
  );
});

SelectionToolbar.displayName = 'SelectionToolbar';
export default SelectionToolbar;
