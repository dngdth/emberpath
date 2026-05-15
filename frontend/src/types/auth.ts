export interface BuildingInfo {
  id: number;
  name: string;
  code: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin_building' | 'operator';
  building_id: number;
  building: BuildingInfo;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}
