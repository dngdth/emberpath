import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SlideControlsProps {
  itemCount: number;
  activeIndex: number;
  progress: number;
  isDark: boolean;
  onPrev: () => void;
  onNext: () => void;
  onDotClick: (index: number) => void;
}

export function SlideControls({
  itemCount,
  activeIndex,
  progress,
  isDark,
  onPrev,
  onNext,
  onDotClick,
}: SlideControlsProps) {
  return (
    <>
      {/* Navigation Controls Overlay */}
      <div className="absolute bottom-6 left-6 right-6 sm:left-10 sm:right-10 md:left-12 md:right-12 z-30 flex items-center justify-between pointer-events-auto">
        {/* Dots Indicator */}
        <div className="flex gap-2">
          {Array.from({ length: itemCount }).map((_, index) => (
            <button
              key={index}
              onClick={() => onDotClick(index)}
              className={`h-2.5 rounded-full transition-all duration-500 ${
                activeIndex === index
                  ? `w-8 ${isDark ? 'bg-[#3B82F6]' : 'bg-blue-600'}`
                  : `w-2.5 ${
                      isDark ? 'bg-white/40 hover:bg-white/60' : 'bg-slate-300 hover:bg-slate-400'
                    }`
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Navigation Arrows */}
        <div className="flex gap-3">
          <button
            onClick={onPrev}
            className={`flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-sm transition-all duration-300 active:scale-95 ${
              isDark
                ? 'border-white/20 bg-white/10 text-white hover:bg-white/20 hover:border-white/40'
                : 'border-slate-200 bg-white/70 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm'
            }`}
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={onNext}
            className={`flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-sm transition-all duration-300 active:scale-95 ${
              isDark
                ? 'border-white/20 bg-white/10 text-white hover:bg-white/20 hover:border-white/40'
                : 'border-slate-200 bg-white/70 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm'
            }`}
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Timer Progress Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 h-1.5 z-30 transition-colors duration-300 ${
          isDark ? 'bg-white/10' : 'bg-slate-100'
        }`}
      >
        <div
          className={`h-full bg-gradient-to-r transition-all duration-30 ease-linear ${
            isDark ? 'from-[#3B82F6] to-cyan-400' : 'from-blue-600 to-cyan-400'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </>
  );
}
