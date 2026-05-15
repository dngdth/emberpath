import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { useAuthStore } from '../store/authStore';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, loading } = useAuthStore();
  const [email, setEmail] = useState('admin@buildinga.demo');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      const message = (err as AxiosError<{ detail?: string }>).response?.data?.detail || 'Đăng nhập thất bại';
      setError(message);
    }
  }

  return (
    <div className="min-h-screen bg-[#f2e4dc] px-4 py-10">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="flex flex-col justify-center">
          <p className="mb-3 inline-flex w-fit rounded-full border border-[#dfb9a8] bg-[#fff4ee] px-3 py-1 text-sm font-medium text-[#b33a2f]">
            Escape Mesh MVP
          </p>

          <h1 className="max-w-3xl text-4xl font-bold leading-tight text-[#a5261f] lg:text-6xl">
            Giám sát an toàn tòa nhà và thiết kế sơ đồ LED trên một nền tảng duy nhất.
          </h1>

          <p className="mt-5 max-w-2xl text-lg text-[#8a5a4b]">
            Dashboard cảm biến ESP32 theo building riêng, editor canvas zoom/pan mượt, mock realtime để test ngay.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {[
              'Multi-tenant theo building',
              'Dashboard sensor realtime',
              'Editor sơ đồ có zoom/pan',
              'Seed demo sẵn để chạy ngay',
            ].map((item) => (
              <div
                key={item}
                className="rounded-[22px] border border-[#e2c6bb] bg-[#fff8f3] p-4 text-[#7c2d23] shadow-[0_8px_24px_rgba(122,43,29,0.06)]"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-[#e2c6bb] bg-[#ead9cf] p-8 shadow-[0_12px_30px_rgba(122,43,29,0.08)]">
          <h2 className="text-2xl font-bold text-[#a5261f]">Đăng nhập</h2>
          <p className="mt-2 text-sm text-[#8a5a4b]">Dùng tài khoản demo hoặc đăng ký building mới.</p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block space-y-1">
              <span className="text-sm text-[#8f241e]">Email</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@buildinga.demo"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm text-[#8f241e]">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="123456"
              />
            </label>

            {error && (
              <div className="rounded-2xl border border-[#d8453b] bg-[#fde9e7] px-4 py-3 text-sm text-[#a5261f]">
                {error}
              </div>
            )}

            <button
              disabled={loading}
              className="w-full rounded-2xl bg-[#c94132] px-4 py-3 font-semibold text-white hover:bg-[#b23326]"
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          <div className="mt-6 rounded-2xl border border-[#d8b1a1] bg-[#fff8f3] p-4 text-sm text-[#7c2d23]">
            <div>Demo admin: <strong>admin@buildinga.demo / 123456</strong></div>
            <div>Demo operator: <strong>operator@buildinga.demo / 123456</strong></div>
          </div>

          <p className="mt-5 text-sm text-[#8a5a4b]">
            Chưa có tài khoản?{' '}
            <Link className="font-medium text-[#b33a2f] hover:text-[#8f241e]" to="/register">
              Tạo building mới
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}