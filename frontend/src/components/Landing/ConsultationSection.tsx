import { Phone, MessageCircle, Mail } from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';
import { ConsultationForm } from './ConsultationForm';

interface Props {
  isDark: boolean;
  onOpenConsultation: () => void;
}

const hotline = import.meta.env.VITE_CONTACT_HOTLINE || 'Chưa cập nhật';
const zaloUrl = import.meta.env.VITE_CONTACT_ZALO || '';
const contactEmail = import.meta.env.VITE_CONTACT_EMAIL || 'Chưa cập nhật';

export function ConsultationSection({ isDark, onOpenConsultation }: Props) {
  return (
    <section id="consultation" className={`py-20 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <ScrollReveal>
          <div className="lg:sticky lg:top-28">
            <span className="text-sm font-bold uppercase tracking-[0.2em] text-orange-500">Tư vấn giải pháp</span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
              Cùng xây dựng lộ trình an toàn phù hợp cho công trình của bạn
            </h2>
            <p className={`mt-5 leading-7 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Chia sẻ quy mô và nhu cầu thực tế. Đội ngũ Emberpath sẽ liên hệ để khảo sát, tư vấn thiết bị và gửi tài liệu kỹ thuật phù hợp.
            </p>
            <div className="mt-8 space-y-3">
              {hotline === 'Chưa cập nhật' ? (
                <div className={`flex items-center gap-3 rounded-2xl border p-4 ${isDark ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-white'}`}>
                  <Phone className="text-orange-500" size={20} />
                  <span>
                    <small className="block opacity-60">Hotline</small>
                    <strong>{hotline}</strong>
                  </span>
                </div>
              ) : (
                <a href={`tel:${hotline.replace(/\s/g, '')}`} className={`flex items-center gap-3 rounded-2xl border p-4 ${isDark ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-white'}`}>
                  <Phone className="text-orange-500" size={20} />
                  <span>
                    <small className="block opacity-60">Hotline</small>
                    <strong>{hotline}</strong>
                  </span>
                </a>
              )}
              {zaloUrl ? (
                <a href={zaloUrl} target="_blank" rel="noreferrer" className={`flex items-center gap-3 rounded-2xl border p-4 ${isDark ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-white'}`}>
                  <MessageCircle className="text-blue-500" size={20} />
                  <span>
                    <small className="block opacity-60">Zalo</small>
                    <strong>Nhắn tin trực tiếp</strong>
                  </span>
                </a>
              ) : (
                <div className={`flex items-center gap-3 rounded-2xl border p-4 ${isDark ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-white'}`}>
                  <MessageCircle className="text-blue-500" size={20} />
                  <span>
                    <small className="block opacity-60">Zalo</small>
                    <strong>Chưa cập nhật</strong>
                  </span>
                </div>
              )}
              {contactEmail === 'Chưa cập nhật' ? (
                <div className={`flex items-center gap-3 rounded-2xl border p-4 ${isDark ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-white'}`}>
                  <Mail className="text-emerald-500" size={20} />
                  <span>
                    <small className="block opacity-60">Email</small>
                    <strong>{contactEmail}</strong>
                  </span>
                </div>
              ) : (
                <a href={`mailto:${contactEmail}`} className={`flex items-center gap-3 rounded-2xl border p-4 ${isDark ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-white'}`}>
                  <Mail className="text-emerald-500" size={20} />
                  <span>
                    <small className="block opacity-60">Email</small>
                    <strong>{contactEmail}</strong>
                  </span>
                </a>
              )}
            </div>
          </div>
        </ScrollReveal>
        <ScrollReveal>
          <div 
            onClick={onOpenConsultation}
            className="relative cursor-pointer"
          >
            {/* Transparent overlay that captures clicks */}
            <div className="absolute inset-0 z-10 rounded-[28px]" />
            
            {/* Visual preview of the form */}
            <ConsultationForm isDark={isDark} readOnly={true} />
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
