# Injective Market Intelligence API (IMI-API)

Derived, developer-ready market intelligence on top of Injective markets. This API focuses on answering questions developers actually need, such as liquidity, volatility, market health, and activity, without exposing raw orderbook noise.

## What It Does
- Liquidity scoring (spread, depth, turnover, imbalance)
- Volatility detection and trend analysis
- Market health signals and risk flags
- Active market ranking

## API Versioning
All endpoints are versioned under `/api/v1`.

## Endpoints (REST)

### Market Endpoints
- `GET /api/v1/markets` - List all markets
- `GET /api/v1/markets/active` - List active markets (ranked by activity)
- `GET /api/v1/markets/:id/summary` - Get comprehensive market summary
- `GET /api/v1/markets/:id/liquidity` - Get liquidity metrics
- `GET /api/v1/markets/:id/volatility` - Get volatility metrics
- `GET /api/v1/markets/:id/health` - Get health metrics
- `GET /api/v1/markets/:id/insights` - Get market insights and signals

### System Endpoints
- `GET /health` - Health check endpoint
- `GET /api/v1/metrics` - API call metrics and monitoring data

## Quick Start

### Development
```bash
npm install
npm run dev
```

### Production (Docker)
```bash
# Build and run with Docker
docker-compose up -d

# Or build manually
docker build -t injective-api .
docker run -p 3000:3000 --env-file .env injective-api
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## Environment Variables
Copy `.env.example` to `.env` and adjust as needed.

### Required Environment Variables
- `INJECTIVE_API_URL` - Base URL for Injective Exchange API (default: `https://api.injective.exchange`)

### Optional Environment Variables
- `PORT` - Server port (default: `3000`)
- `HOST` - Server host (default: `0.0.0.0`)
- `LOG_LEVEL` - Logging level (default: `info`)
- `NODE_ENV` - Environment mode (default: `development`)

### API Configuration
- `INJECTIVE_API_TIMEOUT_MS` - API request timeout in milliseconds (default: `10000`)
- `INJECTIVE_API_CACHE_TTL_MS` - Cache TTL for API responses in milliseconds (default: `5000`)
- `INJECTIVE_API_RATE_LIMIT_PER_MINUTE` - Maximum API requests per minute (default: `60`)
- `ENABLE_API_METRICS` - Enable API call metrics tracking (default: `true`)

### Application Configuration
- `CACHE_TTL_MS` - Cache TTL for application data in milliseconds (default: `10000`)
- `BASELINE_WINDOW` - Baseline window for metrics calculation (default: `7d`)

## Project Structure
src/
 ├── routes        # API endpoints
 ├── controllers   # Request handling
 ├── services      # Injective + metrics logic
 ├── utils         # Shared helpers
 └── types         # Type definitions

## Features

### 🚀 Performance Optimizations
- **Response Caching**: API responses are cached to reduce external API calls
- **Rate Limiting**: Built-in rate limiting protects against API quota exhaustion
- **Endpoint Fallback**: Automatically tries multiple endpoint variants if one fails

### 📊 Monitoring & Metrics
- **API Metrics Tracking**: Tracks success rates, response times, and error rates
- **Metrics Endpoint**: Access real-time API call statistics via `/api/v1/metrics`
- **Error Logging**: Comprehensive error tracking and logging

### 🔄 Reliability
- **Automatic Retry**: Tries alternative endpoint formats if primary fails
- **Timeout Protection**: Configurable request timeouts prevent hanging requests
- **Error Handling**: Graceful error handling with detailed error messages

## API Integration Details

This API integrates with the Injective Exchange API to fetch real-time market data. The service automatically tries multiple endpoint variants:

**Markets Endpoint:**
- `/api/exchange/v1/markets`
- `/markets`
- `/api/v1/markets`

**Orderbook Endpoint:**
- `/api/exchange/v1/orderbooks/{marketId}`
- `/orderbook/{marketId}`
- `/api/v1/orderbook/{marketId}`

**Trades Endpoint:**
- `/api/exchange/v1/trades/{marketId}`
- `/trades/{marketId}`
- `/api/v1/trades/{marketId}`

**Note:** The service automatically tries these variants in order until one succeeds, ensuring compatibility with different API versions.

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive deployment guides including:
- Docker deployment
- Kubernetes configuration
- Cloud platform deployments (AWS, Railway, Render, Fly.io, Heroku)
- Monitoring setup
- CI/CD pipeline configuration

## Monitoring

The API includes built-in monitoring endpoints:
- `/health` - Health check with system information
- `/live` - Liveness probe
- `/ready` - Readiness probe (checks API connectivity)
- `/api/v1/metrics` - API call metrics and statistics

See [monitoring/README.md](./monitoring/README.md) for Prometheus and Grafana setup.

## CI/CD

GitHub Actions workflows are configured:
- **CI Pipeline** (`.github/workflows/ci.yml`): Lint, test, and build on every push/PR
- **Deploy Pipeline** (`.github/workflows/deploy.yml`): Deploy to production on main branch

Configure secrets in GitHub:
- `DOCKER_USERNAME` - Docker Hub username
- `DOCKER_PASSWORD` - Docker Hub password
- `INJECTIVE_API_URL` - Injective API URL (optional, uses default if not set)
