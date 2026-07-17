import { ShieldAlert, ArrowRight, Activity, Wifi, Zap } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface HeroSectionProps {
  isDark: boolean;
}

export function HeroSection({ isDark }: HeroSectionProps) {
  const { token } = useAuthStore();

  const handleLearnMore = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const element = document.querySelector('#problem-solution');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      className={`relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden transition-colors duration-300 ${
        isDark
          ? 'bg-[#0F172A] text-white'
          : 'bg-gradient-to-b from-blue-50/50 to-white text-slate-800'
      }`}
    >
      {/* Background decorations */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid gap-12 lg:grid-cols-12 items-center">
          {/* Left: Text & CTAs */}
          <div className="lg:col-span-6 flex flex-col justify-center text-left space-y-6">
            {/* Tagline Badge */}
            <div className="inline-flex items-center gap-2 self-start rounded-full px-3 py-1 text-xs font-semibold bg-[#F97316]/10 text-[#F97316]">
              <ShieldAlert className="h-4 w-4" />
              <span>Thế hệ IoT An Toàn Tòa Nhà Mới</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              Emberpath – Nền tảng{' '}
              <span className="bg-gradient-to-r from-[#F97316] to-[#3B82F6] bg-clip-text text-transparent">
                Giám sát An toàn
              </span>{' '}
              & Sơ tán Thông minh cho Tòa nhà.
            </h1>

            {/* Subtitle */}
            <p
              className={`text-lg sm:text-xl leading-relaxed ${
                isDark ? 'text-slate-300' : 'text-slate-600'
              }`}
            >
              Tích hợp IoT, giám sát cảm biến khói thời gian thực và thuật toán định tuyến Dijkstra tự động vẽ sơ đồ thoát hiểm an toàn nhất ngay khi xảy ra sự cố.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <a
                href={token ? '/dashboard' : '/register'}
                className="inline-flex items-center gap-2 rounded-xl bg-[#F97316] hover:bg-orange-600 text-white px-6 py-3.5 text-base font-bold transition-all hover:scale-[1.02] shadow-lg shadow-orange-500/20"
              >
                {token ? 'Vào Bảng Điều Khiển' : 'Bắt đầu ngay'}
                <ArrowRight className="h-5 w-5" />
              </a>
              <a
                href="#problem-solution"
                onClick={handleLearnMore}
                className={`inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-base font-semibold border transition-all ${
                  isDark
                    ? 'border-slate-800 bg-slate-900/60 text-slate-200 hover:bg-slate-800'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Tìm hiểu thêm
              </a>
            </div>
          </div>

          {/* Right: Highly Interactive SVG Mockup */}
          <div className="lg:col-span-6 flex justify-center relative">
            {/* Interactive badgse floating */}
            <div className="absolute -top-4 -left-4 z-20 flex items-center gap-2 rounded-2xl bg-emerald-500/10 backdrop-blur-md border border-emerald-500/20 p-3 shadow-lg animate-bounce duration-1000">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white">
                <Wifi className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider">Cảm Biến IoT</p>
                <p className="text-xs font-bold text-slate-800 dark:text-white">Đang kết nối</p>
              </div>
            </div>

            <div className="absolute bottom-10 -right-4 z-20 flex items-center gap-2 rounded-2xl bg-orange-500/10 backdrop-blur-md border border-orange-500/20 p-3 shadow-lg animate-pulse">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F97316] text-white">
                <Zap className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="text-[10px] uppercase font-bold text-[#F97316] tracking-wider">Định Tuyến</p>
                <p className="text-xs font-bold text-slate-800 dark:text-white">Đang hoạt động</p>
              </div>
            </div>

            {/* Laptop SVG Container */}
            <div className="w-full max-w-[520px] filter drop-shadow-2xl">
              <svg viewBox="0 0 800 600" className="w-full h-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Laptop Body & Screen Border */}
                <rect x="80" y="60" width="640" height="420" rx="20" fill={isDark ? "#1E293B" : "#F1F5F9"} stroke={isDark ? "#475569" : "#CBD5E1"} strokeWidth="12" />
                
                {/* Laptop Screen Content Area */}
                <rect x="92" y="72" width="616" height="396" fill={isDark ? "#0F172A" : "#FFFFFF"} />
                
                {/* Floor Plan Layout */}
                <g opacity="0.85">
                  {/* Grid Lines */}
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke={isDark ? "#334155" : "#E2E8F0"} strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect x="92" y="72" width="616" height="396" fill="url(#grid)" />
                  
                  {/* Building Outer Wall */}
                  <rect x="140" y="120" width="520" height="300" rx="10" stroke={isDark ? "#475569" : "#94A3B8"} strokeWidth="4" />
                  
                  {/* Internal Rooms */}
                  {/* Room 1: Office A */}
                  <rect x="140" y="120" width="160" height="150" stroke={isDark ? "#475569" : "#94A3B8"} strokeWidth="3" />
                  {/* Room 2: Office B */}
                  <rect x="300" y="120" width="200" height="150" stroke={isDark ? "#475569" : "#94A3B8"} strokeWidth="3" fill="red" fillOpacity="0.04" />
                  {/* Room 3: Hallway */}
                  <rect x="140" y="270" width="520" height="60" stroke={isDark ? "#475569" : "#94A3B8"} strokeWidth="3" />
                  {/* Room 4: Storage */}
                  <rect x="500" y="120" width="160" height="150" stroke={isDark ? "#475569" : "#94A3B8"} strokeWidth="3" />
                  {/* Room 5: Server Room */}
                  <rect x="140" y="330" width="220" height="90" stroke={isDark ? "#475569" : "#94A3B8"} strokeWidth="3" />
                  {/* Room 6: Lounge */}
                  <rect x="360" y="330" width="300" height="90" stroke={isDark ? "#475569" : "#94A3B8"} strokeWidth="3" />
                </g>

                {/* Smoke Alarm Sensor Alert (Room 2) */}
                <g className="animate-pulse">
                  <circle cx="400" cy="195" r="32" fill="#EF4444" fillOpacity="0.25" />
                  <circle cx="400" cy="195" r="18" fill="#EF4444" fillOpacity="0.5" />
                  <circle cx="400" cy="195" r="8" fill="#EF4444" />
                </g>

                {/* Normal Sensors (Green) */}
                <circle cx="220" cy="195" r="6" fill="#22C55E" />
                <circle cx="580" cy="195" r="6" fill="#22C55E" />
                <circle cx="250" cy="375" r="6" fill="#22C55E" />
                <circle cx="510" cy="375" r="6" fill="#22C55E" />

                {/* Dijkstra Evacuation Route (Safe Path in Green) */}
                {/* Drawn from Room 1 (Office A) out to Hallway, and then out the main East Exit */}
                {/* Dash animation simulates fluid evacuation path */}
                <path
                  d="M 220 195 L 220 300 L 640 300"
                  stroke="#22C55E"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="16, 12"
                  className="animate-[dash_1.5s_linear_infinite]"
                />
                
                {/* Evacuation Exit Indicator (Green Arrow at exit) */}
                <g>
                  <circle cx="640" cy="300" r="16" fill="#22C55E" />
                  <path d="M 635 292 L 645 300 L 635 308" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </g>

                {/* Label Badges on Map */}
                <rect x="360" y="85" width="80" height="24" rx="12" fill="#EF4444" />
                <text x="400" y="101" fill="white" fontSize="10" fontWeight="bold" textAnchor="middle">BÁO CHÁY</text>

                <rect x="525" y="245" width="90" height="24" rx="12" fill="#22C55E" />
                <text x="570" y="261" fill="white" fontSize="10" fontWeight="bold" textAnchor="middle">ĐƯỜNG SƠ TÁN</text>

                {/* Fire Animation Overlay (SVG Fire Path) */}
                <path
                  d="M 390 205 C 390 185, 396 175, 400 170 C 404 175, 410 185, 410 205 C 410 215, 390 215, 390 205 Z"
                  fill="#F97316"
                  className="animate-bounce"
                />

                {/* Laptop Keyboard Base & Touchpad */}
                {/* Keyboard body */}
                <path d="M40 480 L760 480 L800 520 L0 520 Z" fill={isDark ? "#334155" : "#E2E8F0"} />
                <path d="M0 520 L10 535 L790 535 L800 520 Z" fill={isDark ? "#1E293B" : "#CBD5E1"} />
                {/* Touchpad */}
                <rect x="350" y="492" width="100" height="22" rx="4" fill={isDark ? "#1E293B" : "#94A3B8"} opacity="0.4" />
                {/* Keyboard line */}
                <line x1="80" y1="488" x2="720" y2="488" stroke={isDark ? "#475569" : "#CBD5E1"} strokeWidth="4" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Tailwind global keyframe for stroke-dashoffset animation */}
      <style>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -28;
          }
        }
      `}</style>
    </section>
  );
}
