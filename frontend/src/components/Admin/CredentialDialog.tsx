import { Check, Copy, KeyRound, X } from 'lucide-react';
import { useState } from 'react';

export interface CredentialInfo {
  title: string;
  email: string;
  temporaryPassword: string;
  note: string;
}

export function CredentialDialog({ info, onClose }: { info: CredentialInfo; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(`Email: ${info.email}\nMật khẩu tạm thời: ${info.temporaryPassword}`);
    setCopied(true);
  }
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 text-slate-900 shadow-2xl">
        <div className="flex items-start justify-between gap-4"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 text-orange-600"><KeyRound /></div><button onClick={onClose} className="rounded-xl p-2 hover:bg-slate-100"><X size={18} /></button></div>
        <h2 className="mt-5 text-xl font-extrabold">{info.title}</h2>
        <p className="mt-2 text-sm text-slate-500">{info.note}</p>
        <div className="mt-5 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div><span className="text-xs font-bold uppercase text-slate-400">Email</span><p className="font-semibold">{info.email}</p></div>
          <div><span className="text-xs font-bold uppercase text-slate-400">Mật khẩu tạm thời</span><p className="break-all font-mono text-lg font-bold text-orange-600">{info.temporaryPassword}</p></div>
        </div>
        <button onClick={() => void copy()} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 font-bold text-white hover:bg-slate-800">{copied ? <Check size={18} /> : <Copy size={18} />}{copied ? 'Đã sao chép' : 'Sao chép thông tin'}</button>
      </div>
    </div>
  );
}
