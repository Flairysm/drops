import { log } from './vite';

// ============================================================================
// MONITORING AND METRICS COLLECTION
// ============================================================================

export interface Metrics {
  timestamp: number;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  userAgent?: string;
  ip?: string;
  userId?: string;
}

export interface SystemMetrics {
  timestamp: number;
  memoryUsage: NodeJS.MemoryUsage;
  uptime: number;
  cpuUsage?: number;
  activeConnections?: number;
}

export interface DatabaseMetrics {
  timestamp: number;
  queryCount: number;
  averageQueryTime: number;
  slowQueries: number;
  connectionPoolSize: number;
  activeConnections: number;
}

// ============================================================================
// METRICS COLLECTOR
// ============================================================================

export class MetricsCollector {
  private static instance: MetricsCollector;
  private metrics: Metrics[] = [];
  private systemMetrics: SystemMetrics[] = [];
  private databaseMetrics: DatabaseMetrics[] = [];
  private maxMetricsHistory = 1000; // Keep last 1000 entries

  private constructor() {
    // Start system metrics collection
    this.startSystemMetricsCollection();
  }

  public static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  // ============================================================================
  // METRICS COLLECTION
  // ============================================================================

  recordRequest(metrics: Metrics): void {
    this.metrics.push(metrics);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }

    // Log slow requests
    if (metrics.responseTime > 1000) {
      log(`🐌 Slow request: ${metrics.method} ${metrics.endpoint} - ${metrics.responseTime}ms`);
    }

    // Log error responses
    if (metrics.statusCode >= 400) {
      log(`❌ Error response: ${metrics.method} ${metrics.endpoint} - ${metrics.statusCode}`);
    }
  }

  recordSystemMetrics(metrics: SystemMetrics): void {
    this.systemMetrics.push(metrics);
    
    if (this.systemMetrics.length > this.maxMetricsHistory) {
      this.systemMetrics = this.systemMetrics.slice(-this.maxMetricsHistory);
    }
  }

  recordDatabaseMetrics(metrics: DatabaseMetrics): void {
    this.databaseMetrics.push(metrics);
    
    if (this.databaseMetrics.length > this.maxMetricsHistory) {
      this.databaseMetrics = this.databaseMetrics.slice(-this.maxMetricsHistory);
    }
  }

  // ============================================================================
  // METRICS RETRIEVAL
  // ============================================================================

  getRequestMetrics(timeWindowMinutes: number = 60): Metrics[] {
    const cutoff = Date.now() - (timeWindowMinutes * 60 * 1000);
    return this.metrics.filter(m => m.timestamp > cutoff);
  }

  getSystemMetrics(timeWindowMinutes: number = 60): SystemMetrics[] {
    const cutoff = Date.now() - (timeWindowMinutes * 60 * 1000);
    return this.systemMetrics.filter(m => m.timestamp > cutoff);
  }

  getDatabaseMetrics(timeWindowMinutes: number = 60): DatabaseMetrics[] {
    const cutoff = Date.now() - (timeWindowMinutes * 60 * 1000);
    return this.databaseMetrics.filter(m => m.timestamp > cutoff);
  }

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  getRequestAnalytics(timeWindowMinutes: number = 60): {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    slowRequests: number;
    topEndpoints: Array<{ endpoint: string; count: number; avgTime: number }>;
  } {
    const metrics = this.getRequestMetrics(timeWindowMinutes);
    
    if (metrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        errorRate: 0,
        slowRequests: 0,
        topEndpoints: []
      };
    }

    const totalRequests = metrics.length;
    const averageResponseTime = metrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests;
    const errorRate = (metrics.filter(m => m.statusCode >= 400).length / totalRequests) * 100;
    const slowRequests = metrics.filter(m => m.responseTime > 1000).length;

    // Group by endpoint
    const endpointStats = new Map<string, { count: number; totalTime: number }>();
    metrics.forEach(m => {
      const existing = endpointStats.get(m.endpoint) || { count: 0, totalTime: 0 };
      endpointStats.set(m.endpoint, {
        count: existing.count + 1,
        totalTime: existing.totalTime + m.responseTime
      });
    });

    const topEndpoints = Array.from(endpointStats.entries())
      .map(([endpoint, stats]) => ({
        endpoint,
        count: stats.count,
        avgTime: stats.totalTime / stats.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalRequests,
      averageResponseTime,
      errorRate,
      slowRequests,
      topEndpoints
    };
  }

  getSystemAnalytics(timeWindowMinutes: number = 60): {
    averageMemoryUsage: number;
    peakMemoryUsage: number;
    uptime: number;
    memoryTrend: 'increasing' | 'decreasing' | 'stable';
  } {
    const metrics = this.getSystemMetrics(timeWindowMinutes);
    
    if (metrics.length === 0) {
      return {
        averageMemoryUsage: 0,
        peakMemoryUsage: 0,
        uptime: 0,
        memoryTrend: 'stable'
      };
    }

    const memoryUsages = metrics.map(m => m.memoryUsage.heapUsed);
    const averageMemoryUsage = memoryUsages.reduce((sum, usage) => sum + usage, 0) / memoryUsages.length;
    const peakMemoryUsage = Math.max(...memoryUsages);
    const uptime = metrics[metrics.length - 1]?.uptime || 0;

    // Determine memory trend
    const firstHalf = memoryUsages.slice(0, Math.floor(memoryUsages.length / 2));
    const secondHalf = memoryUsages.slice(Math.floor(memoryUsages.length / 2));
    const firstAvg = firstHalf.reduce((sum, usage) => sum + usage, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, usage) => sum + usage, 0) / secondHalf.length;
    
    let memoryTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (secondAvg > firstAvg * 1.1) memoryTrend = 'increasing';
    else if (secondAvg < firstAvg * 0.9) memoryTrend = 'decreasing';

    return {
      averageMemoryUsage,
      peakMemoryUsage,
      uptime,
      memoryTrend
    };
  }

  // ============================================================================
  // SYSTEM METRICS COLLECTION
  // ============================================================================

  private startSystemMetricsCollection(): void {
    // Collect system metrics every 30 seconds
    setInterval(() => {
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();
      
      this.recordSystemMetrics({
        timestamp: Date.now(),
        memoryUsage,
        uptime
      });

      // Log memory warnings
      const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;
      if (memoryUsageMB > 500) {
        log(`⚠️  High memory usage: ${memoryUsageMB.toFixed(2)}MB`);
      }
    }, 30000);
  }

  // ============================================================================
  // ALERTS
  // ============================================================================

  checkAlerts(): string[] {
    const alerts: string[] = [];
    const analytics = this.getRequestAnalytics(5); // Last 5 minutes
    const systemAnalytics = this.getSystemAnalytics(5);

    // High error rate
    if (analytics.errorRate > 10) {
      alerts.push(`High error rate: ${analytics.errorRate.toFixed(2)}%`);
    }

    // High response time
    if (analytics.averageResponseTime > 2000) {
      alerts.push(`High average response time: ${analytics.averageResponseTime.toFixed(2)}ms`);
    }

    // High memory usage
    const memoryUsageMB = systemAnalytics.averageMemoryUsage / 1024 / 1024;
    if (memoryUsageMB > 1000) {
      alerts.push(`High memory usage: ${memoryUsageMB.toFixed(2)}MB`);
    }

    // Memory trend
    if (systemAnalytics.memoryTrend === 'increasing') {
      alerts.push('Memory usage is increasing');
    }

    return alerts;
  }
}

// Export singleton instance
export const metricsCollector = MetricsCollector.getInstance();

// ============================================================================
// MIDDLEWARE
// ============================================================================

export function metricsMiddleware(req: any, res: any, next: any) {
  const start = Date.now();
  const originalSend = res.send;

  res.send = function(data: any) {
    const responseTime = Date.now() - start;
    
    metricsCollector.recordRequest({
      timestamp: Date.now(),
      endpoint: req.path,
      method: req.method,
      statusCode: res.statusCode,
      responseTime,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user?.id
    });

    return originalSend.call(this, data);
  };

  next();
}

// ============================================================================
// HEALTH CHECK WITH METRICS
// ============================================================================

export function getHealthStatus(): {
  status: 'healthy' | 'warning' | 'critical';
  metrics: any;
  alerts: string[];
} {
  const alerts = metricsCollector.checkAlerts();
  const requestAnalytics = metricsCollector.getRequestAnalytics(5);
  const systemAnalytics = metricsCollector.getSystemAnalytics(5);

  let status: 'healthy' | 'warning' | 'critical' = 'healthy';
  
  if (alerts.length > 0) {
    status = 'warning';
  }
  
  if (requestAnalytics.errorRate > 20 || systemAnalytics.averageMemoryUsage / 1024 / 1024 > 2000) {
    status = 'critical';
  }

  return {
    status,
    metrics: {
      requests: requestAnalytics,
      system: systemAnalytics
    },
    alerts
  };
}
