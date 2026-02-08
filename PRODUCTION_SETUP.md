# Production Setup Checklist

This document provides a quick checklist for setting up the Injective Market Intelligence API in production.

## ✅ Pre-Deployment Checklist

### 1. Environment Configuration
- [ ] Create `.env.production` file
- [ ] Set `NODE_ENV=production`
- [ ] Configure `INJECTIVE_API_URL`
- [ ] Set appropriate `LOG_LEVEL` (recommended: `info`)
- [ ] Configure rate limits (`INJECTIVE_API_RATE_LIMIT_PER_MINUTE`)
- [ ] Set cache TTL values
- [ ] Enable metrics (`ENABLE_API_METRICS=true`)

### 2. Security
- [ ] Verify `.env.production` is in `.gitignore`
- [ ] Use secrets management (AWS Secrets Manager, Vault, etc.)
- [ ] Configure HTTPS (via reverse proxy/load balancer)
- [ ] Review CORS settings for production domains
- [ ] Ensure container runs as non-root user (Dockerfile configured)

### 3. Monitoring Setup
- [ ] Configure health check endpoints
  - `/health` - Basic health
  - `/live` - Liveness probe
  - `/ready` - Readiness probe
- [ ] Set up metrics collection (Prometheus/Grafana)
- [ ] Configure alerting rules
- [ ] Set up log aggregation (ELK, Loki, CloudWatch)

### 4. CI/CD Pipeline
- [ ] Configure GitHub Actions secrets:
  - `DOCKER_USERNAME`
  - `DOCKER_PASSWORD`
  - `INJECTIVE_API_URL` (optional)
- [ ] Verify CI pipeline runs successfully
- [ ] Test deployment pipeline

### 5. Testing
- [ ] Run unit tests: `npm test`
- [ ] Run integration tests: `npm run test:integration`
- [ ] Test health endpoints
- [ ] Verify metrics endpoint works
- [ ] Test rate limiting
- [ ] Verify caching behavior

## 🚀 Deployment Steps

### Docker Deployment (Recommended)

1. **Build Image:**
   ```bash
   docker build -t injective-api:latest .
   ```

2. **Run Container:**
   ```bash
   docker run -d \
     --name injective-api \
     -p 3000:3000 \
     --env-file .env.production \
     --restart unless-stopped \
     injective-api:latest
   ```

3. **Verify Deployment:**
   ```bash
   curl http://localhost:3000/health
   curl http://localhost:3000/ready
   curl http://localhost:3000/api/v1/metrics
   ```

### Docker Compose

1. **Update `docker-compose.yml`** with production environment variables

2. **Deploy:**
   ```bash
   docker-compose up -d
   ```

3. **Check Logs:**
   ```bash
   docker-compose logs -f
   ```

## 📊 Post-Deployment Verification

### Health Checks
- [ ] `/health` returns 200
- [ ] `/live` returns 200
- [ ] `/ready` returns 200 (may be 503 if API unavailable)

### API Endpoints
- [ ] `/api/v1/markets` returns market list
- [ ] `/api/v1/markets/active` returns active markets
- [ ] `/api/v1/metrics` returns metrics data

### Monitoring
- [ ] Metrics are being collected
- [ ] Dashboards are configured
- [ ] Alerts are set up
- [ ] Logs are being aggregated

### Performance
- [ ] Response times are acceptable
- [ ] Caching is working (check metrics)
- [ ] Rate limiting is functioning
- [ ] No memory leaks (monitor over time)

## 🔧 Configuration Reference

### Production Environment Variables

```env
# Server
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=info

# Injective API
INJECTIVE_API_URL=https://api.injective.exchange
INJECTIVE_API_TIMEOUT_MS=10000
INJECTIVE_API_CACHE_TTL_MS=5000
INJECTIVE_API_RATE_LIMIT_PER_MINUTE=60
ENABLE_API_METRICS=true

# Application
CACHE_TTL_MS=10000
BASELINE_WINDOW=7d
```

### Recommended Settings

**High Traffic:**
- `INJECTIVE_API_CACHE_TTL_MS=10000` (10 seconds)
- `INJECTIVE_API_RATE_LIMIT_PER_MINUTE=120`
- Multiple instances behind load balancer

**Low Traffic:**
- `INJECTIVE_API_CACHE_TTL_MS=30000` (30 seconds)
- `INJECTIVE_API_RATE_LIMIT_PER_MINUTE=30`
- Single instance sufficient

## 🐛 Troubleshooting

### API Not Responding
1. Check logs: `docker logs injective-api`
2. Verify environment variables
3. Test Injective API connectivity
4. Check rate limits

### High Memory Usage
1. Reduce cache TTL
2. Monitor cache hit rates
3. Consider implementing cache size limits
4. Check for memory leaks

### Slow Response Times
1. Check Injective API response times
2. Verify caching is working
3. Review metrics endpoint
4. Consider increasing cache TTL

### Rate Limit Errors
1. Increase rate limit if API allows
2. Implement request queuing
3. Use caching more aggressively
4. Consider multiple API keys (if supported)

## 📚 Additional Resources

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Detailed deployment guide
- [monitoring/README.md](./monitoring/README.md) - Monitoring setup
- [README.md](./README.md) - General documentation

## 🆘 Support

If you encounter issues:
1. Check application logs
2. Review metrics endpoint (`/api/v1/metrics`)
3. Verify Injective API status
4. Review this checklist
5. Check GitHub issues
