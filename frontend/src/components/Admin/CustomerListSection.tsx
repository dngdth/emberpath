import React, { useMemo, useState } from 'react';
import {
  Building2,
  ExternalLink,
  KeyRound,
  Layers,
  Mail,
  Phone,
  RotateCcw,
  Search,
  Users,
  X
} from 'lucide-react';
import { CustomerBuilding } from '../../types/auth';
import { formatVietnamDate } from '../../utils/dateTime';

interface CustomerListSectionProps {
  buildings: CustomerBuilding[];
  busy: string | null;
  darkMode: boolean;
  facilityLabels: Record<string, string>;
  scaleLabels: Record<string, string>;
  onEnterBuilding: (buildingId: number) => void;
  onResetPassword: (userId: number) => void;
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

export function CustomerListSection({
  buildings,
  busy,
  darkMode,
  facilityLabels,
  scaleLabels,
  onEnterBuilding,
  onResetPassword,
}: CustomerListSectionProps) {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedFacility, setSelectedFacility] = useState<string>('all');
  const [selectedScale, setSelectedScale] = useState<string>('all');

  const filteredBuildings = useMemo(() => {
    const query = normalizeSearch(searchKeyword);
    const phoneQuery = searchKeyword.replace(/\D/g, '');

    return buildings.filter((building) => {
      // 1. Search matching (Name, Code, Phone, User names, User emails)
      if (query) {
        const textToSearch = [
          building.name,
          building.code,
          building.phone || '',
          ...building.users.map((u) => `${u.name} ${u.email}`),
        ].join(' ');

        const matchesText = normalizeSearch(textToSearch).includes(query);
        const matchesPhone =
          Boolean(phoneQuery) &&
          ((building.phone && building.phone.replace(/\D/g, '').includes(phoneQuery)) ||
            textToSearch.replace(/\D/g, '').includes(phoneQuery));

        if (!matchesText && !matchesPhone) {
          return false;
        }
      }

      // 2. Facility type filter
      if (selectedFacility !== 'all') {
        if (building.facility_type !== selectedFacility) {
          return false;
        }
      }

      // 3. Scale filter
      if (selectedScale !== 'all') {
        if (building.expected_scale !== selectedScale) {
          return false;
        }
      }

      return true;
    });
  }, [buildings, searchKeyword, selectedFacility, selectedScale]);

  const hasActiveFilters = Boolean(
    searchKeyword.trim() || selectedFacility !== 'all' || selectedScale !== 'all'
  );

  const resetFilters = () => {
    setSearchKeyword('');
    setSelectedFacility('all');
    setSelectedScale('all');
  };

  const panelBg = darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white';
  const inputBg = darkMode
    ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500 focus:border-blue-500'
    : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500';
  const selectBg = darkMode
    ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500'
    : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500';

  return (
    <div className="space-y-6 mt-7">
      {/* Search & Filter Controls Bar */}
      <div className={`rounded-3xl border p-4 sm:p-6 shadow-sm transition-all ${panelBg}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Main Keyword Search */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Tìm kiếm khách hàng theo tên, số điện thoại, email, mã công trình..."
              className={`w-full rounded-2xl border py-3 pl-11 pr-10 text-sm font-medium transition-all outline-none focus:ring-2 focus:ring-blue-500/20 ${inputBg}`}
            />
            {searchKeyword && (
              <button
                onClick={() => setSearchKeyword('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title="Xóa tìm kiếm"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Filter Select Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Facility Type Filter */}
            <div className="w-full sm:w-auto min-w-44">
              <select
                value={selectedFacility}
                onChange={(e) => setSelectedFacility(e.target.value)}
                className={`w-full rounded-2xl border px-3 py-3 text-xs font-bold outline-none transition-all cursor-pointer ${selectBg}`}
              >
                <option value="all">Tất cả loại hình cơ sở</option>
                {Object.entries(facilityLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Scale Filter */}
            <div className="w-full sm:w-auto min-w-40">
              <select
                value={selectedScale}
                onChange={(e) => setSelectedScale(e.target.value)}
                className={`w-full rounded-2xl border px-3 py-3 text-xs font-bold outline-none transition-all cursor-pointer ${selectBg}`}
              >
                <option value="all">Tất cả quy mô</option>
                {Object.entries(scaleLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Reset Filters */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className={`flex items-center gap-1.5 rounded-2xl border px-3.5 py-3 text-xs font-bold text-rose-500 transition-colors ${
                  darkMode ? 'border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20' : 'border-rose-200 bg-rose-50 hover:bg-rose-100'
                }`}
                title="Đặt lại tất cả bộ lọc"
              >
                <RotateCcw size={14} />
                <span className="hidden sm:inline">Xóa lọc</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Summary & Active Badges */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs opacity-75 pt-3 border-t border-dashed border-inherit">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-500 dark:text-slate-400">
              Hiển thị: <strong className="text-blue-500">{filteredBuildings.length}</strong> / {buildings.length} doanh nghiệp khách hàng
            </span>

            {searchKeyword && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-blue-500/10 px-2 py-0.5 text-blue-500 font-medium">
                Từ khóa: "{searchKeyword}"
                <X size={12} className="cursor-pointer" onClick={() => setSearchKeyword('')} />
              </span>
            )}
            {selectedFacility !== 'all' && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-2 py-0.5 text-amber-500 font-medium">
                Cơ sở: {facilityLabels[selectedFacility] || selectedFacility}
                <X size={12} className="cursor-pointer" onClick={() => setSelectedFacility('all')} />
              </span>
            )}
            {selectedScale !== 'all' && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-purple-500/10 px-2 py-0.5 text-purple-500 font-medium">
                Quy mô: {scaleLabels[selectedScale] || selectedScale}
                <X size={12} className="cursor-pointer" onClick={() => setSelectedScale('all')} />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Buildings Cards Grid */}
      {filteredBuildings.length === 0 ? (
        <div className={`rounded-3xl border p-12 text-center ${panelBg}`}>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-500/10 text-slate-400 mb-3">
            <Building2 size={24} />
          </div>
          <p className="text-sm font-semibold opacity-70">Không tìm thấy khách hàng / doanh nghiệp phù hợp.</p>
          <p className="mt-1 text-xs opacity-50">Thử thay đổi từ khóa tìm kiếm hoặc bỏ bớt các bộ lọc.</p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {filteredBuildings.map((building) => (
            <article key={building.id} className={`rounded-3xl border p-5 shadow-sm transition-all ${panelBg}`}>
              {/* Header: Building Info & Dashboard Action */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 font-bold">
                    <Building2 size={22} />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-base leading-snug">{building.name}</h2>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs opacity-60">
                      <span className="font-mono">{building.code}</span>
                      <span>·</span>
                      <span>Tạo {formatVietnamDate(building.created_at)}</span>
                    </div>

                    {/* Facility & Scale Badges if available */}
                    {(building.facility_type || building.expected_scale) && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {building.facility_type && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-500">
                            {facilityLabels[building.facility_type] || building.facility_type}
                          </span>
                        )}
                        {building.expected_scale && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-500/10 px-2 py-0.5 text-[11px] font-bold text-indigo-500">
                            <Layers size={11} />
                            {scaleLabels[building.expected_scale] || building.expected_scale}
                          </span>
                        )}
                        {building.phone && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-500">
                            <Phone size={11} />
                            {building.phone}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  disabled={busy === `building-${building.id}`}
                  onClick={() => onEnterBuilding(building.id)}
                  className="flex items-center gap-2 shrink-0 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  <ExternalLink size={14} />
                  <span className="hidden sm:inline">Truy cập Dashboard</span>
                  <span className="sm:hidden">Truy cập</span>
                </button>
              </div>

              {/* Accounts List inside Building */}
              <div className="mt-5 space-y-2">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-1">
                  <Users size={12} />
                  <span>Tài khoản quản lý ({building.users.filter((u) => u.role !== 'super_admin').length})</span>
                </div>

                {building.users
                  .filter((u) => u.role !== 'super_admin')
                  .map((user) => (
                    <div
                      key={user.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl p-3.5 transition-colors ${
                        darkMode ? 'bg-slate-950/60 border border-slate-800/80' : 'bg-slate-50 border border-slate-100'
                      }`}
                    >
                      <div>
                        <strong className="text-sm font-bold block">{user.name}</strong>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs opacity-60">
                          <span className="flex items-center gap-1">
                            <Mail size={12} />
                            {user.email}
                          </span>
                          <span>·</span>
                          <span className="capitalize font-mono text-[11px] bg-slate-500/10 px-1.5 py-0.5 rounded">
                            {user.role}
                          </span>
                        </div>
                      </div>

                      <button
                        disabled={busy === `user-${user.id}`}
                        onClick={() => onResetPassword(user.id)}
                        className="flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-inherit px-3 py-2 text-xs font-bold transition-colors hover:text-orange-500 hover:border-orange-500/30 cursor-pointer"
                      >
                        <KeyRound size={14} />
                        <span>Đặt lại mật khẩu</span>
                      </button>
                    </div>
                  ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
