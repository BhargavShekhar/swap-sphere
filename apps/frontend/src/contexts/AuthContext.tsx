/**
 * Authentication Context
 * Provides authentication state and methods throughout the app
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authApi, profileApi, type User, type SignupData, type LoginData, type ProfileData } from '../services/auth.api';
import { privacyApi } from '../services/privacy.api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  signup: (data: SignupData) => Promise<void>;
  login: (data: LoginData) => Promise<void>;
  logout: () => void;
  updateProfile: (data: ProfileData) => Promise<void>;
  refreshUser: () => Promise<void>;
  toggleAnonymous: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is authenticated on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        // No token, skip API call
        setUser(null);
        setLoading(false);
        return;
      }
      
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
    } catch (error: any) {
      // Not authenticated or token expired - this is expected, don't log
      // Only log if it's not an expected auth error
      if (!error?.isAuthError && !error?.silent) {
        console.log('Auth check failed:', error);
      }
      setUser(null);
      authApi.logout();
    } finally {
      setLoading(false);
    }
  };

  const signup = async (data: SignupData) => {
    const response = await authApi.signup(data);
    setUser(response.user);
  };

  const login = async (data: LoginData) => {
    const response = await authApi.login(data);
    setUser(response.user);
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
  };

  const updateProfile = async (data: ProfileData) => {
    const updatedUser = await profileApi.updateProfile(data);
    setUser(updatedUser);
  };

  const refreshUser = async () => {
    try {
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      setUser(null);
    }
  };

  const toggleAnonymous = async () => {
    try {
      const response = await privacyApi.toggleAnonymous();
      // Refresh user to get updated anonymous state
      await refreshUser();
      return response;
    } catch (error) {
      console.error('Error toggling anonymous mode:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    signup,
    login,
    logout,
    updateProfile,
    refreshUser,
    toggleAnonymous,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

