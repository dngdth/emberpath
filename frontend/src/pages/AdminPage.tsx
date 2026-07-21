import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { Building2, ClipboardList, ExternalLink, KeyRound, LogOut, RefreshCw, ScrollText, Search, ShieldCheck, Users } from 'lucide-react';
import { CredentialDialog, CredentialInfo } from '../components/Admin/CredentialDialog';
import { TicketDetailDialog } from '../components/Admin/TicketDetailDialog';
import { SwitchTheme } from '../components/UI/SwitchTheme';
import { adminApi } from '../services/backend';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { AuditLog, CustomerBuilding, CustomerLead, LeadStatus } from '../types/auth';
import { formatVietnamDate, formatVietnamDateTime, parseApiDate } from '../utils/dateTime';

const statusLabels: Record<LeadStatus, string> = { new: 'Mới', processing: 'Đang liên hệ', closed: 'Thành công', cancelled: 'Thất bại / Hủy' };
const statusStyles: Record<LeadStatus, string> = { new: 'bg-blue-500/10 text-blue-500', processing: 'bg-amber-500/10 text-amber-500', closed: 'bg-emerald-500/10 text-emerald-500', cancelled: 'bg-rose-500/10 text-rose-500' };
const facilityLabels: Record<string, string> = { apartment: 'Chung cư', office: 'Văn phòng', hospital: 'Bệnh viện', factory: 'Nhà máy', other: 'Khác' };
const scaleLabels: Record<string, string> = { under_5: 'Dưới 5 tầng', '5_10': '5–10 tầng', over_10: 'Trên 10 tầng' };
type Tab = 'leads' | 'customers' | 'audit';

function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

function describeAuditAction(log: AuditLog) {
  if (log.action === 'impersonation_started') return 'Bắt đầu phiên hỗ trợ doanh nghiệp';
  if (log.action === 'impersonated_websocket_connected') return 'Kết nối dữ liệu cảm biến trực tiếp';
  if (log.action === 'tenant_provisioned') return 'Khởi tạo không gian doanh nghiệp';
  if (log.action === 'password_reset') return 'Đặt lại mật khẩu khách hàng';
  if (log.action.startsWith('lead_status_changed:')) {
    const status = log.action.split(':')[1] as LeadStatus;
    return `Cập nhật ticket thành “${statusLabels[status] || status}”`;
  }
  if (log.action === 'impersonated_request') {
    return log.method === 'GET' ? 'Xem dữ liệu trong phiên hỗ trợ' : 'Thay đổi dữ liệu trong phiên hỗ trợ';
  }
  return log.action;
}

export function AdminPage() {
  const navigate = useNavigate();
  const { logout, impersonate } = useAuthStore();
  const { darkMode } = useThemeStore();
  const [tab, setTab] = useState<Tab>('leads');
  const [leads, setLeads] = useState<CustomerLead[]>([]);
  const [buildings, setBuildings] = useState<CustomerBuilding[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filter, setFilter] = useState<'all' | LeadStatus>('all');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [credential, setCredential] = useState<CredentialInfo | null>(null);
  const [selectedLead, setSelectedLead] = useState<CustomerLead | null>(null);
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const [leadData, buildingData, logData] = await Promise.all([adminApi.leads(), adminApi.buildings(), adminApi.auditLogs()]);
      setLeads(leadData); setBuildings(buildingData); setLogs(logData);
    } catch (err) {
      setError((err as AxiosError<{ detail?: string }>).response?.data?.detail || 'Không thể tải dữ liệu quản trị.');
    } finally { setLoading(false); }
  }

  useEffect(() => { document.title = 'Emberpath – Quản trị hệ thống'; void load(); }, []);

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
        const cancellationOrder = Number(first.status === 'cancelled') - Number(second.status === 'cancelled');
        if (cancellationOrder !== 0) return cancellationOrder;
        return parseApiDate(second.created_at).getTime() - parseApiDate(first.created_at).getTime();
      });
  }, [filter, leads, search]);
  const counts = useMemo(() => ({
    all: leads.length,
    new: leads.filter((x) => x.status === 'new').length,
    processing: leads.filter((x) => x.status === 'processing').length,
    closed: leads.filter((x) => x.status === 'closed').length,
    cancelled: leads.filter((x) => x.status === 'cancelled').length,
  }), [leads]);

  async function changeStatus(lead: CustomerLead, status: LeadStatus) {
    let reason: string | undefined;
    if (status === 'cancelled') {
      const entered = window.prompt('Nhập lý do hủy ticket (bắt buộc):', lead.cancellation_reason || '');
      if (entered === null) return;
      if (!entered.trim()) { setError('Vui lòng nhập lý do hủy ticket.'); return; }
      reason = entered.trim();
    }
    setBusy(`lead-${lead.id}`); setError('');
    try {
      const result = await adminApi.updateLeadStatus(lead.id, status, reason);
      setLeads((items) => items.map((item) => item.id === lead.id ? result.lead : item));
      setSelectedLead((current) => current?.id === lead.id ? result.lead : current);
      if (result.provisioned_account) {
        setCredential({ title: 'Đã khởi tạo tài khoản khách hàng', email: result.provisioned_account.email, temporaryPassword: result.provisioned_account.temporary_password, note: 'Mật khẩu này chỉ hiển thị một lần. Hãy chuyển cho khách hàng qua kênh an toàn.' });
        const buildingData = await adminApi.buildings(); setBuildings(buildingData);
      }
    } catch (err) { setError((err as AxiosError<{ detail?: string }>).response?.data?.detail || 'Không thể cập nhật ticket.'); }
    finally { setBusy(null); }
  }

  async function enterBuilding(buildingId: number) {
    setBusy(`building-${buildingId}`);
    try { await impersonate(buildingId); navigate('/dashboard'); }
    catch (err) { setError((err as AxiosError<{ detail?: string }>).response?.data?.detail || 'Không thể truy cập doanh nghiệp.'); setBusy(null); }
  }

  async function resetPassword(userId: number) {
    if (!window.confirm('Tạo mật khẩu tạm thời mới cho tài khoản này? Mật khẩu hiện tại sẽ ngừng hoạt động.')) return;
    setBusy(`user-${userId}`);
    try {
      const result = await adminApi.resetPassword(userId);
      setCredential({ title: 'Đã đặt lại mật khẩu', email: result.email, temporaryPassword: result.temporary_password, note: result.message });
      setLogs(await adminApi.auditLogs());
    } catch (err) { setError((err as AxiosError<{ detail?: string }>).response?.data?.detail || 'Không thể đặt lại mật khẩu.'); }
    finally { setBusy(null); }
  }

  const panel = darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white';
  return (
    <div className={`min-h-screen ${darkMode ? 'bg-[#0F172A] text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      <header className={`sticky top-0 z-30 border-b ${panel}`}><div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-white"><ShieldCheck size={21} /></div><div><strong className="block">Emberpath Admin</strong><span className="block text-[10px] uppercase tracking-widest opacity-60">System operations</span></div></div><div className="flex items-center gap-2"><SwitchTheme /><button onClick={() => void load()} className="rounded-xl border border-inherit p-2.5" title="Tải lại"><RefreshCw size={17} className={loading ? 'animate-spin' : ''} /></button><button onClick={() => { logout(); navigate('/login'); }} className="flex items-center gap-2 rounded-xl border border-inherit px-3 py-2 text-sm font-semibold"><LogOut size={16} /><span className="hidden sm:inline">Đăng xuất</span></button></div></div></header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-widest text-orange-500">Trung tâm vận hành</p><h1 className="mt-1 text-3xl font-extrabold">Quản lý khách hàng</h1><p className="mt-2 text-sm opacity-60">Tiếp nhận nhu cầu, khởi tạo tenant và hỗ trợ doanh nghiệp an toàn.</p></div><div className="flex rounded-2xl border border-inherit p-1">{([{ id: 'leads', label: 'Tickets', icon: ClipboardList }, { id: 'customers', label: 'Khách hàng', icon: Users }, { id: 'audit', label: 'Audit log', icon: ScrollText }] as const).map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setTab(id)} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${tab === id ? 'bg-blue-600 text-white' : 'opacity-60 hover:opacity-100'}`}><Icon size={16} />{label}</button>)}</div></div>
        {error && <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-500">{error}</div>}
        {loading ? <div className="flex min-h-64 items-center justify-center"><RefreshCw className="animate-spin text-blue-500" /></div> : null}

        {!loading && tab === 'leads' && <>
          <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-5">{(['all', 'new', 'processing', 'closed', 'cancelled'] as const).map((status) => <button key={status} onClick={() => setFilter(status)} className={`rounded-2xl border p-4 text-left ${panel} ${filter === status ? 'ring-2 ring-blue-500' : ''}`}><span className="text-2xl font-extrabold">{counts[status]}</span><span className="mt-1 block text-xs font-semibold opacity-60">{status === 'all' ? 'Tất cả ticket' : statusLabels[status]}</span></button>)}</div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full sm:max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 opacity-40" size={18} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm theo tên hoặc số điện thoại..."
                className={`!w-full !rounded-2xl !border !py-3 !pl-11 !pr-4 !text-sm ${darkMode ? '!border-slate-700 !bg-slate-900 !text-white' : '!border-slate-200 !bg-white !text-slate-800'}`}
              />
            </div>
            <span className="text-xs font-semibold opacity-50">Hiển thị {visibleLeads.length} ticket · Bấm vào một dòng để xem chi tiết</span>
          </div>
          <div className={`mt-4 overflow-hidden rounded-3xl border ${panel}`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className={darkMode ? 'bg-slate-950/50' : 'bg-slate-50'}>
                  <tr>{['Khách hàng', 'Công trình', 'Nhu cầu', 'Ngày gửi', 'Trạng thái'].map((label) => <th key={label} className="px-5 py-4 text-xs uppercase tracking-wider opacity-60">{label}</th>)}</tr>
                </thead>
                <tbody>
                  {visibleLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      tabIndex={0}
                      onClick={() => setSelectedLead(lead)}
                      onKeyDown={(event) => event.key === 'Enter' && setSelectedLead(lead)}
                      className={`cursor-pointer border-t border-inherit align-top outline-none transition-colors ${darkMode ? 'hover:bg-slate-800/70 focus:bg-slate-800/70' : 'hover:bg-blue-50/70 focus:bg-blue-50/70'}`}
                    >
                      <td className="px-5 py-4"><strong>{lead.full_name}</strong><span className="mt-1 block text-xs opacity-60">{lead.phone} · {lead.email}</span>{lead.company_name && <span className="mt-1 block text-xs">{lead.company_name}</span>}</td>
                      <td className="px-5 py-4"><span>{facilityLabels[lead.facility_type] || lead.facility_type}</span><span className="block text-xs opacity-60">{scaleLabels[lead.expected_scale] || lead.expected_scale}</span></td>
                      <td className="max-w-sm px-5 py-4 text-xs leading-5 opacity-70"><p className="line-clamp-2 break-words">{lead.requirements || 'Chưa cung cấp'}</p>{lead.cancellation_reason && <span className="mt-2 block text-rose-500">Lý do hủy: {lead.cancellation_reason}</span>}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-xs opacity-60">{formatVietnamDateTime(lead.created_at)}</td>
                      <td className="px-5 py-4" onClick={(event) => event.stopPropagation()}>
                        <span className={`mb-2 inline-block rounded-full px-2.5 py-1 text-xs font-bold ${statusStyles[lead.status]}`}>{statusLabels[lead.status]}</span>
                        <select disabled={busy === `lead-${lead.id}`} value={lead.status} onChange={(event) => void changeStatus(lead, event.target.value as LeadStatus)} className={`block min-w-40 rounded-xl border px-3 py-2 text-xs ${darkMode ? 'border-slate-700 bg-slate-950 text-white' : 'border-slate-200 bg-white'}`}><option value="new">Mới</option><option value="processing">Đang liên hệ</option><option value="closed">Thành công</option><option value="cancelled">Thất bại / Hủy</option></select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {visibleLeads.length === 0 && <div className="p-12 text-center opacity-50">{search ? 'Không tìm thấy ticket phù hợp.' : 'Chưa có ticket trong nhóm này.'}</div>}
            </div>
          </div>
        </>}

        {!loading && tab === 'customers' && <div className="mt-7 grid gap-5 lg:grid-cols-2">{buildings.map((building) => <article key={building.id} className={`rounded-3xl border p-5 ${panel}`}><div className="flex items-start justify-between"><div className="flex gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500"><Building2 /></div><div><h2 className="font-extrabold">{building.name}</h2><p className="text-xs opacity-50">{building.code} · Tạo {formatVietnamDate(building.created_at)}</p></div></div><button disabled={busy === `building-${building.id}`} onClick={() => void enterBuilding(building.id)} className="flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"><ExternalLink size={14} />Truy cập Dashboard</button></div><div className="mt-5 space-y-2">{building.users.filter((u) => u.role !== 'super_admin').map((user) => <div key={user.id} className={`flex items-center justify-between rounded-2xl p-3 ${darkMode ? 'bg-slate-950/60' : 'bg-slate-50'}`}><div><strong className="text-sm">{user.name}</strong><span className="block text-xs opacity-50">{user.email} · {user.role}</span></div><button disabled={busy === `user-${user.id}`} onClick={() => void resetPassword(user.id)} className="flex items-center gap-1.5 rounded-xl border border-inherit px-3 py-2 text-xs font-bold hover:text-orange-500"><KeyRound size={14} />Đặt lại mật khẩu</button></div>)}</div></article>)}</div>}

        {!loading && tab === 'audit' && <>
          <div className={`mt-7 rounded-3xl border p-5 sm:p-6 ${panel}`}>
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500"><ShieldCheck size={22} /></div>
              <div><h2 className="font-extrabold">Audit log giúp kiểm soát các phiên hỗ trợ</h2><p className="mt-1 max-w-3xl text-sm leading-6 opacity-60">Mỗi lần Super Admin truy cập dashboard khách hàng, hệ thống ghi lại người thực hiện, doanh nghiệp, thời gian, hành động và địa chỉ IP. Dữ liệu này dùng để minh bạch với khách hàng, truy vết khi xảy ra sự cố và xác định trách nhiệm.</p></div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className={`rounded-2xl border p-4 text-sm ${darkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50'}`}><strong>Minh bạch hỗ trợ</strong><p className="mt-1 text-xs leading-5 opacity-55">Biết chính xác ai đã vào hệ thống khách hàng và vào lúc nào.</p></div><div className={`rounded-2xl border p-4 text-sm ${darkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50'}`}><strong>Điều tra sự cố</strong><p className="mt-1 text-xs leading-5 opacity-55">Đối chiếu hoạt động trước và sau khi phát sinh lỗi hoặc khiếu nại.</p></div><div className={`rounded-2xl border p-4 text-sm ${darkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50'}`}><strong>Bảo mật & trách nhiệm</strong><p className="mt-1 text-xs leading-5 opacity-55">Phát hiện truy cập bất thường và tránh can thiệp không có căn cứ.</p></div></div>
          </div>
          <div className={`mt-5 overflow-hidden rounded-3xl border ${panel}`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className={darkMode ? 'bg-slate-950/50' : 'bg-slate-50'}><tr>{['Thời gian', 'Quản trị viên', 'Doanh nghiệp', 'Hoạt động', 'IP'].map((label) => <th key={label} className="px-5 py-4 text-xs uppercase opacity-60">{label}</th>)}</tr></thead>
                <tbody>{logs.map((log) => <tr key={log.id} className="border-t border-inherit"><td className="whitespace-nowrap px-5 py-4 text-xs">{formatVietnamDateTime(log.created_at)}</td><td className="px-5 py-4 font-semibold">{log.admin_name}</td><td className="px-5 py-4">{log.building_name}</td><td className="px-5 py-4"><span className="text-sm font-semibold">{describeAuditAction(log)}</span>{log.path && <span className="mt-1 block font-mono text-[11px] opacity-45">{log.method} {log.path}</span>}</td><td className="px-5 py-4 text-xs opacity-60">{log.ip_address || '—'}</td></tr>)}</tbody>
              </table>
              {logs.length === 0 && <div className="p-12 text-center opacity-50">Chưa có hoạt động audit.</div>}
            </div>
          </div>
        </>}
      </main>
      {credential && <CredentialDialog info={credential} onClose={() => setCredential(null)} />}
      {selectedLead && <TicketDetailDialog lead={selectedLead} darkMode={darkMode} onClose={() => setSelectedLead(null)} />}
    </div>
  );
}
