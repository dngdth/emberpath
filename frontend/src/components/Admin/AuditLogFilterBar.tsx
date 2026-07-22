import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Building2,
  Calendar,
  Filter,
  RotateCcw,
  Search,
  Shield,
  UserCheck,
  Activity,
  X
} from 'lucide-react';

export interface ActionOption {
  value: string;
  label: string;
}

interface AuditLogFilterBarProps {
  searchKeyword: string;
  onSearchKeywordChange: (val: string) => void;
  startDate: string;
  onStartDateChange: (val: string) => void;
  endDate: string;
  onEndDateChange: (val: string) => void;
  selectedAdmin: string;
  onAdminChange: (val: string) => void;
  selectedBuilding: string;
  onBuildingChange: (val: string) => void;
  selectedAction: string;
  onActionChange: (val: string) => void;
  adminOptions: string[];
  buildingOptions: string[];
  actionOptions: ActionOption[];
  onResetFilters: () => void;
  hasActiveFilters: boolean;
  totalCount: number;
  filteredCount: number;
  darkMode: boolean;
}

export function AuditLogFilterBar({
  searchKeyword,
  onSearchKeywordChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  selectedAdmin,
  onAdminChange,
  selectedBuilding,
  onBuildingChange,
  selectedAction,
  onActionChange,
  adminOptions,
  buildingOptions,
  actionOptions,
  onResetFilters,
  hasActiveFilters,
  totalCount,
  filteredCount,
  darkMode,
}: AuditLogFilterBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(true);

  // Quick date presets
  const applyDatePreset = (preset: 'today' | '7days' | '30days' | 'all') => {
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    if (preset === 'today') {
      const todayStr = formatDate(today);
      onStartDateChange(todayStr);
      onEndDateChange(todayStr);
    } else if (preset === '7days') {
      const past7 = new Date();
      past7.setDate(today.getDate() - 7);
      onStartDateChange(formatDate(past7));
      onEndDateChange(formatDate(today));
    } else if (preset === '30days') {
      const past30 = new Date();
      past30.setDate(today.getDate() - 30);
      onStartDateChange(formatDate(past30));
      onEndDateChange(formatDate(today));
    } else if (preset === 'all') {
      onStartDateChange('');
      onEndDateChange('');
    }
  };

  const isPresetActive = (preset: 'today' | '7days' | '30days' | 'all') => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (preset === 'all') return !startDate && !endDate;
    if (preset === 'today') return startDate === todayStr && endDate === todayStr;
    if (preset === '7days') {
      const past7 = new Date();
      past7.setDate(new Date().getDate() - 7);
      return startDate === past7.toISOString().split('T')[0] && endDate === todayStr;
    }
    if (preset === '30days') {
      const past30 = new Date();
      past30.setDate(new Date().getDate() - 30);
      return startDate === past30.toISOString().split('T')[0] && endDate === todayStr;
    }
    return false;
  };

  const cardBg = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const inputBg = darkMode
    ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500 placeholder-slate-500'
    : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500 placeholder-slate-400';
  const selectBg = darkMode
    ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500'
    : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500';

  return (
    <div className={`mt-6 rounded-3xl border p-4 sm:p-6 shadow-sm transition-all ${cardBg}`}>
      {/* Search Header Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Main Search Input */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => onSearchKeywordChange(e.target.value)}
            placeholder="Tìm kiếm đa năng (ngày, admin, doanh nghiệp, hoạt động, IP)..."
            className={`w-full rounded-2xl border py-3 pl-11 pr-10 text-sm font-medium transition-all outline-none focus:ring-2 focus:ring-blue-500/20 ${inputBg}`}
          />
          {searchKeyword && (
            <button
              onClick={() => onSearchKeywordChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              title="Xóa tìm kiếm"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors ${
              showAdvanced
                ? 'bg-blue-600 text-white border-blue-600'
                : darkMode
                ? 'border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800'
                : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Filter size={16} />
            <span>Bộ lọc chi tiết</span>
            {hasActiveFilters && (
              <span className="flex h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
            )}
          </button>

          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              className={`flex items-center gap-1.5 rounded-2xl border px-3.5 py-3 text-xs font-bold text-rose-500 transition-colors ${
                darkMode ? 'border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20' : 'border-rose-200 bg-rose-50 hover:bg-rose-100'
              }`}
              title="Đặt lại toàn bộ bộ lọc"
            >
              <RotateCcw size={14} />
              <span className="hidden sm:inline">Xóa lọc</span>
            </button>
          )}
        </div>
      </div>

      {/* Advanced Collapsible Filter Panel */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-5 pt-5 border-t border-inherit space-y-4">
              {/* Quick Date Presets */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1">
                  Khoảng thời gian:
                </span>
                {(['all', 'today', '7days', '30days'] as const).map((preset) => {
                  const labelMap = {
                    all: 'Tất cả',
                    today: 'Hôm nay',
                    '7days': '7 ngày qua',
                    '30days': '30 ngày qua',
                  };
                  const active = isPresetActive(preset);
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => applyDatePreset(preset)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                        active
                          ? 'bg-blue-600 text-white shadow-sm'
                          : darkMode
                          ? 'bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {labelMap[preset]}
                    </button>
                  );
                })}
              </div>

              {/* Specific Filter Inputs Grid (Desktop 4 columns, Mobile stacked) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Date Range: Start & End Date */}
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-xs font-bold opacity-70">
                    <Calendar size={14} className="text-blue-500" />
                    <span>Từ ngày - Đến ngày</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => onStartDateChange(e.target.value)}
                      className={`w-full rounded-xl border px-2.5 py-2 text-xs font-medium outline-none transition-all ${inputBg}`}
                    />
                    <span className="text-xs opacity-50">-</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => onEndDateChange(e.target.value)}
                      className={`w-full rounded-xl border px-2.5 py-2 text-xs font-medium outline-none transition-all ${inputBg}`}
                    />
                  </div>
                </div>

                {/* 2. Admin Type / Name Filter */}
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-xs font-bold opacity-70">
                    <UserCheck size={14} className="text-emerald-500" />
                    <span>Quản trị viên</span>
                  </label>
                  <select
                    value={selectedAdmin}
                    onChange={(e) => onAdminChange(e.target.value)}
                    className={`w-full rounded-xl border px-3 py-2 text-xs font-semibold outline-none transition-all cursor-pointer ${selectBg}`}
                  >
                    <option value="all">Tất cả quản trị viên</option>
                    {adminOptions.map((admin) => (
                      <option key={admin} value={admin}>
                        {admin}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Enterprise / Building Filter */}
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-xs font-bold opacity-70">
                    <Building2 size={14} className="text-amber-500" />
                    <span>Doanh nghiệp</span>
                  </label>
                  <select
                    value={selectedBuilding}
                    onChange={(e) => onBuildingChange(e.target.value)}
                    className={`w-full rounded-xl border px-3 py-2 text-xs font-semibold outline-none transition-all cursor-pointer ${selectBg}`}
                  >
                    <option value="all">Tất cả doanh nghiệp</option>
                    {buildingOptions.map((bName) => (
                      <option key={bName} value={bName}>
                        {bName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Activity / Action Filter */}
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-xs font-bold opacity-70">
                    <Activity size={14} className="text-purple-500" />
                    <span>Loại hoạt động</span>
                  </label>
                  <select
                    value={selectedAction}
                    onChange={(e) => onActionChange(e.target.value)}
                    className={`w-full rounded-xl border px-3 py-2 text-xs font-semibold outline-none transition-all cursor-pointer ${selectBg}`}
                  >
                    <option value="all">Tất cả hoạt động</option>
                    {actionOptions.map((act) => (
                      <option key={act.value} value={act.value}>
                        {act.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter Summary & Active Chips Bar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs opacity-75 pt-3 border-t border-dashed border-inherit">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-slate-500 dark:text-slate-400">
            Kết quả: <strong className="text-blue-500">{filteredCount}</strong> / {totalCount} nhật ký
          </span>

          {/* Render Active Filter Badges */}
          {searchKeyword && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-blue-500/10 px-2 py-0.5 text-blue-500 font-medium">
              Từ khóa: "{searchKeyword}"
              <X size={12} className="cursor-pointer" onClick={() => onSearchKeywordChange('')} />
            </span>
          )}
          {(startDate || endDate) && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-0.5 text-emerald-500 font-medium">
              Ngày: {startDate || '...'} → {endDate || '...'}
              <X size={12} className="cursor-pointer" onClick={() => { onStartDateChange(''); onEndDateChange(''); }} />
            </span>
          )}
          {selectedAdmin !== 'all' && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-2 py-0.5 text-amber-500 font-medium">
              Admin: {selectedAdmin}
              <X size={12} className="cursor-pointer" onClick={() => onAdminChange('all')} />
            </span>
          )}
          {selectedBuilding !== 'all' && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-purple-500/10 px-2 py-0.5 text-purple-500 font-medium">
              DN: {selectedBuilding}
              <X size={12} className="cursor-pointer" onClick={() => onBuildingChange('all')} />
            </span>
          )}
          {selectedAction !== 'all' && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-500/10 px-2 py-0.5 text-indigo-500 font-medium">
              Hoạt động: {actionOptions.find((a) => a.value === selectedAction)?.label || selectedAction}
              <X size={12} className="cursor-pointer" onClick={() => onActionChange('all')} />
            </span>
          )}
        </div>

        {hasActiveFilters && (
          <button
            onClick={onResetFilters}
            className="text-xs font-semibold text-blue-500 hover:underline"
          >
            Đặt lại bộ lọc
          </button>
        )}
      </div>
    </div>
  );
}
