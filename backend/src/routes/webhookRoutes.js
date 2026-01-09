const express = require('express');
const router = express.Router();
const webhookService = require('../services/webhookService');
const logger = require('../utils/logger');

/**
 * POST /api/webhooks/callback
 * Receive webhook callbacks from external API B
 */
router.post('/callback', async (req, res, next) => {
  try {
    const event = req.body;
    
    logger.info('Webhook received:', { eventId: event.id || event.eventId });

    const result = await webhookService.processWebhook(event);

    // Return 200 immediately to acknowledge receipt
    res.status(200).json({
      success: true,
      message: 'Webhook received',
      ...result
    });
  } catch (error) {
    logger.error('Webhook processing error:', error);
    
    // Still return 200 to prevent retries for invalid requests
    if (error.message.includes('already processed')) {
      return res.status(200).json({
        success: true,
        message: 'Event already processed'
      });
    }

    next(error);
  }
});

/**
 * POST /api/webhooks/register
 * Register webhook callback URL
 */
router.post('/register', async (req, res, next) => {
  try {
    const { callbackUrl } = req.body;

    if (!callbackUrl) {
      return res.status(400).json({
        success: false,
        error: { message: 'callbackUrl is required' }
      });
    }

    const result = await webhookService.registerCallback(callbackUrl);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
