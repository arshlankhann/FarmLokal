const axios = require('axios');
const redisClient = require('../config/redis');
const logger = require('../utils/logger');

class OAuth2Service {
  constructor() {
    this.tokenUrl = process.env.OAUTH_TOKEN_URL;
    this.clientId = process.env.OAUTH_CLIENT_ID;
    this.clientSecret = process.env.OAUTH_CLIENT_SECRET;
    this.scope = process.env.OAUTH_SCOPE || '';
    this.tokenKey = 'oauth2:access_token';
    this.lockKey = 'oauth2:token_lock';
    this.tokenFetchPromise = null;
  }

  /**
   * Get access token with Redis caching
   * Ensures concurrent requests don't trigger multiple token fetches
   */
  async getAccessToken() {
    try {
      // Check if token exists in Redis cache
      const cachedToken = await redisClient.get(this.tokenKey);
      if (cachedToken) {
        logger.info('Using cached OAuth2 token');
        return cachedToken;
      }

      // If another request is already fetching the token, wait for it
      if (this.tokenFetchPromise) {
        logger.info('Waiting for ongoing token fetch');
        return await this.tokenFetchPromise;
      }

      // Acquire lock using Redis SET NX (set if not exists)
      const lockAcquired = await redisClient.set(this.lockKey, '1', {
        NX: true,
        EX: 10 // Lock expires in 10 seconds
      });

      if (!lockAcquired) {
        // Another process has the lock, wait and retry
        logger.info('Lock held by another process, waiting...');
        await this.sleep(100);
        return await this.getAccessToken();
      }

      try {
        // Create promise for concurrent requests
        this.tokenFetchPromise = this.fetchNewToken();
        const token = await this.tokenFetchPromise;
        return token;
      } finally {
        // Release lock
        await redisClient.del(this.lockKey);
        this.tokenFetchPromise = null;
      }
    } catch (error) {
      logger.error('Error getting access token:', error);
      throw error;
    }
  }

  /**
   * Fetch new token from OAuth2 provider
   */
  async fetchNewToken() {
    try {
      logger.info('Fetching new OAuth2 token');
      
      const response = await axios.post(
        this.tokenUrl,
        {
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          scope: this.scope
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const { access_token, expires_in } = response.data;
      
      // Cache token in Redis with expiry (subtract 60s as buffer)
      const ttl = (expires_in || parseInt(process.env.TOKEN_CACHE_TTL)) - 60;
      await redisClient.setEx(this.tokenKey, ttl, access_token);
      
      logger.info(`OAuth2 token cached successfully (TTL: ${ttl}s)`);
      return access_token;
    } catch (error) {
      logger.error('Error fetching OAuth2 token:', error.message);
      throw new Error('Failed to fetch OAuth2 token');
    }
  }

  /**
   * Refresh token manually (if needed)
   */
  async refreshToken() {
    await redisClient.del(this.tokenKey);
    return await this.getAccessToken();
  }

  /**
   * Check if token is valid
   */
  async isTokenValid() {
    const token = await redisClient.get(this.tokenKey);
    return !!token;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new OAuth2Service();
