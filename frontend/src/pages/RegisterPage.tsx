import { useState } from 'react';
import { AxiosError } from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export function RegisterPage() {
  const navigate = useNavigate();
  const { register, loading } = useAuthStore();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirm_password: '',
    building_name: '',
    building_code: '',
  });
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      const message = (err as AxiosError<{ detail?: string }>).response?.data?.detail || 'Đăng ký thất bại';
      setError(message);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <div className="card w-full max-w-2xl p-8">
        <h1 className="text-3xl font-semibold text-white">Tạo building mới</h1>
        <p className="mt-2 text-slate-400">User đầu tiên của building sẽ là <strong>admin_building</strong>.</p>
        <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          {[
            ['name', 'Name'],
            ['email', 'Email'],
            ['password', 'Password'],
            ['confirm_password', 'Confirm password'],
            ['building_name', 'Building name'],
            ['building_code', 'Building code'],
          ].map(([key, label]) => (
            <label key={key} className="space-y-1">
              <span className="text-sm text-slate-300">{label}</span>
              <input
                type={key.includes('password') ? 'password' : 'text'}
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm((current) => ({ ...current, [key]: e.target.value }))}
              />
            </label>
          ))}
          {error && <div className="md:col-span-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}
          <div className="md:col-span-2 flex items-center gap-3">
            <button disabled={loading} className="rounded-2xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-300">{loading ? 'Đang tạo...' : 'Tạo tài khoản'}</button>
            <Link to="/login" className="text-sm text-cyan-300 hover:text-cyan-200">Quay lại đăng nhập</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
