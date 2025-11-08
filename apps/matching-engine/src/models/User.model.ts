/**
 * User Model
 * MongoDB schema for users with authentication and Offer & Want profile
 */

import mongoose, { Schema, type Document, type Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  offer_skill?: string;
  want_skill?: string;
  skill_level?: number; // 1-10
  trustScore: number; // 0-1, default 0.5 for new users
  isAnonymous: boolean; // Privacy mode flag
  anonymousName?: string; // Pseudonym when anonymous
  anonymousAvatar?: string; // Default avatar URL when anonymous
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't return password by default
    },
    offer_skill: {
      type: String,
      trim: true,
    },
    want_skill: {
      type: String,
      trim: true,
    },
    skill_level: {
      type: Number,
      min: [1, 'Skill level must be between 1 and 10'],
      max: [10, 'Skill level must be between 1 and 10'],
    },
    trustScore: {
      type: Number,
      default: 0.5, // Start with neutral trust score
      min: 0,
      max: 1,
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    anonymousName: {
      type: String,
      trim: true,
    },
    anonymousAvatar: {
      type: String,
      trim: true,
      default: '/default-avatar.png', // Default anonymous avatar
    },
  },
  {
    timestamps: true,
    collection: 'users', // Explicitly set collection name
  }
);

// Hash password before saving
UserSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    console.log('Password hashed successfully for user:', this.email);
    next();
  } catch (error) {
    console.error('Error hashing password:', error);
    next(error as Error);
  }
});

// Log after save
UserSchema.post('save', function (doc, next) {
  console.log('✅ User document saved to MongoDB (post-save hook):', {
    id: String(doc._id),
    email: doc.email,
    name: doc.name,
    offer_skill: doc.offer_skill,
    want_skill: doc.want_skill,
    skill_level: doc.skill_level,
  });
  next();
});

// Log after findByIdAndUpdate
UserSchema.post('findOneAndUpdate', function (doc, next) {
  if (doc) {
    console.log('✅ User document updated in MongoDB (post-update hook):', {
      id: String(doc._id),
      email: doc.email,
      offer_skill: doc.offer_skill,
      want_skill: doc.want_skill,
      skill_level: doc.skill_level,
    });
  }
  next();
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Export model
const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;

