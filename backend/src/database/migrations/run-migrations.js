const db = require('../../config/database');
const logger = require('../../utils/logger');

async function createProductsTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      price DECIMAL(10, 2) NOT NULL,
      category VARCHAR(100) NOT NULL,
      stock INT DEFAULT 0,
      image_url VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      
      -- Indexes for performance optimization
      INDEX idx_category (category),
      INDEX idx_price (price),
      INDEX idx_created_at (created_at),
      INDEX idx_name (name(100)),
      INDEX idx_category_price (category, price),
      INDEX idx_search (name(100), description(100)),
      
      -- Full-text search index
      FULLTEXT INDEX ft_name_description (name, description)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  try {
    await db.query(createTableQuery);
    logger.info('Products table created successfully with indexes');
  } catch (error) {
    logger.error('Error creating products table:', error);
    throw error;
  }
}

async function runMigrations() {
  try {
    logger.info('Starting database migrations...');
    
    await createProductsTable();
    
    logger.info('Database migrations completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations();
}

module.exports = { createProductsTable };
