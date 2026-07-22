import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FileText,
  Headphones,
  Mail,
  MessageCircle,
  PhoneCall,
  X,
  Zap
} from 'lucide-react';

interface FloatingContactButtonProps {
  isDark: boolean;
  onOpenConsultation: () => void;
}

export function FloatingContactButton({ isDark, onOpenConsultation }: FloatingContactButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Expanded Quick Contact Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`mb-4 w-72 rounded-3xl border p-4 shadow-2xl backdrop-blur-xl transition-all ${isDark
                ? 'bg-slate-900/90 border-slate-800 text-slate-100 shadow-slate-950/80'
                : 'bg-white/90 border-slate-200 text-slate-800 shadow-slate-300/60'
              }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-inherit mb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500 font-bold">
                  <Zap size={15} />
                </div>
                <div>
                  <strong className="text-xs font-bold block">Liên hệ Emberpath</strong>
                  <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Hỗ trợ trực tuyến 24/7
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer"
                aria-label="Đóng menu"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Actions List */}
            <div className="space-y-2 text-xs font-semibold">
              {/* Option 1: Form Yêu cầu tư vấn */}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenConsultation();
                }}
                className="w-full flex items-center gap-3 rounded-2xl p-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold shadow-md shadow-orange-500/20 hover:from-orange-600 hover:to-amber-600 transition-all cursor-pointer text-left"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/20">
                  <FileText size={16} />
                </div>
                <div>
                  <div className="text-xs font-extrabold">Đăng ký tư vấn giải pháp</div>
                  <div className="text-[10px] font-medium opacity-90">Khảo sát công trình miễn phí</div>
                </div>
              </button>

              {/* Option 2: Gọi Hotline */}
              <a
                href="tel:19006868"
                className={`flex items-center gap-3 rounded-2xl p-2.5 transition-colors border ${isDark
                    ? 'border-slate-800 bg-slate-950/60 hover:bg-slate-800 text-slate-200'
                    : 'border-slate-100 bg-slate-50 hover:bg-slate-100 text-slate-700'
                  }`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 font-bold">
                  <PhoneCall size={15} />
                </div>
                <div>
                  <div className="text-xs font-bold">Hotline 1900 6868</div>
                  <div className="text-[10px] opacity-60">Tư vấn kỹ thuật PCCC</div>
                </div>
              </a>

              {/* Option 3: Chat Zalo */}
              <a
                href="https://zalo.me"
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-3 rounded-2xl p-2.5 transition-colors border ${isDark
                    ? 'border-slate-800 bg-slate-950/60 hover:bg-slate-800 text-slate-200'
                    : 'border-slate-100 bg-slate-50 hover:bg-slate-100 text-slate-700'
                  }`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500 font-bold">
                  <MessageCircle size={15} />
                </div>
                <div>
                  <div className="text-xs font-bold">Chat qua Zalo OA</div>
                  <div className="text-[10px] opacity-60">Phản hồi ngay tức thì</div>
                </div>
              </a>

              {/* Option 4: Email */}
              <a
                href="mailto:ngochuyen237.vn@gmail.com"
                className={`flex items-center gap-3 rounded-2xl p-2.5 transition-colors border ${isDark
                    ? 'border-slate-800 bg-slate-950/60 hover:bg-slate-800 text-slate-200'
                    : 'border-slate-100 bg-slate-50 hover:bg-slate-100 text-slate-700'
                  }`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500 font-bold">
                  <Mail size={15} />
                </div>
                <div>
                  <div className="text-xs font-bold">ngochuyen237.vn@gmail.com</div>
                  <div className="text-[10px] opacity-60">Gửi hồ sơ dự án</div>
                </div>
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Floating Trigger Button */}
      <div className="relative flex items-center gap-2">
        {/* Tooltip Tag (when closed) */}
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className={`hidden sm:flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-extrabold shadow-lg backdrop-blur-md ${isDark
                ? 'border-slate-800 bg-slate-900/90 text-slate-200 shadow-slate-950/50'
                : 'border-slate-200 bg-white/90 text-slate-700 shadow-slate-200/80'
              }`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Tư vấn ngay</span>
          </motion.div>
        )}

        {/* Floating Button with Pulse Effect */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="relative group flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-600 text-white shadow-xl shadow-orange-500/30 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
          aria-label="Liên hệ tư vấn"
        >
          {/* Animated Pulsing Ring */}
          <span className="absolute -inset-1 rounded-full bg-orange-500/40 animate-ping pointer-events-none opacity-75" />

          {isOpen ? (
            <X size={24} className="relative z-10 transition-transform duration-200 rotate-90" />
          ) : (
            <Headphones size={24} className="relative z-10" />
          )}
        </button>
      </div>
    </div>
  );
}
