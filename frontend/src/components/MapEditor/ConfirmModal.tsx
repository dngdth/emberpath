import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const { darkMode } = useThemeStore();
  const isDark = darkMode;

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

            {/* Warning Icon & Title */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
                <AlertTriangle size={20} />
              </div>
              <h3 className="text-lg font-bold tracking-tight">{title}</h3>
            </div>

            {/* Message Body */}
            <p className={`mt-3 text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {message}
            </p>

            {/* Action Buttons */}
            <div className="mt-6 flex justify-end gap-3">
              <button
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
                onClick={onConfirm}
                className="rounded-2xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-500/15 transition hover:bg-rose-700 active:scale-98"
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
export default ConfirmModal;
