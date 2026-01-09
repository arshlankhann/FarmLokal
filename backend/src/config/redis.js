const redis = require('redis');
const logger = require('../utils/logger');

let client = null;
let isConnected = false;

// Only connect if Redis is configured
const shouldConnectRedis = process.env.REDIS_HOST || process.env.NODE_ENV === 'production';

if (shouldConnectRedis) {
  client = redis.createClient({
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      connectTimeout: 5000
    },
    password: process.env.REDIS_PASSWORD || undefined
  });

  client.on('error', (err) => {
    logger.error('Redis error:', err);
    isConnected = false;
  });

  client.on('connect', () => {
    logger.info('Redis connected successfully');
    isConnected = true;
  });

  client.on('disconnect', () => {
    logger.warn('Redis disconnected');
    isConnected = false;
  });

  client.connect().catch(err => {
    logger.warn('Redis connection failed, running without cache:', err.message);
    client = null;
  });
} else {
  logger.info('Redis not configured, running without cache');
}

// Wrapper functions with fallback
const redisWrapper = {
  async get(key) {
    if (!client || !isConnected) return null;
    try {
      return await client.get(key);
    } catch (error) {
      logger.error('Redis GET error:', error);
      return null;
    }
  },

  async setEx(key, ttl, value) {
    if (!client || !isConnected) return null;
    try {
      return await client.setEx(key, ttl, value);
    } catch (error) {
      logger.error('Redis SETEX error:', error);
      return null;
    }
  },

  async del(key) {
    if (!client || !isConnected) return null;
    try {
      return await client.del(key);
    } catch (error) {
      logger.error('Redis DEL error:', error);
      return null;
    }
  },

  async flushDb() {
    if (!client || !isConnected) return null;
    try {
      return await client.flushDb();
    } catch (error) {
      logger.error('Redis FLUSHDB error:', error);
      return null;
    }
  },

  isConnected() {
    return isConnected;
  }
};

module.exports = redisWrapper;
