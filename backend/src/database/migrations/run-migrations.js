const db = require('../../config/database');
const logger = require('../../utils/logger');

async function createProductsTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      price DECIMAL(10, 2) NOT NULL,
      category VARCHAR(100) NOT NULL,
      stock INT DEFAULT 0,
      image_url VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_category ON products (category);
    CREATE INDEX IF NOT EXISTS idx_price ON products (price);
    CREATE INDEX IF NOT EXISTS idx_created_at ON products (created_at);
    CREATE INDEX IF NOT EXISTS idx_name ON products (name);
    CREATE INDEX IF NOT EXISTS idx_category_price ON products (category, price);
    
    -- Create trigger for updated_at
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ language 'plpgsql';
    
    DROP TRIGGER IF EXISTS update_products_updated_at ON products;
    CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
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
