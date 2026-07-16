import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, X } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';

interface FloorRenameModalProps {
  isOpen: boolean;
  title: string;
  initialName?: string;
  confirmText?: string;
  cancelText?: string;
  onSave: (newName: string) => void;
  onCancel: () => void;
}

export function FloorRenameModal({
  isOpen,
  title,
  initialName = '',
  confirmText = 'Lưu',
  cancelText = 'Hủy',
  onSave,
  onCancel,
}: FloorRenameModalProps) {
  const { darkMode } = useThemeStore();
  const isDark = darkMode;
  const [name, setName] = useState(initialName);

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
    }
  }, [isOpen, initialName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim());
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className={`relative z-10 w-full max-w-md overflow-hidden rounded-[28px] border p-6 shadow-2xl transition-colors duration-300 ${
              isDark
                ? 'border-slate-800 bg-[#1E293B] text-slate-100'
                : 'border-slate-200 bg-white text-slate-800'
            }`}
          >
            {/* Close Button */}
            <button
              onClick={onCancel}
              className={`absolute right-4 top-4 p-2 rounded-xl transition ${
                isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <X size={16} />
            </button>

            {/* Icon & Title */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
                <Layers size={20} />
              </div>
              <h3 className="text-lg font-bold tracking-tight">{title}</h3>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-4">
              <div>
                <label
                  className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  Tên tầng / khu vực
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="Ví dụ: Tầng 1, Tầng thượng..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full rounded-2xl border px-4 py-3 text-sm transition outline-none ${
                    isDark
                      ? 'border-slate-800 bg-slate-950 text-slate-100 placeholder-slate-650 focus:border-blue-500'
                      : 'border-slate-200 bg-slate-50 text-slate-850 placeholder-slate-400 focus:border-blue-600 focus:bg-white'
                  }`}
                />
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onCancel}
                  className={`rounded-2xl border px-4 py-2.5 text-xs font-bold transition ${
                    isDark
                      ? 'border-slate-700 bg-slate-900 text-slate-350 hover:bg-slate-800'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {cancelText}
                </button>
                <button
                  type="submit"
                  disabled={!name.trim()}
                  className="rounded-2xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/15 transition hover:bg-blue-700 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {confirmText}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
export default FloorRenameModal;
