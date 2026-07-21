import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { Shield } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { SwitchTheme } from '../components/UI/SwitchTheme';
import { LoginBrandPanel } from '../components/Login/LoginBrandPanel';
import { LoginForm } from '../components/Login/LoginForm';
import { DemoAccounts } from '../components/Login/DemoAccounts';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, loading } = useAuthStore();
  const { darkMode } = useThemeStore();
  
  const [email, setEmail] = useState('admin@buildinga.demo');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');

  // Set page title
  useEffect(() => {
    document.title = 'Emberpath – Đăng nhập hệ thống';
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');

    try {
      await login(email, password);
      navigate(useAuthStore.getState().user?.role === 'super_admin' ? '/admin' : '/dashboard');
    } catch (err) {
      const message =
        (err as AxiosError<{ detail?: string }>).response?.data?.detail ||
        'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.';
      setError(message);
    }
  }

  const handleSelectDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
  };

  const isDark = darkMode;

  return (
    <div
      className={`min-h-screen w-full flex items-center justify-center transition-colors duration-300 p-4 sm:p-6 lg:p-8 relative ${
        isDark ? 'dark bg-[#0F172A] text-slate-100' : 'bg-slate-50 text-slate-800'
      }`}
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Floating Switch Theme Button */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <SwitchTheme />
      </div>

      {/* Main Container Card (Split Screen) */}
      <div
        className={`w-full max-w-5xl grid lg:grid-cols-[1.1fr_1fr] rounded-[32px] border shadow-2xl overflow-hidden transition-all duration-300 ${
          isDark
            ? 'bg-slate-900/50 border-slate-800/80 shadow-slate-950/40 backdrop-blur-sm'
            : 'bg-white border-slate-200/80 shadow-slate-200/50'
        }`}
      >
        {/* Left Side: Brand & IoT Simulation Panel (Hidden on mobile) */}
        <LoginBrandPanel isDark={isDark} />

        {/* Right Side: Form and Quick Demo Action Area */}
        <div className="p-8 sm:p-12 flex flex-col justify-center relative">
          {/* Logo on mobile only (hidden on desktop because of LoginBrandPanel) */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F97316] text-white shadow-md shadow-orange-500/20">
              <Shield className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-[#F97316] to-[#3B82F6] bg-clip-text text-transparent">
              Emberpath
            </span>
          </div>

          {/* Form Header */}
          <div className="text-left mb-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Chào mừng trở lại</h2>
            <p className={`text-sm mt-2 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Nhập thông tin tài khoản của bạn để truy cập bảng điều khiển tòa nhà.
            </p>
          </div>

          {/* Form Input fields */}
          <LoginForm
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            onSubmit={handleSubmit}
            loading={loading}
            error={error}
            isDark={isDark}
          />

          {/* Separator */}
          <div className="my-6 flex items-center justify-center gap-3">
            <div className={`h-[1px] w-full ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
            <span className={`text-xs uppercase font-bold tracking-wider select-none shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Hoặc dùng nhanh
            </span>
            <div className={`h-[1px] w-full ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
          </div>

          {/* Quick Demo Autofill accounts selection */}
          <DemoAccounts onSelect={handleSelectDemo} isDark={isDark} disabled={loading} />
        </div>
      </div>
    </div>
  );
}
