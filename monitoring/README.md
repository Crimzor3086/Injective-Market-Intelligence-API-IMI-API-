# Monitoring Setup

This directory contains monitoring configurations for the Injective Market Intelligence API.

## Prometheus Setup

1. **Install Prometheus** (if not already installed)

2. **Configure Prometheus** using `prometheus.yml`:
```bash
# Copy the config
cp monitoring/prometheus.yml /etc/prometheus/prometheus.yml

# Restart Prometheus
systemctl restart prometheus
```

3. **Access Prometheus UI**: http://localhost:9090

## Grafana Setup

1. **Install Grafana** (if not already installed)

2. **Import Dashboard**:
   - Open Grafana UI: http://localhost:3000
   - Go to Dashboards → Import
   - Upload `grafana-dashboard.json`
   - Configure Prometheus as data source

3. **Configure Data Source**:
   - URL: http://localhost:9090
   - Access: Server (default)

## Metrics Available

The API exposes metrics at `/api/v1/metrics`:

- `totalCalls` - Total number of API calls
- `successCount` - Number of successful calls
- `failureCount` - Number of failed calls
- `successRate` - Success rate (0-1)
- `averageResponseTimeMs` - Average response time in milliseconds
- `endpointStats` - Per-endpoint statistics

## Custom Metrics Export

To export metrics to Prometheus, you can:

1. **Use a metrics exporter** (recommended):
   - Install `prom-client` package
   - Create a metrics exporter that reads from `/api/v1/metrics`
   - Expose metrics at `/metrics` endpoint

2. **Direct Prometheus scraping**:
   - Configure Prometheus to scrape `/api/v1/metrics`
   - Parse JSON response (requires custom exporter)

## Alerting Rules

Example Prometheus alerting rules:

```yaml
groups:
  - name: injective_api
    rules:
      - alert: HighErrorRate
        expr: api_metrics_success_rate < 0.95
        for: 5m
        annotations:
          summary: "High error rate detected"
      
      - alert: SlowResponseTime
        expr: api_metrics_avg_response_time_ms > 5000
        for: 5m
        annotations:
          summary: "Slow API response times"
      
      - alert: APIUnavailable
        expr: up{job="injective-api"} == 0
        for: 1m
        annotations:
          summary: "API is unavailable"
```

## Health Checks

Monitor these endpoints:

- `/health` - Basic health check
- `/live` - Liveness probe (Kubernetes)
- `/ready` - Readiness probe (Kubernetes)

## Logging

Application logs can be collected using:

- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Loki** (Grafana's log aggregation)
- **CloudWatch Logs** (AWS)
- **Datadog Logs**

Configure log levels via `LOG_LEVEL` environment variable:
- `error` - Only errors
- `warn` - Warnings and errors
- `info` - Info, warnings, and errors (default)
- `debug` - All logs including debug
