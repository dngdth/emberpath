import { ReactNode } from 'react';
import { useScrollReveal } from '../../hooks/useScrollReveal';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delayClass?: string; // e.g. 'delay-100', 'delay-200'
}

export function ScrollReveal({ children, className = '', delayClass = '' }: ScrollRevealProps) {
  const { ref, isVisible } = useScrollReveal();

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-out transform ${
        isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95 pointer-events-none'
      } ${delayClass} ${className}`}
    >
      {children}
    </div>
  );
}
