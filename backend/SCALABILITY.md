# BomaSecure Scalability Architecture

## Overview

This document describes the production-grade scalability architecture implemented for BomaSecure to support 1M+ concurrent users without crashing.

## Architecture Components

### 1. Database Layer (MongoDB)

**File:** [`backend/config/database.js`](backend/config/database.js)

- **Connection Pooling**: Configurable pool sizes (100 write, 200 read connections)
- **Read/Write Splitting**: Separate connections for reads (replicas) and writes (primary)
- **Query Timeouts**: Automatic timeout protection (5s reads, 10s writes)
- **Compression**: Snappy and zlib compression for reduced network traffic
- **Health Monitoring**: Automatic reconnection with exponential backoff

**Configuration:**
```env
MONGODB_URI=mongodb://localhost:27017/bomasecure
MONGODB_READ_URI=mongodb://read-replica:27017/bomasecure
DB_MAX_POOL_SIZE=100
DB_MIN_POOL_SIZE=10
DB_READ_MAX_POOL_SIZE=200
DB_READ_MIN_POOL_SIZE=20
```

### 2. Caching Layer (Redis)

**Files:**
- [`backend/config/redis.js`](backend/config/redis.js) - Redis configuration
- [`backend/services/redisCacheService.js`](backend/services/redisCacheService.js) - Caching service

**Features:**
- **Cluster Support**: Automatic cluster mode for horizontal scaling
- **Intelligent Caching**: User, apartment, visitor, and session caching
- **Rate Limiting**: Distributed rate limiting across instances
- **Offline Storage**: Store notifications for offline users
- **Graceful Degradation**: Continues without Redis if unavailable

**Configuration:**
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_CLUSTER_NODES=redis-1:6379,redis-2:6379,redis-3:6379
```

### 3. WebSocket Scaling

**File:** [`backend/services/websocketClusterService.js`](backend/services/websocketClusterService.js)

- **Redis Adapter**: Horizontal scaling across multiple server instances
- **Room Management**: Apartment-based rooms for efficient broadcasting
- **Connection Limits**: Support for 500K+ concurrent connections
- **Rate Limiting**: Per-connection message rate limiting
- **Automatic Failover**: Falls back to single instance if Redis unavailable

### 4. Monitoring & Observability

**File:** [`backend/services/monitoringService.js`](backend/services/monitoringService.js)

**Endpoints:**
- `GET /api/health` - Health check
- `GET /api/ready` - Readiness probe (Kubernetes)
- `GET /api/metrics` - Prometheus-compatible metrics
- `GET /api/metrics/detailed` - Detailed system metrics
- `GET /api/websocket/stats` - WebSocket connection stats
- `GET /api/cache/stats` - Cache statistics
- `GET /api/database/stats` - Database statistics

**Metrics Tracked:**
- Requests per second
- Memory usage
- CPU usage
- Database query times
- Cache hit rates
- Active connections

### 5. Circuit Breaker Pattern

**File:** [`backend/services/circuitBreakerService.js`](backend/services/circuitBreakerService.js)

- **Automatic Failure Detection**: Opens circuit after 5 failures
- **Graceful Degradation**: Fallback strategies for failed services
- **Recovery Testing**: Half-open state for testing recovery
- **Statistics**: Track success/failure rates

### 6. Enhanced Rate Limiting

**File:** [`backend/middleware/enhancedRateLimit.js`](backend/middleware/enhancedRateLimit.js)

- **Distributed**: Redis-backed rate limiting across instances
- **Tiered Limits**: Different limits for free/basic/premium/enterprise
- **WebSocket Support**: Rate limiting for WebSocket messages
- **Local Fallback**: Continues with local limiting if Redis unavailable

**Rate Limit Tiers:**
- Free: 60 requests/minute
- Basic: 120 requests/minute
- Premium: 300 requests/minute
- Enterprise: 1000 requests/minute

### 7. Auto-Scaling (Kubernetes)

**File:** [`backend/k8s/deployment.yaml`](backend/k8s/deployment.yaml)

- **Horizontal Pod Autoscaler**: Auto-scales 10-100 replicas based on CPU/memory
- **Pod Disruption Budget**: Ensures minimum 5 replicas during updates
- **Health Checks**: Liveness, readiness, and startup probes
- **Resource Limits**: CPU and memory limits per pod
- **Anti-Affinity**: Distributes pods across nodes for high availability

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install ioredis @socket.io/redis-adapter
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/bomasecure
MONGODB_READ_URI=mongodb://read-replica:27017/bomasecure

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password

# Scaling
DB_MAX_POOL_SIZE=100
DB_MIN_POOL_SIZE=10
```

### 3. Start Scalable Server

```bash
# Use the scalable server
node server-scalable.js

# Or update package.json scripts
npm run start:scalable
```

### 4. Deploy to Kubernetes

```bash
# Apply Kubernetes configuration
kubectl apply -f k8s/deployment.yaml

# Check deployment status
kubectl get pods -l app=bomasecure-api

# View logs
kubectl logs -f deployment/bomasecure-api
```

## Scaling Strategies

### Horizontal Scaling

1. **Database Sharding**: Shard by apartmentId for location-based queries
2. **Read Replicas**: Distribute read queries across replicas
3. **Redis Cluster**: 6-node cluster (3 masters, 3 replicas)
4. **WebSocket Cluster**: 20+ nodes with Redis adapter

### Vertical Scaling

1. **Connection Pools**: Increase pool sizes based on load
2. **Memory**: Allocate more RAM for caching
3. **CPU**: Increase CPU limits in Kubernetes

### Performance Optimization

1. **Caching Strategy**:
   - User data: 1 hour TTL
   - Apartment data: 5 minutes TTL
   - Active visitors: 2 minutes TTL
   - Statistics: 1 minute TTL

2. **Query Optimization**:
   - Use read replicas for non-critical queries
   - Implement query timeouts
   - Use projection to limit returned fields

3. **Connection Management**:
   - Keep warm connections (minPoolSize)
   - Clean up idle connections (maxIdleTimeMS)
   - Monitor connection pool usage

## Monitoring

### Prometheus Metrics

Access metrics at `http://localhost:4200/api/metrics`:

```
# HELP bomasecure_requests_per_second Current requests per second
# TYPE bomasecure_requests_per_second gauge
bomasecure_requests_per_second 150.5

# HELP bomasecure_memory_usage_percent Memory usage percentage
# TYPE bomasecure_memory_usage_percent gauge
bomasecure_memory_usage_percent 45.2

# HELP bomasecure_cpu_usage_percent CPU usage percentage
# TYPE bomasecure_cpu_usage_percent gauge
bomasecure_cpu_usage_percent 32.1
```

### Health Checks

```bash
# Check health
curl http://localhost:4200/api/health

# Check readiness
curl http://localhost:4200/api/ready

# Get detailed metrics
curl http://localhost:4200/api/metrics/detailed
```

## Cost Estimation

### Starting (1K-10K users)
- **Server**: $20-50/month (DigitalOcean Droplet)
- **Database**: $15-30/month (MongoDB Atlas M10)
- **Redis**: $15-30/month (Redis Cloud)
- **Total**: ~$50-110/month

### Growing (10K-100K users)
- **Kubernetes**: $200-500/month (10-20 nodes)
- **Database**: $200-500/month (MongoDB Atlas M30-M50)
- **Redis**: $100-200/month (Redis Cluster)
- **Load Balancer**: $50-100/month
- **Total**: ~$550-1,300/month

### Scale (100K-1M+ users)
- **Kubernetes**: $2,000-5,000/month (50-100 nodes)
- **Database**: $3,000-8,000/month (Sharded Cluster)
- **Redis**: $1,000-2,500/month (Large Cluster)
- **CDN**: $500-1,000/month
- **Monitoring**: $200-500/month
- **Total**: ~$6,700-17,000/month

## Troubleshooting

### High Memory Usage

1. Check cache statistics: `GET /api/cache/stats`
2. Review connection pool sizes
3. Implement cache eviction policies

### Slow Database Queries

1. Check database stats: `GET /api/database/stats`
2. Review query execution plans
3. Add indexes for frequently queried fields
4. Consider sharding for large collections

### WebSocket Connection Issues

1. Check WebSocket stats: `GET /api/websocket/stats`
2. Verify Redis adapter connection
3. Review rate limiting configuration
4. Check for memory leaks in event handlers

### Rate Limiting Issues

1. Check rate limit stats: `GET /api/ratelimit/stats`
2. Review tier configurations
3. Adjust limits based on usage patterns

## Best Practices

1. **Always use connection pooling** - Don't create new connections per request
2. **Implement caching** - Cache frequently accessed data
3. **Use read replicas** - Distribute read load
4. **Monitor everything** - Set up alerts for critical metrics
5. **Degrade gracefully** - Always have fallback strategies
6. **Test at scale** - Load test before production deployment
7. **Use circuit breakers** - Prevent cascade failures
8. **Implement rate limiting** - Protect against abuse

## Support

For issues or questions:
1. Check monitoring endpoints for system health
2. Review logs for error messages
3. Consult this documentation
4. Contact the development team

---

**Last Updated:** 2024
**Version:** 1.0.0
