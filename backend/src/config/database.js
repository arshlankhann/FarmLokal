const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'farmlokal',
  max: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test connection
pool.connect()
  .then(client => {
    logger.info('PostgreSQL database connected successfully');
    client.release();
  })
  .catch(err => {
    logger.error('PostgreSQL connection error:', err);
  });

module.exports = pool;
