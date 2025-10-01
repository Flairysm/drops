import { EventEmitter } from 'events';
import { DatabaseHealthMonitor } from '../database/health';

export interface SystemMetrics {
  timestamp: Date;
  database: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
    connections: {
      total: number;
      idle: number;
      waiting: number;
    };
  };
  server: {
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: number;
    activeConnections: number;
  };
  business: {
    totalUsers: number;
    activeUsers: number;
    totalRevenue: number;
    dailyRevenue: number;
    totalPacks: number;
    packsSold: number;
    totalCards: number;
    cardsPulled: number;
  };
  performance: {
    avgResponseTime: number;
    requestsPerMinute: number;
    errorRate: number;
    cacheHitRate: number;
  };
}

export interface MetricAlert {
  id: string;
  type: 'warning' | 'error' | 'critical';
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: Date;
  resolved: boolean;
}

export class MetricsCollector extends EventEmitter {
  private static instance: MetricsCollector;
  private metrics: SystemMetrics[] = [];
  private alerts: MetricAlert[] = [];
  private maxMetricsHistory = 1000;
  private maxAlertsHistory = 100;
  private startTime: number;
  private healthMonitor: DatabaseHealthMonitor;

  private constructor() {
    super();
    this.startTime = Date.now();
    this.healthMonitor = DatabaseHealthMonitor.getInstance();
  }

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  async collectMetrics(): Promise<SystemMetrics> {
    const timestamp = new Date();
    
    // Collect database metrics
    const dbHealth = await this.healthMonitor.checkHealth();
    
    // Collect server metrics
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // Collect business metrics (these would come from your database)
    const businessMetrics = await this.collectBusinessMetrics();
    
    // Collect performance metrics
    const performanceMetrics = await this.collectPerformanceMetrics();

    const metrics: SystemMetrics = {
      timestamp,
      database: {
        status: dbHealth.status,
        responseTime: dbHealth.responseTime,
        connections: dbHealth.connections,
      },
      server: {
        uptime: Date.now() - this.startTime,
        memoryUsage,
        cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
        activeConnections: 0, // This would be tracked from your server
      },
      business: businessMetrics,
      performance: performanceMetrics,
    };

    // Store metrics
    this.metrics.push(metrics);
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics.shift();
    }

    // Check for alerts
    await this.checkAlerts(metrics);

    // Emit metrics event
    this.emit('metrics', metrics);

    return metrics;
  }

  private async collectBusinessMetrics(): Promise<SystemMetrics['business']> {
    // These would be actual database queries in production
    return {
      totalUsers: 0,
      activeUsers: 0,
      totalRevenue: 0,
      dailyRevenue: 0,
      totalPacks: 0,
      packsSold: 0,
      totalCards: 0,
      cardsPulled: 0,
    };
  }

  private async collectPerformanceMetrics(): Promise<SystemMetrics['performance']> {
    // These would be calculated from actual request logs
    return {
      avgResponseTime: 0,
      requestsPerMinute: 0,
      errorRate: 0,
      cacheHitRate: 0,
    };
  }

  private async checkAlerts(metrics: SystemMetrics): Promise<void> {
    const alerts: MetricAlert[] = [];

    // Database alerts
    if (metrics.database.status === 'unhealthy') {
      alerts.push({
        id: this.generateAlertId(),
        type: 'critical',
        message: 'Database is unhealthy',
        metric: 'database.status',
        value: 0,
        threshold: 1,
        timestamp: new Date(),
        resolved: false,
      });
    }

    if (metrics.database.responseTime > 5000) {
      alerts.push({
        id: this.generateAlertId(),
        type: 'error',
        message: 'Database response time is too high',
        metric: 'database.responseTime',
        value: metrics.database.responseTime,
        threshold: 5000,
        timestamp: new Date(),
        resolved: false,
      });
    }

    // Memory alerts
    const memoryUsagePercent = (metrics.server.memoryUsage.heapUsed / metrics.server.memoryUsage.heapTotal) * 100;
    if (memoryUsagePercent > 90) {
      alerts.push({
        id: this.generateAlertId(),
        type: 'critical',
        message: 'Memory usage is critically high',
        metric: 'server.memoryUsage',
        value: memoryUsagePercent,
        threshold: 90,
        timestamp: new Date(),
        resolved: false,
      });
    }

    // Performance alerts
    if (metrics.performance.errorRate > 5) {
      alerts.push({
        id: this.generateAlertId(),
        type: 'warning',
        message: 'Error rate is above threshold',
        metric: 'performance.errorRate',
        value: metrics.performance.errorRate,
        threshold: 5,
        timestamp: new Date(),
        resolved: false,
      });
    }

    // Add new alerts
    for (const alert of alerts) {
      this.alerts.push(alert);
      this.emit('alert', alert);
    }

    // Clean up old alerts
    if (this.alerts.length > this.maxAlertsHistory) {
      this.alerts.shift();
    }
  }

  getLatestMetrics(): SystemMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  getMetricsHistory(limit: number = 100): SystemMetrics[] {
    return this.metrics
      .slice(-limit)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getActiveAlerts(): MetricAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  getAllAlerts(limit: number = 50): MetricAlert[] {
    return this.alerts
      .slice(-limit)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      this.emit('alertResolved', alert);
      return true;
    }
    return false;
  }

  getDashboardData(): {
    current: SystemMetrics | null;
    trends: {
      revenue: number[];
      users: number[];
      responseTime: number[];
    };
    alerts: MetricAlert[];
    health: {
      database: string;
      server: string;
      overall: string;
    };
  } {
    const current = this.getLatestMetrics();
    const recentMetrics = this.getMetricsHistory(24); // Last 24 data points
    
    const trends = {
      revenue: recentMetrics.map(m => m.business.dailyRevenue),
      users: recentMetrics.map(m => m.business.activeUsers),
      responseTime: recentMetrics.map(m => m.performance.avgResponseTime),
    };

    const alerts = this.getActiveAlerts();

    const health = {
      database: current?.database.status || 'unknown',
      server: this.getServerHealth(current),
      overall: this.getOverallHealth(current, alerts),
    };

    return {
      current,
      trends,
      alerts,
      health,
    };
  }

  private getServerHealth(metrics: SystemMetrics | null): string {
    if (!metrics) return 'unknown';
    
    const memoryPercent = (metrics.server.memoryUsage.heapUsed / metrics.server.memoryUsage.heapTotal) * 100;
    
    if (memoryPercent > 90) return 'critical';
    if (memoryPercent > 75) return 'warning';
    if (metrics.server.cpuUsage > 80) return 'warning';
    
    return 'healthy';
  }

  private getOverallHealth(metrics: SystemMetrics | null, alerts: MetricAlert[]): string {
    if (!metrics) return 'unknown';
    
    const criticalAlerts = alerts.filter(a => a.type === 'critical').length;
    const errorAlerts = alerts.filter(a => a.type === 'error').length;
    
    if (criticalAlerts > 0) return 'critical';
    if (errorAlerts > 0 || metrics.database.status === 'unhealthy') return 'error';
    if (metrics.database.status === 'degraded' || alerts.length > 0) return 'warning';
    
    return 'healthy';
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Start periodic metrics collection
  startCollection(intervalMs: number = 60000): void {
    setInterval(async () => {
      try {
        await this.collectMetrics();
      } catch (error) {
        console.error('Error collecting metrics:', error);
      }
    }, intervalMs);
  }

  // Get metrics summary for admin dashboard
  getMetricsSummary(): {
    uptime: string;
    totalRequests: number;
    avgResponseTime: number;
    errorRate: number;
    activeUsers: number;
    totalRevenue: number;
    databaseStatus: string;
    memoryUsage: string;
  } {
    const current = this.getLatestMetrics();
    const uptime = current ? Math.floor(current.server.uptime / 1000) : 0;
    
    return {
      uptime: this.formatUptime(uptime),
      totalRequests: 0, // This would be tracked
      avgResponseTime: current?.performance.avgResponseTime || 0,
      errorRate: current?.performance.errorRate || 0,
      activeUsers: current?.business.activeUsers || 0,
      totalRevenue: current?.business.totalRevenue || 0,
      databaseStatus: current?.database.status || 'unknown',
      memoryUsage: current ? this.formatMemoryUsage(current.server.memoryUsage) : 'unknown',
    };
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  private formatMemoryUsage(memoryUsage: NodeJS.MemoryUsage): string {
    const used = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const total = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    return `${used}MB / ${total}MB`;
  }
}
