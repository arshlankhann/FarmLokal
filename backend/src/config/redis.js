const redis = require('redis');
const logger = require('../utils/logger');

let client = null;
let isConnected = false;
let connectionAttempted = false;

// Only connect if Redis credentials are explicitly provided
const redisHost = process.env.REDIS_HOST;
const redisPort = process.env.REDIS_PORT || 6379;
const redisPassword = process.env.REDIS_PASSWORD;

// Only attempt connection if REDIS_HOST is set
if (redisHost) {
  connectionAttempted = true;
  
  client = redis.createClient({
    socket: {
      host: redisHost,
      port: parseInt(redisPort),
      connectTimeout: 5000,
      reconnectStrategy: (retries) => {
        // Stop retrying after 3 attempts
        if (retries > 3) {
          logger.warn('Redis connection failed after 3 attempts, disabling cache');
          return false; // Stop reconnecting
        }
        return Math.min(retries * 100, 3000);
      }
    },
    password: redisPassword || undefined
  });

  // Suppress error spam - just log once
  let errorLogged = false;
  client.on('error', (err) => {
    if (!errorLogged) {
      logger.warn('Redis connection error, running without cache:', err.message);
      errorLogged = true;
    }
    isConnected = false;
  });

  client.on('connect', () => {
    logger.info('Redis connected successfully');
    isConnected = true;
    errorLogged = false; // Reset error flag
  });

  client.on('disconnect', () => {
    logger.warn('Redis disconnected, cache unavailable');
    isConnected = false;
  });

  // Attempt connection but don't crash if it fails
  client.connect().catch(err => {
    logger.warn('Redis unavailable, running without cache:', err.message);
    client = null;
    isConnected = false;
  });
} else {
  logger.info('Redis not configured (REDIS_HOST not set), running without cache');
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
