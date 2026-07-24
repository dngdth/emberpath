import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { ScrollReveal } from './ScrollReveal';

interface BottomCTAProps {
  isDark: boolean;
}

export function BottomCTA({ isDark }: BottomCTAProps) {
  const { token } = useAuthStore();

  return (
    <section
      className={`py-20 transition-colors duration-300 ${isDark ? 'bg-[#0F172A]' : 'bg-white'
        }`}
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div
            className={`relative rounded-3xl overflow-hidden px-8 py-12 md:py-16 text-center border shadow-2xl ${isDark
              ? 'bg-gradient-to-r from-[#486188] to-[#8c9cc2] border-slate-800'
              : 'bg-gradient-to-r from-[#9fb6f5] to-[#1954b3] border-transparent text-white'
              }`}
          >
            {/* Background elements */}
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/5 rounded-full blur-xl pointer-events-none" />
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-orange-500/10 rounded-full blur-xl pointer-events-none" />

            <div className="relative z-10 max-w-3xl mx-auto space-y-6">
              {/* Badge Icon */}
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg shadow-orange-500/20 mx-auto">
                <ShieldCheck className="h-6 w-6" />
              </div>

              {/* Title */}
              <h2
                className={`text-3xl md:text-4xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-white'
                  }`}
              >
                Sẵn Sàng Nâng Cấp An Toàn Cho Tòa Nhà Của Bạn?
              </h2>

              {/* Subtitle */}
              <p
                className={`text-base md:text-lg leading-relaxed ${isDark ? 'text-slate-300' : 'text-white/80'
                  }`}
              >
                Đăng ký tài khoản Emberpath ngay hôm nay để quản lý sơ đồ tầng, tích hợp các cảm biến IoT và bảo đảm an toàn sơ tán khẩn cấp tự động cho tòa nhà của bạn.
              </p>

              {/* Action Button */}
              <div className="pt-4">
                <a
                  href={token ? '/dashboard' : '#consultation'}
                  onClick={(e) => {
                    if (!token) {
                      e.preventDefault();
                      const element = document.querySelector('#consultation');
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth' });
                      }
                    }
                  }}
                  className={`inline-flex items-center gap-2 rounded-xl px-8 py-4 text-base font-bold transition-all hover:scale-[1.03] active:scale-95 shadow-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white hover:from-orange-600 hover:to-orange-700 duration-300 ${isDark
                    ? 'shadow-orange-500/25 border border-orange-500/10'
                    : 'shadow-orange-600/30 border border-orange-400/20'
                    }`}
                >
                  {token ? 'Vào Bảng Điều Khiển' : 'Đăng ký ngay'}
                  <ArrowRight className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
