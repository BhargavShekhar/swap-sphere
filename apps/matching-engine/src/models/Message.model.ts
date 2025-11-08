/**
 * Message Model
 * Persistent chat messages for exchanges
 */

import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IMessage extends Document {
  exchangeId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  content: string;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    exchangeId: {
      type: Schema.Types.ObjectId,
      ref: 'Exchange',
      required: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'messages',
  }
);

// Index for faster queries
MessageSchema.index({ exchangeId: 1, createdAt: -1 });

// Export model
const Message: Model<IMessage> = mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);

export default Message;

