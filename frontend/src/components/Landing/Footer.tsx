import { Shield } from 'lucide-react';

interface FooterProps {
  isDark: boolean;
}

export function Footer({ isDark }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className={`border-t py-8 transition-colors duration-300 ${
        isDark
          ? 'bg-[#0F172A] border-slate-800 text-slate-400'
          : 'bg-white border-slate-200 text-slate-500'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Logo Brand */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F97316] text-white">
              <Shield className="h-5 w-5" />
            </div>
            <span className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
              Emberpath
            </span>
          </div>

          {/* Copyright */}
          <p className="text-xs sm:text-sm">
            &copy; {currentYear} Emberpath. Bảo lưu mọi quyền.
          </p>

          {/* Links */}
          <div className="flex items-center gap-6 text-xs sm:text-sm">
            <a href="#" className="hover:underline transition-colors hover:text-[#3B82F6]">
              Chính sách bảo mật
            </a>
            <a href="#" className="hover:underline transition-colors hover:text-[#3B82F6]">
              Điều khoản dịch vụ
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
