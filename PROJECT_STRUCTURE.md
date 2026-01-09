# FarmLokal Project Structure

```
FarmLokal/
│
├── .github/
│   └── copilot-instructions.md      # GitHub Copilot workspace instructions
│
├── backend/
│   └── src/
│       ├── config/
│       │   ├── database.js          # MySQL connection pool configuration
│       │   └── redis.js             # Redis client configuration
│       │
│       ├── database/
│       │   ├── migrations/
│       │   │   └── run-migrations.js    # Database schema creation
│       │   └── seeders/
│       │       └── seed-products.js     # Product data seeder (1M+ records)
│       │
│       ├── middleware/
│       │   ├── errorHandler.js      # Centralized error handling
│       │   └── rateLimiter.js       # Redis-backed rate limiting
│       │
│       ├── routes/
│       │   ├── productRoutes.js     # Product CRUD endpoints
│       │   ├── webhookRoutes.js     # Webhook callback endpoints
│       │   └── externalApiRoutes.js # External API integration endpoints
│       │
│       ├── services/
│       │   ├── oauth2Service.js         # OAuth2 token management
│       │   ├── productService.js        # Product business logic
│       │   ├── externalApiService.js    # External API calls with retry
│       │   └── webhookService.js        # Webhook processing with idempotency
│       │
│       ├── utils/
│       │   └── logger.js            # Winston logger configuration
│       │
│       ├── server.js                # Main Express application
│       └── mock-oauth-server.js     # Mock OAuth2 server for testing
│
├── frontend/
│   ├── public/
│   │   └── index.html               # HTML template
│   │
│   ├── src/
│   │   ├── App.js                   # Main React component
│   │   ├── index.js                 # React entry point
│   │   └── index.css                # Application styles
│   │
│   └── package.json                 # Frontend dependencies
│
├── logs/                            # Application logs (auto-generated)
│   ├── error.log
│   └── combined.log
│
├── .env                             # Environment variables (DO NOT COMMIT)
├── .env.example                     # Environment variables template
├── .gitignore                       # Git ignore rules
├── package.json                     # Backend dependencies
│
├── README.md                        # Main documentation
├── QUICKSTART.md                    # Quick setup guide
├── DEVELOPMENT.md                   # Development & architecture guide
└── API_EXAMPLES.http                # API testing examples
```

## Key Files Explained

### Backend Core

**server.js**
- Express application setup
- Middleware configuration (CORS, helmet, rate limiting)
- Route mounting
- Error handling

**config/database.js**
- MySQL connection pool with optimization
- Connection limit: 10
- Keep-alive enabled
- Automatic reconnection

**config/redis.js**
- Redis client setup
- Connection management
- Error handling

### Services Layer

**oauth2Service.js**
- OAuth2 Client Credentials flow
- Token caching in Redis with TTL
- Concurrent request handling (lock mechanism)
- Automatic token refresh

**productService.js**
- Product CRUD operations
- Query building with filters, sorting, pagination
- Redis caching with MD5 hash keys
- Cache invalidation strategy

**externalApiService.js**
- External API integration (API A)
- Circuit breaker pattern (Opossum)
- Exponential backoff retry logic
- Timeout handling

**webhookService.js**
- Webhook event processing (API B)
- Idempotency with Redis
- Duplicate detection
- Processing locks

### Middleware

**rateLimiter.js**
- Redis-backed rate limiting
- Configurable window and limits
- Per-IP tracking

**errorHandler.js**
- Centralized error handling
- Structured logging
- Environment-aware stack traces

### Database

**migrations/run-migrations.js**
- Creates products table
- Adds performance indexes:
  - idx_category
  - idx_price
  - idx_created_at
  - idx_name
  - idx_category_price
  - ft_name_description (fulltext)

**seeders/seed-products.js**
- Batch insert optimization
- Generates 1M+ products
- Progress tracking
- Configurable size

### Frontend

**App.js**
- Product listing component
- Search and filter UI
- Pagination (cursor-based)
- Axios API integration

### Configuration Files

**.env**
- Environment-specific configuration
- Database credentials
- Redis connection
- OAuth2 settings
- Performance tuning

**package.json (root)**
- Backend dependencies
- Scripts for development
- Database management commands

**package.json (frontend)**
- React and dependencies
- Development scripts
- Proxy configuration

### Documentation

**README.md**
- Complete project documentation
- Setup instructions
- API documentation
- Architecture overview
- Performance targets
- Troubleshooting guide

**QUICKSTART.md**
- 5-minute setup guide
- Quick testing commands
- Common issues

**DEVELOPMENT.md**
- Detailed architecture explanations
- OAuth2 flow diagrams
- Performance optimization techniques
- Testing scenarios
- Production deployment guide

**API_EXAMPLES.http**
- 36+ API endpoint examples
- Test scenarios
- CURL commands
- Redis/MySQL debugging commands

## Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL with connection pooling
- **Cache**: Redis
- **Authentication**: OAuth2 Client Credentials
- **HTTP Client**: Axios
- **Circuit Breaker**: Opossum
- **Logger**: Winston
- **Validation**: express-validator
- **Security**: Helmet, CORS

### Frontend
- **Framework**: React 18
- **HTTP Client**: Axios
- **Styling**: CSS
- **Build Tool**: Create React App

### DevOps
- **Process Manager**: Nodemon (dev), PM2 (production)
- **Task Runner**: npm scripts
- **Version Control**: Git

## Performance Features

1. **Database Optimization**
   - Multiple indexes for fast queries
   - Connection pooling (max 10 connections)
   - Cursor-based pagination
   - Optimized query patterns

2. **Caching Strategy**
   - Query result caching (5 min TTL)
   - OAuth2 token caching (1 hour TTL)
   - Single product caching
   - Pattern-based invalidation

3. **Reliability**
   - Circuit breaker (50% error threshold, 30s reset)
   - Rate limiting (100 req/min per IP)
   - Exponential backoff retry (1s, 2s, 4s)
   - Request deduplication

4. **Monitoring**
   - Structured logging (Winston)
   - Response time tracking
   - Circuit breaker statistics
   - Health check endpoint

## API Endpoints

### Products
- `GET /api/products` - List products (paginated, filtered, sorted)
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `GET /api/products/meta/stats` - Product statistics

### External API
- `GET /api/external/data` - Call external API with retry
- `GET /api/external/stats` - Circuit breaker statistics

### Webhooks
- `POST /api/webhooks/callback` - Receive webhooks
- `POST /api/webhooks/register` - Register callback URL

### Health
- `GET /health` - Health check

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 5000 |
| DB_HOST | MySQL host | localhost |
| DB_USER | MySQL username | root |
| DB_PASSWORD | MySQL password | - |
| DB_NAME | Database name | farmlokal |
| REDIS_HOST | Redis host | localhost |
| REDIS_PORT | Redis port | 6379 |
| OAUTH_TOKEN_URL | OAuth2 token endpoint | - |
| CACHE_TTL | Cache TTL (seconds) | 300 |
| RATE_LIMIT_MAX_REQUESTS | Max requests per window | 100 |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start backend + frontend |
| `npm run server` | Start backend only |
| `npm run client` | Start frontend only |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed 1M products |
| `npm install-all` | Install all dependencies |

## Testing

See [API_EXAMPLES.http](API_EXAMPLES.http) for:
- 36+ API examples
- Performance testing
- Rate limit testing
- Webhook idempotency testing
- Circuit breaker testing

## Learn More

- [README.md](README.md) - Complete documentation
- [QUICKSTART.md](QUICKSTART.md) - Get started in 5 minutes
- [DEVELOPMENT.md](DEVELOPMENT.md) - Architecture deep-dive
- [API_EXAMPLES.http](API_EXAMPLES.http) - API testing examples
