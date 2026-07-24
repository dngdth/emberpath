import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-react';
import { CustomerLead, LeadStatus } from '../../types/auth';
import { formatVietnamDateTime, parseApiDate } from '../../utils/dateTime';

interface TicketListTableProps {
  leads: CustomerLead[];
  search: string;
  onSearchChange: (val: string) => void;
  filter: 'all' | LeadStatus;
  onFilterChange: (val: 'all' | LeadStatus) => void;
  counts: { all: number; new: number; processing: number; closed: number; cancelled: number };
  busy: string | null;
  darkMode: boolean;
  statusLabels: Record<LeadStatus, string>;
  statusStyles: Record<LeadStatus, string>;
  facilityLabels: Record<string, string>;
  scaleLabels: Record<string, string>;
  onChangeStatus: (lead: CustomerLead, status: LeadStatus) => void;
  onSelectLead: (lead: CustomerLead) => void;
}

function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

export function TicketListTable({
  leads,
  search,
  onSearchChange,
  filter,
  onFilterChange,
  counts,
  busy,
  darkMode,
  statusLabels,
  statusStyles,
  facilityLabels,
  scaleLabels,
  onChangeStatus,
  onSelectLead,
}: TicketListTableProps) {
  // Sort order state: 'desc' (Mới nhất trước) or 'asc' (Cũ nhất trước)
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const visibleLeads = useMemo(() => {
    const query = normalizeSearch(search);
    const phoneQuery = search.replace(/\D/g, '');

    return leads
      .filter((lead) => filter === 'all' || lead.status === filter)
      .filter((lead) => {
        if (!query) return true;
        const matchesText = normalizeSearch(`${lead.full_name} ${lead.phone}`).includes(query);
        const matchesPhone = Boolean(phoneQuery) && lead.phone.replace(/\D/g, '').includes(phoneQuery);
        return matchesText || matchesPhone;
      })
      .sort((first, second) => {
        // Keep cancelled tickets at bottom if needed, or sort directly by date
        const cancellationOrder = Number(first.status === 'cancelled') - Number(second.status === 'cancelled');
        if (cancellationOrder !== 0) return cancellationOrder;

        const timeFirst = parseApiDate(first.created_at).getTime();
        const timeSecond = parseApiDate(second.created_at).getTime();
        return sortOrder === 'asc' ? timeFirst - timeSecond : timeSecond - timeFirst;
      });
  }, [filter, leads, search, sortOrder]);

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
  };

  const panel = darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white';

  return (
    <>
      {/* Filter cards */}
      <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-5">
        {(['all', 'new', 'processing', 'closed', 'cancelled'] as const).map((status) => (
          <button
            key={status}
            onClick={() => onFilterChange(status)}
            className={`rounded-2xl border p-4 text-left ${panel} ${
              filter === status ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            <span className="text-2xl font-extrabold">{counts[status]}</span>
            <span className="mt-1 block text-xs font-semibold opacity-60">
              {status === 'all' ? 'Tất cả ticket' : statusLabels[status]}
            </span>
          </button>
        ))}
      </div>

      {/* Search Bar & Result info */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 opacity-40" size={18} />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Tìm theo tên hoặc số điện thoại..."
            className={`!w-full !rounded-2xl !border !py-3 !pl-11 !pr-4 !text-sm ${
              darkMode
                ? '!border-slate-700 !bg-slate-900 !text-white'
                : '!border-slate-200 !bg-white !text-slate-800'
            }`}
          />
        </div>
        <div className="flex items-center gap-3 text-xs font-semibold opacity-60">
          <span>
            Sắp xếp ngày gửi: <strong className="text-blue-500">{sortOrder === 'desc' ? 'Mới nhất' : 'Cũ nhất'}</strong>
          </span>
          <span>· Hiển thị {visibleLeads.length} ticket</span>
        </div>
      </div>

      {/* Table container */}
      <div className={`mt-4 overflow-hidden rounded-3xl border ${panel}`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className={darkMode ? 'bg-slate-950/50' : 'bg-slate-50'}>
              <tr>
                <th className="px-5 py-4 text-xs font-extrabold uppercase tracking-wider opacity-60">Khách hàng</th>
                <th className="px-5 py-4 text-xs font-extrabold uppercase tracking-wider opacity-60">Công trình</th>
                <th className="px-5 py-4 text-xs font-extrabold uppercase tracking-wider opacity-60">Nhu cầu</th>

                {/* Clickable Header for Sorting Date */}
                <th className="px-5 py-4">
                  <button
                    type="button"
                    onClick={toggleSortOrder}
                    className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors group cursor-pointer"
                    title={
                      sortOrder === 'desc'
                        ? 'Đang xếp: Mới nhất trước. Bấm để xếp cũ nhất trước.'
                        : 'Đang xếp: Cũ nhất trước. Bấm để xếp mới nhất trước.'
                    }
                  >
                    <span>Ngày gửi</span>
                    <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                      {sortOrder === 'desc' ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
                    </span>
                  </button>
                </th>

                <th className="px-5 py-4 text-xs font-extrabold uppercase tracking-wider opacity-60">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-inherit">
              {visibleLeads.map((lead) => (
                <tr
                  key={lead.id}
                  tabIndex={0}
                  onClick={() => onSelectLead(lead)}
                  onKeyDown={(event) => event.key === 'Enter' && onSelectLead(lead)}
                  className={`cursor-pointer border-t border-inherit align-top outline-none transition-colors ${
                    darkMode
                      ? 'hover:bg-slate-800/70 focus:bg-slate-800/70'
                      : 'hover:bg-blue-50/70 focus:bg-blue-50/70'
                  }`}
                >
                  <td className="px-5 py-4">
                    <strong>{lead.full_name}</strong>
                    <span className="mt-1 block text-xs opacity-60">
                      {lead.phone} · {lead.email}
                    </span>
                    {lead.company_name && <span className="mt-1 block text-xs">{lead.company_name}</span>}
                  </td>
                  <td className="px-5 py-4">
                    <span>{facilityLabels[lead.facility_type] || lead.facility_type}</span>
                    <span className="block text-xs opacity-60">
                      {scaleLabels[lead.expected_scale] || lead.expected_scale}
                    </span>
                  </td>
                  <td className="max-w-sm px-5 py-4 text-xs leading-5 opacity-70">
                    <p className="line-clamp-2 break-words">{lead.requirements || 'Chưa cung cấp'}</p>
                    {lead.cancellation_reason && (
                      <span className="mt-2 block text-rose-500">Lý do hủy: {lead.cancellation_reason}</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                    {formatVietnamDateTime(lead.created_at)}
                  </td>
                  <td className="px-5 py-4" onClick={(event) => event.stopPropagation()}>
                    <span className={`mb-2 inline-block rounded-full px-2.5 py-1 text-xs font-bold ${statusStyles[lead.status]}`}>
                      {statusLabels[lead.status]}
                    </span>
                    <select
                      disabled={busy === `lead-${lead.id}`}
                      value={lead.status}
                      onChange={(event) => void onChangeStatus(lead, event.target.value as LeadStatus)}
                      className={`block min-w-40 rounded-xl border px-3 py-2 text-xs ${
                        darkMode ? 'border-slate-700 bg-slate-950 text-white' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <option value="new">Mới</option>
                      <option value="processing">Đang liên hệ</option>
                      <option value="closed">Thành công</option>
                      <option value="cancelled">Thất bại / Hủy</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibleLeads.length === 0 && (
            <div className="p-12 text-center opacity-50">
              {search ? 'Không tìm thấy ticket phù hợp.' : 'Chưa có ticket trong nhóm này.'}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
