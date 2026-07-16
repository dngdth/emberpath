import { LayoutDashboard, Map, History, Flame, ChevronLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

interface Props {
  activeTab: 'dashboard' | 'editor' | 'history';
  onChangeTab?: (tab: 'dashboard' | 'editor' | 'history') => void;
  isDark: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export function DashboardSidebar({ activeTab, onChangeTab, isDark, isOpen, onClose }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();

  const menuItems = [
    {
      id: 'dashboard' as const,
      label: 'Dashboard',
      icon: LayoutDashboard,
      onClick: () => {
        if (onChangeTab) onChangeTab('dashboard');
        if (location.pathname !== '/dashboard') {
          navigate('/dashboard');
        }
        onClose();
      },
    },
    ...(user?.role === 'admin_building'
      ? [
          {
            id: 'editor' as const,
            label: 'Quản lý Sơ đồ',
            icon: Map,
            onClick: () => {
              if (onChangeTab) onChangeTab('editor');
              navigate('/editor');
              onClose();
            },
          },
        ]
      : []),
    {
      id: 'history' as const,
      label: 'Bảng Dữ liệu Lịch sử',
      icon: History,
      onClick: () => {
        if (onChangeTab) onChangeTab('history');
        onClose();
      },
    },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden transition-opacity duration-300"
        />
      )}

      <aside
        className={`fixed bottom-0 top-0 left-0 z-50 flex w-64 flex-col border-r transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          isDark
            ? 'border-slate-800 bg-[#1E293B] text-slate-100'
            : 'border-slate-200 bg-white text-slate-800'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-inherit">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-red-600 text-white shadow-md">
              <Flame size={20} className="animate-pulse" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-[#F97316] to-[#3B82F6] bg-clip-text text-transparent">Emberpath</span>
              <span className="block text-[10px] opacity-75">SAFETY DASHBOARD</span>
            </div>
          </div>

          {/* Toggle (Close) button */}
          <button
            onClick={onClose}
            className={`p-1.5 rounded-xl border transition-all duration-200 hover:scale-105 active:scale-95 ${
              isDark
                ? 'border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-800'
            }`}
            title="Đóng sidebar"
          >
            <ChevronLeft size={18} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1.5 p-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={item.onClick}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-[#3B82F6] text-white shadow-[0_4px_12px_rgba(59,130,246,0.25)]'
                    : isDark
                      ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer Info */}
        <div className="p-4 border-t border-inherit text-center text-xs opacity-60">
          &copy; {new Date().getFullYear()} Emberpath Safety
        </div>
      </aside>
    </>
  );
}
