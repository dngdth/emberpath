import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { Building2, ClipboardList, ExternalLink, KeyRound, LogOut, RefreshCw, ScrollText, Search, ShieldCheck, Users } from 'lucide-react';
import { CredentialDialog, CredentialInfo } from '../components/Admin/CredentialDialog';
import { ConfirmModal } from '../components/MapEditor/ConfirmModal';
import { TicketDetailDialog } from '../components/Admin/TicketDetailDialog';
import { AuditLogSection } from '../components/Admin/AuditLogSection';
import { TicketListTable } from '../components/Admin/TicketListTable';
import { CustomerListSection } from '../components/Admin/CustomerListSection';
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
  const [confirmResetUserId, setConfirmResetUserId] = useState<number | null>(null);
  const [hasMoreLogs, setHasMoreLogs] = useState(true);
  const [loadingMoreLogs, setLoadingMoreLogs] = useState(false);

  async function load() {
    setLoading(true); setError('');
    try {
      const [leadData, buildingData, logData] = await Promise.all([
        adminApi.leads(),
        adminApi.buildings(),
        adminApi.auditLogs(50, 0),
      ]);
      setLeads(leadData);
      setBuildings(buildingData);
      setLogs(logData);
      setHasMoreLogs(logData.length >= 50);
    } catch (err) {
      setError((err as AxiosError<{ detail?: string }>).response?.data?.detail || 'Không thể tải dữ liệu quản trị.');
    } finally { setLoading(false); }
  }

  async function loadMoreLogs() {
    if (loadingMoreLogs || !hasMoreLogs) return;
    setLoadingMoreLogs(true);
    try {
      const nextLogs = await adminApi.auditLogs(50, logs.length);
      if (nextLogs.length < 50) {
        setHasMoreLogs(false);
      }
      setLogs((prev) => [...prev, ...nextLogs]);
    } catch (err) {
      setError('Không thể tải thêm nhật ký audit.');
    } finally {
      setLoadingMoreLogs(false);
    }
  }

  useEffect(() => { document.title = 'Emberpath – Quản trị hệ thống'; void load(); }, []);


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

        {!loading && tab === 'leads' && (
          <TicketListTable
            leads={leads}
            search={search}
            onSearchChange={setSearch}
            filter={filter}
            onFilterChange={setFilter}
            counts={counts}
            busy={busy}
            darkMode={darkMode}
            statusLabels={statusLabels}
            statusStyles={statusStyles}
            facilityLabels={facilityLabels}
            scaleLabels={scaleLabels}
            onChangeStatus={(lead, status) => void changeStatus(lead, status)}
            onSelectLead={setSelectedLead}
          />
        )}

        {!loading && tab === 'customers' && (
          <CustomerListSection
            buildings={buildings}
            busy={busy}
            darkMode={darkMode}
            facilityLabels={facilityLabels}
            scaleLabels={scaleLabels}
            onEnterBuilding={(id) => void enterBuilding(id)}
            onResetPassword={(userId) => setConfirmResetUserId(userId)}
          />
        )}

        {!loading && tab === 'audit' && (
          <AuditLogSection
            logs={logs}
            darkMode={darkMode}
            onLoadMore={() => void loadMoreLogs()}
            hasMore={hasMoreLogs}
            loadingMore={loadingMoreLogs}
          />
        )}
      </main>
      {credential && <CredentialDialog info={credential} onClose={() => setCredential(null)} />}
      {selectedLead && <TicketDetailDialog lead={selectedLead} darkMode={darkMode} onClose={() => setSelectedLead(null)} />}
      <ConfirmModal
        isOpen={confirmResetUserId !== null}
        title="Đặt lại mật khẩu"
        message="Tạo mật khẩu tạm thời mới cho tài khoản này? Mật khẩu hiện tại sẽ ngừng hoạt động."
        confirmText="Đồng ý đặt lại"
        cancelText="Hủy"
        onConfirm={() => {
          if (confirmResetUserId !== null) {
            void resetPassword(confirmResetUserId);
            setConfirmResetUserId(null);
          }
        }}
        onCancel={() => setConfirmResetUserId(null)}
      />
    </div>
  );
}
