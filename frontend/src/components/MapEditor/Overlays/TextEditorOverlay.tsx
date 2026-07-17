import React from 'react';
import { FloorPlanObject } from '../../../types/editor';

interface TextEditorOverlayProps {
  editingLabelId: string | null;
  setEditingLabelId: (id: string | null) => void;
  editingTextVal: string;
  setEditingTextVal: (val: string) => void;
  inputPos: { x: number; y: number; width: number; height: number; rotation: number };
  scale: number;
  isDark: boolean;
  objects: FloorPlanObject[];
  onUpdateObject: (id: string, patch: Partial<FloorPlanObject>) => void;
}

export const TextEditorOverlay: React.FC<TextEditorOverlayProps> = React.memo(({
  editingLabelId,
  setEditingLabelId,
  editingTextVal,
  setEditingTextVal,
  inputPos,
  scale,
  isDark,
  objects,
  onUpdateObject,
}) => {
  if (!editingLabelId) return null;

  const targetFontSize = objects.find(o => o.id === editingLabelId)?.fontSize || 20;

  return (
    <textarea
      value={editingTextVal}
      onChange={(e) => setEditingTextVal(e.target.value)}
      onBlur={() => {
        onUpdateObject(editingLabelId, { name: editingTextVal });
        setEditingLabelId(null);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          onUpdateObject(editingLabelId, { name: editingTextVal });
          setEditingLabelId(null);
        }
        if (e.key === 'Escape') {
          setEditingLabelId(null);
        }
      }}
      autoFocus
      style={{
        position: 'fixed',
        left: `${inputPos.x}px`,
        top: `${inputPos.y}px`,
        width: `${inputPos.width}px`,
        height: `${inputPos.height}px`,
        transform: `rotate(${inputPos.rotation}deg)`,
        transformOrigin: 'left top',
        fontSize: `${targetFontSize * scale}px`,
        color: isDark ? '#f8fafc' : '#1e293b',
        background: isDark ? '#1e293b' : '#ffffff',
        border: '1.5px solid #3b82f6',
        borderRadius: '6px',
        padding: '2px',
        outline: 'none',
        zIndex: 100,
        fontFamily: "'Inter', sans-serif",
        fontWeight: 'bold',
      }}
    />
  );
});

TextEditorOverlay.displayName = 'TextEditorOverlay';
export default TextEditorOverlay;
