/**
 * Privacy API Service
 * Handles anonymous mode toggle and state
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
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export interface PrivacyState {
  isAnonymous: boolean;
  anonymousName: string | null;
  anonymousAvatar: string;
}

export interface ToggleResponse {
  success: boolean;
  isAnonymous: boolean;
  anonymousName?: string;
  anonymousAvatar?: string;
  message: string;
}

/**
 * Privacy API
 */
export const privacyApi = {
  /**
   * Toggle anonymous mode on/off
   */
  async toggleAnonymous(): Promise<ToggleResponse> {
    const response = await api.patch<ToggleResponse>('/api/privacy/toggle');
    return response.data;
  },

  /**
   * Get current privacy state
   */
  async getPrivacyState(): Promise<PrivacyState> {
    const response = await api.get<PrivacyState>('/api/privacy/state');
    return response.data;
  },
};

