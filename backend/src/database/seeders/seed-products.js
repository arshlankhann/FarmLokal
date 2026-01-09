const db = require('../../config/database');
const logger = require('../../utils/logger');

const categories = [
  'Vegetables',
  'Fruits',
  'Dairy',
  'Grains',
  'Meat',
  'Poultry',
  'Seafood',
  'Herbs',
  'Spices',
  'Organic'
];

const productNames = [
  'Tomatoes', 'Potatoes', 'Onions', 'Carrots', 'Lettuce',
  'Apples', 'Bananas', 'Oranges', 'Grapes', 'Strawberries',
  'Milk', 'Cheese', 'Butter', 'Yogurt', 'Eggs',
  'Rice', 'Wheat', 'Corn', 'Barley', 'Oats',
  'Chicken', 'Beef', 'Pork', 'Lamb', 'Turkey',
  'Salmon', 'Tuna', 'Shrimp', 'Cod', 'Lobster',
  'Basil', 'Oregano', 'Thyme', 'Rosemary', 'Parsley'
];

/**
 * Generate random product data
 */
function generateProduct(index) {
  const name = productNames[Math.floor(Math.random() * productNames.length)];
  const category = categories[Math.floor(Math.random() * categories.length)];
  const price = (Math.random() * 100 + 1).toFixed(2);
  const stock = Math.floor(Math.random() * 1000);
  
  return {
    name: `${name} ${index}`,
    description: `Fresh ${name.toLowerCase()} from local farms. High quality and organic.`,
    price,
    category,
    stock,
    image_url: `https://placehold.co/300x200/2ecc71/white?text=${encodeURIComponent(name)}`
  };
}

/**
 * Seed products in batches for performance
 */
async function seedProducts(totalProducts = 1000000) {
  const batchSize = 1000;
  const totalBatches = Math.ceil(totalProducts / batchSize);

  try {
    logger.info(`Starting to seed ${totalProducts} products in ${totalBatches} batches...`);

    for (let batch = 0; batch < totalBatches; batch++) {
      const products = [];
      const currentBatchSize = Math.min(batchSize, totalProducts - (batch * batchSize));

      for (let i = 0; i < currentBatchSize; i++) {
        const index = batch * batchSize + i + 1;
        products.push(generateProduct(index));
      }

      // Build batch insert query
      const values = products.map(p => 
        `('${p.name.replace(/'/g, "''")}', '${p.description.replace(/'/g, "''")}', ${p.price}, '${p.category}', ${p.stock}, '${p.image_url}')`
      ).join(',');

      const query = `
        INSERT INTO products (name, description, price, category, stock, image_url)
        VALUES ${values}
      `;

      await db.query(query);

      if ((batch + 1) % 10 === 0) {
        const progress = ((batch + 1) / totalBatches * 100).toFixed(2);
        logger.info(`Progress: ${progress}% (${(batch + 1) * batchSize} products seeded)`);
      }
    }

    logger.info(`Successfully seeded ${totalProducts} products`);
    
    // Verify count
    const [result] = await db.query('SELECT COUNT(*) as count FROM products');
    logger.info(`Total products in database: ${result[0].count}`);

    process.exit(0);
  } catch (error) {
    logger.error('Error seeding products:', error);
    process.exit(1);
  }
}

// Run seeder if this file is executed directly
if (require.main === module) {
  const totalProducts = process.argv[2] ? parseInt(process.argv[2]) : 1000000;
  seedProducts(totalProducts);
}

module.exports = { seedProducts };
