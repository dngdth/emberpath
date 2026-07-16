import clsx from 'clsx';
import { tokenLibrary } from '../../data/initialMockData';
import { ObjectType } from '../../types/editor';
import { useThemeStore } from '../../store/themeStore';

export function TokenLibrary({
  activeTool,
  onSelect,
}: {
  activeTool: string;
  onSelect: (type: ObjectType | 'select') => void;
}) {
  const { darkMode } = useThemeStore();
  const isDark = darkMode;

  return (
    <div className="space-y-2">
      {tokenLibrary.map((token) => {
        const isActive = activeTool === token.type;

        return (
          <div
            key={token.type}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', token.type);
            }}
            onClick={() => {
              if (activeTool === token.type) {
                onSelect('select');
              } else {
                onSelect(token.type);
              }
            }}
            className={clsx(
              'w-full rounded-2xl border px-4 py-3 text-left transition duration-200 cursor-grab active:cursor-grabbing select-none',
              isActive
                ? 'border-blue-500 bg-blue-500/10'
                : isDark
                  ? 'border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 hover:border-slate-700 hover:scale-102'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-350 hover:scale-102'
            )}
          >
            <div className="flex items-center justify-between">
              <span
                className={clsx(
                  'text-xs font-bold leading-tight',
                  isActive
                    ? 'text-blue-500'
                    : isDark
                      ? 'text-slate-200'
                      : 'text-slate-800'
                )}
              >
                {token.label}
              </span>
              <span className="text-[10px] opacity-40 font-mono">DRAG</span>
            </div>
            <div
              className={clsx(
                'mt-1 text-[10px] leading-tight',
                isActive
                  ? 'text-blue-450/80'
                  : isDark
                    ? 'text-slate-450'
                    : 'text-slate-500'
              )}
            >
              {token.description}
            </div>
          </div>
        );
      })}
    </div>
  );
}
export default TokenLibrary;