/**
 * Authentication API Service
 * Handles signup, login, and token management
 */

import axios from 'axios';

const MATCHING_ENGINE_URL = import.meta.env.VITE_MATCHING_ENGINE_URL || 'http://localhost:8081';

const api = axios.create({
  baseURL: MATCHING_ENGINE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add auth token to requests
api.interceptors.request.use(
  (config) => {
    // Add token to requests if available
    const token = getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle 401 errors gracefully
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // For 401 errors on /api/auth/me, this is expected when not logged in
    // Suppress console errors for this case
    if (error.response?.status === 401 && error.config?.url?.includes('/api/auth/me')) {
      // Mark as handled to prevent browser console error
      error.isHandled = true;
      return Promise.reject(error);
    }
    // For login 401, this is a real error (wrong credentials) - let it through
    // For other errors, log them
    if (error.response?.status !== 401) {
      console.error('API Error:', error);
    }
    return Promise.reject(error);
  }
);

export interface User {
  id: string;
  name: string;
  email: string;
  offer_skill?: string;
  want_skill?: string;
  skill_level?: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface SignupData {
  name: string;
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface ProfileData {
  offer_skill: string;
  want_skill: string;
  skill_level?: number; // 1-10
}

/**
 * Get token from localStorage
 */
export const getToken = (): string | null => {
  return localStorage.getItem('token');
};

/**
 * Set token in localStorage
 */
export const setToken = (token: string): void => {
  localStorage.setItem('token', token);
};

/**
 * Remove token from localStorage
 */
export const removeToken = (): void => {
  localStorage.removeItem('token');
};

/**
 * Set authorization header for authenticated requests
 * Note: The request interceptor now handles this automatically,
 * but we keep this for backwards compatibility
 */
export const setAuthHeader = (token: string | null): void => {
  // The interceptor handles this, but we can still set it for explicit control
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

/**
 * Auth API
 */
export const authApi = {
  /**
   * Sign up a new user
   */
  async signup(data: SignupData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/api/auth/signup', data);
    setToken(response.data.token);
    setAuthHeader(response.data.token);
    return response.data;
  },

  /**
   * Login user
   */
  async login(data: LoginData): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>('/api/auth/login', data);
      setToken(response.data.token);
      setAuthHeader(response.data.token);
      return response.data;
    } catch (error: any) {
      // For login, 401 means wrong credentials - this is a real error
      if (error.response?.status === 401) {
        throw new Error(error.response.data?.error || 'Invalid email or password');
      }
      if (error.response) {
        // Server responded with error
        throw new Error(error.response.data?.error || 'Login failed');
      } else if (error.request) {
        // Request made but no response
        throw new Error('Unable to connect to server. Please check if the matching engine is running.');
      } else {
        // Error setting up request
        throw new Error(error.message || 'Login failed');
      }
    }
  },

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User> {
    try {
      const response = await api.get<{ user: User }>('/api/auth/me');
      // Check if response status is 401 (shouldn't happen with validateStatus, but just in case)
      if (response.status === 401) {
        removeToken();
        setAuthHeader(null);
        throw new Error('Not authenticated');
      }
      return response.data.user;
    } catch (error: any) {
      if (error.response?.status === 401) {
        // Token invalid or expired - this is expected when checking auth status
        removeToken();
        setAuthHeader(null);
        // Return a silent rejection that won't show in console
        const silentError = new Error('Not authenticated');
        (silentError as any).silent = true;
        (silentError as any).isAuthError = true;
        throw silentError;
      }
      throw error;
    }
  },

  /**
   * Logout user
   */
  logout(): void {
    removeToken();
    setAuthHeader(null);
  },
};

/**
 * Profile API
 */
export const profileApi = {
  /**
   * Create or update Offer & Want profile
   */
  async updateProfile(data: ProfileData): Promise<User> {
    const response = await api.post<{ user: User }>('/api/profile', data);
    return response.data.user;
  },

  /**
   * Get current user's profile
   */
  async getProfile(): Promise<User> {
    const response = await api.get<{ user: User }>('/api/profile');
    return response.data.user;
  },
};

