import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';

interface LoginFormProps {
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  error: string;
  isDark: boolean;
}

export function LoginForm({
  email,
  setEmail,
  password,
  setPassword,
  onSubmit,
  loading,
  error,
  isDark,
}: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      {/* Email Input */}
      <div className="space-y-1.5 text-left">
        <label className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
          Địa chỉ Email
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Mail className={`h-5 w-5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
          </div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="nhanvien@toanha.com"
            disabled={loading}
            className={`w-full rounded-2xl border pl-11 pr-4 py-3 text-base outline-none transition-all duration-200 ${
              isDark
                ? 'bg-slate-950/70 border-slate-800 text-white placeholder-slate-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
                : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
            }`}
            style={{ colorScheme: isDark ? 'dark' : 'light' }}
          />
        </div>
      </div>

      {/* Password Input */}
      <div className="space-y-1.5 text-left">
        <div className="flex justify-between items-center">
          <label className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            Mật khẩu
          </label>
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Lock className={`h-5 w-5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            disabled={loading}
            className={`w-full rounded-2xl border pl-11 pr-12 py-3 text-base outline-none transition-all duration-200 ${
              isDark
                ? 'bg-slate-950/70 border-slate-800 text-white placeholder-slate-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
                : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            disabled={loading}
            className={`absolute inset-y-0 right-0 pr-3.5 flex items-center transition-colors hover:text-[#3B82F6] ${
              isDark ? 'text-slate-500' : 'text-slate-400'
            }`}
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-500 dark:text-red-400 text-left flex items-start gap-2">
          <span className="font-semibold select-none">Lỗi:</span>
          <span>{error}</span>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-[0.98] text-white py-3.5 px-4 font-bold text-base transition-all shadow-lg shadow-orange-500/10 disabled:opacity-50 disabled:pointer-events-none"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Đang xử lý đăng nhập...
          </>
        ) : (
          <>
            Đăng nhập
            <ArrowRight className="h-5 w-5" />
          </>
        )}
      </button>

      {/* Links */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
        <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
          Chưa có tài khoản?{' '}
          <Link
            to="/register"
            className="font-semibold text-orange-500 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-300 transition-colors"
          >
            Đăng ký tòa nhà mới
          </Link>
        </span>

        <Link
          to="/"
          className={`font-medium transition-colors ${
            isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Quay lại trang chủ
        </Link>
      </div>
    </form>
  );
}
