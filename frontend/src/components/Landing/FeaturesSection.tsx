import { LayoutDashboard, Move, Radio, Compass } from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';

interface FeaturesSectionProps {
  isDark: boolean;
}

export function FeaturesSection({ isDark }: FeaturesSectionProps) {
  const features = [
    {
      icon: LayoutDashboard,
      title: 'Bảng điều khiển theo thời gian thực',
      description: 'Hiển thị dữ liệu nhiệt độ và chỉ số khói (MQ2) từ các cảm biến IoT trực tiếp lên màn hình quản trị. Theo dõi trạng thái hoạt động của thiết bị tức thời.',
      badge: 'Giám sát thời gian thực',
      color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    },
    {
      icon: Move,
      title: 'Bản đồ tương tác kéo-thả',
      description: 'Công cụ vẽ sơ đồ tầng tích hợp, cho phép quản trị viên tải lên sơ đồ phòng và kéo thả định vị các cảm biến khói, đầu báo cháy một cách trực quan.',
      badge: 'Bản đồ tương tác',
      color: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
    },
    {
      icon: Radio,
      title: 'Cảnh báo thông minh WebSocket',
      description: 'Khi phát hiện khói vượt ngưỡng, hệ thống lập tức phát tín hiệu khẩn cấp qua kênh truyền WebSocket tốc độ cao đến toàn bộ quản trị viên và người trong tòa nhà.',
      badge: 'Cảnh báo tức thời',
      color: 'text-red-500 bg-red-500/10 border-red-500/20',
    },
    {
      icon: Compass,
      title: 'Định tuyến sơ tán Dijkstra',
      description: 'Tự động tính toán đường đi thoát hiểm tối ưu nhất dựa trên thuật toán Dijkstra, tránh các phòng/tầng đang có báo động cháy để dẫn hướng sơ tán an sau.',
      badge: 'Định tuyến sơ tán',
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    },
  ];

  return (
    <section
      id="features"
      className={`py-20 md:py-28 transition-colors duration-300 ${
        isDark ? 'bg-[#0F172A]' : 'bg-white'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <ScrollReveal>
            <p className="text-sm font-bold uppercase tracking-wider text-[#3B82F6]">
              Công nghệ tiên phong
            </p>
            <h2 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight">
              Tính năng cốt lõi
            </h2>
            <p
              className={`mt-4 text-base md:text-lg ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              Hệ sinh thái giải pháp tích hợp phần cứng và phần mềm toàn diện cho công tác an toàn phòng cháy chữa cháy thông minh.
            </p>
          </ScrollReveal>
        </div>

        {/* Features Grid (2x2 on desktop, 1x1 on mobile) */}
        <div className="grid gap-8 md:grid-cols-2">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <ScrollReveal
                key={feature.title}
                delayClass={index % 2 === 1 ? 'delay-100' : ''}
              >
                <div
                  className={`group h-full p-8 rounded-3xl border transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 relative overflow-hidden ${
                    isDark
                      ? 'bg-[#1E293B] border-slate-800 hover:border-slate-700'
                      : 'bg-gradient-to-br from-white to-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Subtle hover background highlight */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl group-hover:scale-150 transition-all duration-700 pointer-events-none" />

                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    {/* Icon Container */}
                    <div
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border transition-all duration-300 group-hover:scale-110 ${feature.color}`}
                    >
                      <Icon className="h-7 w-7" />
                    </div>

                    {/* Text Container */}
                    <div className="space-y-3 text-left">
                      <span
                        className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                          isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {feature.badge}
                      </span>
                      <h3 className="text-xl font-bold tracking-tight">
                        {feature.title}
                      </h3>
                      <p
                        className={`text-sm leading-relaxed ${
                          isDark ? 'text-slate-300' : 'text-slate-600'
                        }`}
                      >
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
