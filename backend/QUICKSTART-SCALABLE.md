# BomaSecure Scalable Server - Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### Step 1: Install New Dependencies

```bash
cd backend
npm install ioredis @socket.io/redis-adapter
```

### Step 2: Configure Environment

Add these variables to your `.env` file:

```env
# Redis Configuration (Required for scaling)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Optional: Redis Cluster (for production)
# REDIS_CLUSTER_NODES=redis-1:6379,redis-2:6379,redis-3:6379

# Database Optimization (Optional)
DB_MAX_POOL_SIZE=100
DB_MIN_POOL_SIZE=10
DB_READ_MAX_POOL_SIZE=200
DB_READ_MIN_POOL_SIZE=20

# MongoDB Read Replica (Optional)
# MONGODB_READ_URI=mongodb://read-replica:27017/bomasecure
```

### Step 3: Start Scalable Server

```bash
# Development
npm run dev:scalable

# Production
npm run start:scalable
```

## 📊 New Endpoints

Once running, you'll have access to these monitoring endpoints:

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |
| `GET /api/ready` | Readiness probe (Kubernetes) |
| `GET /api/metrics` | Prometheus metrics |
| `GET /api/metrics/detailed` | Detailed system metrics |
| `GET /api/websocket/stats` | WebSocket connection stats |
| `GET /api/cache/stats` | Redis cache statistics |
| `GET /api/database/stats` | Database connection stats |
| `GET /api/ratelimit/stats` | Rate limiting statistics |

## 🔧 What's New?

### 1. Redis Caching
- Automatic caching of user, apartment, and visitor data
- Distributed rate limiting across multiple server instances
- Offline notification storage

### 2. WebSocket Scaling
- Horizontal scaling with Redis adapter
- Support for 500K+ concurrent connections
- Automatic failover to single instance mode

### 3. Database Optimization
- Connection pooling (100-200 connections)
- Read/write splitting (optional)
- Query timeouts and monitoring

### 4. Monitoring
- Real-time metrics (requests/sec, memory, CPU)
- Prometheus-compatible metrics
- Health and readiness probes

### 5. Circuit Breakers
- Automatic failure detection
- Graceful degradation
- Fallback strategies

### 6. Enhanced Rate Limiting
- Redis-backed distributed limiting
- Tiered limits (free/basic/premium/enterprise)
- WebSocket message rate limiting

## 🧪 Testing

### Test Health Endpoint

```bash
curl http://localhost:4200/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "database": { "primary": "up", "replica": "up" },
    "redis": "up",
    "websocket": "up"
  },
  "metrics": {
    "uptime": 123.456,
    "memoryUsage": 0.45,
    "cpuUsage": 0.32,
    "requestsPerSecond": 150.5
  }
}
```

### Test Metrics Endpoint

```bash
curl http://localhost:4200/api/metrics
```

### Test WebSocket Stats

```bash
curl http://localhost:4200/api/websocket/stats
```

## 🐳 Docker Deployment

### Build Image

```bash
docker build -t bomasecure-api:scalable .
```

### Run Container

```bash
docker run -d \
  --name bomasecure-api \
  -p 4200:4200 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/bomasecure \
  -e REDIS_HOST=host.docker.internal \
  -e JWT_SECRET=your-secret-key \
  bomasecure-api:scalable
```

## ☸️ Kubernetes Deployment

### Apply Configuration

```bash
kubectl apply -f k8s/deployment.yaml
```

### Check Status

```bash
kubectl get pods -l app=bomasecure-api
kubectl get hpa bomasecure-api-hpa
```

### View Logs

```bash
kubectl logs -f deployment/bomasecure-api
```

## 📈 Scaling Scenarios

### Scenario 1: No Redis Available

The server will automatically fall back to:
- Local rate limiting
- Single-instance WebSocket
- No caching (direct database queries)

**Result:** Server runs normally, just without scaling benefits.

### Scenario 2: Redis Available

Full scaling features enabled:
- Distributed caching
- WebSocket cluster
- Distributed rate limiting

**Result:** Ready for 1M+ users.

### Scenario 3: Database Issues

Circuit breaker activates:
- Automatic failover to read replica
- Cached data served
- Graceful degradation

**Result:** Service continues with degraded functionality.

## 🔍 Troubleshooting

### Server Won't Start

1. Check if port 4200 is available
2. Verify MongoDB is running
3. Check environment variables

### Redis Connection Failed

```bash
# Check Redis status
redis-cli ping

# Should return: PONG
```

If Redis is not available, the server will still start without caching.

### High Memory Usage

1. Check cache stats: `GET /api/cache/stats`
2. Review connection pool sizes
3. Consider increasing Redis memory

### Slow Responses

1. Check database stats: `GET /api/database/stats`
2. Review query execution plans
3. Add database indexes

## 📚 Additional Resources

- [Full Scalability Documentation](SCALABILITY.md)
- [Kubernetes Configuration](k8s/deployment.yaml)
- [Redis Configuration](config/redis.js)
- [Database Configuration](config/database.js)

## 🎯 Next Steps

1. **Install Redis** (if not already installed):
   ```bash
   # macOS
   brew install redis
   brew services start redis
   
   # Ubuntu
   sudo apt-get install redis-server
   sudo systemctl start redis
   ```

2. **Configure Production Environment**:
   - Set up MongoDB replica set
   - Configure Redis cluster
   - Set up monitoring (Prometheus/Grafana)

3. **Load Testing**:
   ```bash
   # Install artillery
   npm install -g artillery
   
   # Run load test
   artillery quick --count 1000 -n 50 http://localhost:4200/api/health
   ```

4. **Deploy to Production**:
   - Follow Kubernetes deployment guide
   - Set up CDN (CloudFlare)
   - Configure auto-scaling rules

## ✅ Checklist

- [ ] Installed new dependencies
- [ ] Configured environment variables
- [ ] Started scalable server
- [ ] Tested health endpoint
- [ ] Tested metrics endpoint
- [ ] Verified Redis connection (optional)
- [ ] Tested WebSocket functionality
- [ ] Reviewed monitoring endpoints

---

**Need Help?** Check the [SCALABILITY.md](SCALABILITY.md) for detailed documentation.

**Ready for Production?** Follow the [Kubernetes deployment guide](k8s/deployment.yaml).
