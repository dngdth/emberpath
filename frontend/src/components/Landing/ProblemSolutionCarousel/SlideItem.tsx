import React from 'react';

interface SlideItemProps {
  item: {
    title: string;
    problem: string;
    image: string;
  };
  isActive: boolean;
  isDark: boolean;
  index: number;
  totalItems: number;
}

export function SlideItem({ item, isActive, isDark, index, totalItems }: SlideItemProps) {
  return (
    <div
      className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
        isActive ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
      }`}
    >
      {/* Background Image with Zoom Effect */}
      <img
        src={item.image}
        alt={item.title}
        className={`w-full h-full object-cover transition-transform duration-[6000ms] ease-out ${
          isActive ? 'scale-105' : 'scale-100'
        }`}
      />

      {/* Dynamic Gradient Overlay for Readability */}
      <div
        className={`absolute inset-0 bg-gradient-to-t via-transparent to-transparent transition-colors duration-300 ${
          isDark
            ? 'from-slate-950/95 via-slate-950/50'
            : 'from-white/95 via-white/50'
        }`}
      />

      {/* Slide Content Overlay - Only Title and Description directly on image */}
      <div className="absolute inset-0 z-20 flex flex-col justify-end p-6 sm:p-10 md:p-12 pb-24 sm:pb-24 md:pb-28">
        <div className="max-w-3xl transition-all duration-700">
          <span
            className={`text-xs md:text-sm font-bold uppercase tracking-widest inline-block mb-3 px-3.5 py-1 rounded-full border transition-colors duration-300 ${
              isDark
                ? 'text-[#3B82F6] bg-[#3B82F6]/10 border-[#3B82F6]/20'
                : 'text-blue-600 bg-blue-50 border-blue-200'
            }`}
          >
            Thử thách {index + 1} / {totalItems}
          </span>
          <h3
            className={`text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4 transition-colors duration-300 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            {item.title}
          </h3>
          <p
            className={`text-sm sm:text-base md:text-lg lg:text-xl leading-relaxed font-medium transition-colors duration-300 max-w-2xl ${
              isDark ? 'text-slate-200' : 'text-slate-700'
            }`}
          >
            {item.problem}
          </p>
        </div>
      </div>
    </div>
  );
}
