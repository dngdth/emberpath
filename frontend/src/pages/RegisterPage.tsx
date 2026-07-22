import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, ShieldCheck } from 'lucide-react';
import { SwitchTheme } from '../components/UI/SwitchTheme';
import { useThemeStore } from '../store/themeStore';
import { ConsultationForm } from '../components/Landing/ConsultationForm';

const steps = [
  ['01', 'Gửi yêu cầu tư vấn', 'Nhập thông tin công trình và nhu cầu khảo sát giải pháp sơ tán.'],
  ['02', 'Khảo sát & Tư vấn', 'Đội ngũ kỹ sư Emberpath liên hệ khảo sát thực tế và thiết kế sơ đồ.'],
  ['03', 'Khởi tạo hệ thống', 'Kích hoạt tài khoản quản trị tòa nhà và kết nối toàn bộ cảm biến IoT.'],
];

export function RegisterPage() {
  const navigate = useNavigate();
  const { darkMode } = useThemeStore();

  useEffect(() => {
    document.title = 'Emberpath – Đăng ký sử dụng dịch vụ';
  }, []);

  return (
    <div className={`relative min-h-screen px-4 py-8 sm:px-6 lg:py-12 ${darkMode ? 'bg-[#0F172A] text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      <div className="absolute right-5 top-5 z-20">
        <SwitchTheme />
      </div>
      <div className={`mx-auto grid w-full max-w-6xl overflow-hidden rounded-[32px] border shadow-2xl lg:grid-cols-[0.82fr_1.18fr] ${darkMode ? 'border-slate-800 bg-slate-900 shadow-slate-950/50' : 'border-slate-200 bg-white shadow-slate-200/70'}`}>
        {/* Left Panel */}
        <aside className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-8 text-white sm:p-10 lg:p-12">
          <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl" />
          <div className="absolute -bottom-24 -right-20 h-72 w-72 rounded-full bg-orange-500/15 blur-3xl" />
          <div className="relative">
            <Link to="/" className="inline-flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-500/20">
                <ShieldCheck size={25} />
              </div>
              <div>
                <strong className="block text-xl">Emberpath</strong>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  Building Safety Platform
                </span>
              </div>
            </Link>
            <h1 className="mt-10 text-3xl font-extrabold leading-tight sm:text-4xl">
              Đăng ký sử dụng<br />
              <span className="text-orange-400">dịch vụ & tư vấn</span>
            </h1>
            <p className="mt-4 max-w-md text-sm leading-7 text-slate-400">
              Điền thông tin công trình của bạn. Đội ngũ kỹ thuật viên Emberpath sẽ khảo sát và hỗ trợ lắp đặt giải pháp sơ tán an toàn.
            </p>
            <div className="mt-10 space-y-4">
              {steps.map(([number, title, description]) => (
                <div key={number} className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-xs font-extrabold text-blue-300">
                    {number}
                  </span>
                  <div>
                    <strong className="text-sm">{title}</strong>
                    <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Right Panel: Consultation Form */}
        <main className="p-6 sm:p-10 lg:p-12">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">
                Đăng ký dịch vụ
              </p>
              <h2 className="mt-2 text-3xl font-extrabold">Tạo yêu cầu tư vấn mới</h2>
              <p className={`mt-2 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Hệ thống chỉ dẫn sơ tán thông minh & cảnh báo sự cố IoT cho tòa nhà.
              </p>
            </div>
            <Building2 className="hidden text-blue-500 sm:block" size={32} />
          </div>

          <div className="mt-4">
            <ConsultationForm isDark={darkMode} onSuccess={() => navigate('/login')} minimal={true} />
          </div>

          <div className="mt-4 text-center">
            <Link
              to="/login"
              className={`inline-flex items-center gap-2 text-sm font-semibold ${
                darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <ArrowLeft size={16} />
              Quay lại đăng nhập
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
