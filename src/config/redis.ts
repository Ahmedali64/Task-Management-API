import { createClient } from 'redis';

// Create a redis client
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 20) {
        return new Error('Too many retries');
      }
      // Add more time per try but capped at 1000
      return Math.min(retries * 50, 1000);
    },
  },
});

// Error handling
redisClient.on('err', (err) => {
  console.error(err);
});

redisClient.on('connect', () => {
  console.log('Redis connected successfully');
});

redisClient.on('ready', () => {
  console.log('Redis client ready');
});

redisClient.on('end', () => {
  console.log('Redis connection closed');
});

// Connect to redis
export const connectRedis = async (): Promise<void> => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
  }
};

// Disconnect from Redis
export const disconnectRedis = (): void => {
  try {
    if (redisClient.isOpen) {
      redisClient.destroy();
    }
  } catch (error) {
    console.error('Error disconnecting from Redis:', error);
  }
};

export default redisClient;
