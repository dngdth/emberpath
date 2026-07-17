import { AlertTriangle, Flame, ShieldCheck, Thermometer } from 'lucide-react';
import { DashboardSummary } from '../../types/sensor';

const items = (summary: DashboardSummary | null) => [
  { label: 'Tổng số MQ2', value: summary?.total_mq2 ?? '--', icon: Flame },
  { label: 'Tổng số cảm biến nhiệt', value: summary?.total_temperature ?? '--', icon: Thermometer },
  { label: 'Đang an toàn', value: summary?.safe_count ?? '--', icon: ShieldCheck },
  { label: 'Đang nguy hiểm', value: summary?.danger_count ?? '--', icon: AlertTriangle },
];

export function DashboardSummaryCards({ summary }: { summary: DashboardSummary | null }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items(summary).map((item) => {
        const Icon = item.icon;

        return (
          <div
            key={item.label}
            className="rounded-[24px] border border-[#e2c6bb] bg-[#fff8f3] p-5 shadow-[0_8px_24px_rgba(122,43,29,0.06)]"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-[#8a5a4b]">{item.label}</span>
              <div className="rounded-2xl bg-[#f5e4db] p-2 text-[#b33a2f]">
                <Icon size={18} />
              </div>
            </div>

            <div className="text-3xl font-bold text-[#a5261f]">{item.value}</div>

            <p className="mt-3 text-xs text-[#9a6d5d]">
              Cập nhật gần nhất: {summary?.latest_updated_at ? new Date(summary.latest_updated_at).toLocaleString() : '--'}
            </p>
          </div>
        );
      })}
    </div>
  );
}