import { useEffect, useState } from 'react';
import { AxiosError } from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, CheckCircle2, Eye, EyeOff, Hash, KeyRound, Loader2, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { SwitchTheme } from '../components/UI/SwitchTheme';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { validateEmail, validateFullName } from '../utils/customerValidation';

const initialForm = {
  name: '',
  email: '',
  password: '',
  confirm_password: '',
  building_name: '',
  building_code: '',
};

type FormKey = keyof typeof initialForm;
type FormErrors = Partial<Record<FormKey, string>>;

const steps = [
  ['01', 'Thông tin quản trị', 'Tạo tài khoản đầu tiên có toàn quyền quản lý tòa nhà.'],
  ['02', 'Định danh tòa nhà', 'Mỗi tòa nhà có tên và mã riêng để dữ liệu luôn được tách biệt.'],
  ['03', 'Bắt đầu cấu hình', 'Sau khi đăng ký, bạn có thể thiết kế sơ đồ và kết nối cảm biến.'],
];

export function RegisterPage() {
  const navigate = useNavigate();
  const { register, loading } = useAuthStore();
  const { darkMode } = useThemeStore();
  const [form, setForm] = useState(initialForm);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => { document.title = 'Emberpath – Đăng ký tòa nhà'; }, []);

  function validateField(key: FormKey, value: string) {
    if (key === 'name') return validateFullName(value);
    if (key === 'email') return validateEmail(value);
    if (key === 'password') return value.length >= 6 ? '' : 'Mật khẩu phải có ít nhất 6 ký tự.';
    if (key === 'confirm_password') return value === form.password ? '' : 'Mật khẩu xác nhận chưa khớp.';
    if (key === 'building_name') return value.trim().length >= 2 ? '' : 'Vui lòng nhập tên tòa nhà.';
    if (key === 'building_code') return /^[A-Z0-9][A-Z0-9-]{1,49}$/.test(value) ? '' : 'Mã gồm chữ in hoa, số và dấu gạch nối.';
    return '';
  }

  function updateField(key: FormKey, value: string) {
    const nextValue = key === 'building_code' ? value.toUpperCase().replace(/\s/g, '') : value;
    setForm((current) => ({ ...current, [key]: nextValue }));
    if (fieldErrors[key]) setFieldErrors((current) => ({ ...current, [key]: '' }));
    if (key === 'password' && fieldErrors.confirm_password) {
      setFieldErrors((current) => ({ ...current, confirm_password: '' }));
    }
  }

  function checkField(key: FormKey) {
    setFieldErrors((current) => ({ ...current, [key]: validateField(key, form[key]) }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors = Object.fromEntries(
      (Object.keys(form) as FormKey[]).map((key) => [key, validateField(key, form[key])]),
    ) as FormErrors;
    setFieldErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      setError('Vui lòng kiểm tra lại thông tin đăng ký.');
      return;
    }

    setError('');
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      const detail = (err as AxiosError<{ detail?: string | Array<{ msg?: string }> }>).response?.data?.detail;
      const message = Array.isArray(detail) ? detail[0]?.msg?.replace('Value error, ', '') : detail;
      setError(message || 'Không thể tạo tài khoản. Vui lòng thử lại.');
    }
  }

  const inputClass = `!w-full !rounded-2xl !border !px-4 !py-3.5 !text-sm !outline-none !transition ${darkMode
    ? '!border-slate-700 !bg-slate-950/70 !text-white placeholder:!text-slate-600 focus:!border-blue-500'
    : '!border-slate-200 !bg-slate-50 !text-slate-900 placeholder:!text-slate-400 focus:!border-blue-500'}`;

  function fieldError(key: FormKey) {
    return fieldErrors[key] ? <span className="mt-1.5 block text-xs font-medium text-red-500">{fieldErrors[key]}</span> : null;
  }

  return (
    <div className={`relative min-h-screen px-4 py-8 sm:px-6 lg:py-12 ${darkMode ? 'bg-[#0F172A] text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      <div className="absolute right-5 top-5 z-20"><SwitchTheme /></div>
      <div className={`mx-auto grid w-full max-w-6xl overflow-hidden rounded-[32px] border shadow-2xl lg:grid-cols-[0.82fr_1.18fr] ${darkMode ? 'border-slate-800 bg-slate-900 shadow-slate-950/50' : 'border-slate-200 bg-white shadow-slate-200/70'}`}>
        <aside className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-8 text-white sm:p-10 lg:p-12">
          <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl" />
          <div className="absolute -bottom-24 -right-20 h-72 w-72 rounded-full bg-orange-500/15 blur-3xl" />
          <div className="relative">
            <Link to="/" className="inline-flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-500/20"><ShieldCheck size={25} /></div>
              <div><strong className="block text-xl">Emberpath</strong><span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Building Safety Platform</span></div>
            </Link>
            <h1 className="mt-10 text-3xl font-extrabold leading-tight sm:text-4xl">Khởi tạo không gian<br /><span className="text-orange-400">an toàn cho tòa nhà</span></h1>
            <p className="mt-4 max-w-md text-sm leading-7 text-slate-400">Chỉ mất vài phút để tạo tài khoản quản trị và bắt đầu cấu hình hệ thống giám sát, sơ tán thông minh.</p>
            <div className="mt-10 space-y-4">
              {steps.map(([number, title, description]) => <div key={number} className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-xs font-extrabold text-blue-300">{number}</span><div><strong className="text-sm">{title}</strong><p className="mt-1 text-xs leading-5 text-slate-400">{description}</p></div></div>)}
            </div>
          </div>
        </aside>

        <main className="p-6 sm:p-10 lg:p-12">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">Đăng ký hệ thống</p><h2 className="mt-2 text-3xl font-extrabold">Tạo tài khoản tòa nhà</h2><p className={`mt-2 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Tài khoản đầu tiên sẽ là quản trị viên của tòa nhà.</p></div>
            <Building2 className="hidden text-blue-500 sm:block" size={32} />
          </div>

          <form className="mt-8 grid gap-x-5 gap-y-5 sm:grid-cols-2" onSubmit={handleSubmit} noValidate>
            <label className="text-sm font-semibold"><span className="mb-2 block">Họ và tên <b className="text-orange-500">*</b></span><div className="relative"><UserRound className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 opacity-35" size={18} /><input autoComplete="name" className={`${inputClass} !pl-11 ${fieldErrors.name ? '!border-red-500' : ''}`} value={form.name} onChange={(e) => updateField('name', e.target.value)} onBlur={() => checkField('name')} placeholder="Nguyễn Văn An" /></div>{fieldError('name')}</label>
            <label className="text-sm font-semibold"><span className="mb-2 block">Email quản trị <b className="text-orange-500">*</b></span><div className="relative"><Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 opacity-35" size={18} /><input autoComplete="email" type="email" className={`${inputClass} !pl-11 ${fieldErrors.email ? '!border-red-500' : ''}`} value={form.email} onChange={(e) => updateField('email', e.target.value)} onBlur={() => checkField('email')} placeholder="admin@congty.vn" /></div>{fieldError('email')}</label>
            <label className="text-sm font-semibold"><span className="mb-2 block">Mật khẩu <b className="text-orange-500">*</b></span><div className="relative"><KeyRound className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 opacity-35" size={18} /><input autoComplete="new-password" type={showPassword ? 'text' : 'password'} className={`${inputClass} !pl-11 !pr-12 ${fieldErrors.password ? '!border-red-500' : ''}`} value={form.password} onChange={(e) => updateField('password', e.target.value)} onBlur={() => checkField('password')} placeholder="Ít nhất 6 ký tự" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>{fieldError('password')}</label>
            <label className="text-sm font-semibold"><span className="mb-2 block">Xác nhận mật khẩu <b className="text-orange-500">*</b></span><div className="relative"><KeyRound className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 opacity-35" size={18} /><input autoComplete="new-password" type={showPassword ? 'text' : 'password'} className={`${inputClass} !pl-11 ${fieldErrors.confirm_password ? '!border-red-500' : ''}`} value={form.confirm_password} onChange={(e) => updateField('confirm_password', e.target.value)} onBlur={() => checkField('confirm_password')} placeholder="Nhập lại mật khẩu" /></div>{fieldError('confirm_password')}</label>

            <div className={`sm:col-span-2 my-1 border-t ${darkMode ? 'border-slate-800' : 'border-slate-200'}`} />

            <label className="text-sm font-semibold"><span className="mb-2 block">Tên tòa nhà / Doanh nghiệp <b className="text-orange-500">*</b></span><div className="relative"><Building2 className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 opacity-35" size={18} /><input className={`${inputClass} !pl-11 ${fieldErrors.building_name ? '!border-red-500' : ''}`} value={form.building_name} onChange={(e) => updateField('building_name', e.target.value)} onBlur={() => checkField('building_name')} placeholder="Tòa nhà Văn phòng A" /></div>{fieldError('building_name')}</label>
            <label className="text-sm font-semibold"><span className="mb-2 block">Mã tòa nhà <b className="text-orange-500">*</b></span><div className="relative"><Hash className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 opacity-35" size={18} /><input className={`${inputClass} !pl-11 uppercase ${fieldErrors.building_code ? '!border-red-500' : ''}`} value={form.building_code} onChange={(e) => updateField('building_code', e.target.value)} onBlur={() => checkField('building_code')} placeholder="VAN-PHONG-A" /></div>{fieldError('building_code')}</label>

            {error && <div className="sm:col-span-2 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</div>}

            <button disabled={loading} className="sm:col-span-2 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-4 font-bold text-white shadow-lg shadow-orange-500/20 hover:from-orange-600 hover:to-orange-700 disabled:opacity-60">{loading ? <Loader2 className="animate-spin" size={19} /> : <CheckCircle2 size={19} />}{loading ? 'Đang khởi tạo...' : 'Tạo tài khoản quản trị'}</button>
            <div className="sm:col-span-2 text-center"><Link to="/login" className={`inline-flex items-center gap-2 text-sm font-semibold ${darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}><ArrowLeft size={16} />Quay lại đăng nhập</Link></div>
          </form>
        </main>
      </div>
    </div>
  );
}
