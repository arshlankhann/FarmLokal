const express = require('express');
const logger = require('../utils/logger');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory token storage (for mock purposes)
const tokens = new Map();

/**
 * Mock OAuth2 Token Endpoint
 * POST /oauth/token
 */
app.post('/oauth/token', (req, res) => {
  const { grant_type, client_id, client_secret } = req.body;

  // Validate grant type
  if (grant_type !== 'client_credentials') {
    return res.status(400).json({
      error: 'unsupported_grant_type',
      error_description: 'Only client_credentials grant type is supported'
    });
  }

  // Validate client credentials
  if (!client_id || !client_secret) {
    return res.status(401).json({
      error: 'invalid_client',
      error_description: 'Client authentication failed'
    });
  }

  // Generate mock access token
  const accessToken = `mock_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const expiresIn = 3600; // 1 hour

  tokens.set(accessToken, {
    client_id,
    created_at: Date.now(),
    expires_in: expiresIn
  });

  logger.info(`Mock OAuth2 token issued for client: ${client_id}`);

  res.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: expiresIn,
    scope: req.body.scope || 'read:products'
  });
});

/**
 * Verify token endpoint (for testing)
 * GET /oauth/verify
 */
app.get('/oauth/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'invalid_token',
      error_description: 'No token provided'
    });
  }

  const token = authHeader.substring(7);
  const tokenData = tokens.get(token);

  if (!tokenData) {
    return res.status(401).json({
      error: 'invalid_token',
      error_description: 'Token not found or expired'
    });
  }

  // Check if token is expired
  const now = Date.now();
  const expiresAt = tokenData.created_at + (tokenData.expires_in * 1000);

  if (now > expiresAt) {
    tokens.delete(token);
    return res.status(401).json({
      error: 'invalid_token',
      error_description: 'Token has expired'
    });
  }

  res.json({
    valid: true,
    client_id: tokenData.client_id,
    expires_at: new Date(expiresAt).toISOString()
  });
});

const PORT = process.env.OAUTH_SERVER_PORT || 5001;

app.listen(PORT, () => {
  logger.info(`Mock OAuth2 server running on port ${PORT}`);
});

module.exports = app;
