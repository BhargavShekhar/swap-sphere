/**
 * MongoDB Database Connection
 * Connects to MongoDB Atlas
 */

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

// Validate MongoDB URI - check for placeholder patterns
if (!MONGODB_URI || 
    MONGODB_URI.includes('username:password') || 
    MONGODB_URI === 'your-connection-string-here' ||
    MONGODB_URI.trim() === '') {
  console.error('\n❌ ERROR: MONGODB_URI is not configured properly!\n');
  console.error('The connection string appears to be a placeholder.\n');
  console.error('Please update apps/matching-engine/.env with your actual MongoDB Atlas connection string.\n');
  console.error('See SETUP.md for detailed instructions.\n');
  console.error('Get your connection string from: https://www.mongodb.com/cloud/atlas\n');
  throw new Error('MONGODB_URI must be configured with a real MongoDB Atlas connection string');
}

// Validate connection string format
if (!MONGODB_URI.startsWith('mongodb://') && !MONGODB_URI.startsWith('mongodb+srv://')) {
  console.error('\n❌ ERROR: Invalid MongoDB connection string format!\n');
  console.error('Connection string must start with mongodb:// or mongodb+srv://\n');
  throw new Error('Invalid MONGODB_URI format');
}

let cached: {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
} = {
  conn: null,
  promise: null,
};

async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then(async (mongooseInstance) => {
      console.log('✅ Connected to MongoDB Atlas');
      const db = mongooseInstance.connection.db;
      if (db) {
        console.log('Database:', db.databaseName);
        // Test the connection with a ping
        try {
          await db.admin().ping();
          console.log('✅ Database ping successful - connection is active');
        } catch (pingError) {
          console.error('❌ Database ping failed:', pingError);
        }
      }
      console.log('Connection state:', mongooseInstance.connection.readyState === 1 ? 'Connected' : 'Not connected');
      return mongooseInstance;
    }).catch((error) => {
      console.error('❌ MongoDB connection error:', error);
      throw error;
    });
  }

  try {
    cached.conn = await cached.promise;
    
    // Verify connection
    if (cached.conn.connection.readyState !== 1) {
      throw new Error('MongoDB connection not ready');
    }
    
    console.log('✅ MongoDB connection verified and ready');
  } catch (e) {
    cached.promise = null;
    console.error('❌ Failed to establish MongoDB connection:', e);
    throw e;
  }

  return cached.conn;
}

export default connectDB;

