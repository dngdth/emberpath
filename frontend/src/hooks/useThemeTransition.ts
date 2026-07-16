import { useThemeStore } from '../store/themeStore';
import React from 'react';

export const useThemeTransition = () => {
  const { darkMode, toggleDarkMode } = useThemeStore();

  const toggleWithTransition = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      toggleDarkMode();
      return;
    }

    const doc = document as any;
    const isAppearanceTransition =
      doc.startViewTransition &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!isAppearanceTransition) {
      toggleDarkMode();
      // Also update the class on documentElement directly so it works on non-transition browsers
      const root = document.documentElement;
      if (!darkMode) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      return;
    }

    let x = event.clientX;
    let y = event.clientY;

    // Fallback to center of the button if triggered by keyboard/programmatically
    if (x === 0 && y === 0) {
      const rect = event.currentTarget.getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    }

    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const transition = doc.startViewTransition(() => {
      // 1. Toggle state in store
      toggleDarkMode();

      // 2. Synchronously update the DOM class so the browser captures the transition states
      const root = document.documentElement;
      if (!darkMode) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    });

    transition.ready.then(() => {
      const clipPath = [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${endRadius}px at ${x}px ${y}px)`,
      ];

      document.documentElement.animate(
        {
          clipPath: clipPath,
        },
        {
          duration: 500,
          easing: 'ease-in-out',
          pseudoElement: '::view-transition-new(root)',
        }
      );
    });
  };

  return {
    darkMode,
    toggleWithTransition,
  };
};
