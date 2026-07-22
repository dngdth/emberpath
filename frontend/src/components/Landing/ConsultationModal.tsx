import { useEffect } from 'react';
import { X, ShieldAlert } from 'lucide-react';
import { ConsultationForm } from './ConsultationForm';

interface ConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
}

export function ConsultationModal({ isOpen, onClose, isDark }: ConsultationModalProps) {
  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 select-none">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity duration-300 animate-fade-in cursor-pointer"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div 
        className={`relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border shadow-2xl transition-all duration-300 transform scale-100 animate-scale-up select-text custom-scrollbar ${
          isDark 
            ? 'bg-[#0F172A] border-slate-800 text-white' 
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-5 right-5 p-2.5 rounded-2xl border transition-all duration-200 hover:scale-105 active:scale-95 z-20 ${
            isDark
              ? 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
              : 'border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="px-6 pt-8 pb-2 md:px-8">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold bg-orange-500/10 text-orange-500 mb-3">
            <ShieldAlert className="h-4 w-4" />
            <span>Tư vấn giải pháp</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Yêu Cầu Khảo Sát & Tư Vấn Giải Pháp
          </h2>
          <p className={`mt-2 text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Hãy điền các thông tin dưới đây. Đội ngũ kỹ sư của Emberpath sẽ liên hệ ngay để khảo sát công trình và tư vấn kỹ thuật.
          </p>
        </div>

        {/* Modal Form */}
        <div className="px-1 pb-4">
          <ConsultationForm isDark={isDark} onSuccess={onClose} minimal={true} />
        </div>
      </div>

      {styleTag}
    </div>
  );
}

// Add simple CSS animations and custom scrollbar
const styleTag = (
  <style>{`
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes scaleUp {
      from { opacity: 0; transform: scale(0.95) translateY(10px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    .animate-fade-in {
      animation: fadeIn 0.2s ease-out forwards;
    }
    .animate-scale-up {
      animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    
    /* Custom scrollbar for modal content container */
    .custom-scrollbar::-webkit-scrollbar {
      width: 8px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
      margin: 20px 0; /* Keeps the scrollbar offset from top & bottom rounded corners */
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #CBD5E1;
      border-radius: 9999px;
    }
    .dark .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #475569;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #94A3B8;
    }
    .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #64748B;
    }
  `}</style>
);
