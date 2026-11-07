import mongoose from 'mongoose';
import { ENV } from './env.js';

let isConnected = false;

export async function connectDB(): Promise<void> {
  if (isConnected) return;

  try {
    mongoose.set('strictQuery', true);

    // Try connecting to configured MONGODB_URI with a 4s timeout
    await mongoose.connect(ENV.MONGODB_URI, {
      serverSelectionTimeoutMS: 4000,
    });
    isConnected = true;
    console.log(`[DB] Connected successfully to MongoDB at: ${ENV.MONGODB_URI.replace(/:\/\/.*@/, '://<credentials>@')}`);
  } catch (error) {
    console.warn(`[DB] Could not connect to primary MongoDB URI (${(error as Error).message}).`);

    // In non-production, fallback to in-memory MongoDB for zero-config testing
    if (ENV.NODE_ENV !== 'production') {
      try {
        console.log('[DB] Launching embedded MongoDB memory server for development fallback...');
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        const mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri();
        await mongoose.connect(uri);
        isConnected = true;
        console.log(`[DB] Connected to Development In-Memory MongoDB at: ${uri}`);
      } catch (memErr) {
        console.error('[DB] Failed to launch in-memory MongoDB:', memErr);
        throw error;
      }
    } else {
      throw error;
    }
  }
}

export async function disconnectDB(): Promise<void> {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
  }
}

