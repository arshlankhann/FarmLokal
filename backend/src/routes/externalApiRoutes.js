const express = require('express');
const router = express.Router();
const externalApiService = require('../services/externalApiService');
const logger = require('../utils/logger');

/**
 * GET /api/external/data
 * Fetch data from external API A (with retries and circuit breaker)
 */
router.get('/data', async (req, res, next) => {
  try {
    const { endpoint = '/posts', ...params } = req.query;

    logger.info(`Calling external API A: ${endpoint}`);

    const data = await externalApiService.callApiA(endpoint, params);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    logger.error('External API call failed:', error.message);
    
    res.status(503).json({
      success: false,
      error: {
        message: 'External service unavailable',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/external/stats
 * Get circuit breaker statistics
 */
router.get('/stats', (req, res) => {
  const stats = externalApiService.getStats();
  
  res.json({
    success: true,
    data: {
      circuitBreaker: {
        fires: stats.fires,
        failures: stats.failures,
        successes: stats.successes,
        rejects: stats.rejects,
        timeouts: stats.timeouts,
        fallbacks: stats.fallbacks,
        semaphoreRejections: stats.semaphoreRejections
      }
    }
  });
});

module.exports = router;
