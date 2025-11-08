/**
 * Message API routes
 * Handles persistent chat messages for exchanges
 */

import { Router, type Router as ExpressRouter } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import Message from '../models/Message.model.js';
import Exchange from '../models/Exchange.model.js';
import { serializeUser } from '../utils/user.serializer.js';

const router: ExpressRouter = Router();

/**
 * POST /api/message
 * Send a message in an exchange
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const userId = String((req as any).user.id);
    const { exchangeId, content } = req.body;

    if (!exchangeId || !content || content.trim().length === 0) {
      res.status(400).json({ error: 'exchangeId and content are required' });
      return;
    }

    // Verify exchange exists and user is part of it
    const exchange = await Exchange.findById(exchangeId);
    if (!exchange) {
      res.status(404).json({ error: 'Exchange not found' });
      return;
    }

    if (String(exchange.userA) !== userId && String(exchange.userB) !== userId) {
      res.status(403).json({ error: 'You are not part of this exchange' });
      return;
    }

    // Create message
    const message = new Message({
      exchangeId,
      senderId: userId,
      content: content.trim(),
    });

    await message.save();
    await message.populate('senderId', 'name email isAnonymous anonymousName anonymousAvatar');

    // Serialize sender
    const serializedMessage = {
      ...message.toObject(),
      senderId: serializeUser(message.senderId, false),
    };

    res.status(201).json({ message: serializedMessage });
  } catch (error: any) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message', message: error.message });
  }
});

/**
 * GET /api/message/:exchangeId
 * Get all messages for an exchange
 */
router.get('/:exchangeId', authenticate, async (req, res) => {
  try {
    const userId = String((req as any).user.id);
    const { exchangeId } = req.params;

    // Verify exchange exists and user is part of it
    const exchange = await Exchange.findById(exchangeId);
    if (!exchange) {
      res.status(404).json({ error: 'Exchange not found' });
      return;
    }

    if (String(exchange.userA) !== userId && String(exchange.userB) !== userId) {
      res.status(403).json({ error: 'You are not part of this exchange' });
      return;
    }

    // Get messages
    const messages = await Message.find({ exchangeId })
      .populate('senderId', 'name email isAnonymous anonymousName anonymousAvatar')
      .sort({ createdAt: 1 }); // Oldest first

    // Serialize all senders
    const serializedMessages = messages.map(message => ({
      ...message.toObject(),
      senderId: serializeUser(message.senderId, false),
    }));

    res.json({ messages: serializedMessages });
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages', message: error.message });
  }
});

export default router;

