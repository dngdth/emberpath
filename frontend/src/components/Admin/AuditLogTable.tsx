import React from 'react';
import { AuditLog } from '../../types/auth';
import { formatVietnamDateTime } from '../../utils/dateTime';
import {
  ShieldAlert,
  Terminal,
  UserCheck,
  KeyRound,
  Building2,
  Eye,
  Edit3,
  Globe,
  ChevronDown,
  RefreshCw
} from 'lucide-react';

interface AuditLogTableProps {
  logs: AuditLog[];
  darkMode: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
}

export function describeAuditAction(log: AuditLog): string {
  if (log.action === 'impersonation_started') return 'Bắt đầu phiên hỗ trợ doanh nghiệp';
  if (log.action === 'impersonated_websocket_connected') return 'Kết nối dữ liệu cảm biến trực tiếp';
  if (log.action === 'tenant_provisioned') return 'Khởi tạo không gian doanh nghiệp';
  if (log.action === 'password_reset') return 'Đặt lại mật khẩu khách hàng';
  if (log.action.startsWith('lead_status_changed:')) {
    const status = log.action.split(':')[1];
    const statusMap: Record<string, string> = {
      new: 'Mới',
      processing: 'Đang liên hệ',
      closed: 'Thành công',
      cancelled: 'Thất bại / Hủy',
    };
    return `Cập nhật ticket thành “${statusMap[status] || status}”`;
  }
  if (log.action === 'impersonated_request') {
    return log.method === 'GET' ? 'Xem dữ liệu trong phiên hỗ trợ' : 'Thay đổi dữ liệu trong phiên hỗ trợ';
  }
  return log.action;
}

function getActionBadgeStyle(action: string, method: string | null) {
  if (action === 'impersonation_started') {
    return {
      bg: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      icon: UserCheck,
    };
  }
  if (action === 'password_reset') {
    return {
      bg: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      icon: KeyRound,
    };
  }
  if (action === 'tenant_provisioned') {
    return {
      bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      icon: Building2,
    };
  }
  if (action.startsWith('lead_status_changed')) {
    return {
      bg: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      icon: Edit3,
    };
  }
  if (action === 'impersonated_request') {
    return method === 'GET'
      ? { bg: 'bg-slate-500/10 text-slate-400 border-slate-500/20', icon: Eye }
      : { bg: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: Edit3 };
  }
  return {
    bg: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    icon: Terminal,
  };
}

export function AuditLogTable({ logs, darkMode, onLoadMore, hasMore, loadingMore }: AuditLogTableProps) {
  const panelBg = darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white';
  const headerBg = darkMode ? 'bg-slate-950/70 text-slate-400' : 'bg-slate-50 text-slate-600';
  const cardItemBg = darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200';

  if (logs.length === 0) {
    return (
      <div className={`mt-5 rounded-3xl border p-12 text-center ${panelBg}`}>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-500/10 text-slate-400 mb-3">
          <ShieldAlert size={24} />
        </div>
        <p className="text-sm font-semibold opacity-70">Không tìm thấy nhật ký audit nào phù hợp với bộ lọc.</p>
        <p className="mt-1 text-xs opacity-50">Thử thay đổi hoặc xóa bỏ các điều kiện tìm kiếm.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={`mt-5 overflow-hidden rounded-3xl border shadow-sm ${panelBg}`}>
        {/* Desktop View (Table Layout) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className={headerBg}>
              <tr>
                {['Thời gian', 'Quản trị viên', 'Doanh nghiệp', 'Hoạt động', 'IP'].map((label) => (
                  <th key={label} className="px-5 py-4 text-xs font-extrabold uppercase tracking-wider opacity-70">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-inherit">
              {logs.map((log) => {
                const actionDesc = describeAuditAction(log);
                const badge = getActionBadgeStyle(log.action, log.method);
                const ActionIcon = badge.icon;

                return (
                  <tr
                    key={log.id}
                    className={`transition-colors hover:bg-slate-500/5 ${
                      darkMode ? 'hover:bg-slate-800/40' : 'hover:bg-blue-50/40'
                    }`}
                  >
                    {/* Thời gian */}
                    <td className="whitespace-nowrap px-5 py-4 text-xs font-medium opacity-80">
                      {formatVietnamDateTime(log.created_at)}
                    </td>

                    {/* Quản trị viên */}
                    <td className="px-5 py-4 font-bold">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/10 text-xs font-extrabold text-blue-500">
                          {log.admin_name.charAt(0)}
                        </div>
                        <span>{log.admin_name}</span>
                      </div>
                    </td>

                    {/* Doanh nghiệp */}
                    <td className="px-5 py-4 font-medium text-slate-700 dark:text-slate-300">
                      <span className="inline-flex items-center gap-1.5">
                        <Building2 size={15} className="text-amber-500 opacity-80" />
                        {log.building_name}
                      </span>
                    </td>

                    {/* Hoạt động */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1 text-xs font-bold ${badge.bg}`}>
                          <ActionIcon size={13} />
                          {actionDesc}
                        </span>
                      </div>
                      {log.path && (
                        <span className="mt-1 block font-mono text-[11px] opacity-45">
                          {log.method} {log.path}
                        </span>
                      )}
                    </td>

                    {/* IP */}
                    <td className="px-5 py-4 text-xs font-mono opacity-60">
                      <span className="inline-flex items-center gap-1">
                        <Globe size={13} />
                        {log.ip_address || '—'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile View (Card List Layout) */}
        <div className="block md:hidden p-4 space-y-3">
          {logs.map((log) => {
            const actionDesc = describeAuditAction(log);
            const badge = getActionBadgeStyle(log.action, log.method);
            const ActionIcon = badge.icon;

            return (
              <div key={log.id} className={`rounded-2xl border p-4 text-xs space-y-2.5 ${cardItemBg}`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-500 dark:text-slate-400">
                    {formatVietnamDateTime(log.created_at)}
                  </span>
                  <span className="font-mono text-[11px] opacity-50 flex items-center gap-1">
                    <Globe size={11} />
                    {log.ip_address || '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-inherit">
                  <div className="flex items-center gap-1.5 font-bold">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/10 text-[10px] text-blue-500 font-extrabold">
                      {log.admin_name.charAt(0)}
                    </div>
                    <span>{log.admin_name}</span>
                  </div>
                  <div className="flex items-center gap-1 text-amber-500 font-semibold">
                    <Building2 size={13} />
                    <span>{log.building_name}</span>
                  </div>
                </div>

                <div className="pt-1">
                  <span className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1 text-xs font-bold ${badge.bg}`}>
                    <ActionIcon size={12} />
                    {actionDesc}
                  </span>
                  {log.path && (
                    <span className="mt-1 block font-mono text-[10px] opacity-45 break-all">
                      {log.method} {log.path}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Load More Button */}
      {hasMore && onLoadMore && (
        <div className="mt-6 flex flex-col items-center justify-center gap-2">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className={`flex items-center gap-2 rounded-2xl border px-6 py-3 text-sm font-bold shadow-sm transition-all cursor-pointer ${
              darkMode
                ? 'border-slate-800 bg-slate-900 text-blue-400 hover:bg-slate-800 hover:border-slate-700'
                : 'border-slate-200 bg-white text-blue-600 hover:bg-slate-50 hover:border-slate-300'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loadingMore ? (
              <>
                <RefreshCw size={16} className="animate-spin text-blue-500" />
                <span>Đang tải thêm nhật ký từ hệ thống...</span>
              </>
            ) : (
              <>
                <ChevronDown size={16} />
                <span>Xem thêm 50 nhật ký tiếp theo</span>
              </>
            )}
          </button>
          <span className="text-xs opacity-50 font-medium">
            Đã hiển thị {logs.length} nhật ký
          </span>
        </div>
      )}
    </div>
  );
}
