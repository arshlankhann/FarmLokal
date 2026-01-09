const redisClient = require('../config/redis');
const logger = require('./logger');

async function clearCache() {
  try {
    await redisClient.flushDb();
    logger.info('Redis cache cleared successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error clearing cache:', error);
    process.exit(1);
  }
}

clearCache();
