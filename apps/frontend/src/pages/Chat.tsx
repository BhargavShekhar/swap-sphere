/**
 * Chat Page
 * Real-time chat between two users in an exchange
 */

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { sendMessage, getMessages, type Message } from '../services/message.api';
import { getExchange, createExchange, getExchanges, type Exchange } from '../services/exchange.api';

export function Chat() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const exchangeId = searchParams.get('exchangeId');
  const matchedUserId = searchParams.get('matchedUserId');
  const skillA = searchParams.get('skillA');
  const skillB = searchParams.get('skillB');

  const [exchange, setExchange] = useState<Exchange | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize exchange and load messages
  useEffect(() => {
    const initializeChat = async () => {
      if (!user) {
        navigate('/login');
        return;
      }

      try {
        setLoading(true);
        setError(null);

        let currentExchange: Exchange | null = null;

        // If exchangeId is provided, fetch the exchange
        if (exchangeId) {
          try {
            const response = await getExchange(exchangeId);
            currentExchange = response.exchange;
          } catch (err: any) {
            // Exchange not found, we'll create a new one
            console.log('Exchange not found, will create new one');
          }
        }

        // If no exchange exists and we have match info, create one
        if (!currentExchange && matchedUserId && skillA && skillB) {
          try {
            const response = await createExchange({
              matchedUserId,
              skillA,
              skillB,
            });
            currentExchange = response.exchange;
            // Update URL with exchangeId
            const newParams = new URLSearchParams(searchParams);
            newParams.set('exchangeId', currentExchange._id);
            navigate(`/chat?${newParams.toString()}`, { replace: true });
          } catch (err: any) {
            console.error('Error creating exchange:', err);
            // If exchange already exists, try to find it
            if (err.response?.status === 400 && err.response?.data?.error?.includes('already exists')) {
              try {
                // Try to find the existing exchange
                const exchangesResponse = await getExchanges();
                const existingExchange = exchangesResponse.exchanges.find(
                  (ex) =>
                    (ex.userA._id === user.id && ex.userB._id === matchedUserId) ||
                    (ex.userB._id === user.id && ex.userA._id === matchedUserId)
                );
                if (existingExchange) {
                  currentExchange = existingExchange;
                  // Update URL with exchangeId
                  const newParams = new URLSearchParams(searchParams);
                  newParams.set('exchangeId', currentExchange._id);
                  navigate(`/chat?${newParams.toString()}`, { replace: true });
                } else {
                  setError('An exchange already exists but could not be found. Please refresh the page.');
                  setLoading(false);
                  return;
                }
              } catch (findErr: any) {
                console.error('Error finding existing exchange:', findErr);
                setError('An exchange already exists. Please refresh the page.');
                setLoading(false);
                return;
              }
            } else {
              setError('Failed to start chat. Please try again.');
              setLoading(false);
              return;
            }
          }
        }

        if (!currentExchange) {
          setError('Unable to initialize chat. Missing exchange information.');
          setLoading(false);
          return;
        }

        setExchange(currentExchange);

        // Load initial messages
        await loadMessages(currentExchange._id);
      } catch (err: any) {
        console.error('Error initializing chat:', err);
        setError(err.message || 'Failed to initialize chat');
      } finally {
        setLoading(false);
      }
    };

    initializeChat();
  }, [exchangeId, matchedUserId, skillA, skillB, user, navigate, searchParams]);

  // Poll for new messages
  useEffect(() => {
    if (!exchange) return;

    // Poll every 1.5 seconds for new messages
    pollingIntervalRef.current = setInterval(async () => {
      try {
        await loadMessages(exchange._id, true); // Silent update
      } catch (err) {
        // Silently fail for polling
        console.error('Error polling messages:', err);
      }
    }, 1500);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [exchange]);

  const loadMessages = async (exId: string, silent = false) => {
    try {
      const response = await getMessages(exId);
      setMessages(response.messages);
    } catch (err: any) {
      if (!silent) {
        console.error('Error loading messages:', err);
        setError('Failed to load messages');
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !exchange || sending) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      await sendMessage({
        exchangeId: exchange._id,
        content: messageContent,
      });

      // Reload messages to get the new one
      await loadMessages(exchange._id);
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
      setNewMessage(messageContent); // Restore message
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (error && !exchange) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-red-600 text-center mb-4">
            <p className="text-lg font-semibold">Error</p>
            <p className="text-sm">{error}</p>
          </div>
          <button
            onClick={() => navigate('/matching')}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Matching
          </button>
        </div>
      </div>
    );
  }

  if (!exchange) {
    return null;
  }

  // Determine the other user
  const otherUser = exchange.userA._id === user?.id ? exchange.userB : exchange.userA;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-md px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/matching')}
              className="px-3 py-2 text-gray-600 hover:text-gray-900 font-medium"
            >
              ← Back
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Chat with {otherUser.name}</h1>
              <p className="text-sm text-gray-600">
                {exchange.skillA} ↔ {exchange.skillB}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2">
          <div className="max-w-4xl mx-auto">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwnMessage = message.senderId._id === user?.id;
              return (
                <div
                  key={message._id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      isOwnMessage
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-900 shadow-sm'
                    }`}
                  >
                    {!isOwnMessage && (
                      <p className="text-xs font-semibold mb-1 opacity-75">
                        {message.senderId.name}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                      }`}
                    >
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

