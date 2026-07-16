import { useState } from 'react';
import { Shield, Sun, Moon, Menu, X, LogIn } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface NavbarProps {
  isDark: boolean;
  setIsDark: (dark: boolean) => void;
}

export function Navbar({ isDark, setIsDark }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { token, logout } = useAuthStore();

  const navLinks = [
    { label: 'Vấn đề & Giải pháp', href: '#problem-solution' },
    { label: 'Tính năng', href: '#features' },
    { label: 'Quy trình hoạt động', href: '#how-it-works' },
  ];

  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${
        isDark
          ? 'bg-[#0F172A]/85 border-slate-800 text-slate-100 backdrop-blur-md'
          : 'bg-white/85 border-slate-200 text-slate-800 backdrop-blur-md'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F97316] text-white shadow-lg shadow-orange-500/20">
              <Shield className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-[#F97316] to-[#3B82F6] bg-clip-text text-transparent">
              Emberpath
            </span>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleScroll(e, link.href)}
                className={`text-sm font-medium hover:text-[#3B82F6] transition-colors ${
                  isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600'
                }`}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="hidden md:flex items-center gap-4">
            {/* Dark Mode Toggle */}
            <button
              onClick={() => setIsDark(!isDark)}
              className={`p-2 rounded-xl border transition-all ${
                isDark
                  ? 'border-slate-800 bg-slate-900 text-yellow-400 hover:bg-slate-800'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
              title="Toggle theme"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {token ? (
              <div className="flex items-center gap-3">
                <a
                  href="/dashboard"
                  className="rounded-xl bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 transition-all shadow-md shadow-blue-500/10"
                >
                  Bảng điều khiển
                </a>
                <button
                  onClick={logout}
                  className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
                    isDark
                      ? 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Đăng xuất
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <a
                  href="/login"
                  className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
                    isDark
                      ? 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Đăng nhập
                </a>
                <a
                  href="/register"
                  className="rounded-xl bg-[#F97316] px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-all shadow-md shadow-orange-500/10"
                >
                  Đăng ký
                </a>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={() => setIsDark(!isDark)}
              className={`p-2 rounded-xl border transition-all ${
                isDark
                  ? 'border-slate-800 bg-slate-900 text-yellow-400'
                  : 'border-slate-200 bg-slate-50 text-slate-600'
              }`}
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`p-2 rounded-xl transition-colors ${
                isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div
          className={`md:hidden border-b px-4 pt-2 pb-4 space-y-3 transition-colors ${
            isDark ? 'bg-[#0F172A] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleScroll(e, link.href)}
              className={`block py-2 text-base font-medium rounded-lg px-3 hover:bg-slate-100 ${
                isDark
                  ? 'text-slate-300 hover:text-white hover:bg-slate-900'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {link.label}
            </a>
          ))}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
            {token ? (
              <>
                <a
                  href="/dashboard"
                  className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#3B82F6] py-2.5 text-sm font-semibold text-white"
                >
                  Bảng điều khiển
                </a>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full rounded-xl border py-2.5 text-sm font-semibold ${
                    isDark
                      ? 'border-slate-800 bg-slate-900 text-slate-300'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <a
                  href="/login"
                  className={`flex items-center justify-center gap-2 w-full rounded-xl border py-2.5 text-sm font-semibold ${
                    isDark
                      ? 'border-slate-800 bg-slate-900 text-slate-300'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <LogIn className="h-4 w-4" /> Đăng nhập
                </a>
                <a
                  href="/register"
                  className="flex items-center justify-center w-full rounded-xl bg-[#F97316] py-2.5 text-sm font-semibold text-white"
                >
                  Đăng ký
                </a>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
