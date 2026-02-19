import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api } from '@/services/api';

interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await SecureStore.getItemAsync('auth_token');
      if (storedToken) {
        setToken(storedToken);
        api.setToken(storedToken);
        const userData = await api.getMe();
        setUser(userData);
      }
    } catch (error) {
      console.error('Failed to load auth:', error);
      await SecureStore.deleteItemAsync('auth_token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (accessToken: string, userData: User) => {
    await SecureStore.setItemAsync('auth_token', accessToken);
    setToken(accessToken);
    setUser(userData);
    api.setToken(accessToken);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('auth_token');
    setToken(null);
    setUser(null);
    api.setToken(null);
  };

  const register = async (name: string, email: string, password: string) => {
    const response = await api.register(name, email, password);
    await login(response.access_token, response.user);
  };

  const signIn = async (email: string, password: string) => {
    const response = await api.login(email, password);
    await login(response.access_token, response.user);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, register, signIn }}>
      {children}
    </AuthContext.Provider>
  );
};
