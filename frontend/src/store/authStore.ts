import { create } from 'zustand';
import { User } from '../types/auth';
import { adminApi, authApi, RegisterPayload } from '../services/backend';
import { clearAuthSession, getToken, isImpersonating, saveToken, startImpersonation, stopImpersonation } from '../utils/authHelpers';

interface AuthState {
  token: string | null;
  user: User | null;
  loading: boolean;
  impersonating: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  bootstrap: () => Promise<void>;
  impersonate: (buildingId: number) => Promise<void>;
  exitImpersonation: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: getToken(),
  user: null,
  loading: false,
  impersonating: isImpersonating(),
  login: async (email, password) => {
    set({ loading: true });
    try {
      const data = await authApi.login(email, password);
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
      const data = await authApi.register(payload);
      saveToken(data.access_token);
      set({ token: data.access_token, user: data.user, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },
  logout: () => {
    clearAuthSession();
    set({ token: null, user: null, impersonating: false });
  },
  bootstrap: async () => {
    const token = getToken();
    if (!token) return;
    set({ loading: true });
    try {
      const user = await authApi.me();
      set({ user, token, loading: false });
    } catch {
      clearAuthSession();
      set({ user: null, token: null, loading: false, impersonating: false });
    }
  },
  impersonate: async (buildingId) => {
    set({ loading: true });
    try {
      const data = await adminApi.impersonate(buildingId);
      startImpersonation(data.access_token);
      set({ token: data.access_token, user: data.user, loading: false, impersonating: true });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },
  exitImpersonation: async () => {
    const originalToken = stopImpersonation();
    if (!originalToken) {
      set({ token: null, user: null, impersonating: false });
      return;
    }
    set({ loading: true, token: originalToken, impersonating: false });
    try {
      const user = await authApi.me();
      set({ user, token: originalToken, loading: false });
    } catch (error) {
      clearAuthSession();
      set({ user: null, token: null, loading: false, impersonating: false });
      throw error;
    }
  },
}));
