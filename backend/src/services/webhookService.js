const { v4: uuidv4 } = require('uuid');
const redisClient = require('../config/redis');
const logger = require('../utils/logger');

class WebhookService {
  constructor() {
    this.processedEventsKey = 'webhook:processed_events';
    this.eventTTL = 86400; // 24 hours
  }

  /**
   * Process incoming webhook with idempotency
   */
  async processWebhook(event) {
    try {
      const eventId = event.id || event.eventId;
      
      if (!eventId) {
        throw new Error('Event ID is required for idempotency');
      }

      // Check if event was already processed
      const isProcessed = await this.isEventProcessed(eventId);
      if (isProcessed) {
        logger.info(`Event ${eventId} already processed, skipping`);
        return { status: 'already_processed', eventId };
      }

      // Mark event as being processed (with lock)
      await this.markEventAsProcessing(eventId);

      try {
        // Process the event
        logger.info(`Processing webhook event: ${eventId}`);
        const result = await this.handleEvent(event);

        // Mark as successfully processed
        await this.markEventAsProcessed(eventId);

        return { status: 'success', eventId, result };
      } catch (error) {
        // Remove processing lock on error
        await this.removeProcessingLock(eventId);
        throw error;
      }
    } catch (error) {
      logger.error('Webhook processing error:', error);
      throw error;
    }
  }

  /**
   * Handle the actual event processing logic
   */
  async handleEvent(event) {
    // Simulate processing
    logger.info('Event data:', event);
    
    // Here you would implement your business logic
    // For example: update database, trigger notifications, etc.
    
    return {
      processed: true,
      timestamp: new Date().toISOString(),
      data: event
    };
  }

  /**
   * Check if event was already processed
   */
  async isEventProcessed(eventId) {
    const key = `${this.processedEventsKey}:${eventId}`;
    const exists = await redisClient.exists(key);
    return exists === 1;
  }

  /**
   * Mark event as being processed (lock)
   */
  async markEventAsProcessing(eventId) {
    const key = `${this.processedEventsKey}:processing:${eventId}`;
    const locked = await redisClient.set(key, '1', {
      NX: true,
      EX: 300 // 5 minutes processing timeout
    });

    if (!locked) {
      throw new Error(`Event ${eventId} is currently being processed`);
    }
  }

  /**
   * Mark event as successfully processed
   */
  async markEventAsProcessed(eventId) {
    const processingKey = `${this.processedEventsKey}:processing:${eventId}`;
    const processedKey = `${this.processedEventsKey}:${eventId}`;
    
    // Remove processing lock
    await redisClient.del(processingKey);
    
    // Mark as processed
    await redisClient.setEx(processedKey, this.eventTTL, '1');
  }

  /**
   * Remove processing lock
   */
  async removeProcessingLock(eventId) {
    const key = `${this.processedEventsKey}:processing:${eventId}`;
    await redisClient.del(key);
  }

  /**
   * Register webhook callback URL (simulation)
   */
  async registerCallback(callbackUrl) {
    logger.info(`Registering webhook callback: ${callbackUrl}`);
    
    // In a real scenario, you would call the external API
    // to register your callback URL
    
    return {
      success: true,
      callbackUrl,
      webhookId: uuidv4()
    };
  }
}

module.exports = new WebhookService();
