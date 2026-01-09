const axios = require('axios');
const CircuitBreaker = require('opossum');
const logger = require('../utils/logger');
const oauth2Service = require('./oauth2Service');

class ExternalApiService {
  constructor() {
    this.apiAUrl = process.env.EXTERNAL_API_A_URL || 'https://jsonplaceholder.typicode.com';
    this.maxRetries = 3;
    this.initialDelay = 1000;

    // Circuit breaker configuration
    const circuitBreakerOptions = {
      timeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT) || 3000,
      errorThresholdPercentage: parseInt(process.env.CIRCUIT_BREAKER_ERROR_THRESHOLD) || 50,
      resetTimeout: parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT) || 30000
    };

    // Create circuit breaker for API A
    this.breaker = new CircuitBreaker(this.makeRequest.bind(this), circuitBreakerOptions);

    this.breaker.on('open', () => logger.warn('Circuit breaker opened'));
    this.breaker.on('halfOpen', () => logger.info('Circuit breaker half-open'));
    this.breaker.on('close', () => logger.info('Circuit breaker closed'));
  }

  /**
   * API A - Synchronous call with retry and exponential backoff
   */
  async callApiA(endpoint, params = {}) {
    try {
      // Get OAuth2 token
      const token = await oauth2Service.getAccessToken();

      // Make request through circuit breaker
      const response = await this.breaker.fire({
        url: `${this.apiAUrl}${endpoint}`,
        method: 'GET',
        params,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      return response;
    } catch (error) {
      logger.error('API A call failed:', error.message);
      throw error;
    }
  }

  /**
   * Make HTTP request with retry logic
   */
  async makeRequest(config, retryCount = 0) {
    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      if (retryCount < this.maxRetries && this.isRetryableError(error)) {
        const delay = this.calculateBackoff(retryCount);
        logger.warn(`Request failed, retrying in ${delay}ms (attempt ${retryCount + 1}/${this.maxRetries})`);
        
        await this.sleep(delay);
        return this.makeRequest(config, retryCount + 1);
      }
      
      throw error;
    }
  }

  /**
   * Check if error is retryable
   */
  isRetryableError(error) {
    if (!error.response) {
      return true; // Network errors are retryable
    }
    const status = error.response.status;
    return status === 429 || status >= 500;
  }

  /**
   * Calculate exponential backoff delay
   */
  calculateBackoff(retryCount) {
    return this.initialDelay * Math.pow(2, retryCount);
  }

  /**
   * Get circuit breaker stats
   */
  getStats() {
    return this.breaker.stats;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new ExternalApiService();
