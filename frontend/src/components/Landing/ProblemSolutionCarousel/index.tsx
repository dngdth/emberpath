import { ScrollReveal } from '../ScrollReveal';
import { problemSolutionItems } from './data';
import { useCarousel } from './useCarousel';
import { SlideItem } from './SlideItem';
import { SlideControls } from './SlideControls';
import { SolutionSection } from './SolutionSection';

interface ProblemSolutionProps {
  isDark: boolean;
}

export function ProblemSolution({ isDark }: ProblemSolutionProps) {
  const {
    activeIndex,
    progress,
    handlePrev,
    handleNext,
    handleDotClick,
  } = useCarousel(problemSolutionItems.length, 3000);

  return (
    <>
      {/* Problem Section (Carousel) */}
      <section
        id="problem-solution"
        className={`py-20 md:py-28 transition-colors duration-300 ${
          isDark ? 'bg-[#0F172A]' : 'bg-[#F8FAFC]'
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <ScrollReveal>
              <p className="text-sm font-bold uppercase tracking-wider text-[#3B82F6]">
                Hạn Chế & Điểm Yếu
              </p>
              <h2
                className={`mt-2 text-3xl md:text-4xl font-bold tracking-tight transition-colors duration-300 ${
                  isDark ? 'text-white' : 'text-slate-950'
                }`}
              >
                Khuyết Điểm Của Phòng Cháy Truyền Thống
              </h2>
              <p
                className={`mt-4 text-base md:text-lg leading-relaxed transition-colors duration-300 ${
                  isDark ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                Hệ thống phòng cháy chữa cháy kiểu cũ thường thụ động, thiếu thông tin thời gian thực và gây nhiều trễ nải nguy hiểm khi xảy ra sự cố.
              </p>
            </ScrollReveal>
          </div>

          {/* Carousel Container */}
          <ScrollReveal>
            <div
              className={`relative overflow-hidden rounded-[32px] border shadow-2xl transition-all duration-500 h-[750px] sm:h-[700px] md:h-[650px] lg:h-[600px] ${
                isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
              }`}
            >
              {/* Background Slides with overlays */}
              {problemSolutionItems.map((item, index) => (
                <SlideItem
                  key={index}
                  item={item}
                  isActive={activeIndex === index}
                  isDark={isDark}
                  index={index}
                  totalItems={problemSolutionItems.length}
                />
              ))}

              {/* Slider Controls (dots, arrows, progress timer) */}
              <SlideControls
                itemCount={problemSolutionItems.length}
                activeIndex={activeIndex}
                progress={progress}
                isDark={isDark}
                onPrev={handlePrev}
                onNext={handleNext}
                onDotClick={handleDotClick}
              />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Solutions Grid Section */}
      <SolutionSection isDark={isDark} />
    </>
  );
}
