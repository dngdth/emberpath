import { useEffect } from 'react';
import { AppRouter } from './router';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import { ImpersonationBanner } from './components/Admin/ImpersonationBanner';

export default function App() {
  const { bootstrap } = useAuthStore();
  const { darkMode } = useThemeStore();

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  // Sync dark class on documentElement globally
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  return <><ImpersonationBanner /><AppRouter /></>;
}
