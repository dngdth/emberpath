import { Building2, CalendarClock, Mail, MessageSquareText, Phone, UserRound, X } from 'lucide-react';
import { useEffect } from 'react';
import { CustomerLead, LeadStatus } from '../../types/auth';
import { formatVietnamDateTime } from '../../utils/dateTime';

const statusLabels: Record<LeadStatus, string> = {
  new: 'Mới',
  processing: 'Đang liên hệ',
  closed: 'Thành công',
  cancelled: 'Thất bại / Hủy',
};

const statusStyles: Record<LeadStatus, string> = {
  new: 'bg-blue-500/10 text-blue-500',
  processing: 'bg-amber-500/10 text-amber-500',
  closed: 'bg-emerald-500/10 text-emerald-500',
  cancelled: 'bg-rose-500/10 text-rose-500',
};

const facilityLabels: Record<string, string> = {
  apartment: 'Chung cư',
  office: 'Văn phòng',
  hospital: 'Bệnh viện',
  factory: 'Nhà máy',
  other: 'Khác',
};

const scaleLabels: Record<string, string> = {
  under_5: 'Dưới 5 tầng',
  '5_10': '5–10 tầng',
  over_10: 'Trên 10 tầng',
};

interface Props {
  lead: CustomerLead;
  darkMode: boolean;
  onClose: () => void;
}

export function TicketDetailDialog({ lead, darkMode, onClose }: Props) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  const card = darkMode ? 'border-slate-700 bg-slate-950/60' : 'border-slate-200 bg-slate-50';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className={`max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border p-6 shadow-2xl sm:p-8 ${darkMode ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-200 bg-white text-slate-800'}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">Ticket #{lead.id}</span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyles[lead.status]}`}>{statusLabels[lead.status]}</span>
            </div>
            <h2 className="mt-2 text-2xl font-extrabold">Thông tin yêu cầu tư vấn</h2>
            <p className="mt-1 text-sm opacity-55">Toàn bộ thông tin khách hàng đã gửi từ landing page.</p>
          </div>
          <button onClick={onClose} className={`shrink-0 rounded-xl border p-2.5 ${card}`} aria-label="Đóng chi tiết ticket"><X size={19} /></button>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          <div className={`rounded-2xl border p-4 ${card}`}><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-50"><UserRound size={15} />Họ và tên</div><p className="mt-2 font-bold">{lead.full_name}</p></div>
          <div className={`rounded-2xl border p-4 ${card}`}><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-50"><Building2 size={15} />Công ty / Tổ chức</div><p className="mt-2 font-bold">{lead.company_name || 'Không cung cấp'}</p></div>
          <a href={`tel:${lead.phone}`} className={`rounded-2xl border p-4 ${card}`}><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-50"><Phone size={15} />Số điện thoại / Zalo</div><p className="mt-2 font-bold text-blue-500">{lead.phone}</p></a>
          <a href={`mailto:${lead.email}`} className={`rounded-2xl border p-4 ${card}`}><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-50"><Mail size={15} />Email công việc</div><p className="mt-2 break-all font-bold text-blue-500">{lead.email}</p></a>
          <div className={`rounded-2xl border p-4 ${card}`}><span className="text-xs font-bold uppercase tracking-wider opacity-50">Loại hình cơ sở</span><p className="mt-2 font-bold">{facilityLabels[lead.facility_type] || lead.facility_type}</p></div>
          <div className={`rounded-2xl border p-4 ${card}`}><span className="text-xs font-bold uppercase tracking-wider opacity-50">Quy mô dự kiến</span><p className="mt-2 font-bold">{scaleLabels[lead.expected_scale] || lead.expected_scale}</p></div>
        </div>

        <div className={`mt-4 min-h-48 rounded-2xl border p-5 ${card}`}>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-50"><MessageSquareText size={16} />Nhu cầu cụ thể</div>
          <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7">{lead.requirements || 'Khách hàng chưa cung cấp nhu cầu cụ thể.'}</p>
        </div>

        {lead.cancellation_reason && <div className="mt-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4 text-sm text-rose-500"><strong>Lý do hủy:</strong> {lead.cancellation_reason}</div>}

        <div className={`mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border p-4 text-xs ${card}`}>
          <span className="flex items-center gap-2"><CalendarClock size={15} className="text-blue-500" /><strong>Ngày gửi:</strong> {formatVietnamDateTime(lead.created_at)}</span>
          <span className="opacity-60"><strong>Cập nhật:</strong> {formatVietnamDateTime(lead.updated_at)}</span>
        </div>
      </div>
    </div>
  );
}
