const rateLimit = require('express-rate-limit');
const redisClient = require('../config/redis');
const logger = require('../utils/logger');

// Custom store using Redis (only if available)
class RedisStore {
  constructor(options) {
    this.client = options.client;
    this.prefix = options.prefix || 'rl:';
    this.resetExpiryOnChange = options.resetExpiryOnChange || false;
  }

  async increment(key) {
    const redisKey = `${this.prefix}${key}`;
    
    try {
      // Try to get current value
      const currentStr = await this.client.get(redisKey);
      const current = currentStr ? parseInt(currentStr) + 1 : 1;
      
      // Set new value with TTL
      await this.client.setEx(redisKey, 60, current.toString());
      
      return {
        totalHits: current,
        resetTime: new Date(Date.now() + 60000)
      };
    } catch (error) {
      logger.error('Redis rate limiter error:', error);
      // Return safe values if Redis fails
      return {
        totalHits: 1,
        resetTime: new Date(Date.now() + 60000)
      };
    }
  }

  async decrement(key) {
    const redisKey = `${this.prefix}${key}`;
    try {
      const currentStr = await this.client.get(redisKey);
      if (currentStr) {
        const current = Math.max(0, parseInt(currentStr) - 1);
        await this.client.setEx(redisKey, 60, current.toString());
      }
    } catch (error) {
      logger.error('Redis rate limiter decrement error:', error);
    }
  }

  async resetKey(key) {
    const redisKey = `${this.prefix}${key}`;
    try {
      await this.client.del(redisKey);
    } catch (error) {
      logger.error('Redis rate limiter reset error:', error);
    }
  }
}

// Configure rate limiter
const limiterConfig = {
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.'
};

// Use Redis store if available, otherwise use default memory store
if (redisClient.isConnected()) {
  limiterConfig.store = new RedisStore({ client: redisClient });
  logger.info('Rate limiter using Redis store');
} else {
  logger.info('Rate limiter using memory store (Redis not available)');
}

const limiter = rateLimit(limiterConfig);

module.exports = limiter;
