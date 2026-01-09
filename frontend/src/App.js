import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './index.css';

// Configure API base URL
const API_URL = process.env.REACT_APP_API_URL || '';

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [responseTime, setResponseTime] = useState(null);

  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    minPrice: '',
    maxPrice: '',
    sortBy: 'created_at',
    sortOrder: 'DESC',
    limit: 50
  });

  const categories = [
    'All', 'Vegetables', 'Fruits', 'Dairy', 'Grains', 
    'Meat', 'Poultry', 'Seafood', 'Herbs', 'Spices', 'Organic'
  ];

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProducts = async (cursor = null) => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        ...filters,
        category: filters.category === 'All' ? '' : filters.category,
        cursor
      };

      // Remove empty params
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null) {
          delete params[key];
        }
      });

      const response = await axios.get(`${API_URL}/api/products`, { params });

      if (cursor) {
        setProducts(prev => [...prev, ...response.data.data]);
      } else {
        setProducts(response.data.data);
      }

      setNextCursor(response.data.pagination.nextCursor);
      setHasMore(response.data.pagination.hasMore);
      setResponseTime(response.data.meta.responseTime);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to fetch products');
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchProducts();
  };

  const handleLoadMore = () => {
    fetchProducts(nextCursor);
  };

  const handleReset = () => {
    setFilters({
      search: '',
      category: '',
      minPrice: '',
      maxPrice: '',
      sortBy: 'created_at',
      sortOrder: 'DESC',
      limit: 50
    });
    setTimeout(() => fetchProducts(), 0);
  };

  return (
    <div className="App">
      <header className="header">
        <h1>🌾 FarmLokal</h1>
        <p>Fresh Products from Local Farms</p>
      </header>

      <div className="container">
        <div className="filters">
          <form onSubmit={handleSearch}>
            <div className="filter-row">
              <div className="filter-group">
                <label>Search</label>
                <input
                  type="text"
                  name="search"
                  value={filters.search}
                  onChange={handleFilterChange}
                  placeholder="Search products..."
                />
              </div>

              <div className="filter-group">
                <label>Category</label>
                <select
                  name="category"
                  value={filters.category}
                  onChange={handleFilterChange}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat === 'All' ? '' : cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Min Price ($)</label>
                <input
                  type="number"
                  name="minPrice"
                  value={filters.minPrice}
                  onChange={handleFilterChange}
                  placeholder="0"
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="filter-group">
                <label>Max Price ($)</label>
                <input
                  type="number"
                  name="maxPrice"
                  value={filters.maxPrice}
                  onChange={handleFilterChange}
                  placeholder="1000"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="filter-row">
              <div className="filter-group">
                <label>Sort By</label>
                <select
                  name="sortBy"
                  value={filters.sortBy}
                  onChange={handleFilterChange}
                >
                  <option value="created_at">Date</option>
                  <option value="name">Name</option>
                  <option value="price">Price</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Order</label>
                <select
                  name="sortOrder"
                  value={filters.sortOrder}
                  onChange={handleFilterChange}
                >
                  <option value="ASC">Ascending</option>
                  <option value="DESC">Descending</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Results Per Page</label>
                <select
                  name="limit"
                  value={filters.limit}
                  onChange={handleFilterChange}
                >
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>

              <div className="filter-group">
                <label>&nbsp;</label>
                <button type="submit">Apply Filters</button>
              </div>

              <div className="filter-group">
                <label>&nbsp;</label>
                <button type="button" onClick={handleReset}>Reset</button>
              </div>
            </div>
          </form>
        </div>

        {responseTime && (
          <div className="stats">
            <span>Showing {products.length} products</span>
            <span>Response time: {responseTime}</span>
          </div>
        )}

        {error && <div className="error">{error}</div>}

        {loading && products.length === 0 ? (
          <div className="loading">Loading products...</div>
        ) : (
          <>
            <div className="product-grid">
              {products.map((product) => (
                <div key={product.id} className="product-card">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="product-image"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://placehold.co/300x200/2ecc71/white?text=${encodeURIComponent(product.name)}`;
                    }}
                  />
                  <div className="product-info">
                    <h3 className="product-name">{product.name}</h3>
                    <span className="product-category">{product.category}</span>
                    <p className="product-description">{product.description}</p>
                    <div className="product-footer">
                      <span className="product-price">${product.price}</span>
                      <span className="product-stock">
                        Stock: {product.stock}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="pagination">
                <button onClick={handleLoadMore} disabled={loading}>
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;
