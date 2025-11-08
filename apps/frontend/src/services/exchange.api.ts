/**
 * Exchange API Service
 * Handles exchange creation, acceptance, and LiveKit token generation
 */

import axios from 'axios';
import { getToken } from './auth.api';

const MATCHING_ENGINE_URL = import.meta.env.VITE_MATCHING_ENGINE_URL || 'http://localhost:8081';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

const EXCHANGE_API_BASE = `${MATCHING_ENGINE_URL}/api/exchange`;
const TOKEN_API_BASE = `${BACKEND_URL}/api/token`;

export interface Exchange {
  _id: string;
  userA: { 
    _id: string; 
    name: string; 
    email?: string;
    avatar?: string;
    isAnonymous?: boolean;
    anonymousName?: string;
    anonymousAvatar?: string;
  };
  userB: { 
    _id: string; 
    name: string; 
    email?: string;
    avatar?: string;
    isAnonymous?: boolean;
    anonymousName?: string;
    anonymousAvatar?: string;
  };
  skillA: string;
  skillB: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  roomId: string;
  startedAt?: string;
  completedAt?: string;
  userAConfirmed: boolean;
  userBConfirmed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExchangeRequest {
  matchedUserId: string;
  skillA: string;
  skillB: string;
}

export interface LiveKitTokenResponse {
  token: string;
}

/**
 * Create a new exchange from a match
 */
export async function createExchange(data: CreateExchangeRequest): Promise<{ exchange: Exchange }> {
  const token = getToken();
  const response = await axios.post(
    `${EXCHANGE_API_BASE}/create`,
    data,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
}

/**
 * Accept a pending exchange
 */
export async function acceptExchange(exchangeId: string): Promise<{ exchange: Exchange }> {
  const token = getToken();
  const response = await axios.post(
    `${EXCHANGE_API_BASE}/${exchangeId}/accept`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
}

/**
 * Start an accepted exchange (begin the session)
 */
export async function startExchange(exchangeId: string): Promise<{ exchange: Exchange }> {
  const token = getToken();
  const response = await axios.post(
    `${EXCHANGE_API_BASE}/${exchangeId}/start`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
}

/**
 * Get a specific exchange
 */
export async function getExchange(exchangeId: string): Promise<{ exchange: Exchange }> {
  const token = getToken();
  const response = await axios.get(
    `${EXCHANGE_API_BASE}/${exchangeId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
}

/**
 * Get all exchanges for the current user
 */
export async function getExchanges(): Promise<{ exchanges: Exchange[] }> {
  const token = getToken();
  const response = await axios.get(
    `${EXCHANGE_API_BASE}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
}

/**
 * Generate LiveKit token for video call
 */
export async function getLiveKitToken(
  room: string,
  participantName: string
): Promise<LiveKitTokenResponse> {
  const response = await axios.post(`${TOKEN_API_BASE}`, {
    username: participantName,
    room,
  });
  return response.data;
}

/**
 * Confirm session completion
 */
export async function confirmExchangeCompletion(
  exchangeId: string
): Promise<{ exchange: Exchange; bothConfirmed: boolean }> {
  const token = getToken();
  const response = await axios.post(
    `${EXCHANGE_API_BASE}/${exchangeId}/confirm`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
}



