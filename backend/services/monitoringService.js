// Monitoring Service for BomaSecure
// Implements comprehensive monitoring, health checks, and alerting

const os = require('os');
const databaseManager = require('../config/database');
const redisCacheService = require('./redisCacheService');
const websocketClusterService = require('./websocketClusterService');
const { gracefulDegradationService } = require('./circuitBreakerService');

class MonitoringService {
  constructor() {
    this.metrics = {
      requestsPerSecond: 0,
      activeConnections: 0,
      dbQueryTime: [],
      avgDbQueryTime: 0,
      cacheHitRate: 0,
      avgMaintenanceResponseTime: 0, // New metric
      rentIncreaseAlertsCount: 0,    // New metric
      memoryUsage: 0,
      cpuUsage: 0,
      uptime: 0
    };
    
    this.requestCount = 0;
    this.maintenanceResponseTimes = []; // To track individual response times
    this.rentIncreaseCounter = 0; // To count rent increase alerts
    this.requestStartTime = Date.now();
    this.alerts = [];
    this.thresholds = {
      dbQueryTime: 500, // ms
      cacheHitRate: 0.7, // 70%
      memoryUsage: 0.8, // 80%
      cpuUsage: 0.7, // 70%
      activeConnections: 8000,
      avgMaintenanceResponseTime: 3600000 // 1 hour in ms (example threshold)
    };
    this.initialized = false;
  }

  // Initialize monitoring
  initialize() {
    if (this.initialized) return;

    // Pre-register core circuits to ensure maintenance categories are visible in the UI
    gracefulDegradationService.circuitBreaker.getCircuit('database');
    gracefulDegradationService.circuitBreaker.getCircuit('redis');
    gracefulDegradationService.circuitBreaker.getCircuit('websocket');
    gracefulDegradationService.circuitBreaker.getCircuit('sms-gateway');
    gracefulDegradationService.circuitBreaker.getCircuit('maintenance-service');

    // Update metrics every 10 seconds and broadcast to realtime dashboard
    setInterval(async () => {
      this.updateMetrics();
      await this.broadcastMetrics();
    }, 10000);

    // Log metrics every minute
    setInterval(() => {
      this.logMetrics();
    }, 60000);

    // Check alerts every 30 seconds
    setInterval(() => {
      this.checkAlerts();
    }, 30000);

    this.initialized = true;
    console.log('✅ Monitoring service initialized');
  }

  // Update system metrics
  updateMetrics() {
    // Calculate requests per second
    const elapsed = (Date.now() - this.requestStartTime) / 1000;
    this.metrics.requestsPerSecond = this.requestCount / elapsed;
    
    // Reset counters every minute
    if (elapsed > 60) {
      this.requestCount = 0;
      this.requestStartTime = Date.now();
    }

    // Memory usage
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    this.metrics.memoryUsage = (totalMem - freeMem) / totalMem;

    // CPU usage
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });
    
    this.metrics.cpuUsage = 1 - (totalIdle / totalTick);

    // Uptime
    this.metrics.uptime = process.uptime();

    // Calculate average DB query time
    this.metrics.avgDbQueryTime = this.metrics.dbQueryTime.length > 0 
      ? this.metrics.dbQueryTime.reduce((a, b) => a + b, 0) / this.metrics.dbQueryTime.length
      : 0;

    // Calculate average maintenance response time (placeholder logic)
    this.metrics.avgMaintenanceResponseTime = this.maintenanceResponseTimes.length > 0
      ? this.maintenanceResponseTimes.reduce((a, b) => a + b, 0) / this.maintenanceResponseTimes.length
      : 0;
    // Keep only recent maintenance response times (e.g., last 100)
    if (this.maintenanceResponseTimes.length > 100) {
      this.maintenanceResponseTimes = this.maintenanceResponseTimes.slice(-100);
    }
    this.metrics.rentIncreaseAlertsCount = this.rentIncreaseCounter;

    // Sync active connections from WebSocket service
    this.metrics.activeConnections = websocketClusterService.getStats().totalConnections;

    // Database query time (average of last 100 queries)
    if (this.metrics.dbQueryTime.length > 100) {
      this.metrics.dbQueryTime = this.metrics.dbQueryTime.slice(-100);
    }
  }

  // Track request
  trackRequest() {
    this.requestCount++;
  }

  // Track database query time
  trackDbQuery(timeMs) {
    this.metrics.dbQueryTime.push(timeMs);
  }

  // Track cache hit/miss
  trackCacheHit(hit) {
    // Simple moving average
    const weight = 0.1;
    this.metrics.cacheHitRate = this.metrics.cacheHitRate * (1 - weight) + (hit ? 1 : 0) * weight;
  }

  // Track maintenance response time (in milliseconds)
  trackMaintenanceResponseTime(timeMs) {
    this.maintenanceResponseTimes.push(timeMs);
  }

  // Increment rent increase alert counter
  incrementRentIncreaseAlert() {
    this.rentIncreaseCounter++;
  }

  // Broadcast full monitoring state via WebSockets for realtime UI
  async broadcastMetrics() {
    try {
      // Use getDetailedMetrics to ensure the socket payload matches the initial REST API response
      // This prevents UI elements from disappearing when live updates arrive
      const fullData = await this.getDetailedMetrics(); // This will now include new metrics
      if (websocketClusterService.io) {
        websocketClusterService.io.to('admins').emit('metrics:update', fullData);
      }
    } catch (error) {
      console.error('❌ Realtime broadcast failed:', error.message);
    }
  }

  // Log metrics to console
  logMetrics() {
    console.log('📊 System Metrics:', {
      requestsPerSecond: this.metrics.requestsPerSecond.toFixed(2),
      memoryUsage: `${(this.metrics.memoryUsage * 100).toFixed(1)}%`,
      cpuUsage: `${(this.metrics.cpuUsage * 100).toFixed(1)}%`,
      uptime: `${Math.floor(this.metrics.uptime)}s`,
      avgDbQueryTime: `${this.metrics.avgDbQueryTime.toFixed(0)}ms`, // Existing
      avgMaintenanceResponseTime: `${(this.metrics.avgMaintenanceResponseTime / 60000).toFixed(1)} min`, // New
      rentIncreaseAlerts: this.metrics.rentIncreaseAlertsCount, // New
      cacheHitRate: `${(this.metrics.cacheHitRate * 100).toFixed(1)}%`
    });
  }

  // Check for alert conditions
  async checkAlerts() {
    const newAlerts = [];

    // Check database query time
    if (this.metrics.avgDbQueryTime > this.thresholds.dbQueryTime) {
      newAlerts.push({
        type: 'database',
        severity: 'critical', // Enhanced contrast
        message: `Database slow queries detected: ${this.metrics.avgDbQueryTime.toFixed(0)}ms average`,
        timestamp: new Date()
      });
    }

    // Check cache hit rate
    if (this.metrics.cacheHitRate < this.thresholds.cacheHitRate) {
      newAlerts.push({
        type: 'cache',
        severity: 'critical',
        message: `Low cache hit rate: ${(this.metrics.cacheHitRate * 100).toFixed(1)}%`,
        timestamp: new Date()
      });
    }

    // Check memory usage
    if (this.metrics.memoryUsage > this.thresholds.memoryUsage) {
      newAlerts.push({
        type: 'memory',
        severity: 'critical',
        message: `High memory usage: ${(this.metrics.memoryUsage * 100).toFixed(1)}%`,
        timestamp: new Date()
      });
    }

    // Check CPU usage
    if (this.metrics.cpuUsage > this.thresholds.cpuUsage) {
      newAlerts.push({
        type: 'cpu',
        severity: 'critical',
        message: `High CPU usage: ${(this.metrics.cpuUsage * 100).toFixed(1)}%`,
        timestamp: new Date()
      });
    }

    // Check average maintenance response time
    if (this.metrics.avgMaintenanceResponseTime > this.thresholds.avgMaintenanceResponseTime) {
      newAlerts.push({
        type: 'maintenance',
        severity: 'warning',
        message: `Slow maintenance response: ${(this.metrics.avgMaintenanceResponseTime / 60000).toFixed(1)} min average`,
        timestamp: new Date()
      });
    }

    // Log new alerts
    if (newAlerts.length > 0) {
      this.alerts.push(...newAlerts);
      console.warn('⚠️ Alerts detected:', newAlerts);
    }
  }

  // Get health status
  async getHealthStatus() {
    try {
      const dbHealth = await databaseManager.checkHealth();
      const redisHealth = redisCacheService.isAvailable();
      const serviceHealth = gracefulDegradationService.getServiceHealth();
      
      const isHealthy = dbHealth.primary && redisHealth;
      
      return {
        status: isHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        directory: {
          hostname: os.hostname(),
          platform: os.platform(),
          status: 'ONLINE',
          label: `Primary Node: ${os.hostname()}`
        },
        services: {
          database: {
            primary: dbHealth.primary ? 'up' : 'down',
            replica: dbHealth.replica ? 'up' : 'down'
          },
          redis: redisHealth ? 'up' : 'down',
          websocket: 'up',
          maintenance_ops: serviceHealth['maintenance-service']?.status || 'up',
          maintenance: serviceHealth
        },
        metrics: {
          uptime: this.metrics.uptime,
          memoryUsage: this.metrics.memoryUsage,
          cpuUsage: this.metrics.cpuUsage,
          requestsPerSecond: this.metrics.requestsPerSecond
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  // Get readiness status (for Kubernetes)
  async getReadinessStatus() {
    try {
      const dbHealth = await databaseManager.checkHealth();
      
      // Ready if primary database is up
      const isReady = dbHealth.primary;
      
      return {
        status: isReady ? 'ready' : 'not_ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: dbHealth.primary ? 'pass' : 'fail'
        }
      };
    } catch (error) {
      return {
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  // Get detailed metrics
  async getDetailedMetrics() {
    try {
      const dbStats = await databaseManager.getStats();
      const cacheStats = await redisCacheService.getStats();
      const serviceHealth = gracefulDegradationService.getServiceHealth();

      // Get local IP addresses for directory info
      const networkInterfaces = os.networkInterfaces();
      const ips = Object.values(networkInterfaces)
        .flat()
        .filter(details => (details.family === 'IPv4' || details.family === 4) && !details.internal)
        .map(details => details.address);
      
      // Map service health to enhanced maintenance objects for better visibility
      const maintenance = {};
      for (const [service, health] of Object.entries(serviceHealth)) {
        maintenance[service] = {
          ...health,
          displayName: service.toUpperCase().replace('-', ' '),
          contrastStatus: (health.status || 'unknown').toUpperCase(),
          labelColor: health.textColor || '#FFFFFF',
          tagColor: health.color || '#6B7280'
        };
      }

      return {
        timestamp: new Date().toISOString(),
        uiHints: {
          searchBar: {
            bg: '#F9FAFB',
            border: '#D1D5DB',
            text: '#111827',
            placeholder: '#6B7280'
          },
          filters: {
            bg: '#FFFFFF',
            text: '#374151',
            activeBg: '#EFF6FF',
            activeText: '#1D4ED8'
          }
        },
        filters: {
          status: [
            { id: 'all', label: 'All Statuses', color: '#E2E8F0', textColor: '#1E293B' },
            { id: 'healthy', label: 'Healthy', color: '#059669', textColor: '#FFFFFF' },
            { id: 'degraded', label: 'Degraded', color: '#D97706', textColor: '#000000' },
            { id: 'unhealthy', label: 'Unhealthy', color: '#DC2626', textColor: '#FFFFFF' }
          ],
          categories: [
            { id: 'all', label: 'All Categories', color: '#E2E8F0', textColor: '#1E293B' },
            { id: 'core', label: 'Core Services', color: '#4B5563', textColor: '#FFFFFF' },
            { id: 'infrastructure', label: 'Infrastructure', color: '#4B5563', textColor: '#FFFFFF' },
            { id: 'external', label: 'External APIs', color: '#4B5563', textColor: '#FFFFFF' }
          ]
        },
        system: {
          hostname: os.hostname(),
          platform: os.platform(),
          arch: os.arch(),
          uptime: this.metrics.uptime,
          ips: ips,
          status: 'RUNNING',
          memory: {
            total: os.totalmem(),
            free: os.freemem(),
            used: os.totalmem() - os.freemem(),
            usagePercent: this.metrics.memoryUsage * 100
          },
          cpu: {
            cores: os.cpus().length,
            usagePercent: this.metrics.cpuUsage * 100
          },
          loadAverage: os.loadavg()
        },
        application: {
          requestsPerSecond: this.metrics.requestsPerSecond,
          totalRequests: this.requestCount,
          activeConnections: this.metrics.activeConnections, // Existing
          avgMaintenanceResponseTime: this.metrics.avgMaintenanceResponseTime, // New
          rentIncreaseAlertsCount: this.metrics.rentIncreaseAlertsCount, // New
          avgDbQueryTime: this.metrics.avgDbQueryTime,
          cacheHitRate: this.metrics.cacheHitRate * 100
        },
        database: dbStats,
        cache: cacheStats,
        maintenance,
        alerts: this.alerts.slice(-20) // Increased visibility
      };
    } catch (error) {
      return {
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  // Get Prometheus-compatible metrics
  getPrometheusMetrics() {
    const metrics = [];
    
    metrics.push(`# HELP bomasecure_requests_per_second Current requests per second`);
    metrics.push(`# TYPE bomasecure_requests_per_second gauge`);
    metrics.push(`bomasecure_requests_per_second ${this.metrics.requestsPerSecond}`);
    
    metrics.push(`# HELP bomasecure_memory_usage_percent Memory usage percentage`);
    metrics.push(`# TYPE bomasecure_memory_usage_percent gauge`);
    metrics.push(`bomasecure_memory_usage_percent ${this.metrics.memoryUsage * 100}`);
    
    metrics.push(`# HELP bomasecure_cpu_usage_percent CPU usage percentage`);
    metrics.push(`# TYPE bomasecure_cpu_usage_percent gauge`);
    metrics.push(`bomasecure_cpu_usage_percent ${this.metrics.cpuUsage * 100}`);
    
    metrics.push(`# HELP bomasecure_uptime_seconds Application uptime in seconds`);
    metrics.push(`# TYPE bomasecure_uptime_seconds gauge`);
    metrics.push(`bomasecure_uptime_seconds ${this.metrics.uptime}`);
    
    metrics.push(`# HELP bomasecure_cache_hit_rate_percent Cache hit rate percentage`);
    metrics.push(`# TYPE bomasecure_cache_hit_rate_percent gauge`);
    metrics.push(`bomasecure_cache_hit_rate_percent ${this.metrics.cacheHitRate * 100}`);

    metrics.push(`# HELP bomasecure_avg_maintenance_response_time_ms Average maintenance response time in milliseconds`);
    metrics.push(`# TYPE bomasecure_avg_maintenance_response_time_ms gauge`);
    metrics.push(`bomasecure_avg_maintenance_response_time_ms ${this.metrics.avgMaintenanceResponseTime}`);

    metrics.push(`# HELP bomasecure_rent_increase_alerts_total Total rent increase alerts`);
    metrics.push(`# TYPE bomasecure_rent_increase_alerts_total counter`);
    metrics.push(`bomasecure_rent_increase_alerts_total ${this.metrics.rentIncreaseAlertsCount}`);
    
    if (this.metrics.dbQueryTime.length > 0) {
      const avgQueryTime = this.metrics.dbQueryTime.reduce((a, b) => a + b, 0) / this.metrics.dbQueryTime.length;
      metrics.push(`# HELP bomasecure_db_query_time_ms Average database query time in milliseconds`);
      metrics.push(`# TYPE bomasecure_db_query_time_ms gauge`);
      metrics.push(`bomasecure_db_query_time_ms ${avgQueryTime}`);
    }
    
    return metrics.join('\n');
  }

  // Clear alerts
  clearAlerts() {
    this.alerts = [];
  }

  // Get alerts
  getAlerts() {
    return this.alerts;
  }
}

// Export singleton instance
module.exports = new MonitoringService();
