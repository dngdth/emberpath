import { useState, useEffect } from 'react';

export function useCarousel(itemCount: number, durationMs: number = 3000) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const updateIntervalMs = 30;
    const increment = (updateIntervalMs / durationMs) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setActiveIndex((prevIndex) => (prevIndex + 1) % itemCount);
          return 0;
        }
        return prev + increment;
      });
    }, updateIntervalMs);

    return () => clearInterval(timer);
  }, [itemCount, durationMs]);

  const handlePrev = () => {
    setActiveIndex((prev) => (prev === 0 ? itemCount - 1 : prev - 1));
    setProgress(0);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % itemCount);
    setProgress(0);
  };

  const handleDotClick = (index: number) => {
    setActiveIndex(index);
    setProgress(0);
  };

  return {
    activeIndex,
    progress,
    handlePrev,
    handleNext,
    handleDotClick,
  };
}
