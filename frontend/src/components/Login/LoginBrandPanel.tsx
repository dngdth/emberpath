import { Shield, Radio, Route, Compass } from 'lucide-react';
import { motion } from 'framer-motion';

interface LoginBrandPanelProps {
  isDark: boolean;
}

export function LoginBrandPanel({ isDark }: LoginBrandPanelProps) {
  const benefits = [
    {
      icon: Radio,
      title: 'Giám sát cảm biến IoT',
      desc: 'Cập nhật trạng thái khói, nhiệt độ thời gian thực.',
      color: 'text-orange-500 bg-orange-500/10',
    },
    {
      icon: Route,
      title: 'Định tuyến Dijkstra tự động',
      desc: 'Tính toán đường thoát hiểm an toàn nhất ngay khi có sự cố.',
      color: 'text-blue-500 bg-blue-500/10',
    },
    {
      icon: Compass,
      title: 'Quản lý sơ đồ trực quan',
      desc: 'Trình chỉnh sửa sơ đồ tòa nhà kéo thả và cấu hình LED mượt mà.',
      color: 'text-emerald-500 bg-emerald-500/10',
    },
  ];

  return (
    <div
      className={`relative hidden lg:flex flex-col justify-between p-12 overflow-hidden h-full rounded-l-[32px] transition-colors duration-300 ${
        isDark
          ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 border-r border-slate-800/80'
          : 'bg-gradient-to-br from-blue-50/60 via-indigo-50/20 to-white text-slate-800 border-r border-slate-200/80'
      }`}
    >
      {/* Decorative Grid Overlay */}
      <div
        className={`absolute inset-0 opacity-[0.05] pointer-events-none ${
          isDark ? 'bg-[radial-gradient(#38bdf8_1px,transparent_1px)]' : 'bg-[radial-gradient(#3b82f6_1px,transparent_1px)]'
        }`}
        style={{ backgroundSize: '24px 24px' }}
      />
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="relative z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20">
            <Shield className="h-7 w-7" />
          </div>
          <div>
            <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-orange-500 to-blue-500 bg-clip-text text-transparent">
              Emberpath
            </span>
            <p className="text-[10px] tracking-widest font-bold uppercase opacity-60">IoT Building Escape Mesh</p>
          </div>
        </div>

        <h1 className="mt-8 text-3xl font-extrabold tracking-tight leading-tight max-w-md">
          Hệ Thống Chỉ Dẫn Sơ Tán
          <span className="block mt-1 bg-gradient-to-r from-orange-500 to-blue-600 bg-clip-text text-transparent">
            Thông Minh & An Toàn
          </span>
        </h1>
      </div>

      {/* Animated SVG Mockup of Evacuation Path */}
      <div className="relative z-10 flex items-center justify-center my-6">
        <div
          className={`w-full max-w-[360px] p-6 rounded-3xl border shadow-2xl backdrop-blur-md transition-all ${
            isDark ? 'bg-slate-950/40 border-slate-800/80 shadow-slate-950/50' : 'bg-white/50 border-slate-200/80 shadow-slate-100'
          }`}
        >
          <svg viewBox="0 0 400 240" className="w-full h-auto">
            {/* Grid Pattern inside Mockup */}
            <defs>
              <pattern id="login-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill={isDark ? '#334155' : '#cbd5e1'} opacity="0.3" />
              </pattern>
            </defs>
            <rect width="400" height="240" fill="url(#login-grid)" rx="16" />

            {/* Room Borders */}
            <path
              d="M 50 40 L 350 40 L 350 200 L 50 200 Z M 150 40 L 150 120 M 150 150 L 150 200 M 270 40 L 270 200"
              stroke={isDark ? '#1e293b' : '#e2e8f0'}
              strokeWidth="2"
              strokeDasharray="4 4"
              fill="none"
            />

            {/* Connection Network Lines */}
            <path
              d="M 100 80 L 210 80 L 310 80 L 310 160 L 210 160 L 100 160 Z"
              stroke={isDark ? '#334155' : '#cbd5e1'}
              strokeWidth="1.5"
              fill="none"
            />

            {/* Danger Alert Area (Pulsating Fire Circle) */}
            <g>
              <motion.circle
                cx="310"
                cy="80"
                r="24"
                fill="#ef4444"
                opacity="0.15"
                animate={{ scale: [1, 1.25, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.circle
                cx="310"
                cy="80"
                r="12"
                fill="#ef4444"
                opacity="0.3"
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
              />
              <circle cx="310" cy="80" r="5" fill="#ef4444" />
            </g>

            {/* Evacuation Safe Routing Line (Dynamic Green Path) */}
            <motion.path
              d="M 100 80 L 210 80 L 210 160 L 100 160"
              stroke="#10b981"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              strokeDasharray="12 10"
              animate={{ strokeDashoffset: [-22, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />

            {/* Connected IoT Nodes (Green dots) */}
            <circle cx="100" cy="80" r="6" fill="#10b981" />
            <circle cx="210" cy="80" r="6" fill="#10b981" />
            <circle cx="210" cy="160" r="6" fill="#10b981" />
            <circle cx="100" cy="160" r="6" fill="#10b981" />
            <circle cx="310" cy="160" r="6" fill="#3b82f6" />

            {/* Flow Indicators / Labels */}
            <rect x="70" y="55" width="60" height="16" rx="8" fill="#10b981" fillOpacity="0.15" />
            <text x="100" y="66" fill="#10b981" fontSize="8" fontWeight="bold" textAnchor="middle">
              BẮT ĐẦU
            </text>

            <rect x="70" y="175" width="60" height="16" rx="8" fill="#10b981" fillOpacity="0.15" />
            <text x="100" y="186" fill="#10b981" fontSize="8" fontWeight="bold" textAnchor="middle">
              LỐI RA
            </text>

            {/* Exit door icon mock */}
            <path
              d="M 50 150 L 50 170 M 50 155 L 42 155 L 42 165 L 50 165"
              stroke="#10b981"
              strokeWidth="2"
              fill="none"
            />
          </svg>
        </div>
      </div>

      {/* Benefits List */}
      <div className="space-y-5 relative z-10">
        {benefits.map((b, i) => {
          const Icon = b.icon;
          return (
            <div key={i} className="flex gap-4 items-start max-w-md">
              <div className={`p-2.5 rounded-xl shrink-0 ${b.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold">{b.title}</h4>
                <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {b.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Copy */}
      <div className="text-xs opacity-50 relative z-10">
        &copy; {new Date().getFullYear()} Emberpath Safety Inc.
      </div>
    </div>
  );
}
