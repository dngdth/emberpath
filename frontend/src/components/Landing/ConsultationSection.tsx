import { useState } from 'react';
import { AxiosError } from 'axios';
import { CheckCircle2, Loader2, Mail, MessageCircle, Phone, Send } from 'lucide-react';
import { leadsApi } from '../../services/backend';
import { ScrollReveal } from './ScrollReveal';
import { normalizeVietnamPhone, validateEmail, validateFullName, validateVietnamPhone } from '../../utils/customerValidation';

interface Props { isDark: boolean; }

const initialForm = {
  full_name: '', phone: '', email: '', company_name: '',
  facility_type: '', expected_scale: '', requirements: '',
};
type FormKey = keyof typeof initialForm;
type FormErrors = Partial<Record<FormKey, string>>;

const hotline = import.meta.env.VITE_CONTACT_HOTLINE || 'Chưa cập nhật';
const zaloUrl = import.meta.env.VITE_CONTACT_ZALO || '';
const contactEmail = import.meta.env.VITE_CONTACT_EMAIL || 'Chưa cập nhật';

export function ConsultationSection({ isDark }: Props) {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});

  function validateField(key: FormKey, value: string) {
    if (key === 'full_name') return validateFullName(value);
    if (key === 'phone') return validateVietnamPhone(value);
    if (key === 'email') return validateEmail(value);
    if (key === 'facility_type' && !value) return 'Vui lòng chọn loại hình cơ sở.';
    if (key === 'expected_scale' && !value) return 'Vui lòng chọn quy mô dự kiến.';
    return '';
  }

  function updateField(key: FormKey, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    if (fieldErrors[key]) setFieldErrors((current) => ({ ...current, [key]: '' }));
  }

  function checkField(key: FormKey) {
    setFieldErrors((current) => ({ ...current, [key]: validateField(key, form[key]) }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors: FormErrors = {
      full_name: validateFullName(form.full_name),
      phone: validateVietnamPhone(form.phone),
      email: validateEmail(form.email),
      facility_type: validateField('facility_type', form.facility_type),
      expected_scale: validateField('expected_scale', form.expected_scale),
    };
    setFieldErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      setError('Vui lòng kiểm tra lại các trường được đánh dấu.');
      return;
    }
    setLoading(true); setMessage(''); setError('');
    try {
      const result = await leadsApi.create({ ...form, phone: normalizeVietnamPhone(form.phone) });
      setMessage(result.message);
      setForm(initialForm);
      setFieldErrors({});
    } catch (err) {
      const detail = (err as AxiosError<{ detail?: string }>).response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Không thể gửi yêu cầu. Vui lòng thử lại sau.');
    } finally { setLoading(false); }
  }

  const fieldClass = `w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${isDark
    ? 'border-slate-700 bg-slate-950/70 text-white placeholder:text-slate-600 focus:border-orange-500'
    : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-orange-500'}`;

  return (
    <section id="consultation" className={`py-20 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <ScrollReveal>
          <div className="lg:sticky lg:top-28">
            <span className="text-sm font-bold uppercase tracking-[0.2em] text-orange-500">Tư vấn giải pháp</span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">Cùng xây dựng lộ trình an toàn phù hợp cho công trình của bạn</h2>
            <p className={`mt-5 leading-7 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Chia sẻ quy mô và nhu cầu thực tế. Đội ngũ Emberpath sẽ liên hệ để khảo sát, tư vấn thiết bị và gửi tài liệu kỹ thuật phù hợp.</p>
            <div className="mt-8 space-y-3">
              {hotline === 'Chưa cập nhật' ? <div className={`flex items-center gap-3 rounded-2xl border p-4 ${isDark ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-white'}`}><Phone className="text-orange-500" size={20} /><span><small className="block opacity-60">Hotline</small><strong>{hotline}</strong></span></div> : <a href={`tel:${hotline.replace(/\s/g, '')}`} className={`flex items-center gap-3 rounded-2xl border p-4 ${isDark ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-white'}`}><Phone className="text-orange-500" size={20} /><span><small className="block opacity-60">Hotline</small><strong>{hotline}</strong></span></a>}
              {zaloUrl ? <a href={zaloUrl} target="_blank" rel="noreferrer" className={`flex items-center gap-3 rounded-2xl border p-4 ${isDark ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-white'}`}><MessageCircle className="text-blue-500" size={20} /><span><small className="block opacity-60">Zalo</small><strong>Nhắn tin trực tiếp</strong></span></a> : <div className={`flex items-center gap-3 rounded-2xl border p-4 ${isDark ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-white'}`}><MessageCircle className="text-blue-500" size={20} /><span><small className="block opacity-60">Zalo</small><strong>Chưa cập nhật</strong></span></div>}
              {contactEmail === 'Chưa cập nhật' ? <div className={`flex items-center gap-3 rounded-2xl border p-4 ${isDark ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-white'}`}><Mail className="text-emerald-500" size={20} /><span><small className="block opacity-60">Email</small><strong>{contactEmail}</strong></span></div> : <a href={`mailto:${contactEmail}`} className={`flex items-center gap-3 rounded-2xl border p-4 ${isDark ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-white'}`}><Mail className="text-emerald-500" size={20} /><span><small className="block opacity-60">Email</small><strong>{contactEmail}</strong></span></a>}
            </div>
          </div>
        </ScrollReveal>
        <ScrollReveal>
          <form onSubmit={handleSubmit} className={`rounded-[28px] border p-6 shadow-xl sm:p-8 ${isDark ? 'border-slate-800 bg-[#0F172A]' : 'border-slate-200 bg-white'}`}>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-semibold">Họ và tên <span className="text-orange-500">*</span><input className={`${fieldClass} ${fieldErrors.full_name ? '!border-red-500' : ''}`} required maxLength={100} value={form.full_name} onChange={(e) => updateField('full_name', e.target.value)} onBlur={() => checkField('full_name')} placeholder="Nguyễn Văn An" />{fieldErrors.full_name && <span className="block text-xs font-medium text-red-500">{fieldErrors.full_name}</span>}</label>
              <label className="space-y-2 text-sm font-semibold">Số điện thoại (Zalo) <span className="text-orange-500">*</span><input className={`${fieldClass} ${fieldErrors.phone ? '!border-red-500' : ''}`} type="tel" inputMode="tel" required maxLength={20} value={form.phone} onChange={(e) => updateField('phone', e.target.value)} onBlur={() => checkField('phone')} placeholder="0901 234 567" />{fieldErrors.phone && <span className="block text-xs font-medium text-red-500">{fieldErrors.phone}</span>}</label>
              <label className="space-y-2 text-sm font-semibold">Email công việc <span className="text-orange-500">*</span><input className={`${fieldClass} ${fieldErrors.email ? '!border-red-500' : ''}`} type="email" required maxLength={160} value={form.email} onChange={(e) => updateField('email', e.target.value)} onBlur={() => checkField('email')} placeholder="ban@congty.vn" />{fieldErrors.email && <span className="block text-xs font-medium text-red-500">{fieldErrors.email}</span>}</label>
              <label className="space-y-2 text-sm font-semibold">Tên Công ty/Tổ chức<input className={fieldClass} maxLength={160} value={form.company_name} onChange={(e) => updateField('company_name', e.target.value)} placeholder="Tên doanh nghiệp" /></label>
              <label className="space-y-2 text-sm font-semibold">Loại hình cơ sở <span className="text-orange-500">*</span><select className={`${fieldClass} ${fieldErrors.facility_type ? '!border-red-500' : ''}`} required value={form.facility_type} onChange={(e) => updateField('facility_type', e.target.value)} onBlur={() => checkField('facility_type')}><option value="">Chọn loại hình</option><option value="apartment">Chung cư</option><option value="office">Văn phòng</option><option value="hospital">Bệnh viện</option><option value="factory">Nhà máy</option><option value="other">Khác</option></select>{fieldErrors.facility_type && <span className="block text-xs font-medium text-red-500">{fieldErrors.facility_type}</span>}</label>
              <label className="space-y-2 text-sm font-semibold">Quy mô dự kiến <span className="text-orange-500">*</span><select className={`${fieldClass} ${fieldErrors.expected_scale ? '!border-red-500' : ''}`} required value={form.expected_scale} onChange={(e) => updateField('expected_scale', e.target.value)} onBlur={() => checkField('expected_scale')}><option value="">Chọn quy mô</option><option value="under_5">Dưới 5 tầng</option><option value="5_10">5–10 tầng</option><option value="over_10">Trên 10 tầng</option></select>{fieldErrors.expected_scale && <span className="block text-xs font-medium text-red-500">{fieldErrors.expected_scale}</span>}</label>
              <label className="space-y-2 text-sm font-semibold sm:col-span-2">Nhu cầu cụ thể<textarea className={`${fieldClass} min-h-32 resize-y`} maxLength={2000} value={form.requirements} onChange={(e) => updateField('requirements', e.target.value)} placeholder="Mô tả công trình, vấn đề cần giải quyết hoặc thời gian dự kiến..." /><span className="block text-right text-xs font-medium opacity-40">{form.requirements.length}/2000</span></label>
            </div>
            {message && <div className="mt-5 flex items-start gap-2 rounded-2xl bg-emerald-500/10 p-4 text-sm text-emerald-500"><CheckCircle2 size={19} />{message}</div>}
            {error && <div className="mt-5 rounded-2xl bg-red-500/10 p-4 text-sm text-red-500">{error}</div>}
            <button disabled={loading} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-3.5 font-bold text-white shadow-lg shadow-orange-500/20 hover:from-orange-600 hover:to-orange-700 disabled:opacity-60">{loading ? <Loader2 className="animate-spin" size={19} /> : <Send size={19} />}{loading ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu tư vấn'}</button>
            <p className={`mt-3 text-center text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Thông tin của bạn chỉ được sử dụng để tư vấn giải pháp Emberpath.</p>
          </form>
        </ScrollReveal>
      </div>
    </section>
  );
}
