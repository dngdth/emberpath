import { ScrollReveal } from '../ScrollReveal';
import { problemSolutionItems } from './data';

interface SolutionSectionProps {
  isDark: boolean;
}

export function SolutionSection({ isDark }: SolutionSectionProps) {
  return (
    <section
      id="solutions-grid"
      className={`py-20 md:py-24 border-t transition-colors duration-300 ${
        isDark ? 'bg-[#0B0F19] border-slate-800' : 'bg-[#F1F5F9] border-slate-200'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <ScrollReveal>
            <p className="text-sm font-bold uppercase tracking-wider text-emerald-500">
              Giải Pháp Emberpath
            </p>
            <h2
              className={`mt-2 text-3xl md:text-4xl font-bold tracking-tight transition-colors duration-300 ${
                isDark ? 'text-white' : 'text-slate-950'
              }`}
            >
              Hệ Thống Phòng Thủ Phòng Cháy Thông Minh
            </h2>
            <p
              className={`mt-4 text-base md:text-lg leading-relaxed transition-colors duration-300 ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              Chúng tôi thay thế sự thụ động bằng các công nghệ cốt lõi thời gian thực, đảm bảo tính mạng con người và tài sản trong mọi kịch bản khẩn cấp.
            </p>
          </ScrollReveal>
        </div>

        {/* 4-Column Solutions Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {problemSolutionItems.map((item, idx) => {
            const IconComponent = item.solutionIcon;
            return (
              <ScrollReveal key={idx} delayClass={`delay-${idx * 100}`}>
                <div
                  className={`group flex flex-col p-6 h-full rounded-2xl border transition-all duration-300 hover:-translate-y-1 ${
                    isDark
                      ? 'border-slate-800 bg-slate-900/60 hover:bg-slate-900 hover:border-emerald-500/30 text-white hover:shadow-2xl hover:shadow-emerald-500/5'
                      : 'border-slate-200/80 bg-white hover:border-emerald-500/30 text-slate-800 shadow-md shadow-slate-100 hover:shadow-xl hover:shadow-emerald-100/35'
                  }`}
                >
                  {/* Glowing Icon Wrapper */}
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl mb-5 transition-transform duration-300 group-hover:scale-110 ${
                      isDark
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    }`}
                  >
                    <IconComponent className="h-6 w-6" />
                  </div>

                  {/* Solution Title */}
                  <h3
                    className={`text-lg font-bold mb-3 tracking-tight transition-colors duration-300 ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {item.solutionTitle}
                  </h3>

                  {/* Solution Description */}
                  <p
                    className={`text-sm leading-relaxed font-medium transition-colors duration-300 ${
                      isDark ? 'text-slate-400' : 'text-slate-600'
                    }`}
                  >
                    {item.solution}
                  </p>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
