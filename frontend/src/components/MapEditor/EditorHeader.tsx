import React from 'react';
import {
  ArrowLeft,
  LogOut,
  Undo2,
  Redo2,
  Save,
  ChevronDown,
  Download,
  Upload,
  Eye,
  Eraser,
} from 'lucide-react';
import { SwitchTheme } from '../UI/SwitchTheme';
import clsx from 'clsx';
import { User } from '../../types/auth';

interface EditorHeaderProps {
  user: User | null;
  logout: () => void;
  editMode: boolean;
  setEditMode: (val: boolean) => void;
  isDark: boolean;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  savePlan: () => void;
  fileMenuOpen: boolean;
  setFileMenuOpen: (val: boolean) => void;
  handleExport: () => void;
  handleImport: () => void;
  fileMenuRef: React.RefObject<HTMLDivElement>;
  clearSelection: () => void;
  activeTool: string;
  setActiveTool: (tool: string) => void;
}

export const EditorHeader: React.FC<EditorHeaderProps> = React.memo(({
  user,
  logout,
  editMode,
  setEditMode,
  isDark,
  canUndo,
  canRedo,
  undo,
  redo,
  savePlan,
  fileMenuOpen,
  setFileMenuOpen,
  handleExport,
  handleImport,
  fileMenuRef,
  clearSelection,
  activeTool,
  setActiveTool,
}) => {
  return (
    <header
      className={clsx(
        'flex items-center justify-between px-4 py-3 border-b shrink-0 h-14 transition-colors duration-300 z-30 select-none',
        isDark ? 'border-slate-850 bg-[#1E293B]' : 'border-slate-200 bg-white'
      )}
    >
      {/* Left Section: Back link, building name */}
      <div className="flex items-center gap-3">
        <a
          href="/dashboard"
          className={clsx(
            'p-2 rounded-xl border transition hover:scale-105 active:scale-95',
            isDark
              ? 'border-slate-800 bg-slate-900 text-slate-450 hover:bg-slate-850 hover:text-white'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-55'
          )}
          title="Về Dashboard"
        >
          <ArrowLeft size={15} />
        </a>

        <div>
          <h1 className="hidden sm:block text-xs font-black tracking-tight leading-tight uppercase opacity-90">
            {user?.building?.name}
          </h1>
        </div>
      </div>

      {/* Center Section: Compact tools switchers, standalone save, action dropdowns */}
      <div className="flex items-center gap-3">
        {editMode ? (
          <>
            {/* History Undo / Redo */}
            <div
              className={clsx(
                'hidden md:flex items-center border rounded-xl overflow-hidden',
                isDark ? 'border-slate-855 bg-slate-900/60' : 'border-slate-200 bg-white'
              )}
            >
              <button
                onClick={undo}
                disabled={!canUndo}
                className="p-2 hover:bg-black/10 transition disabled:opacity-30 disabled:cursor-not-allowed text-inherit"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 size={13} />
              </button>
              <span className={`h-4 w-px ${isDark ? 'bg-slate-805' : 'bg-slate-200'}`} />
              <button
                onClick={redo}
                disabled={!canRedo}
                className="p-2 hover:bg-black/10 transition disabled:opacity-30 disabled:cursor-not-allowed text-inherit"
                title="Redo (Ctrl+Y)"
              >
                <Redo2 size={13} />
              </button>
            </div>

            {/* Eraser Tool Toggle */}
            <button
              onClick={() => {
                if (activeTool === 'eraser') {
                  setActiveTool('select');
                } else {
                  setActiveTool('eraser');
                  clearSelection();
                }
              }}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-sm select-none h-8',
                activeTool === 'eraser'
                  ? 'bg-rose-600 border-rose-600 text-white hover:bg-rose-700 shadow-rose-500/20'
                  : isDark
                    ? 'border-slate-800 bg-slate-900 text-slate-100 hover:bg-slate-855 hover:text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-55'
              )}
              title="Công cụ tẩy (Eraser) - Click kéo để xóa nhanh nhiều vật thể"
            >
              <Eraser size={13} />
              <span>Tẩy</span>
            </button>

            {/* Standalone Save button */}
            <button
              onClick={savePlan}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm active:scale-95 shrink-0 h-8"
              title="Lưu sơ đồ thiết kế vào hệ thống (Ctrl+S)"
            >
              <Save size={13} />
              <span className="hidden sm:inline">Lưu sơ đồ</span>
            </button>

            {/* Export/Import JSON Dropdown */}
            <div className="relative font-sans hidden md:block" ref={fileMenuRef}>
              <button
                onClick={() => setFileMenuOpen(!fileMenuOpen)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-sm select-none h-8',
                  isDark
                    ? 'border-slate-800 bg-slate-900 text-slate-100 hover:bg-slate-855'
                    : 'border-slate-200 bg-white text-slate-850 hover:bg-slate-55'
                )}
              >
                <span>Xuất/Nhập</span>
                <ChevronDown size={12} className="opacity-60" />
              </button>

              {fileMenuOpen && (
                <div
                  className={clsx(
                    'absolute right-0 mt-1.5 w-44 rounded-2xl border p-1.5 shadow-2xl z-40 transition-colors duration-200',
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                  )}
                >
                  <button
                    onClick={handleExport}
                    className={clsx(
                      'flex items-center gap-2.5 w-full rounded-xl px-3 py-2 text-left text-xs font-bold transition',
                      isDark ? 'text-slate-350 hover:bg-slate-800 hover:text-white' : 'text-slate-700 hover:bg-slate-55'
                    )}
                  >
                    <Download size={13} />
                    <span>Xuất File JSON</span>
                  </button>
                  <button
                    onClick={handleImport}
                    className={clsx(
                      'flex items-center gap-2.5 w-full rounded-xl px-3 py-2 text-left text-xs font-bold transition',
                      isDark ? 'text-slate-350 hover:bg-slate-800 hover:text-white' : 'text-slate-700 hover:bg-slate-55'
                    )}
                  >
                    <Upload size={13} />
                    <span>Nạp File JSON</span>
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          // Monitor status text
          <span className="text-xs font-bold text-emerald-500 uppercase flex items-center gap-1.5 select-none animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Chế độ giám sát live</span>
          </span>
        )}
      </div>

      {/* Right Section: Mode switch, Theme switch, Profile */}
      <div className="flex items-center gap-2 md:gap-3.5">
        {/* Mode Switch Toggle */}
        <div className="flex items-center gap-1 rounded-xl p-1 bg-slate-950/20 border border-slate-800/10 dark:border-slate-800">
          {user?.role === 'admin_building' ? (
            <>
              <button
                onClick={() => {
                  setEditMode(true);
                  clearSelection();
                }}
                className={clsx(
                  'flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-extrabold transition-all',
                  editMode ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                )}
              >
                <span>EDIT</span>
              </button>
              <button
                onClick={() => {
                  setEditMode(false);
                  clearSelection();
                }}
                className={clsx(
                  'flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-extrabold transition-all',
                  !editMode ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                )}
              >
                <span>MONITOR</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-1 px-2.5 py-1 text-[9px] font-extrabold text-slate-400">
              <Eye size={10} className="text-emerald-500" />
              <span>GIÁM SÁT</span>
            </div>
          )}
        </div>

        <SwitchTheme />

        <button
          onClick={logout}
          className={clsx(
            'p-2 rounded-xl border transition',
            isDark
              ? 'border-slate-850 hover:bg-rose-955/20 hover:text-rose-450 hover:border-rose-900 text-slate-400'
              : 'border-slate-200 bg-white hover:bg-slate-55 text-slate-700'
          )}
          title="Đăng xuất"
        >
          <LogOut size={14} />
        </button>
      </div>
    </header>
  );
});

EditorHeader.displayName = 'EditorHeader';
export default EditorHeader;
