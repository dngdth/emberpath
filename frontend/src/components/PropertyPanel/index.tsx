import { FloorPlanObject } from '../../types/editor';

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
  if (!object) {
    return (
      <div className="rounded-2xl border border-dashed border-[#d7b0a0] bg-[#fffaf7] px-3 py-4 text-xs text-[#9a6d5d]">
        Chọn một object để chỉnh nhanh thuộc tính.
      </div>
    );
  }

  const isLed = object.type === 'led';
  const isLabel = object.type === 'label';
  const showSize = object.type !== 'led' && object.type !== 'exit';
  const showText = object.type === 'room' || object.type === 'label' || object.type === 'exit';

  return (
    <div className="space-y-3 text-[11px] text-[#8a5a4b]">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-[#b33a2f]">
            ID
          </label>
          <input
            value={object.id}
            disabled
            className="h-8 w-full rounded-xl border border-[#e1c1b4] bg-[#f7eee9] px-2.5 text-[11px] text-[#8b5a49]"
          />
        </div>

        <div className="col-span-2">
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-[#b33a2f]">
            Type
          </label>
          <input
            value={object.type}
            disabled
            className="h-8 w-full rounded-xl border border-[#e1c1b4] bg-[#f7eee9] px-2.5 text-[11px] text-[#8b5a49]"
          />
        </div>

        <div className="col-span-2">
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-[#b33a2f]">
            Name / Label
          </label>
          <input
            value={object.name || ''}
            onChange={(e) => onChange({ name: e.target.value })}
            className="h-8 w-full rounded-xl border border-[#d8b1a1] bg-[#fff8f3] px-2.5 text-[12px] text-[#7c2d23]"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-[#ecd2c6] bg-[#fffaf7] p-2.5">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#b33a2f]">
          Position
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-[10px] text-[#9a6d5d]">X</label>
            <input
              value={object.x ?? 0}
              onChange={(e) => updateNumber(e.target.value, 'x', onChange)}
              className="h-8 w-full rounded-xl border border-[#d8b1a1] bg-white px-2.5 text-[12px]"
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] text-[#9a6d5d]">Y</label>
            <input
              value={object.y ?? 0}
              onChange={(e) => updateNumber(e.target.value, 'y', onChange)}
              className="h-8 w-full rounded-xl border border-[#d8b1a1] bg-white px-2.5 text-[12px]"
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] text-[#9a6d5d]">Rotation</label>
            <input
              value={object.rotation ?? 0}
              onChange={(e) => updateNumber(e.target.value, 'rotation', onChange)}
              className="h-8 w-full rounded-xl border border-[#d8b1a1] bg-white px-2.5 text-[12px]"
            />
          </div>

          {showSize && (
            <>
              <div>
                <label className="mb-1 block text-[10px] text-[#9a6d5d]">Width</label>
                <input
                  value={object.width ?? 0}
                  onChange={(e) => updateNumber(e.target.value, 'width', onChange)}
                  className="h-8 w-full rounded-xl border border-[#d8b1a1] bg-white px-2.5 text-[12px]"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] text-[#9a6d5d]">Height</label>
                <input
                  value={object.height ?? 0}
                  onChange={(e) => updateNumber(e.target.value, 'height', onChange)}
                  className="h-8 w-full rounded-xl border border-[#d8b1a1] bg-white px-2.5 text-[12px]"
                />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-[#ecd2c6] bg-[#fffaf7] p-2.5">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#b33a2f]">
          Style
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-[10px] text-[#9a6d5d]">Color</label>
            <input
              value={object.color || ''}
              onChange={(e) => onChange({ color: e.target.value })}
              className="h-8 w-full rounded-xl border border-[#d8b1a1] bg-white px-2.5 text-[12px]"
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] text-[#9a6d5d]">Text color</label>
            <input
              value={object.textColor || ''}
              onChange={(e) => onChange({ textColor: e.target.value })}
              className="h-8 w-full rounded-xl border border-[#d8b1a1] bg-white px-2.5 text-[12px]"
            />
          </div>

          {showText && (
            <div className="col-span-2">
              <label className="mb-1 block text-[10px] text-[#9a6d5d]">Font size</label>
              <input
                value={object.fontSize ?? 16}
                onChange={(e) => updateNumber(e.target.value, 'fontSize', onChange)}
                className="h-8 w-full rounded-xl border border-[#d8b1a1] bg-white px-2.5 text-[12px]"
              />
            </div>
          )}

          {isLed && (
            <div className="col-span-2">
              <label className="mb-1 block text-[10px] text-[#9a6d5d]">Node status</label>
              <select
                value={object.nodeStatus || 'safe'}
                onChange={(e) => onChange({ nodeStatus: e.target.value as 'safe' | 'danger' })}
                className="h-8 w-full rounded-xl border border-[#d8b1a1] bg-white px-2.5 text-[12px]"
              >
                <option value="safe">safe</option>
                <option value="danger">danger</option>
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <label className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#d8b1a1] bg-[#fff8f3] px-2 py-2 text-[11px] text-[#7c2d23]">
          <input
            type="checkbox"
            checked={!!object.locked}
            onChange={(e) => onChange({ locked: e.target.checked })}
          />
          Locked
        </label>

        <label className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#d8b1a1] bg-[#fff8f3] px-2 py-2 text-[11px] text-[#7c2d23]">
          <input
            type="checkbox"
            checked={object.visible !== false}
            onChange={(e) => onChange({ visible: e.target.checked })}
          />
          Visible
        </label>
      </div>

      {isLabel && (
        <div className="rounded-xl bg-[#f7eee9] px-3 py-2 text-[10px] text-[#9a6d5d]">
          Label có thể kéo thả trực tiếp, đổi text ở ô Name / Label.
        </div>
      )}
    </div>
  );
}