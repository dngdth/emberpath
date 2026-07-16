import { FloorPlanObject } from '../../types/editor';
import { useThemeStore } from '../../store/themeStore';
import clsx from 'clsx';

type Props = {
  object: FloorPlanObject | null;
  onChange: (patch: Partial<FloorPlanObject>) => void;
};

function updateNumber(
  value: string,
  key: keyof FloorPlanObject,
  onChange: (patch: Partial<FloorPlanObject>) => void,
) {
  const parsed = Number(value);
  if (!Number.isNaN(parsed)) {
    onChange({ [key]: parsed } as Partial<FloorPlanObject>);
  }
}

export function PropertyPanel({ object, onChange }: Props) {
  const { darkMode } = useThemeStore();
  const isDark = darkMode;

  const panelBg = isDark ? 'bg-[#1E293B] border-slate-800' : 'bg-white border-slate-200';
  const labelClass = isDark ? 'text-slate-400' : 'text-slate-500';
  const sectionTitleClass = isDark ? 'text-blue-400' : 'text-blue-600';
  
  const disabledInputClass = isDark
    ? 'h-8 w-full rounded-xl border border-slate-800 bg-slate-900 px-2.5 text-[11px] text-slate-500 cursor-not-allowed'
    : 'h-8 w-full rounded-xl border border-slate-200 bg-slate-100 px-2.5 text-[11px] text-slate-400 cursor-not-allowed';

  const inputClass = isDark
    ? 'h-8 w-full rounded-xl border border-slate-800 bg-slate-950 px-2.5 text-[12px] text-slate-100 focus:border-slate-750 transition outline-none'
    : 'h-8 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-[12px] text-slate-850 focus:border-blue-500 transition outline-none';

  if (!object) {
    return (
      <div
        className={`rounded-2xl border border-dashed px-3 py-4 text-xs ${
          isDark ? 'border-slate-800 text-slate-500 bg-slate-950/20' : 'border-slate-200 text-slate-400 bg-slate-50'
        }`}
      >
        Chọn một object để chỉnh nhanh thuộc tính.
      </div>
    );
  }

  const isLed = object.type === 'led';
  const isLabel = object.type === 'label';
  const showSize = object.type !== 'led' && object.type !== 'exit';
  const showText = object.type === 'room' || object.type === 'label' || object.type === 'exit';

  return (
    <div className={`space-y-3 text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <label className={clsx('mb-1 block text-[10px] font-bold uppercase tracking-wide', sectionTitleClass)}>
            ID
          </label>
          <input value={object.id} disabled className={disabledInputClass} />
        </div>

        <div className="col-span-2">
          <label className={clsx('mb-1 block text-[10px] font-bold uppercase tracking-wide', sectionTitleClass)}>
            Type
          </label>
          <input value={object.type} disabled className={disabledInputClass} />
        </div>

        <div className="col-span-2">
          <label className={clsx('mb-1 block text-[10px] font-bold uppercase tracking-wide', sectionTitleClass)}>
            Name / Label
          </label>
          <input
            value={object.name || ''}
            onChange={(e) => onChange({ name: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>

      <div className={`rounded-2xl border p-2.5 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
        <div className={clsx('mb-2 text-[10px] font-extrabold uppercase tracking-wide', sectionTitleClass)}>
          Position
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={clsx('mb-0.5 block text-[10px]', labelClass)}>X</label>
            <input
              value={object.x ?? 0}
              onChange={(e) => updateNumber(e.target.value, 'x', onChange)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={clsx('mb-0.5 block text-[10px]', labelClass)}>Y</label>
            <input
              value={object.y ?? 0}
              onChange={(e) => updateNumber(e.target.value, 'y', onChange)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={clsx('mb-0.5 block text-[10px]', labelClass)}>Rotation</label>
            <input
              value={object.rotation ?? 0}
              onChange={(e) => updateNumber(e.target.value, 'rotation', onChange)}
              className={inputClass}
            />
          </div>

          {showSize && (
            <>
              <div>
                <label className={clsx('mb-0.5 block text-[10px]', labelClass)}>Width</label>
                <input
                  value={object.width ?? 0}
                  onChange={(e) => updateNumber(e.target.value, 'width', onChange)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={clsx('mb-0.5 block text-[10px]', labelClass)}>Height</label>
                <input
                  value={object.height ?? 0}
                  onChange={(e) => updateNumber(e.target.value, 'height', onChange)}
                  className={inputClass}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <div className={`rounded-2xl border p-2.5 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
        <div className={clsx('mb-2 text-[10px] font-extrabold uppercase tracking-wide', sectionTitleClass)}>
          Style
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={clsx('mb-0.5 block text-[10px]', labelClass)}>Color</label>
            <input
              value={object.color || ''}
              onChange={(e) => onChange({ color: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label className={clsx('mb-0.5 block text-[10px]', labelClass)}>Text color</label>
            <input
              value={object.textColor || ''}
              onChange={(e) => onChange({ textColor: e.target.value })}
              className={inputClass}
            />
          </div>

          {showText && (
            <div className="col-span-2">
              <label className={clsx('mb-0.5 block text-[10px]', labelClass)}>Font size</label>
              <input
                value={object.fontSize ?? 16}
                onChange={(e) => updateNumber(e.target.value, 'fontSize', onChange)}
                className={inputClass}
              />
            </div>
          )}

          {isLed && (
            <div className="col-span-2">
              <label className={clsx('mb-0.5 block text-[10px]', labelClass)}>Node status</label>
              <select
                value={object.nodeStatus || 'safe'}
                onChange={(e) => onChange({ nodeStatus: e.target.value as 'safe' | 'danger' })}
                className={inputClass}
              >
                <option value="safe">safe</option>
                <option value="danger">danger</option>
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <label className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-2 py-2 text-[11px] font-semibold transition cursor-pointer select-none ${
          isDark ? 'border-slate-800 bg-slate-900 text-slate-350 hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
        }`}>
          <input
            type="checkbox"
            checked={!!object.locked}
            onChange={(e) => onChange({ locked: e.target.checked })}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          Locked
        </label>

        <label className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-2 py-2 text-[11px] font-semibold transition cursor-pointer select-none ${
          isDark ? 'border-slate-800 bg-slate-900 text-slate-350 hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
        }`}>
          <input
            type="checkbox"
            checked={object.visible !== false}
            onChange={(e) => onChange({ visible: e.target.checked })}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          Visible
        </label>
      </div>

      {isLabel && (
        <div className={`rounded-xl px-3 py-2 text-[10px] ${isDark ? 'bg-slate-900 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
          Label có thể kéo thả trực tiếp, đổi text ở ô Name / Label.
        </div>
      )}
    </div>
  );
}
export default PropertyPanel;