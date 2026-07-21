import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export function ImpersonationBanner() {
  const navigate = useNavigate();
  const { impersonating, user, exitImpersonation } = useAuthStore();
  if (!impersonating) return null;
  async function exit() {
    await exitImpersonation();
    navigate('/admin');
  }
  return (
    <div className="fixed inset-x-0 top-0 z-[90] flex min-h-11 items-center justify-center gap-3 bg-amber-400 px-4 py-2 text-center text-sm font-semibold text-amber-950 shadow-lg">
      <ShieldAlert size={18} />
      <span>Bạn đang hỗ trợ với tư cách <strong>{user?.building.name}</strong>. Mọi thao tác đều được ghi audit.</span>
      <button onClick={() => void exit()} className="inline-flex items-center gap-1 rounded-lg bg-amber-950 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-900"><ArrowLeft size={14} />Thoát hỗ trợ</button>
    </div>
  );
}
