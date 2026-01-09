const rateLimit = require('express-rate-limit');
const redisClient = require('../config/redis');

// Custom store using Redis
class RedisStore {
  constructor(options) {
    this.client = options.client;
    this.prefix = options.prefix || 'rl:';
    this.resetExpiryOnChange = options.resetExpiryOnChange || false;
  }

  async increment(key) {
    const redisKey = `${this.prefix}${key}`;
    const current = await this.client.incr(redisKey);
    
    if (current === 1) {
      await this.client.expire(redisKey, 60); // 60 seconds TTL
    }
    
    return {
      totalHits: current,
      resetTime: new Date(Date.now() + 60000)
    };
  }

  async decrement(key) {
    const redisKey = `${this.prefix}${key}`;
    await this.client.decr(redisKey);
  }

  async resetKey(key) {
    const redisKey = `${this.prefix}${key}`;
    await this.client.del(redisKey);
  }
}

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ client: redisClient }),
  message: 'Too many requests from this IP, please try again later.'
});

module.exports = limiter;
