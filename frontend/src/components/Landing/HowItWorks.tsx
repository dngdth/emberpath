import { Flame, Bell, Route } from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';

interface HowItWorksProps {
  isDark: boolean;
}

export function HowItWorks({ isDark }: HowItWorksProps) {
  const steps = [
    {
      step: '01',
      icon: Flame,
      title: 'Cảm biến khói kích hoạt',
      subtitle: 'Báo động cảm biến IoT',
      description: 'Cảm biến IoT (MQ2/Nhiệt độ) đặt tại các vị trí trong tòa nhà phát hiện nồng độ khói hoặc nhiệt độ tăng cao vượt ngưỡng an toàn.',
      color: 'text-red-500 bg-red-500/10 border-red-500/20',
      glow: 'shadow-red-500/10',
    },
    {
      step: '02',
      icon: Bell,
      title: 'Cảnh báo WebSocket',
      subtitle: 'Truyền dẫn thời gian thực',
      description: 'Ngay lập tức, tín hiệu khẩn cấp được đẩy lên Cloud Server và phát sóng thời gian thực qua giao thức WebSocket đến các máy khách admin.',
      color: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
      glow: 'shadow-orange-500/10',
    },
    {
      step: '03',
      icon: Route,
      title: 'Tự động vẽ đường sơ tán',
      subtitle: 'Thuật toán Dijkstra chỉ lối',
      description: 'Thuật toán Dijkstra chạy trực tiếp trên bản đồ tòa nhà, cô lập khu vực cháy và tự động vẽ mũi tên chỉ dẫn lối thoát an toàn nhất.',
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
      glow: 'shadow-emerald-500/10',
    },
  ];

  return (
    <section
      id="how-it-works"
      className={`py-20 md:py-28 transition-colors duration-300 ${
        isDark ? 'bg-[#0F172A]' : 'bg-[#F8FAFC]'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <ScrollReveal>
            <p className="text-sm font-bold uppercase tracking-wider text-[#3B82F6]">
              Cách thức vận hành
            </p>
            <h2 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight">
              Quy trình hoạt động
            </h2>
            <p
              className={`mt-4 text-base md:text-lg ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              Hành trình xử lý sự cố khẩn cấp tự động và tức thời của hệ thống Emberpath.
            </p>
          </ScrollReveal>
        </div>

        {/* Timeline Layout */}
        <div className="relative">
          {/* Connecting Line (Desktop) */}
          <div className="hidden lg:block absolute top-[90px] left-[15%] right-[15%] h-0.5 border-t border-dashed border-slate-300 dark:border-slate-700 z-0" />

          {/* Steps Grid */}
          <div className="grid gap-12 lg:grid-cols-3 relative z-10">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <ScrollReveal
                  key={step.step}
                  delayClass={
                    index === 1 ? 'delay-100' : index === 2 ? 'delay-200' : ''
                  }
                >
                  <div className="flex flex-col items-center text-center px-4">
                    {/* Circle Icon Container */}
                    <div
                      className={`relative flex h-24 w-24 items-center justify-center rounded-full border shadow-xl transition-all duration-300 hover:scale-105 mb-6 ${step.color} ${step.glow}`}
                    >
                      {/* Step Number Badge */}
                      <span className="absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#3B82F6] text-[12px] font-bold text-white shadow-md">
                        {step.step}
                      </span>
                      <Icon className="h-10 w-10" />
                    </div>

                    {/* Step Title & Description */}
                    <h3 className="text-xl font-bold tracking-tight mb-1">{step.title}</h3>
                    <p className="text-sm font-semibold text-[#3B82F6] mb-3">{step.subtitle}</p>
                    <p
                      className={`text-sm leading-relaxed max-w-sm ${
                        isDark ? 'text-slate-300' : 'text-slate-600'
                      }`}
                    >
                      {step.description}
                    </p>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
