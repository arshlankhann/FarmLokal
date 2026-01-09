const db = require('../config/database');
const redisClient = require('../config/redis');
const logger = require('../utils/logger');
const crypto = require('crypto');

class ProductService {
  constructor() {
    this.cacheTTL = parseInt(process.env.CACHE_TTL) || 300;
    this.cachePrefix = 'products:';
  }

  /**
   * Encode cursor for pagination
   * @param {Object} lastItem - Last item in current page
   * @param {String} sortBy - Sort column
   * @returns {String} Base64 encoded cursor
   */
  encodeCursor(lastItem, sortBy) {
    if (!lastItem) return null;
    const cursorData = {
      id: lastItem.id,
      sortValue: lastItem[sortBy]
    };
    return Buffer.from(JSON.stringify(cursorData)).toString('base64');
  }

  /**
   * Decode cursor for pagination
   * @param {String} cursor - Base64 encoded cursor
   * @returns {Object|null} Decoded cursor data
   */
  decodeCursor(cursor) {
    if (!cursor) return null;
    try {
      const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    } catch (error) {
      logger.error('Error decoding cursor:', error);
      return null;
    }
  }

  /**
   * Get products with pagination, filtering, sorting, and search
   * Performance optimized with Redis caching
   */
  async getProducts(options = {}) {
    const {
      cursor,
      limit = 50,
      sortBy = 'created_at',
      sortOrder = 'DESC',
      search,
      category,
      minPrice,
      maxPrice
    } = options;

    try {
      // Generate cache key based on query parameters
      const cacheKey = this.generateCacheKey(options);
      
      // Check cache first
      const cachedData = await this.getCachedData(cacheKey);
      if (cachedData) {
        logger.info('Cache hit for products query');
        return cachedData;
      }

      // Build SQL query
      const queryResult = await this.buildAndExecuteQuery(options);
      
      // Cache the result
      await this.cacheData(cacheKey, queryResult);
      
      return queryResult;
    } catch (error) {
      logger.error('Error fetching products:', error);
      throw error;
    }
  }

  /**
   * Build and execute optimized SQL query
   */
  async buildAndExecuteQuery(options) {
    const {
      cursor,
      limit = 50,
      sortBy = 'created_at',
      sortOrder = 'DESC',
      direction = 'forward',
      search,
      category,
      minPrice,
      maxPrice
    } = options;

    const validSortColumns = ['price', 'created_at', 'name', 'id'];
    const validSortOrders = ['ASC', 'DESC'];
    
    const orderColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const order = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

    // Decode cursor
    const cursorData = this.decodeCursor(cursor);

    // Base query with indexed columns
    let query = `
      SELECT 
        p.id, 
        p.name, 
        p.description, 
        p.price, 
        p.category, 
        p.stock, 
        p.image_url,
        p.created_at,
        p.updated_at
      FROM products p
      WHERE 1=1
    `;

    const params = [];

    // Advanced cursor-based pagination with sort column support
    if (cursorData) {
      const { id, sortValue } = cursorData;
      
      // Handle different sort directions
      const isForward = direction === 'forward';
      const isAscending = order === 'ASC';
      
      if (orderColumn === 'id') {
        // Simple ID-based cursor
        const operator = isForward ? '>' : '<';
        query += ` AND p.id ${operator} ?`;
        params.push(id);
      } else {
        // Complex cursor with sort column + id for tie-breaking
        if (isForward) {
          if (isAscending) {
            query += ` AND (p.${orderColumn} > ? OR (p.${orderColumn} = ? AND p.id > ?))`;
            params.push(sortValue, sortValue, id);
          } else {
            query += ` AND (p.${orderColumn} < ? OR (p.${orderColumn} = ? AND p.id > ?))`;
            params.push(sortValue, sortValue, id);
          }
        } else {
          // Backward pagination
          if (isAscending) {
            query += ` AND (p.${orderColumn} < ? OR (p.${orderColumn} = ? AND p.id < ?))`;
            params.push(sortValue, sortValue, id);
          } else {
            query += ` AND (p.${orderColumn} > ? OR (p.${orderColumn} = ? AND p.id < ?))`;
            params.push(sortValue, sortValue, id);
          }
        }
      }
    }

    // Search filter (indexed)
    if (search) {
      query += ` AND (p.name LIKE ? OR p.description LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    // Category filter (indexed)
    if (category) {
      query += ` AND p.category = ?`;
      params.push(category);
    }

    // Price range filter (indexed)
    if (minPrice !== undefined) {
      query += ` AND p.price >= ?`;
      params.push(minPrice);
    }

    if (maxPrice !== undefined) {
      query += ` AND p.price <= ?`;
      params.push(maxPrice);
    }

    // Sorting (handle backward pagination)
    const isBackward = direction === 'backward';
    const sortOrderForQuery = isBackward ? (order === 'ASC' ? 'DESC' : 'ASC') : order;
    query += ` ORDER BY p.${orderColumn} ${sortOrderForQuery}, p.id ${sortOrderForQuery}`;
    
    // Limit
    query += ` LIMIT ?`;
    params.push(parseInt(limit) + 1); // Fetch one extra to determine if there are more pages

    // Execute query
    const [rows] = await db.query(query, params);

    // For backward pagination, reverse the results
    const results = isBackward ? rows.reverse() : rows;

    // Determine if there are more results
    const hasMore = results.length > limit;
    const products = hasMore ? results.slice(0, limit) : results;
    
    // Generate cursors
    const nextCursor = hasMore && !isBackward ? this.encodeCursor(products[products.length - 1], orderColumn) : null;
    const prevCursor = products.length > 0 && (cursor || isBackward) ? this.encodeCursor(products[0], orderColumn) : null;

    return {
      products,
      pagination: {
        nextCursor,
        prevCursor,
        hasMore,
        hasPrevious: !!cursor,
        limit: parseInt(limit),
        count: products.length
      }
    };
  }

  /**
   * Get product by ID with caching
   */
  async getProductById(id) {
    try {
      const cacheKey = `${this.cachePrefix}single:${id}`;
      
      // Check cache
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.info(`Cache hit for product ${id}`);
        return JSON.parse(cached);
      }

      // Query database
      const [rows] = await db.query(
        'SELECT * FROM products WHERE id = ?',
        [id]
      );

      if (rows.length === 0) {
        return null;
      }

      const product = rows[0];

      // Cache result
      await redisClient.setEx(cacheKey, this.cacheTTL, JSON.stringify(product));

      return product;
    } catch (error) {
      logger.error(`Error fetching product ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create product and invalidate cache
   */
  async createProduct(productData) {
    try {
      const { name, description, price, category, stock, image_url } = productData;

      const [result] = await db.query(
        `INSERT INTO products (name, description, price, category, stock, image_url) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [name, description, price, category, stock, image_url]
      );

      // Invalidate relevant caches
      await this.invalidateCache();

      return { id: result.insertId, ...productData };
    } catch (error) {
      logger.error('Error creating product:', error);
      throw error;
    }
  }

  /**
   * Update product and invalidate cache
   */
  async updateProduct(id, productData) {
    try {
      const updates = [];
      const params = [];

      Object.entries(productData).forEach(([key, value]) => {
        if (value !== undefined) {
          updates.push(`${key} = ?`);
          params.push(value);
        }
      });

      if (updates.length === 0) {
        throw new Error('No fields to update');
      }

      params.push(id);

      await db.query(
        `UPDATE products SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
        params
      );

      // Invalidate cache
      await this.invalidateCache();
      await redisClient.del(`${this.cachePrefix}single:${id}`);

      return await this.getProductById(id);
    } catch (error) {
      logger.error(`Error updating product ${id}:`, error);
      throw error;
    }
  }

  /**
   * Generate cache key from query parameters
   */
  generateCacheKey(options) {
    const keyString = JSON.stringify(options);
    const hash = crypto.createHash('md5').update(keyString).digest('hex');
    return `${this.cachePrefix}query:${hash}`;
  }

  /**
   * Get cached data
   */
  async getCachedData(key) {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Cache read error:', error);
      return null;
    }
  }

  /**
   * Cache data
   */
  async cacheData(key, data) {
    try {
      await redisClient.setEx(key, this.cacheTTL, JSON.stringify(data));
    } catch (error) {
      logger.error('Cache write error:', error);
    }
  }

  /**
   * Invalidate all product list caches
   * Strategy: Delete all keys matching pattern
   */
  async invalidateCache() {
    try {
      const pattern = `${this.cachePrefix}query:*`;
      
      // Scan and delete matching keys
      let cursor = 0;
      do {
        const result = await redisClient.scan(cursor, {
          MATCH: pattern,
          COUNT: 100
        });
        
        cursor = result.cursor;
        const keys = result.keys;
        
        if (keys.length > 0) {
          await redisClient.del(keys);
        }
      } while (cursor !== 0);

      logger.info('Product cache invalidated');
    } catch (error) {
      logger.error('Cache invalidation error:', error);
    }
  }

  /**
   * Get product statistics
   */
  async getStats() {
    try {
      const [stats] = await db.query(`
        SELECT 
          COUNT(*) as total_products,
          AVG(price) as avg_price,
          MIN(price) as min_price,
          MAX(price) as max_price,
          COUNT(DISTINCT category) as total_categories
        FROM products
      `);

      return stats[0];
    } catch (error) {
      logger.error('Error fetching stats:', error);
      throw error;
    }
  }
}

module.exports = new ProductService();
