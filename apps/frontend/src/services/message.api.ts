/**
 * Message API Service
 * Handles sending and fetching chat messages
 */

import axios from 'axios';
import { getToken } from './auth.api';

const MATCHING_ENGINE_URL = import.meta.env.VITE_MATCHING_ENGINE_URL || 'http://localhost:8081';
const MESSAGE_API_BASE = `${MATCHING_ENGINE_URL}/api/message`;

export interface Message {
  _id: string;
  exchangeId: string;
  senderId: {
    _id: string;
    name: string;
    email?: string;
    avatar?: string;
    isAnonymous?: boolean;
    anonymousName?: string;
    anonymousAvatar?: string;
  };
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface SendMessageRequest {
  exchangeId: string;
  content: string;
}

/**
 * Send a message in an exchange
 */
export async function sendMessage(data: SendMessageRequest): Promise<{ message: Message }> {
  const token = getToken();
  const response = await axios.post(
    `${MESSAGE_API_BASE}`,
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
 * Get all messages for an exchange
 */
export async function getMessages(exchangeId: string): Promise<{ messages: Message[] }> {
  const token = getToken();
  const response = await axios.get(
    `${MESSAGE_API_BASE}/${exchangeId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
}

