const express = require('express');
const router = express.Router();
const productService = require('../services/productService');
const { query, validationResult } = require('express-validator');
const logger = require('../utils/logger');

/**
 * GET /api/products
 * High-performance product listing with pagination, sorting, filtering
 */
router.get('/',
  [
    query('cursor').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('sortBy').optional().isIn(['price', 'created_at', 'name', 'id']),
    query('sortOrder').optional().isIn(['ASC', 'DESC', 'asc', 'desc']),
    query('direction').optional().isIn(['forward', 'backward']),
    query('search').optional().isString(),
    query('category').optional().isString(),
    query('minPrice').optional().isFloat({ min: 0 }),
    query('maxPrice').optional().isFloat({ min: 0 })
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const startTime = Date.now();

      const options = {
        cursor: req.query.cursor,
        limit: req.query.limit ? parseInt(req.query.limit) : 50,
        sortBy: req.query.sortBy || 'created_at',
        sortOrder: (req.query.sortOrder || 'DESC').toUpperCase(),
        direction: req.query.direction || 'forward',
        search: req.query.search,
        category: req.query.category,
        minPrice: req.query.minPrice ? parseFloat(req.query.minPrice) : undefined,
        maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice) : undefined
      };

      const result = await productService.getProducts(options);

      const responseTime = Date.now() - startTime;
      logger.info(`Products query completed in ${responseTime}ms`);

      res.json({
        success: true,
        data: result.products,
        pagination: result.pagination,
        meta: {
          responseTime: `${responseTime}ms`
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/products/:id
 * Get single product by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: { message: 'Product not found' }
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/products
 * Create new product
 */
router.post('/', async (req, res, next) => {
  try {
    const product = await productService.createProduct(req.body);
    
    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/products/:id
 * Update product
 */
router.put('/:id', async (req, res, next) => {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);
    
    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/products/stats
 * Get product statistics
 */
router.get('/meta/stats', async (req, res, next) => {
  try {
    const stats = await productService.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
