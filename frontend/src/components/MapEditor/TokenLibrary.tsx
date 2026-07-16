import clsx from 'clsx';
import { tokenLibrary } from '../../data/initialMockData';
import { ObjectType } from '../../types/editor';
import { useThemeStore } from '../../store/themeStore';

export function TokenLibrary({
  activeTool,
  onSelect,
}: {
  activeTool: string;
  onSelect: (type: ObjectType) => void;
}) {
  const { darkMode } = useThemeStore();
  const isDark = darkMode;

  return (
    <div className="space-y-1.5">
      {tokenLibrary.map((token) => {
        const isActive = activeTool === token.type;

        return (
          <button
            key={token.type}
            onClick={() => onSelect(token.type)}
            className={clsx(
              'w-full rounded-xl border px-3 py-2 text-left transition duration-150',
              isActive
                ? 'border-blue-500 bg-blue-500/10'
                : isDark
                  ? 'border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 hover:border-slate-700'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300'
            )}
          >
            <div
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
            </div>
            <div
              className={clsx(
                'mt-0.5 text-[10px] leading-tight',
                isActive
                  ? 'text-blue-400/80'
                  : isDark
                    ? 'text-slate-400'
                    : 'text-slate-500'
              )}
            >
              {token.description}
            </div>
          </button>
        );
      })}
    </div>
  );
}
export default TokenLibrary;