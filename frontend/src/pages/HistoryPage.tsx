import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useRealtimeSensors } from '../hooks/useRealtimeSensors';
import { DashboardSidebar } from '../components/Dashboard/DashboardSidebar';
import { SwitchTheme } from '../components/UI/SwitchTheme';
import {
  Layers,
  LogOut,
  RefreshCw,
  FileSpreadsheet,
  Menu,
} from 'lucide-react';

export function HistoryPage() {
  const { user, logout } = useAuthStore();
  const { darkMode } = useThemeStore();
  const isDark = darkMode;

  // Sidebar status: open by default on desktop, closed on mobile
  const [sidebarOpen, setSidebarOpen] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );

  const { refresh } = useRealtimeSensors();

  // Page title sync
  useEffect(() => {
    document.title = `Emberpath – Lịch sử dữ liệu`;
  }, []);

  return (
    <div
      className={`min-h-screen font-sans antialiased transition-colors duration-300 ${
        isDark ? 'bg-[#0F172A] text-slate-100' : 'bg-slate-50 text-slate-800'
      }`}
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Floating Toggle Button (visible only when sidebar is closed) */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className={`fixed bottom-6 left-6 z-40 p-3.5 rounded-full shadow-2xl border transition-all duration-300 hover:scale-110 active:scale-95 hover:shadow-blue-500/25 ${
            isDark
              ? 'bg-slate-800 border-slate-700 text-blue-400 hover:bg-slate-700 hover:text-blue-300 shadow-slate-950/80'
              : 'bg-white border-slate-200 text-blue-600 hover:bg-slate-50 hover:text-blue-500'
          }`}
          title="Mở sidebar"
        >
          <Menu size={22} />
        </button>
      )}

      {/* 1. Left Sidebar Navigation */}
      <DashboardSidebar
        activeTab="history"
        isDark={isDark}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpen={() => setSidebarOpen(true)}
      />

      {/* 2. Main content area (aligned right of sidebar) */}
      <div
        className={`pl-0 ${
          sidebarOpen ? 'md:pl-64' : 'md:pl-0'
        } min-h-screen flex flex-col transition-[padding-left] duration-300 ease-in-out`}
      >
        {/* Header bar */}
        <header
          className={`h-16 flex items-center justify-between px-4 md:px-8 border-b transition-colors duration-300 ${
            isDark ? 'bg-[#1E293B] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Layers className={isDark ? 'text-blue-500' : 'text-blue-600'} size={20} />
            <h1
              className={`text-sm md:text-lg font-bold uppercase tracking-wide truncate max-w-[200px] sm:max-w-none ${
                isDark ? 'text-slate-100' : 'text-slate-800'
              }`}
            >
              Lịch sử hệ thống – {user?.building.name || 'Building A'}
            </h1>
          </div>

          <div className="flex items-center gap-6">
            {/* Light / Dark Mode Switcher */}
            <SwitchTheme />

            {/* Profile Avatar Widget */}
            <div
              className={`flex items-center gap-3 px-3 py-1.5 rounded-xl border ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div
                className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold text-white ${
                  isDark ? 'bg-blue-600 shadow-md' : 'bg-blue-600'
                }`}
              >
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="text-left leading-none">
                <span className="block text-xs font-bold">{user?.name || 'User'}</span>
                <span className="text-[9px] uppercase tracking-wider opacity-75">
                  {user?.role || 'Operator'}
                </span>
              </div>
            </div>

            {/* Logout Trigger */}
            <button
              onClick={logout}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                isDark
                  ? 'border-slate-800 hover:bg-rose-950/20 hover:text-rose-400 hover:border-rose-900'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
              title="Đăng xuất khỏi hệ thống"
            >
              <LogOut size={13} />
              <span>Đăng xuất</span>
            </button>
          </div>
        </header>

        {/* 3. Main Dashboard Workspace Layout */}
        <main className="flex-1 p-6 space-y-6">
          <div
            className={`rounded-3xl border shadow-soft p-6 transition-colors duration-300 ${
              isDark ? 'bg-[#1E293B] border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between border-b pb-4 mb-4 border-inherit">
              <div>
                <h2 className="text-lg font-extrabold tracking-tight">BẢNG DỮ LIỆU LỊCH SỬ HỆ THỐNG</h2>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Xem và xuất dữ liệu ghi nhận lịch sử đo đạc từ các sensor của tòa nhà
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => refresh()}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                    isDark
                      ? 'border-slate-700 hover:bg-slate-800 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <RefreshCw size={13} />
                  <span>Làm mới</span>
                </button>
                <button
                  onClick={() => alert('Xuất báo cáo thành công dưới dạng CSV!')}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white rounded-lg bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/10"
                >
                  <FileSpreadsheet size={13} />
                  <span>Xuất file CSV</span>
                </button>
              </div>
            </div>

            {/* Simulation historical data list */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr
                    className={`text-[10px] font-bold uppercase tracking-wider border-b transition-colors duration-300 ${
                      isDark ? 'bg-slate-950/30 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    <th className="py-3 px-6">Mã Thiết Bị</th>
                    <th className="py-3 px-6">Tên Sensor</th>
                    <th className="py-3 px-6">Vị Trí</th>
                    <th className="py-3 px-6">Chỉ số Đo Đạc</th>
                    <th className="py-3 px-6">Ngưỡng</th>
                    <th className="py-3 px-6 text-center">Trạng Thái</th>
                    <th className="py-3 px-6">Thời gian Ghi Nhận</th>
                  </tr>
                </thead>
                <tbody
                  className={`divide-y text-xs transition-colors duration-300 ${
                    isDark ? 'divide-slate-800' : 'divide-slate-200/80'
                  }`}
                >
                  {[
                    {
                      dev: 'mq2-01',
                      name: 'MQ2 Lobby A',
                      loc: 'Lobby',
                      val: '220 raw',
                      th: '600 raw',
                      st: 'safe',
                      time: '16:04:12 16/07',
                    },
                    {
                      dev: 'temp-01',
                      name: 'Temp Lobby A',
                      loc: 'Lobby',
                      val: '29 °C',
                      th: '50 °C',
                      st: 'safe',
                      time: '16:03:55 16/07',
                    },
                    {
                      dev: 'mq2-02',
                      name: 'Corridor A',
                      loc: 'Corridor E',
                      val: '710 raw',
                      th: '600 raw',
                      st: 'danger',
                      time: '15:58:32 16/07',
                    },
                    {
                      dev: 'mq2-03',
                      name: 'MQ2 Control A',
                      loc: 'Control Room',
                      val: '180 raw',
                      th: '600 raw',
                      st: 'safe',
                      time: '15:55:10 16/07',
                    },
                  ].map((item, index) => (
                    <tr
                      key={index}
                      className={item.st === 'danger' ? 'bg-rose-500/5 text-rose-500' : ''}
                    >
                      <td className="py-3.5 px-6 font-mono font-semibold">{item.dev}</td>
                      <td className="py-3.5 px-6">{item.name}</td>
                      <td className="py-3.5 px-6">{item.loc}</td>
                      <td className="py-3.5 px-6 font-mono font-bold">{item.val}</td>
                      <td className="py-3.5 px-6 font-mono opacity-85">{item.th}</td>
                      <td className="py-3.5 px-6 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                            item.st === 'danger'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {item.st.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 font-mono opacity-75">{item.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
