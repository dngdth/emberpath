import { useEffect } from 'react';
import { AppRouter } from './router';
import { useAuthStore } from './store/authStore';

export default function App() {
  const { bootstrap } = useAuthStore();

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return <AppRouter />;
}
