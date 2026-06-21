'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface UserInfo {
  id: string;
  phone: string;
  nickname: string;
  avatar_url: string | null;
}

interface AuthContextType {
  user: UserInfo | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (phone: string, password: string, nickname: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (data: { nickname?: string; avatar_url?: string }) => Promise<{ success: boolean; error?: string }>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
  getToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

const TOKEN_KEY = 'schedule_auth_token';

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

function setStoredToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/** Build headers with Authorization if token exists */
function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  const token = getStoredToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const getToken = useCallback(() => {
    return getStoredToken();
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
        headers: authHeaders(),
      });
      const json = await res.json();
      if (json.data) {
        setUser(json.data);
      } else {
        setUser(null);
        clearStoredToken();
      }
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const login = useCallback(async (phone: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
        credentials: 'include',
      });
      const json = await res.json();
      if (json.error) return { success: false, error: json.error };
      // Store token in localStorage for Authorization header fallback
      if (json.token) {
        setStoredToken(json.token);
      }
      setUser(json.data);
      return { success: true };
    } catch {
      return { success: false, error: '网络错误' };
    }
  }, []);

  const register = useCallback(async (phone: string, password: string, nickname: string) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password, nickname }),
        credentials: 'include',
      });
      const json = await res.json();
      if (json.error) return { success: false, error: json.error };
      // Store token in localStorage for Authorization header fallback
      if (json.token) {
        setStoredToken(json.token);
      }
      setUser(json.data);
      return { success: true };
    } catch {
      return { success: false, error: '网络错误' };
    }
  }, []);

  const logout = useCallback(() => {
    clearStoredToken();
    document.cookie = 'token=; path=/; max-age=0';
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (data: { nickname?: string; avatar_url?: string }) => {
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(data),
        credentials: 'include',
      });
      const json = await res.json();
      if (json.error) return { success: false, error: json.error };
      setUser(json.data);
      return { success: true };
    } catch {
      return { success: false, error: '网络错误' };
    }
  }, []);

  const changePassword = useCallback(async (oldPassword: string, newPassword: string) => {
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ oldPassword, newPassword }),
        credentials: 'include',
      });
      const json = await res.json();
      if (json.error) return { success: false, error: json.error };
      return { success: true };
    } catch {
      return { success: false, error: '网络错误' };
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile, changePassword, refreshUser, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}
