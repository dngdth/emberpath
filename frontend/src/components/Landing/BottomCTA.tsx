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
      className={`py-20 transition-colors duration-300 ${
        isDark ? 'bg-[#0F172A]' : 'bg-white'
      }`}
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div
            className={`relative rounded-3xl overflow-hidden px-8 py-12 md:py-16 text-center border shadow-2xl ${
              isDark
                ? 'bg-gradient-to-r from-[#1E293B] to-[#0F172A] border-slate-800'
                : 'bg-gradient-to-r from-blue-500 to-indigo-600 border-transparent text-white'
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
                className={`text-3xl md:text-4xl font-extrabold tracking-tight ${
                  isDark ? 'text-white' : 'text-white'
                }`}
              >
                Sẵn Sàng Nâng Cấp An Toàn Cho Tòa Nhà Của Bạn?
              </h2>

              {/* Subtitle */}
              <p
                className={`text-base md:text-lg leading-relaxed ${
                  isDark ? 'text-slate-300' : 'text-white/80'
                }`}
              >
                Đăng ký tài khoản Emberpath ngay hôm nay để quản lý sơ đồ tầng, tích hợp các cảm biến IoT và bảo đảm an toàn sơ tán khẩn cấp tự động cho tòa nhà của bạn.
              </p>

              {/* Action Button */}
              <div className="pt-4">
                <a
                  href={token ? '/dashboard' : '/register'}
                  className={`inline-flex items-center gap-2 rounded-xl px-8 py-4 text-base font-bold transition-all hover:scale-[1.02] shadow-xl ${
                    isDark
                      ? 'bg-[#F97316] text-white hover:bg-orange-600 shadow-orange-500/15'
                      : 'bg-white text-indigo-600 hover:bg-indigo-50 shadow-black/10'
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
