import { create } from 'zustand';

interface ThemeState {
  darkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (darkMode: boolean) => void;
}

const getInitialTheme = (): boolean => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) {
      return saved === 'true';
    }
  }
  return true; // Default to dark mode for the premium tech aesthetic
};

export const useThemeStore = create<ThemeState>((set) => ({
  darkMode: getInitialTheme(),
  toggleDarkMode: () =>
    set((state) => {
      const newMode = !state.darkMode;
      if (typeof window !== 'undefined') {
        localStorage.setItem('darkMode', String(newMode));
      }
      return { darkMode: newMode };
    }),
  setDarkMode: (darkMode) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('darkMode', String(darkMode));
    }
    set({ darkMode });
  },
}));
