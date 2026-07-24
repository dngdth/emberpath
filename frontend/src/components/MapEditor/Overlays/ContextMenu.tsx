import React from 'react';
import clsx from 'clsx';

interface ContextMenuProps {
  contextMenu: { x: number; y: number; objectId: string } | null;
  setContextMenu: (menu: { x: number; y: number; objectId: string } | null) => void;
  isDark: boolean;
  onContextAction: (action: string, objectId: string) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = React.memo(({
  contextMenu,
  setContextMenu,
  isDark,
  onContextAction,
}) => {
  if (!contextMenu) return null;

  return (
    <div
      className={clsx(
        'fixed z-50 w-44 rounded-2xl border p-2 shadow-2xl transition-colors duration-300',
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      )}
      style={{ left: contextMenu.x, top: contextMenu.y }}
    >
      {['rename', 'duplicate', 'delete', 'front', 'back', 'lock'].map((action) => (
        <button
          key={action}
          onClick={() => {
            onContextAction(action, contextMenu.objectId);
            setContextMenu(null);
          }}
          className={clsx(
            'block w-full rounded-xl px-3 py-2 text-left text-xs font-semibold transition',
            isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
          )}
        >
          {action === 'front'
            ? 'Lên trên cùng'
            : action === 'back'
              ? 'Xuống dưới cùng'
              : action === 'rename'
                ? 'Đổi tên'
                : action === 'duplicate'
                  ? 'Nhân đôi'
                  : action === 'delete'
                    ? 'Xóa'
                    : action === 'lock'
                      ? 'Khóa / Mở khóa'
                      : action}
        </button>
      ))}
    </div>
  );
});

ContextMenu.displayName = 'ContextMenu';
export default ContextMenu;
