# Deployment Guide

This guide covers deploying the Injective Market Intelligence API to production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Docker Deployment](#docker-deployment)
- [Environment Configuration](#environment-configuration)
- [Cloud Platform Deployments](#cloud-platform-deployments)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- Node.js 20+ (for local development)
- Docker and Docker Compose (for containerized deployment)
- Access to Injective Exchange API
- Environment variables configured

## Docker Deployment

### Build Docker Image

```bash
# Build the image
docker build -t injective-api:latest .

# Or use npm script
npm run docker:build
```

### Run with Docker

```bash
# Run container
docker run -d \
  --name injective-api \
  -p 3000:3000 \
  --env-file .env.production \
  injective-api:latest

# Or use npm script
npm run docker:run
```

### Docker Compose

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Or use npm scripts
npm run docker:compose
npm run docker:compose:down
```

## Environment Configuration

### Production Environment Variables

Create a `.env.production` file with the following:

```env
# Server Configuration
PORT=3000
HOST=0.0.0.0
NODE_ENV=production
LOG_LEVEL=info

# Injective API Configuration
INJECTIVE_API_URL=https://api.injective.exchange
INJECTIVE_API_TIMEOUT_MS=10000
INJECTIVE_API_CACHE_TTL_MS=5000
INJECTIVE_API_RATE_LIMIT_PER_MINUTE=60
ENABLE_API_METRICS=true

# Application Configuration
CACHE_TTL_MS=10000
BASELINE_WINDOW=7d
```

### Security Best Practices

1. **Never commit `.env.production` to version control**
2. Use secrets management services:
   - AWS Secrets Manager
   - HashiCorp Vault
   - Kubernetes Secrets
   - Docker Secrets
3. Rotate API keys regularly
4. Use environment-specific API endpoints when available

## Cloud Platform Deployments

### AWS (ECS/Fargate)

1. **Build and push Docker image to ECR:**
```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
docker tag injective-api:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/injective-api:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/injective-api:latest
```

2. **Create ECS Task Definition** with environment variables
3. **Deploy to ECS Service** with health checks pointing to `/health`

### Kubernetes

1. **Create ConfigMap:**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: injective-api-config
data:
  PORT: "3000"
  NODE_ENV: "production"
```

2. **Create Deployment:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: injective-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: injective-api
  template:
    metadata:
      labels:
        app: injective-api
    spec:
      containers:
      - name: api
        image: injective-api:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: injective-api-config
        livenessProbe:
          httpGet:
            path: /live
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 10
```

3. **Create Service:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: injective-api
spec:
  selector:
    app: injective-api
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

### Railway

1. Connect your GitHub repository
2. Set environment variables in Railway dashboard
3. Railway will automatically detect Dockerfile and deploy

### Render

1. Create a new Web Service
2. Connect your repository
3. Set build command: `npm run build`
4. Set start command: `npm start`
5. Add environment variables

### Fly.io

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Launch app
fly launch

# Set secrets
fly secrets set INJECTIVE_API_URL=https://api.injective.exchange

# Deploy
fly deploy
```

### Heroku

```bash
# Login
heroku login

# Create app
heroku create injective-api

# Set config vars
heroku config:set NODE_ENV=production
heroku config:set INJECTIVE_API_URL=https://api.injective.exchange

# Deploy
git push heroku main
```

## Monitoring

### Health Check Endpoints

- **Health**: `GET /health` - Basic health check
- **Liveness**: `GET /live` - Kubernetes liveness probe
- **Readiness**: `GET /ready` - Kubernetes readiness probe (checks API connectivity)

### Metrics Endpoint

- **Metrics**: `GET /api/v1/metrics` - API call statistics and performance metrics

### Recommended Monitoring Tools

1. **Prometheus + Grafana**
   - Export metrics from `/api/v1/metrics`
   - Create dashboards for:
     - API call success rates
     - Response times
     - Error rates
     - Rate limit hits

2. **Datadog/New Relic**
   - APM integration
   - Custom metrics from metrics endpoint
   - Alerting on error rates

3. **CloudWatch (AWS)**
   - CloudWatch Logs for application logs
   - CloudWatch Metrics for custom metrics
   - CloudWatch Alarms for alerting

### Monitoring Dashboard Configuration

Example Prometheus scrape config:

```yaml
scrape_configs:
  - job_name: 'injective-api'
    metrics_path: '/api/v1/metrics'
    static_configs:
      - targets: ['localhost:3000']
```

## Troubleshooting

### Common Issues

1. **API Connection Failures**
   - Check `INJECTIVE_API_URL` is correct
   - Verify network connectivity
   - Check API rate limits

2. **High Memory Usage**
   - Adjust `INJECTIVE_API_CACHE_TTL_MS` to reduce cache size
   - Monitor cache hit rates
   - Consider implementing cache size limits

3. **Rate Limit Errors**
   - Increase `INJECTIVE_API_RATE_LIMIT_PER_MINUTE` if API allows
   - Implement request queuing
   - Use caching more aggressively

4. **Slow Response Times**
   - Check Injective API response times
   - Verify caching is working (`/api/v1/metrics`)
   - Consider increasing cache TTL

### Logs

View application logs:

```bash
# Docker
docker logs injective-api -f

# Docker Compose
docker-compose logs -f

# Kubernetes
kubectl logs -f deployment/injective-api
```

### Debugging

Enable debug logging:

```env
LOG_LEVEL=debug
```

## Scaling

### Horizontal Scaling

- Deploy multiple instances behind a load balancer
- Each instance maintains its own cache
- Use sticky sessions if needed (not required for this API)

### Vertical Scaling

- Increase container memory limits
- Adjust Node.js heap size: `NODE_OPTIONS=--max-old-space-size=2048`

## Backup and Recovery

- No persistent data to backup (stateless API)
- Configuration stored in environment variables
- Metrics are in-memory (consider exporting to external storage)

## Security Checklist

- [ ] Environment variables secured (not in code)
- [ ] HTTPS enabled (via reverse proxy/load balancer)
- [ ] Rate limiting configured appropriately
- [ ] CORS configured for production domains
- [ ] Health checks configured
- [ ] Logging configured (avoid logging sensitive data)
- [ ] Container runs as non-root user (Dockerfile configured)
- [ ] Regular security updates applied

## Support

For issues or questions:
1. Check logs and metrics endpoint
2. Review this deployment guide
3. Check Injective API status
4. Review GitHub issues
