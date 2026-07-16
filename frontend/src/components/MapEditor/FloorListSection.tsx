import { useMemo } from 'react';
import { FloorItem } from '../../types/editor';
import { Layers, Plus, Edit3, Trash2, Activity } from 'lucide-react';

interface FloorListSectionProps {
  floors: FloorItem[];
  activeFloorId: number | null;
  loading: boolean;
  userRole?: string;
  isDark: boolean;
  onFloorSelect: (id: number) => void;
  onAddFloor: () => void;
  onRenameFloor: (floor: FloorItem) => void;
  onDeleteFloor: (floor: FloorItem) => void;
}

export function FloorListSection({
  floors,
  activeFloorId,
  loading,
  userRole,
  isDark,
  onFloorSelect,
  onAddFloor,
  onRenameFloor,
  onDeleteFloor,
}: FloorListSectionProps) {
  // Sort floors logically by index
  const sortedFloors = useMemo(() => {
    return [...floors].sort((a, b) => a.order_index - b.order_index);
  }, [floors]);

  return (
    <div className="flex flex-col h-full">
      {/* Title Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider opacity-85">
          <Layers size={14} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
          <span>Danh sách Tầng</span>
        </div>

        {userRole === 'admin_building' && (
          <button
            onClick={onAddFloor}
            className="flex items-center gap-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 text-xs font-bold transition shadow-sm active:scale-95"
            title="Thêm tầng mới"
          >
            <Plus size={12} />
            <span>Thêm</span>
          </button>
        )}
      </div>

      {/* Floors List Container */}
      <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin space-y-1.5 max-h-[260px] md:max-h-none">
        {loading ? (
          <div className="text-center py-6 text-xs opacity-50 flex items-center justify-center gap-2">
            <Activity className="animate-spin text-blue-500" size={14} />
            <span>Đang nạp tầng...</span>
          </div>
        ) : sortedFloors.length === 0 ? (
          <div className={`text-center py-8 text-xs border border-dashed rounded-2xl ${
            isDark ? 'border-slate-800 text-slate-500 bg-slate-900/10' : 'border-slate-200 text-slate-400 bg-slate-50'
          }`}>
            Chưa có tầng nào được tạo.
          </div>
        ) : (
          sortedFloors.map((floor) => {
            const isActive = activeFloorId === floor.id;
            return (
              <div
                key={floor.id}
                className={`group flex items-center justify-between rounded-2xl px-3.5 py-2.5 text-xs font-bold transition duration-200 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-[0_4px_12px_rgba(59,130,246,0.18)]'
                    : isDark
                      ? 'bg-slate-900/50 text-slate-350 border border-slate-800/80 hover:bg-slate-800 hover:text-white'
                      : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 hover:text-slate-905'
                }`}
              >
                <button
                  onClick={() => onFloorSelect(floor.id)}
                  className="flex-1 text-left truncate py-0.5"
                >
                  {floor.name}
                </button>

                {/* Admin Action Buttons on Hover */}
                {userRole === 'admin_building' && (
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <button
                      onClick={() => onRenameFloor(floor)}
                      className={`p-1 rounded-lg transition hover:bg-black/10 text-inherit`}
                      title="Đổi tên tầng"
                    >
                      <Edit3 size={12} />
                    </button>
                    <button
                      onClick={() => onDeleteFloor(floor)}
                      className="p-1 rounded-lg transition hover:bg-black/10 hover:text-rose-350 text-inherit"
                      title="Xóa tầng"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
export default FloorListSection;
