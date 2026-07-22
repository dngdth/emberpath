import React, { useMemo, useState } from 'react';
import { AuditLog } from '../../types/auth';
import { parseApiDate } from '../../utils/dateTime';
import { AuditLogFilterBar, ActionOption } from './AuditLogFilterBar';
import { AuditLogTable, describeAuditAction } from './AuditLogTable';

interface AuditLogSectionProps {
  logs: AuditLog[];
  darkMode: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
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

const ACTION_OPTIONS: ActionOption[] = [
  { value: 'impersonation_started', label: 'Bắt đầu phiên hỗ trợ' },
  { value: 'impersonated_websocket_connected', label: 'Kết nối cảm biến' },
  { value: 'tenant_provisioned', label: 'Khởi tạo không gian' },
  { value: 'password_reset', label: 'Đặt lại mật khẩu' },
  { value: 'lead_status_changed', label: 'Cập nhật ticket' },
  { value: 'impersonated_request', label: 'Xem / Thay đổi dữ liệu' },
];

export function AuditLogSection({
  logs,
  darkMode,
  onLoadMore,
  hasMore,
  loadingMore,
}: AuditLogSectionProps) {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedAdmin, setSelectedAdmin] = useState('all');
  const [selectedBuilding, setSelectedBuilding] = useState('all');
  const [selectedAction, setSelectedAction] = useState('all');

  // Extract unique admin list from logs
  const adminOptions = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((log) => {
      if (log.admin_name) set.add(log.admin_name);
    });
    return Array.from(set).sort();
  }, [logs]);

  // Extract unique building/enterprise list from logs
  const buildingOptions = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((log) => {
      if (log.building_name) set.add(log.building_name);
    });
    return Array.from(set).sort();
  }, [logs]);

  // Filter logs based on all active criteria
  const filteredLogs = useMemo(() => {
    const query = normalizeSearch(searchKeyword);

    return logs.filter((log) => {
      // 1. Keyword search (normalized text matching)
      if (query) {
        const actionDesc = describeAuditAction(log);
        const textToSearch = `${log.admin_name} ${log.building_name} ${actionDesc} ${log.action} ${log.method || ''} ${log.path || ''} ${log.ip_address || ''}`;
        if (!normalizeSearch(textToSearch).includes(query)) {
          return false;
        }
      }

      // 2. Admin filter
      if (selectedAdmin !== 'all' && log.admin_name !== selectedAdmin) {
        return false;
      }

      // 3. Enterprise / Building filter
      if (selectedBuilding !== 'all' && log.building_name !== selectedBuilding) {
        return false;
      }

      // 4. Action type filter
      if (selectedAction !== 'all') {
        if (selectedAction === 'lead_status_changed') {
          if (!log.action.startsWith('lead_status_changed')) return false;
        } else if (log.action !== selectedAction) {
          return false;
        }
      }

      // 5. Date range filter
      if (startDate || endDate) {
        const logDateObj = parseApiDate(log.created_at);
        // Format log date to YYYY-MM-DD in local time
        const year = logDateObj.getFullYear();
        const month = String(logDateObj.getMonth() + 1).padStart(2, '0');
        const day = String(logDateObj.getDate()).padStart(2, '0');
        const logDateStr = `${year}-${month}-${day}`;

        if (startDate && logDateStr < startDate) return false;
        if (endDate && logDateStr > endDate) return false;
      }

      return true;
    });
  }, [logs, searchKeyword, startDate, endDate, selectedAdmin, selectedBuilding, selectedAction]);

  const hasActiveFilters = Boolean(
    searchKeyword.trim() ||
      startDate ||
      endDate ||
      selectedAdmin !== 'all' ||
      selectedBuilding !== 'all' ||
      selectedAction !== 'all'
  );

  const resetFilters = () => {
    setSearchKeyword('');
    setStartDate('');
    setEndDate('');
    setSelectedAdmin('all');
    setSelectedBuilding('all');
    setSelectedAction('all');
  };

  return (
    <div className="space-y-4">
      {/* Versatile Search Filter Bar */}
      <AuditLogFilterBar
        searchKeyword={searchKeyword}
        onSearchKeywordChange={setSearchKeyword}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        selectedAdmin={selectedAdmin}
        onAdminChange={setSelectedAdmin}
        selectedBuilding={selectedBuilding}
        onBuildingChange={setSelectedBuilding}
        selectedAction={selectedAction}
        onActionChange={setSelectedAction}
        adminOptions={adminOptions}
        buildingOptions={buildingOptions}
        actionOptions={ACTION_OPTIONS}
        onResetFilters={resetFilters}
        hasActiveFilters={hasActiveFilters}
        totalCount={logs.length}
        filteredCount={filteredLogs.length}
        darkMode={darkMode}
      />

      {/* Audit Log Table / Cards */}
      <AuditLogTable
        logs={filteredLogs}
        darkMode={darkMode}
        onLoadMore={onLoadMore}
        hasMore={hasMore}
        loadingMore={loadingMore}
      />
    </div>
  );
}
