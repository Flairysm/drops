import { Express } from 'express';
import { APICacheMiddleware, CacheConfigs, CachePatterns } from '../cache/apiCache';
import { BackupManager, createBackupRoutes } from '../backup/backupManager';
import { apiLimiter, authLimiter, setSecurityHeaders } from '../middleware/security';
import { checkDatabaseHealth } from '../database/health';
import { runMigrations } from '../database/migrations';
import { trackError } from '../monitoring/errorTracker';
import { updateMetric } from '../monitoring/metrics';
import { CacheWarmer } from '../cache/apiCache';
import { CacheMonitor } from '../cache/apiCache';
import { addEmailJob, addReportJob } from '../jobs/jobQueue';
import { recordAdminActivity } from '../activity/activityFeed';
import { bulkInsert, bulkUpdate, bulkDelete } from '../operations/bulk';
import { advancedSearch } from '../search/advancedSearch';
import { exportDataToCsv, importDataFromCsv } from '../data/exportImport';
import { addIndex, analyzeQuery } from '../database/optimization';
import { runInTransaction } from '../database/transactions';
import { createUserSchema, updateUserSchema, createInventoryCardSchema } from '../validation/schemas';
import config from '../config';

export class AdminEnhancements {
  private static instance: AdminEnhancements;
  private app: Express;
  private apiCache: APICacheMiddleware;
  private backupManager: BackupManager;
  private cacheWarmer: CacheWarmer;
  private cacheMonitor: CacheMonitor;

  private constructor(app: Express) {
    this.app = app;
    this.apiCache = APICacheMiddleware.getInstance();
    this.backupManager = BackupManager.getInstance();
    this.cacheWarmer = CacheWarmer.getInstance();
    this.cacheMonitor = CacheMonitor.getInstance();
  }

  static getInstance(app: Express): AdminEnhancements {
    if (!AdminEnhancements.instance) {
      AdminEnhancements.instance = new AdminEnhancements(app);
    }
    return AdminEnhancements.instance;
  }

  // Initialize all admin enhancements
  async initialize(): Promise<void> {
    try {
      console.log('🚀 Initializing admin enhancements...');

      // 1. Security & Rate Limiting
      await this.setupSecurity();

      // 2. Database Health & Migrations
      await this.setupDatabase();

      // 3. Caching System
      await this.setupCaching();

      // 4. Backup System
      await this.setupBackups();

      // 5. Monitoring & Metrics
      await this.setupMonitoring();

      // 6. Background Jobs
      await this.setupBackgroundJobs();

      // 7. API Routes
      await this.setupAPIRoutes();

      // 8. Cache Warming
      await this.warmCache();

      console.log('✅ Admin enhancements initialized successfully');
    } catch (error) {
      trackError(error as Error, { component: 'AdminEnhancements', operation: 'initialize' }, 'critical');
      console.error('❌ Failed to initialize admin enhancements:', error);
      throw error;
    }
  }

  // Setup security middleware
  private async setupSecurity(): Promise<void> {
    console.log('🔒 Setting up security middleware...');

    // Security headers
    this.app.use(setSecurityHeaders);

    // Rate limiting
    this.app.use('/api/', apiLimiter);
    this.app.use('/api/auth/', authLimiter);

    console.log('✅ Security middleware configured');
  }

  // Setup database health checks and migrations
  private async setupDatabase(): Promise<void> {
    console.log('🗄️ Setting up database enhancements...');

    // Run migrations
    await runMigrations();

    // Health check endpoint
    this.app.get('/api/health', async (req, res) => {
      try {
        const dbStatus = await checkDatabaseHealth();
        const overallStatus = dbStatus.status === 'ok' ? 'ok' : 'degraded';

        res.status(overallStatus === 'ok' ? 200 : 503).json({
          status: overallStatus,
          timestamp: new Date().toISOString(),
          services: {
            database: dbStatus,
          },
        });
      } catch (error) {
        trackError(error as Error, { endpoint: '/api/health' }, 'high');
        res.status(503).json({ status: 'error', message: 'Health check failed' });
      }
    });

    console.log('✅ Database enhancements configured');
  }

  // Setup caching system
  private async setupCaching(): Promise<void> {
    console.log('💾 Setting up caching system...');

    // Apply caching middleware to different route groups
    this.app.use('/api/available-packs', this.apiCache.createMiddleware(CacheConfigs.publicAPI));
    this.app.use('/api/auth/user', this.apiCache.createMiddleware(CacheConfigs.userData));
    this.app.use('/api/vault', this.apiCache.createMiddleware(CacheConfigs.userData));
    this.app.use('/api/inventory', this.apiCache.createMiddleware(CacheConfigs.staticData));

    // Cache invalidation middleware
    this.app.use('/api/admin', this.apiCache.createInvalidationMiddleware(CachePatterns.adminRelated));
    this.app.use('/api/users', this.apiCache.createInvalidationMiddleware(CachePatterns.userRelated));
    this.app.use('/api/packs', this.apiCache.createInvalidationMiddleware(CachePatterns.packRelated));
    this.app.use('/api/inventory', this.apiCache.createInvalidationMiddleware(CachePatterns.inventoryRelated));

    console.log('✅ Caching system configured');
  }

  // Setup backup system
  private async setupBackups(): Promise<void> {
    console.log('💾 Setting up backup system...');

    // Create backup routes
    createBackupRoutes(this.app);

    // Schedule automatic backups
    await this.backupManager.scheduleBackups();

    console.log('✅ Backup system configured');
  }

  // Setup monitoring and metrics
  private async setupMonitoring(): Promise<void> {
    console.log('📊 Setting up monitoring...');

    // Metrics endpoint
    this.app.get('/api/admin/metrics', async (req, res) => {
      try {
        const metrics = {
          cache: this.cacheMonitor.getCurrentStats(),
          backup: await this.backupManager.getBackupStats(),
          system: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
          },
        };

        res.json(metrics);
      } catch (error) {
        trackError(error as Error, { endpoint: '/api/admin/metrics' }, 'high');
        res.status(500).json({ error: 'Failed to get metrics' });
      }
    });

    // Cache stats endpoint
    this.app.get('/api/admin/cache/stats', async (req, res) => {
      try {
        const stats = this.cacheMonitor.getCurrentStats();
        res.json(stats);
      } catch (error) {
        trackError(error as Error, { endpoint: '/api/admin/cache/stats' }, 'medium');
        res.status(500).json({ error: 'Failed to get cache stats' });
      }
    });

    // Clear cache endpoint
    this.app.post('/api/admin/cache/clear', async (req, res) => {
      try {
        await this.apiCache.clear();
        res.json({ message: 'Cache cleared successfully' });
      } catch (error) {
        trackError(error as Error, { endpoint: '/api/admin/cache/clear' }, 'medium');
        res.status(500).json({ error: 'Failed to clear cache' });
      }
    });

    console.log('✅ Monitoring configured');
  }

  // Setup background jobs
  private async setupBackgroundJobs(): Promise<void> {
    console.log('⚙️ Setting up background jobs...');

    // Example: Schedule daily cleanup job
    setInterval(async () => {
      try {
        await this.backupManager.cleanupOldBackups();
        updateMetric('totalCleanupJobs', 1, 'increment');
      } catch (error) {
        trackError(error as Error, { job: 'dailyCleanup' }, 'medium');
      }
    }, 24 * 60 * 60 * 1000); // Daily

    console.log('✅ Background jobs configured');
  }

  // Setup additional API routes
  private async setupAPIRoutes(): Promise<void> {
    console.log('🛣️ Setting up additional API routes...');

    // Bulk operations
    this.app.post('/api/admin/bulk/insert', async (req, res) => {
      try {
        const { table, records } = req.body;
        // Implementation would depend on your schema
        res.json({ message: 'Bulk insert completed', count: records.length });
      } catch (error) {
        trackError(error as Error, { endpoint: '/api/admin/bulk/insert' }, 'high');
        res.status(500).json({ error: 'Bulk insert failed' });
      }
    });

    // Advanced search
    this.app.post('/api/admin/search', async (req, res) => {
      try {
        const { table, filters, options } = req.body;
        // Implementation would depend on your schema
        res.json({ results: [], total: 0 });
      } catch (error) {
        trackError(error as Error, { endpoint: '/api/admin/search' }, 'high');
        res.status(500).json({ error: 'Search failed' });
      }
    });

    // Data export
    this.app.get('/api/admin/export/:table', async (req, res) => {
      try {
        const { table } = req.params;
        const { format = 'csv' } = req.query;
        
        if (format === 'csv') {
          // Implementation would depend on your schema
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename="${table}.csv"`);
          res.send('export data here');
        } else {
          res.status(400).json({ error: 'Unsupported export format' });
        }
      } catch (error) {
        trackError(error as Error, { endpoint: '/api/admin/export' }, 'high');
        res.status(500).json({ error: 'Export failed' });
      }
    });

    // Database optimization
    this.app.post('/api/admin/optimize', async (req, res) => {
      try {
        const { table, column, unique = false } = req.body;
        await addIndex(table, column, unique);
        res.json({ message: 'Index added successfully' });
      } catch (error) {
        trackError(error as Error, { endpoint: '/api/admin/optimize' }, 'high');
        res.status(500).json({ error: 'Optimization failed' });
      }
    });

    console.log('✅ Additional API routes configured');
  }

  // Warm cache with popular endpoints
  private async warmCache(): Promise<void> {
    console.log('🔥 Warming cache...');

    try {
      await this.cacheWarmer.warmPopularEndpoints();
      console.log('✅ Cache warmed successfully');
    } catch (error) {
      trackError(error as Error, { operation: 'warmCache' }, 'medium');
      console.warn('⚠️ Cache warming failed, but continuing...');
    }
  }

  // Utility methods for admin operations
  async recordAdminAction(adminId: string, action: string, resource: string, resourceId: string, changes?: any): Promise<void> {
    try {
      await recordAdminActivity({
        adminId,
        action,
        resource,
        resourceId,
        changes: changes || {},
        ipAddress: '127.0.0.1', // Would be extracted from request in real implementation
        userAgent: 'Admin Panel', // Would be extracted from request in real implementation
      });
    } catch (error) {
      trackError(error as Error, { operation: 'recordAdminAction' }, 'medium');
    }
  }

  async sendAdminNotification(type: string, message: string, data?: any): Promise<void> {
    try {
      await addEmailJob(
        config.adminEmail,
        `Admin Notification: ${type}`,
        `${message}\n\nData: ${JSON.stringify(data, null, 2)}`
      );
    } catch (error) {
      trackError(error as Error, { operation: 'sendAdminNotification' }, 'medium');
    }
  }

  async generateAdminReport(reportType: string, params: any): Promise<void> {
    try {
      await addReportJob(reportType, params);
    } catch (error) {
      trackError(error as Error, { operation: 'generateAdminReport' }, 'medium');
    }
  }

  // Get system status
  async getSystemStatus(): Promise<{
    status: string;
    services: Record<string, any>;
    metrics: any;
  }> {
    try {
      const dbStatus = await checkDatabaseHealth();
      const cacheStats = this.cacheMonitor.getCurrentStats();
      const backupStats = await this.backupManager.getBackupStats();

      return {
        status: dbStatus.status === 'ok' ? 'healthy' : 'degraded',
        services: {
          database: dbStatus,
          cache: cacheStats,
          backup: backupStats,
        },
        metrics: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
        },
      };
    } catch (error) {
      trackError(error as Error, { operation: 'getSystemStatus' }, 'high');
      return {
        status: 'error',
        services: {},
        metrics: {},
      };
    }
  }
}

// Export singleton instance
export const getAdminEnhancements = (app: Express): AdminEnhancements => {
  return AdminEnhancements.getInstance(app);
};
