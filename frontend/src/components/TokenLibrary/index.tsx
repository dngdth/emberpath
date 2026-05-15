import clsx from 'clsx';
import { tokenLibrary } from '../../data/initialMockData';
import { ObjectType } from '../../types/editor';

export function TokenLibrary({
  activeTool,
  onSelect,
}: {
  activeTool: string;
  onSelect: (type: ObjectType) => void;
}) {
  return (
    <div className="space-y-1.5">
      {tokenLibrary.map((token) => (
        <button
          key={token.type}
          onClick={() => onSelect(token.type)}
          className={clsx(
            'w-full rounded-xl border px-2.5 py-2 text-left transition',
            activeTool === token.type
              ? 'border-[#c94132] bg-[#f8e3da]'
              : 'border-[#e2c6bb] bg-[#fff8f3] hover:border-[#d8a08b] hover:bg-[#f9ede7]',
          )}
        >
          <div className="text-[13px] font-medium leading-tight text-[#8f241e]">
            {token.label}
          </div>
          <div className="mt-0.5 text-[10px] leading-tight text-[#8a5a4b]">
            {token.description}
          </div>
        </button>
      ))}
    </div>
  );
}