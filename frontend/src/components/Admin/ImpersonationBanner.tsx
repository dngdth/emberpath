import { useState } from 'react';
import { ArrowLeft, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export function ImpersonationBanner() {
  const navigate = useNavigate();
  const { impersonating, user, exitImpersonation } = useAuthStore();
  const [isHovered, setIsHovered] = useState(false);

  if (!impersonating) return null;

  async function exit() {
    await exitImpersonation();
    navigate('/admin');
  }

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => setIsHovered(!isHovered)}
      className={`fixed bottom-6 right-6 z-[90] flex items-center justify-center shadow-2xl transition-all duration-300 ease-out bg-amber-400 border border-amber-500/30 text-amber-950 cursor-pointer ${
        isHovered
          ? 'rounded-[20px] p-5 max-w-md w-auto h-auto'
          : 'rounded-full w-14 h-14'
      }`}
    >
      {isHovered ? (
        <div className="flex flex-col gap-3 animate-fade-in text-sm font-semibold select-text">
          <div className="flex items-start gap-2.5">
            <UserCheck size={20} className="shrink-0 text-amber-950 mt-0.5 animate-pulse" />
            <span>
              Bạn đang hỗ trợ với tư cách <strong>{user?.building.name}</strong>. Mọi thao tác đều được ghi audit.
            </span>
          </div>
          <div className="flex justify-end pt-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                void exit();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-950 px-4 py-2 text-xs font-bold text-white hover:bg-slate-900 transition-colors shadow-lg active:scale-95 shrink-0"
            >
              <ArrowLeft size={14} />
              Thoát hỗ trợ
            </button>
          </div>
        </div>
      ) : (
        <div className="relative flex items-center justify-center">
          {/* Pulsing glow ring */}
          <span className="absolute inline-flex h-12 w-12 rounded-full bg-amber-500 opacity-40 animate-ping pointer-events-none" />
          <UserCheck size={24} className="relative z-10 text-amber-950" />
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
