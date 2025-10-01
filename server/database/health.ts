import { Pool, PoolClient } from 'pg';
import { db } from '../db';

export interface DatabaseHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  connections: {
    total: number;
    idle: number;
    waiting: number;
  };
  responseTime: number;
  lastError?: string;
  uptime: number;
  version: string;
  timestamp: Date;
}

export interface ConnectionStats {
  totalConnections: number;
  idleConnections: number;
  waitingConnections: number;
  maxConnections: number;
}

export class DatabaseHealthMonitor {
  private static instance: DatabaseHealthMonitor;
  private startTime: number;
  private lastError?: string;
  private healthHistory: DatabaseHealth[] = [];
  private maxHistorySize = 100;

  private constructor() {
    this.startTime = Date.now();
  }

  static getInstance(): DatabaseHealthMonitor {
    if (!DatabaseHealthMonitor.instance) {
      DatabaseHealthMonitor.instance = new DatabaseHealthMonitor();
    }
    return DatabaseHealthMonitor.instance;
  }

  async checkHealth(): Promise<DatabaseHealth> {
    const startTime = Date.now();
    let status: DatabaseHealth['status'] = 'healthy';
    let lastError: string | undefined;
    let version = 'unknown';
    let connectionStats: ConnectionStats = {
      totalConnections: 0,
      idleConnections: 0,
      waitingConnections: 0,
      maxConnections: 0,
    };

    try {
      // Test basic connectivity
      const result = await db.execute('SELECT version() as version, now() as current_time');
      version = result.rows[0]?.version || 'unknown';

      // Get connection pool stats
      const pool = (db as any).pool as Pool;
      if (pool) {
        connectionStats = {
          totalConnections: pool.totalCount,
          idleConnections: pool.idleCount,
          waitingConnections: pool.waitingCount,
          maxConnections: pool.options.max || 10,
        };
      }

      // Determine health status based on response time and connections
      const responseTime = Date.now() - startTime;
      
      if (responseTime > 5000) {
        status = 'unhealthy';
      } else if (responseTime > 1000 || connectionStats.waitingConnections > 5) {
        status = 'degraded';
      }

      this.lastError = undefined;
    } catch (error) {
      status = 'unhealthy';
      lastError = error instanceof Error ? error.message : 'Unknown database error';
      this.lastError = lastError;
      console.error('❌ Database health check failed:', error);
    }

    const health: DatabaseHealth = {
      status,
      connections: {
        total: connectionStats.totalConnections,
        idle: connectionStats.idleConnections,
        waiting: connectionStats.waitingConnections,
      },
      responseTime: Date.now() - startTime,
      lastError,
      uptime: Date.now() - this.startTime,
      version,
      timestamp: new Date(),
    };

    // Store in history
    this.healthHistory.push(health);
    if (this.healthHistory.length > this.maxHistorySize) {
      this.healthHistory.shift();
    }

    return health;
  }

  async getConnectionStats(): Promise<ConnectionStats> {
    try {
      const pool = (db as any).pool as Pool;
      if (!pool) {
        throw new Error('Database pool not available');
      }

      return {
        totalConnections: pool.totalCount,
        idleConnections: pool.idleCount,
        waitingConnections: pool.waitingCount,
        maxConnections: pool.options.max || 10,
      };
    } catch (error) {
      console.error('Error getting connection stats:', error);
      return {
        totalConnections: 0,
        idleConnections: 0,
        waitingConnections: 0,
        maxConnections: 0,
      };
    }
  }

  getHealthHistory(limit: number = 10): DatabaseHealth[] {
    return this.healthHistory
      .slice(-limit)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getLastError(): string | undefined {
    return this.lastError;
  }

  async testQuery(query: string = 'SELECT 1'): Promise<{ success: boolean; duration: number; error?: string }> {
    const startTime = Date.now();
    try {
      await db.execute(query);
      return {
        success: true,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getSlowQueries(limit: number = 10): Promise<Array<{
    query: string;
    duration: number;
    timestamp: Date;
  }>> {
    try {
      // This would require pg_stat_statements extension
      const result = await db.execute(`
        SELECT 
          query,
          mean_exec_time as duration,
          last_exec as timestamp
        FROM pg_stat_statements 
        WHERE mean_exec_time > 1000
        ORDER BY mean_exec_time DESC 
        LIMIT $1
      `, [limit]);

      return result.rows.map(row => ({
        query: row.query,
        duration: parseFloat(row.duration),
        timestamp: new Date(row.timestamp),
      }));
    } catch (error) {
      console.warn('Could not fetch slow queries (pg_stat_statements not enabled):', error);
      return [];
    }
  }

  async getDatabaseSize(): Promise<{
    databaseSize: string;
    tableSizes: Array<{ table: string; size: string }>;
  }> {
    try {
      // Get database size
      const dbSizeResult = await db.execute(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `);
      
      // Get table sizes
      const tableSizesResult = await db.execute(`
        SELECT 
          schemaname,
          tablename as table,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 20
      `);

      return {
        databaseSize: dbSizeResult.rows[0]?.size || 'unknown',
        tableSizes: tableSizesResult.rows.map(row => ({
          table: row.table,
          size: row.size,
        })),
      };
    } catch (error) {
      console.error('Error getting database size:', error);
      return {
        databaseSize: 'unknown',
        tableSizes: [],
      };
    }
  }

  // Start periodic health monitoring
  startMonitoring(intervalMs: number = 60000): void {
    setInterval(async () => {
      const health = await this.checkHealth();
      
      if (health.status === 'unhealthy') {
        console.error('🚨 Database health check failed:', health);
        // In production, you would send alerts here
      } else if (health.status === 'degraded') {
        console.warn('⚠️ Database health degraded:', health);
      }
    }, intervalMs);
  }
}

// Enhanced database connection with health monitoring
export class EnhancedDatabaseConnection {
  private healthMonitor: DatabaseHealthMonitor;
  private connectionPool: Pool;

  constructor(pool: Pool) {
    this.connectionPool = pool;
    this.healthMonitor = DatabaseHealthMonitor.getInstance();
    
    // Set up connection event handlers
    this.setupConnectionHandlers();
  }

  private setupConnectionHandlers(): void {
    this.connectionPool.on('connect', (client: PoolClient) => {
      console.log('✅ New database client connected');
    });

    this.connectionPool.on('error', (err: Error, client: PoolClient) => {
      console.error('❌ Database client error:', err);
    });

    this.connectionPool.on('remove', (client: PoolClient) => {
      console.log('🔌 Database client removed from pool');
    });
  }

  async executeWithHealthCheck<T = any>(
    query: string, 
    params: any[] = []
  ): Promise<{ data: T[]; health: DatabaseHealth }> {
    const health = await this.healthMonitor.checkHealth();
    
    if (health.status === 'unhealthy') {
      throw new Error(`Database is unhealthy: ${health.lastError}`);
    }

    const startTime = Date.now();
    try {
      const result = await this.connectionPool.query(query, params);
      const duration = Date.now() - startTime;
      
      // Log slow queries
      if (duration > 1000) {
        console.warn(`🐌 Slow query detected (${duration}ms):`, query.substring(0, 100));
      }

      return {
        data: result.rows,
        health,
      };
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  getHealthMonitor(): DatabaseHealthMonitor {
    return this.healthMonitor;
  }
}
