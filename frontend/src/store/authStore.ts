import { create } from 'zustand';
import { AuthResponse, User } from '../types/auth';
import api from '../utils/api';
import { clearToken, getToken, saveToken } from '../utils/authHelpers';

interface AuthState {
  token: string | null;
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: Record<string, string>) => Promise<void>;
  logout: () => void;
  bootstrap: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: getToken(),
  user: null,
  loading: false,
  login: async (email, password) => {
    set({ loading: true });
    try {
      const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
      saveToken(data.access_token);
      set({ token: data.access_token, user: data.user, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },
  register: async (payload) => {
    set({ loading: true });
    try {
      const { data } = await api.post<AuthResponse>('/auth/register', payload);
      saveToken(data.access_token);
      set({ token: data.access_token, user: data.user, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },
  logout: () => {
    clearToken();
    set({ token: null, user: null });
  },
  bootstrap: async () => {
    const token = getToken();
    if (!token) return;
    set({ loading: true });
    try {
      const { data } = await api.get<User>('/auth/me');
      set({ user: data, token, loading: false });
    } catch {
      clearToken();
      set({ user: null, token: null, loading: false });
    }
  },
}));
