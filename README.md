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
- `GET /api/v1/markets`
- `GET /api/v1/markets/active`
- `GET /api/v1/markets/:id/summary`
- `GET /api/v1/markets/:id/liquidity`
- `GET /api/v1/markets/:id/volatility`
- `GET /api/v1/markets/:id/health`
- `GET /api/v1/markets/:id/insights`

## Quick Start
```bash
npm install
npm run dev
```

## Environment Variables
Copy `.env.example` to `.env` and adjust as needed.

## Project Structure
src/
 ├── routes        # API endpoints
 ├── controllers   # Request handling
 ├── services      # Injective + metrics logic
 ├── utils         # Shared helpers
 └── types         # Type definitions

## Notes
This repository is scaffolded for clarity and judge review. The Injective data layer is currently mocked and ready to be swapped with live API calls.
