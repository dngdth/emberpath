import { Route, UserCheck, ShieldCheck } from 'lucide-react';

interface DemoAccountsProps {
  onSelect: (email: string, pass: string) => void;
  isDark: boolean;
  disabled: boolean;
}

export function DemoAccounts({ onSelect, isDark, disabled }: DemoAccountsProps) {
  const accounts = [
    {
      role: 'Admin tòa nhà',
      email: 'admin@buildinga.demo',
      pass: '123456',
      desc: 'Toàn quyền cấu hình sơ đồ & thiết bị IoT.',
      icon: ShieldCheck,
      iconColor: 'text-[#F97316]',
      bgColor: 'hover:border-[#F97316]/50 hover:bg-[#F97316]/5',
    },
    {
      role: 'Nhân viên vận hành',
      email: 'operator@buildinga.demo',
      pass: '123456',
      desc: 'Giám sát cảm biến, ứng phó sự cố khẩn cấp.',
      icon: UserCheck,
      iconColor: 'text-[#3B82F6]',
      bgColor: 'hover:border-[#3B82F6]/50 hover:bg-[#3B82F6]/5',
    },
    {
      role: 'Demo Gradient 4 tầng',
      email: 'gradient@emberpath.demo',
      pass: '123456',
      desc: 'Thử tuyến LED đa tầng và nhánh tránh node nguy hiểm.',
      icon: Route,
      iconColor: 'text-emerald-500',
      bgColor: 'hover:border-emerald-500/50 hover:bg-emerald-500/5',
    },
  ];

  return (
    <div
      className={`rounded-2xl border p-4 transition-colors ${
        isDark ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-50/50 border-slate-200/80'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Đăng nhập nhanh (Quick Demo)
        </h4>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-semibold">
          Sẵn dùng
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {accounts.map((acc, index) => {
          const Icon = acc.icon;
          return (
            <button
              key={index}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(acc.email, acc.pass)}
              className={`flex flex-col text-left p-3 rounded-xl border transition-all duration-200 ${
                isDark
                  ? 'bg-slate-950/60 border-slate-800/60 text-white'
                  : 'bg-white border-slate-200/60 text-slate-800'
              } ${acc.bgColor} disabled:opacity-50 disabled:pointer-events-none group`}
            >
              <div className="flex items-center gap-1.5 font-bold text-sm">
                <Icon className={`h-4 w-4 ${acc.iconColor}`} />
                <span className="group-hover:text-blue-500 dark:group-hover:text-orange-400 transition-colors">
                  {acc.role}
                </span>
              </div>
              <span className={`text-xs mt-1 font-mono break-all ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {acc.email}
              </span>
              <span className={`text-[10px] mt-1.5 italic ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                {acc.desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
