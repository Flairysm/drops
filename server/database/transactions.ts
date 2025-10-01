import { Pool, PoolClient } from 'pg';
import { EventEmitter } from 'events';

export interface TransactionOptions {
  isolationLevel?: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';
  readOnly?: boolean;
  deferrable?: boolean;
  timeout?: number; // in milliseconds
}

export interface TransactionContext {
  id: string;
  startTime: Date;
  isolationLevel: string;
  readOnly: boolean;
  timeout?: number;
  operations: TransactionOperation[];
  status: 'active' | 'committed' | 'rolled_back' | 'failed';
  error?: string;
  duration?: number;
}

export interface TransactionOperation {
  id: string;
  type: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'CUSTOM';
  query: string;
  params: any[];
  startTime: Date;
  duration?: number;
  error?: string;
  result?: any;
}

export class TransactionManager extends EventEmitter {
  private static instance: TransactionManager;
  private pool: Pool;
  private activeTransactions: Map<string, TransactionContext> = new Map();
  private transactionHistory: TransactionContext[] = [];
  private maxHistorySize = 1000;

  private constructor(pool: Pool) {
    super();
    this.pool = pool;
  }

  static getInstance(pool: Pool): TransactionManager {
    if (!TransactionManager.instance) {
      TransactionManager.instance = new TransactionManager(pool);
    }
    return TransactionManager.instance;
  }

  async beginTransaction(
    options: TransactionOptions = {}
  ): Promise<TransactionContext> {
    const transactionId = this.generateTransactionId();
    const client = await this.pool.connect();

    try {
      // Set transaction options
      let query = 'BEGIN';
      
      if (options.isolationLevel) {
        query += ` ISOLATION LEVEL ${options.isolationLevel}`;
      }
      
      if (options.readOnly) {
        query += ' READ ONLY';
      }
      
      if (options.deferrable) {
        query += ' DEFERRABLE';
      }

      await client.query(query);

      // Set timeout if specified
      if (options.timeout) {
        await client.query(`SET LOCAL statement_timeout = ${options.timeout}`);
      }

      const context: TransactionContext = {
        id: transactionId,
        startTime: new Date(),
        isolationLevel: options.isolationLevel || 'READ_COMMITTED',
        readOnly: options.readOnly || false,
        timeout: options.timeout,
        operations: [],
        status: 'active',
      };

      this.activeTransactions.set(transactionId, context);
      this.emit('transactionStarted', context);

      return context;
    } catch (error) {
      client.release();
      throw error;
    }
  }

  async executeInTransaction<T>(
    transactionId: string,
    query: string,
    params: any[] = []
  ): Promise<T[]> {
    const context = this.activeTransactions.get(transactionId);
    if (!context) {
      throw new Error(`Transaction ${transactionId} not found or not active`);
    }

    const operationId = this.generateOperationId();
    const startTime = new Date();

    const operation: TransactionOperation = {
      id: operationId,
      type: this.getQueryType(query),
      query,
      params,
      startTime,
    };

    try {
      const client = await this.pool.connect();
      
      try {
        const result = await client.query(query, params);
        operation.duration = Date.now() - startTime.getTime();
        operation.result = result.rows;

        context.operations.push(operation);
        this.emit('operationCompleted', { transactionId, operation });

        return result.rows;
      } finally {
        client.release();
      }
    } catch (error) {
      operation.duration = Date.now() - startTime.getTime();
      operation.error = error instanceof Error ? error.message : 'Unknown error';
      
      context.operations.push(operation);
      context.status = 'failed';
      context.error = operation.error;

      this.emit('operationFailed', { transactionId, operation, error });
      throw error;
    }
  }

  async commitTransaction(transactionId: string): Promise<void> {
    const context = this.activeTransactions.get(transactionId);
    if (!context) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    if (context.status !== 'active') {
      throw new Error(`Transaction ${transactionId} is not active`);
    }

    const client = await this.pool.connect();
    
    try {
      await client.query('COMMIT');
      
      context.status = 'committed';
      context.duration = Date.now() - context.startTime.getTime();
      
      this.activeTransactions.delete(transactionId);
      this.addToHistory(context);
      
      this.emit('transactionCommitted', context);
    } catch (error) {
      context.status = 'failed';
      context.error = error instanceof Error ? error.message : 'Unknown error';
      context.duration = Date.now() - context.startTime.getTime();
      
      this.activeTransactions.delete(transactionId);
      this.addToHistory(context);
      
      this.emit('transactionFailed', context);
      throw error;
    } finally {
      client.release();
    }
  }

  async rollbackTransaction(transactionId: string, reason?: string): Promise<void> {
    const context = this.activeTransactions.get(transactionId);
    if (!context) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    const client = await this.pool.connect();
    
    try {
      await client.query('ROLLBACK');
      
      context.status = 'rolled_back';
      context.duration = Date.now() - context.startTime.getTime();
      if (reason) {
        context.error = reason;
      }
      
      this.activeTransactions.delete(transactionId);
      this.addToHistory(context);
      
      this.emit('transactionRolledBack', context);
    } catch (error) {
      context.status = 'failed';
      context.error = error instanceof Error ? error.message : 'Unknown error';
      context.duration = Date.now() - context.startTime.getTime();
      
      this.activeTransactions.delete(transactionId);
      this.addToHistory(context);
      
      this.emit('transactionFailed', context);
      throw error;
    } finally {
      client.release();
    }
  }

  async withTransaction<T>(
    callback: (transactionId: string) => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<T> {
    const context = await this.beginTransaction(options);
    
    try {
      const result = await callback(context.id);
      await this.commitTransaction(context.id);
      return result;
    } catch (error) {
      await this.rollbackTransaction(context.id, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  getActiveTransactions(): TransactionContext[] {
    return Array.from(this.activeTransactions.values());
  }

  getTransactionHistory(limit: number = 100): TransactionContext[] {
    return this.transactionHistory
      .slice(-limit)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  getTransactionStats(): {
    active: number;
    total: number;
    committed: number;
    rolledBack: number;
    failed: number;
    avgDuration: number;
  } {
    const active = this.activeTransactions.size;
    const total = this.transactionHistory.length;
    
    const committed = this.transactionHistory.filter(t => t.status === 'committed').length;
    const rolledBack = this.transactionHistory.filter(t => t.status === 'rolled_back').length;
    const failed = this.transactionHistory.filter(t => t.status === 'failed').length;
    
    const completedTransactions = this.transactionHistory.filter(t => t.duration);
    const avgDuration = completedTransactions.length > 0
      ? completedTransactions.reduce((sum, t) => sum + (t.duration || 0), 0) / completedTransactions.length
      : 0;

    return {
      active,
      total,
      committed,
      rolledBack,
      failed,
      avgDuration,
    };
  }

  // Deadlock detection and resolution
  async detectDeadlocks(): Promise<{
    detected: boolean;
    transactions: string[];
    details: string;
  }> {
    try {
      const result = await this.pool.query(`
        SELECT 
          blocked_locks.pid AS blocked_pid,
          blocked_activity.usename AS blocked_user,
          blocking_locks.pid AS blocking_pid,
          blocking_activity.usename AS blocking_user,
          blocked_activity.query AS blocked_statement,
          blocking_activity.query AS current_statement_in_blocking_process
        FROM pg_catalog.pg_locks blocked_locks
        JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
        JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
          AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
          AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
          AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
          AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
          AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
          AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
          AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
          AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
          AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
          AND blocking_locks.pid != blocked_locks.pid
        JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
        WHERE NOT blocked_locks.granted;
      `);

      if (result.rows.length > 0) {
        const blockedPids = result.rows.map(row => row.blocked_pid);
        const blockingPids = result.rows.map(row => row.blocking_pid);
        
        return {
          detected: true,
          transactions: [...new Set([...blockedPids, ...blockingPids])],
          details: JSON.stringify(result.rows, null, 2),
        };
      }

      return {
        detected: false,
        transactions: [],
        details: 'No deadlocks detected',
      };
    } catch (error) {
      console.error('Error detecting deadlocks:', error);
      return {
        detected: false,
        transactions: [],
        details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // Transaction timeout monitoring
  startTimeoutMonitoring(intervalMs: number = 30000): void {
    setInterval(() => {
      const now = Date.now();
      
      for (const [transactionId, context] of this.activeTransactions) {
        const duration = now - context.startTime.getTime();
        
        // Check for timeout
        if (context.timeout && duration > context.timeout) {
          console.warn(`⚠️ Transaction ${transactionId} timed out after ${duration}ms`);
          this.rollbackTransaction(transactionId, 'Transaction timeout')
            .catch(error => console.error('Error rolling back timed out transaction:', error));
        }
        
        // Check for long-running transactions (over 5 minutes)
        if (duration > 5 * 60 * 1000) {
          console.warn(`⚠️ Long-running transaction detected: ${transactionId} (${Math.round(duration / 1000)}s)`);
        }
      }
    }, intervalMs);
  }

  private getQueryType(query: string): TransactionOperation['type'] {
    const trimmed = query.trim().toUpperCase();
    if (trimmed.startsWith('SELECT')) return 'SELECT';
    if (trimmed.startsWith('INSERT')) return 'INSERT';
    if (trimmed.startsWith('UPDATE')) return 'UPDATE';
    if (trimmed.startsWith('DELETE')) return 'DELETE';
    return 'CUSTOM';
  }

  private addToHistory(context: TransactionContext): void {
    this.transactionHistory.push(context);
    if (this.transactionHistory.length > this.maxHistorySize) {
      this.transactionHistory.shift();
    }
  }

  private generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Utility functions for common transaction patterns
export class TransactionUtils {
  static async bulkInsert<T>(
    transactionId: string,
    table: string,
    data: T[],
    columns: string[]
  ): Promise<void> {
    if (data.length === 0) return;

    const values = data.map((_, index) => {
      const placeholders = columns.map((_, colIndex) => 
        `$${index * columns.length + colIndex + 1}`
      ).join(', ');
      return `(${placeholders})`;
    }).join(', ');

    const query = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES ${values}
    `;

    const params = data.flatMap(item => 
      columns.map(column => (item as any)[column])
    );

    const manager = TransactionManager.getInstance(null as any); // This would be properly injected
    await manager.executeInTransaction(transactionId, query, params);
  }

  static async bulkUpdate<T>(
    transactionId: string,
    table: string,
    updates: Array<{ id: string; data: Partial<T> }>,
    idColumn: string = 'id'
  ): Promise<void> {
    for (const update of updates) {
      const setClause = Object.keys(update.data)
        .map((key, index) => `${key} = $${index + 2}`)
        .join(', ');

      const query = `
        UPDATE ${table}
        SET ${setClause}
        WHERE ${idColumn} = $1
      `;

      const params = [update.id, ...Object.values(update.data)];

      const manager = TransactionManager.getInstance(null as any); // This would be properly injected
      await manager.executeInTransaction(transactionId, query, params);
    }
  }

  static async conditionalUpdate(
    transactionId: string,
    table: string,
    updates: Record<string, any>,
    conditions: Record<string, any>
  ): Promise<number> {
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(', ');

    const whereClause = Object.keys(conditions)
      .map((key, index) => `${key} = $${Object.keys(updates).length + index + 1}`)
      .join(' AND ');

    const query = `
      UPDATE ${table}
      SET ${setClause}
      WHERE ${whereClause}
    `;

    const params = [...Object.values(updates), ...Object.values(conditions)];

    const manager = TransactionManager.getInstance(null as any); // This would be properly injected
    const result = await manager.executeInTransaction(transactionId, query, params);
    return result.length;
  }
}
