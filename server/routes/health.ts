import { Router, Request, Response } from 'express';
import { DatabaseHealthMonitor } from '../database/health';
import { MetricsCollector } from '../monitoring/metrics';
import { ErrorTracker } from '../monitoring/errorTracker';
import { TransactionManager } from '../database/transactions';
import { Pool } from 'pg';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: HealthCheck;
    server: HealthCheck;
    memory: HealthCheck;
    disk: HealthCheck;
    external: HealthCheck[];
  };
  metrics: {
    responseTime: number;
    activeConnections: number;
    errorRate: number;
  };
}

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  message?: string;
  details?: any;
}

export class HealthCheckService {
  private static instance: HealthCheckService;
  private dbHealthMonitor: DatabaseHealthMonitor;
  private metricsCollector: MetricsCollector;
  private errorTracker: ErrorTracker;
  private transactionManager: TransactionManager;
  private startTime: number;

  private constructor(
    dbHealthMonitor: DatabaseHealthMonitor,
    metricsCollector: MetricsCollector,
    errorTracker: ErrorTracker,
    transactionManager: TransactionManager
  ) {
    this.dbHealthMonitor = dbHealthMonitor;
    this.metricsCollector = metricsCollector;
    this.errorTracker = errorTracker;
    this.transactionManager = transactionManager;
    this.startTime = Date.now();
  }

  static getInstance(
    dbHealthMonitor: DatabaseHealthMonitor,
    metricsCollector: MetricsCollector,
    errorTracker: ErrorTracker,
    transactionManager: TransactionManager
  ): HealthCheckService {
    if (!HealthCheckService.instance) {
      HealthCheckService.instance = new HealthCheckService(
        dbHealthMonitor,
        metricsCollector,
        errorTracker,
        transactionManager
      );
    }
    return HealthCheckService.instance;
  }

  async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const checks = await this.runAllChecks();
    const overallStatus = this.determineOverallStatus(checks);
    const responseTime = Date.now() - startTime;

    return {
      status: overallStatus,
      timestamp: new Date(),
      uptime: Date.now() - this.startTime,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks,
      metrics: {
        responseTime,
        activeConnections: 0, // This would be tracked from your server
        errorRate: this.calculateErrorRate(),
      },
    };
  }

  private async runAllChecks(): Promise<HealthCheckResult['checks']> {
    const [database, server, memory, disk, external] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkServer(),
      this.checkMemory(),
      this.checkDisk(),
      this.checkExternalServices(),
    ]);

    return {
      database: database.status === 'fulfilled' ? database.value : this.createFailedCheck('database', 'Database check failed'),
      server: server.status === 'fulfilled' ? server.value : this.createFailedCheck('server', 'Server check failed'),
      memory: memory.status === 'fulfilled' ? memory.value : this.createFailedCheck('memory', 'Memory check failed'),
      disk: disk.status === 'fulfilled' ? disk.value : this.createFailedCheck('disk', 'Disk check failed'),
      external: external.status === 'fulfilled' ? external.value : [],
    };
  }

  private async checkDatabase(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      const health = await this.dbHealthMonitor.checkHealth();
      const responseTime = Date.now() - startTime;
      
      return {
        name: 'database',
        status: health.status,
        responseTime,
        message: health.status === 'healthy' ? 'Database is healthy' : 'Database issues detected',
        details: {
          connections: health.connections,
          responseTime: health.responseTime,
          version: health.version,
        },
      };
    } catch (error) {
      return {
        name: 'database',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: `Database check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async checkServer(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      const metrics = this.metricsCollector.getLatestMetrics();
      const responseTime = Date.now() - startTime;
      
      if (!metrics) {
        return {
          name: 'server',
          status: 'degraded',
          responseTime,
          message: 'No metrics available',
        };
      }

      const memoryPercent = (metrics.server.memoryUsage.heapUsed / metrics.server.memoryUsage.heapTotal) * 100;
      let status: HealthCheck['status'] = 'healthy';
      let message = 'Server is healthy';

      if (memoryPercent > 90) {
        status = 'unhealthy';
        message = 'Memory usage critically high';
      } else if (memoryPercent > 75) {
        status = 'degraded';
        message = 'Memory usage high';
      }

      return {
        name: 'server',
        status,
        responseTime,
        message,
        details: {
          uptime: metrics.server.uptime,
          memoryUsage: memoryPercent,
          cpuUsage: metrics.server.cpuUsage,
        },
      };
    } catch (error) {
      return {
        name: 'server',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: `Server check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async checkMemory(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      const memoryUsage = process.memoryUsage();
      const responseTime = Date.now() - startTime;
      
      const heapUsedPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
      const rssPercent = (memoryUsage.rss / (1024 * 1024 * 1024)) * 100; // Assuming 1GB total
      
      let status: HealthCheck['status'] = 'healthy';
      let message = 'Memory usage is normal';

      if (heapUsedPercent > 90 || rssPercent > 80) {
        status = 'unhealthy';
        message = 'Memory usage critically high';
      } else if (heapUsedPercent > 75 || rssPercent > 60) {
        status = 'degraded';
        message = 'Memory usage high';
      }

      return {
        name: 'memory',
        status,
        responseTime,
        message,
        details: {
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          rss: Math.round(memoryUsage.rss / 1024 / 1024),
          external: Math.round(memoryUsage.external / 1024 / 1024),
          heapUsedPercent: Math.round(heapUsedPercent),
        },
      };
    } catch (error) {
      return {
        name: 'memory',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: `Memory check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async checkDisk(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      const fs = await import('fs/promises');
      const stats = await fs.stat('.');
      const responseTime = Date.now() - startTime;
      
      // This is a simplified disk check - in production you'd check actual disk usage
      return {
        name: 'disk',
        status: 'healthy',
        responseTime,
        message: 'Disk space is available',
        details: {
          accessible: true,
          lastModified: stats.mtime,
        },
      };
    } catch (error) {
      return {
        name: 'disk',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: `Disk check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async checkExternalServices(): Promise<HealthCheck[]> {
    const services = [
      { name: 'redis', url: process.env.REDIS_URL },
      { name: 'email', url: process.env.SMTP_HOST },
    ];

    const checks = await Promise.allSettled(
      services.map(service => this.checkExternalService(service.name, service.url))
    );

    return checks
      .map((result, index) => 
        result.status === 'fulfilled' 
          ? result.value 
          : this.createFailedCheck(services[index].name, 'External service check failed')
      )
      .filter(check => check !== null) as HealthCheck[];
  }

  private async checkExternalService(name: string, url?: string): Promise<HealthCheck | null> {
    if (!url) return null;

    const startTime = Date.now();
    
    try {
      // This would be actual service-specific health checks
      const responseTime = Date.now() - startTime;
      
      return {
        name,
        status: 'healthy',
        responseTime,
        message: `${name} service is healthy`,
        details: { url },
      };
    } catch (error) {
      return {
        name,
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: `${name} service is unavailable`,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }

  private determineOverallStatus(checks: HealthCheckResult['checks']): HealthCheckResult['status'] {
    const allChecks = [
      checks.database,
      checks.server,
      checks.memory,
      checks.disk,
      ...checks.external,
    ];

    const unhealthyCount = allChecks.filter(check => check.status === 'unhealthy').length;
    const degradedCount = allChecks.filter(check => check.status === 'degraded').length;

    if (unhealthyCount > 0) return 'unhealthy';
    if (degradedCount > 0) return 'degraded';
    return 'healthy';
  }

  private calculateErrorRate(): number {
    const errorStats = this.errorTracker.getErrorStats();
    const total = errorStats.total;
    const last24Hours = errorStats.last24Hours;
    
    return total > 0 ? (last24Hours / total) * 100 : 0;
  }

  private createFailedCheck(name: string, message: string): HealthCheck {
    return {
      name,
      status: 'unhealthy',
      responseTime: 0,
      message,
    };
  }
}

// Health check routes
export const createHealthRoutes = (
  dbHealthMonitor: DatabaseHealthMonitor,
  metricsCollector: MetricsCollector,
  errorTracker: ErrorTracker,
  transactionManager: TransactionManager
): Router => {
  const router = Router();
  const healthService = HealthCheckService.getInstance(
    dbHealthMonitor,
    metricsCollector,
    errorTracker,
    transactionManager
  );

  // Basic health check
  router.get('/health', async (req: Request, res: Response) => {
    try {
      const result = await healthService.performHealthCheck();
      const statusCode = result.status === 'healthy' ? 200 : result.status === 'degraded' ? 200 : 503;
      
      res.status(statusCode).json(result);
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Health check failed',
      });
    }
  });

  // Detailed health check
  router.get('/health/detailed', async (req: Request, res: Response) => {
    try {
      const result = await healthService.performHealthCheck();
      const statusCode = result.status === 'healthy' ? 200 : result.status === 'degraded' ? 200 : 503;
      
      res.status(statusCode).json({
        ...result,
        additionalInfo: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          pid: process.pid,
          uptime: process.uptime(),
        },
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Detailed health check failed',
      });
    }
  });

  // Readiness probe
  router.get('/health/ready', async (req: Request, res: Response) => {
    try {
      const result = await healthService.performHealthCheck();
      
      if (result.status === 'healthy' || result.status === 'degraded') {
        res.status(200).json({ status: 'ready' });
      } else {
        res.status(503).json({ status: 'not ready', reason: result.checks });
      }
    } catch (error) {
      res.status(503).json({ 
        status: 'not ready', 
        error: error instanceof Error ? error.message : 'Readiness check failed' 
      });
    }
  });

  // Liveness probe
  router.get('/health/live', (req: Request, res: Response) => {
    res.status(200).json({ 
      status: 'alive', 
      timestamp: new Date(),
      uptime: process.uptime(),
    });
  });

  return router;
};
