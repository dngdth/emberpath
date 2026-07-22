import { AuditLog, AuthResponse, CustomerBuilding, CustomerLead, LeadStatus, User } from '../types/auth';
import { FloorItem, FloorPlanObject, FloorPlanResponse, SafePathResult } from '../types/editor';
import { DashboardSummary, SensorDevice, SensorReading } from '../types/sensor';
import api, { getApiBaseUrl } from '../utils/api';
import { getToken } from '../utils/authHelpers';

export type RegisterPayload = Record<string, string>;

export type LeadPayload = {
  full_name: string;
  phone: string;
  email: string;
  company_name?: string;
  facility_type: string;
  expected_scale: string;
  requirements?: string;
};

export type FloorPlanSavePayload = {
  objects: FloorPlanObject[];
  canvas_width: number;
  canvas_height: number;
  canvas_shape: NonNullable<FloorPlanResponse['canvas_shape']>;
};

export type BuildingFloorPlanSavePayload = FloorPlanSavePayload & {
  floor_id: number;
};

export type SensorFilters = {
  floorId?: number | null;
  search?: string;
};

function sensorQuery(filters: SensorFilters = {}) {
  const params = new URLSearchParams();
  if (filters.floorId) params.set('floor_id', String(filters.floorId));
  if (filters.search?.trim()) params.set('search', filters.search.trim());
  return params;
}

function appendQuery(path: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export const authApi = {
  async login(email: string, password: string) {
    const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
    return data;
  },
  async register(payload: RegisterPayload) {
    const { data } = await api.post<AuthResponse>('/auth/register', payload);
    return data;
  },
  async me() {
    const { data } = await api.get<User>('/auth/me');
    return data;
  },
};

export const leadsApi = {
  async create(payload: LeadPayload) {
    const { data } = await api.post<{ id: number; message: string }>('/leads', payload);
    return data;
  },
};

export const adminApi = {
  async leads() {
    const { data } = await api.get<CustomerLead[]>('/admin/leads');
    return data;
  },
  async updateLeadStatus(leadId: number, status: LeadStatus, cancellationReason?: string) {
    const { data } = await api.patch<{
      lead: CustomerLead;
      provisioned_account: null | {
        building_id: number;
        building_name: string;
        email: string;
        temporary_password: string;
      };
    }>(`/admin/leads/${leadId}/status`, {
      status,
      cancellation_reason: cancellationReason || null,
    });
    return data;
  },
  async buildings() {
    const { data } = await api.get<CustomerBuilding[]>('/admin/buildings');
    return data;
  },
  async impersonate(buildingId: number) {
    const { data } = await api.post<AuthResponse & { expires_in_seconds: number }>(
      `/admin/buildings/${buildingId}/impersonate`,
    );
    return data;
  },
  async resetPassword(userId: number) {
    const { data } = await api.post<{
      user_id: number;
      email: string;
      temporary_password: string;
      message: string;
    }>(`/admin/users/${userId}/reset-password`);
    return data;
  },
  async auditLogs(limit: number = 50, offset: number = 0) {
    const { data } = await api.get<AuditLog[]>('/admin/audit-logs', {
      params: { limit, offset },
    });
    return data;
  },
};

export const floorsApi = {
  async list() {
    const { data } = await api.get<FloorItem[]>('/floors');
    return data;
  },
  async create(name: string) {
    const { data } = await api.post<FloorItem>('/floors', { name });
    return data;
  },
  async rename(floorId: number, name: string) {
    const { data } = await api.patch<FloorItem>(`/floors/${floorId}`, { name });
    return data;
  },
  async remove(floorId: number) {
    await api.delete(`/floors/${floorId}`);
  },
  async getPlan(floorId: number) {
    const { data } = await api.get<FloorPlanResponse>(`/floors/${floorId}/plan`);
    return data;
  },
  async savePlan(floorId: number, payload: FloorPlanSavePayload) {
    const { data } = await api.put<FloorPlanResponse>(`/floors/${floorId}/plan`, payload);
    return data;
  },
  async saveBuildingPlans(floors: BuildingFloorPlanSavePayload[]) {
    const { data } = await api.put<FloorPlanResponse[]>('/floors/plans/bulk', { floors });
    return data;
  },
  async findPath(floorId: number, startNodeId: string, endNodeId?: string) {
    const params = new URLSearchParams({ start_node_id: startNodeId });
    if (endNodeId) params.set('end_node_id', endNodeId);
    const { data } = await api.get<SafePathResult>(`/floors/${floorId}/path?${params.toString()}`);
    return data;
  },
};

export const sensorsApi = {
  async dashboardSummary() {
    const { data } = await api.get<DashboardSummary>('/dashboard/summary');
    return data;
  },
  async mq2(filters: SensorFilters = {}) {
    const { data } = await api.get<SensorDevice[]>(appendQuery('/sensors/mq2', sensorQuery(filters)));
    return data;
  },
  async temperature(filters: SensorFilters = {}) {
    const { data } = await api.get<SensorDevice[]>(appendQuery('/sensors/temperature', sensorQuery(filters)));
    return data;
  },
  async liveReadings() {
    const { data } = await api.get<SensorReading[]>('/sensors/readings/live');
    return data;
  },
};

export function getSensorsWebSocketUrl() {
  const token = getToken();
  if (!token) return null;

  const baseUrl = new URL(getApiBaseUrl());
  baseUrl.protocol = baseUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  baseUrl.pathname = '/ws/sensors';
  baseUrl.search = new URLSearchParams({ token }).toString();
  return baseUrl.toString();
}
