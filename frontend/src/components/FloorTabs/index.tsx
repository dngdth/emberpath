import clsx from 'clsx';
import { FloorItem } from '../../types/editor';

export function FloorTabs({
  floors,
  activeFloorId,
  onChange,
}: {
  floors: FloorItem[];
  activeFloorId: number | null;
  onChange: (id: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {floors.map((floor) => (
        <button
          key={floor.id}
          onClick={() => onChange(floor.id)}
          className={clsx(
            'rounded-xl px-4 py-2 text-sm font-medium transition',
            activeFloorId === floor.id
              ? 'bg-[#d9a36b] text-white'
              : 'bg-[#fff8f3] text-[#8f241e] border border-[#dfb9a8] hover:bg-[#f7e8df]',
          )}
        >
          {floor.name}
        </button>
      ))}
    </div>
  );
}