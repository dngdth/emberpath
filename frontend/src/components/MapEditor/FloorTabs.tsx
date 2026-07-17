import clsx from 'clsx';
import { FloorItem } from '../../types/editor';
import { useThemeStore } from '../../store/themeStore';

export function FloorTabs({
  floors,
  activeFloorId,
  onChange,
}: {
  floors: FloorItem[];
  activeFloorId: number | null;
  onChange: (id: number) => void;
}) {
  const { darkMode } = useThemeStore();
  const isDark = darkMode;

  return (
    <div className="flex flex-wrap gap-2">
      {floors.map((floor) => (
        <button
          key={floor.id}
          onClick={() => onChange(floor.id)}
          className={clsx(
            'rounded-xl px-4 py-2 text-sm font-semibold transition',
            activeFloorId === floor.id
              ? 'bg-[#3B82F6] text-white shadow-sm'
              : isDark
                ? 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
                : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
          )}
        >
          {floor.name}
        </button>
      ))}
    </div>
  );
}
export default FloorTabs;