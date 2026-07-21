export interface BuildingInfo {
  id: number;
  name: string;
  code: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'super_admin' | 'admin_building' | 'operator';
  building_id: number;
  building: BuildingInfo;
  created_at: string;
}

export type LeadStatus = 'new' | 'processing' | 'closed' | 'cancelled';

export interface CustomerLead {
  id: number;
  full_name: string;
  phone: string;
  email: string;
  company_name: string | null;
  facility_type: string;
  expected_scale: string;
  requirements: string | null;
  status: LeadStatus;
  cancellation_reason: string | null;
  building_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerAccount {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface CustomerBuilding {
  id: number;
  name: string;
  code: string;
  created_at: string;
  users: CustomerAccount[];
}

export interface AuditLog {
  id: number;
  admin_id: number;
  admin_name: string;
  building_id: number;
  building_name: string;
  action: string;
  method: string | null;
  path: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}
