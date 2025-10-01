import { Pool } from 'pg';

export interface QueryPlan {
  query: string;
  executionTime: number;
  rowsReturned: number;
  cost: number;
  plan: any;
}

export interface IndexSuggestion {
  table: string;
  columns: string[];
  type: 'btree' | 'hash' | 'gin' | 'gist';
  reason: string;
  estimatedImprovement: string;
}

export interface QueryOptimization {
  originalQuery: string;
  optimizedQuery: string;
  improvements: string[];
  estimatedSpeedup: number;
}

export class DatabaseOptimizer {
  private static instance: DatabaseOptimizer;
  private pool: Pool;
  private queryCache: Map<string, QueryPlan> = new Map();
  private slowQueries: Array<{ query: string; avgTime: number; count: number }> = [];

  private constructor(pool: Pool) {
    this.pool = pool;
  }

  static getInstance(pool: Pool): DatabaseOptimizer {
    if (!DatabaseOptimizer.instance) {
      DatabaseOptimizer.instance = new DatabaseOptimizer(pool);
    }
    return DatabaseOptimizer.instance;
  }

  async analyzeQuery(query: string): Promise<QueryPlan> {
    const startTime = Date.now();
    
    try {
      // Get query plan
      const planResult = await this.pool.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`);
      const plan = planResult.rows[0]['QUERY PLAN'][0];
      
      // Execute query to get actual results
      const result = await this.pool.query(query);
      const executionTime = Date.now() - startTime;
      
      const queryPlan: QueryPlan = {
        query,
        executionTime,
        rowsReturned: result.rows.length,
        cost: plan['Total Cost'] || 0,
        plan,
      };

      // Cache the plan
      this.queryCache.set(query, queryPlan);
      
      // Track slow queries
      if (executionTime > 1000) { // Queries taking more than 1 second
        this.trackSlowQuery(query, executionTime);
      }

      return queryPlan;
    } catch (error) {
      throw new Error(`Query analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getIndexSuggestions(): Promise<IndexSuggestion[]> {
    const suggestions: IndexSuggestion[] = [];

    try {
      // Analyze table statistics
      const tableStats = await this.pool.query(`
        SELECT 
          schemaname,
          tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          n_live_tup as live_tuples,
          n_dead_tup as dead_tuples,
          last_vacuum,
          last_autovacuum,
          last_analyze,
          last_autoanalyze
        FROM pg_stat_user_tables
        ORDER BY n_live_tup DESC
      `);

      // Check for missing indexes on foreign keys
      const missingFKIndexes = await this.pool.query(`
        SELECT
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        LEFT JOIN pg_indexes pi
          ON pi.tablename = tc.table_name
          AND pi.indexdef LIKE '%' || kcu.column_name || '%'
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND pi.indexname IS NULL
      `);

      for (const row of missingFKIndexes.rows) {
        suggestions.push({
          table: row.table_name,
          columns: [row.column_name],
          type: 'btree',
          reason: 'Foreign key column without index',
          estimatedImprovement: 'High - improves JOIN performance',
        });
      }

      // Check for columns frequently used in WHERE clauses
      const frequentWhereColumns = await this.pool.query(`
        SELECT 
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats
        WHERE schemaname = 'public'
          AND n_distinct > 10
          AND correlation < 0.1
        ORDER BY n_distinct DESC
      `);

      for (const row of frequentWhereColumns.rows) {
        suggestions.push({
          table: row.tablename,
          columns: [row.attname],
          type: 'btree',
          reason: 'High cardinality column frequently used in WHERE clauses',
          estimatedImprovement: 'Medium - improves WHERE clause performance',
        });
      }

      // Check for columns used in ORDER BY without indexes
      const orderByColumns = await this.pool.query(`
        SELECT DISTINCT
          schemaname,
          tablename,
          attname
        FROM pg_stats
        WHERE schemaname = 'public'
          AND attname IN (
            SELECT unnest(string_to_array(
              regexp_replace(
                regexp_replace(query, '.*ORDER BY ', '', 'gi'),
                '\\s+(ASC|DESC).*', '', 'gi'
              ), ','
            ))
            FROM pg_stat_statements
            WHERE query ILIKE '%ORDER BY%'
          )
      `);

      for (const row of orderByColumns.rows) {
        suggestions.push({
          table: row.tablename,
          columns: [row.attname],
          type: 'btree',
          reason: 'Column used in ORDER BY without index',
          estimatedImprovement: 'Medium - improves ORDER BY performance',
        });
      }

    } catch (error) {
      console.error('Error generating index suggestions:', error);
    }

    return suggestions;
  }

  async optimizeQuery(query: string): Promise<QueryOptimization> {
    const originalPlan = await this.analyzeQuery(query);
    const improvements: string[] = [];
    let optimizedQuery = query;
    let estimatedSpeedup = 1;

    // Check for common optimization opportunities
    const lowerQuery = query.toLowerCase();

    // 1. Check for SELECT * usage
    if (lowerQuery.includes('select *')) {
      improvements.push('Consider specifying columns instead of SELECT *');
      estimatedSpeedup *= 1.2;
    }

    // 2. Check for missing WHERE clauses on large tables
    if (lowerQuery.includes('from users') && !lowerQuery.includes('where')) {
      improvements.push('Consider adding WHERE clause to limit results');
      estimatedSpeedup *= 1.5;
    }

    // 3. Check for inefficient LIKE patterns
    if (lowerQuery.includes("like '%")) {
      improvements.push('Leading wildcards in LIKE prevent index usage');
      estimatedSpeedup *= 1.3;
    }

    // 4. Check for ORDER BY without LIMIT
    if (lowerQuery.includes('order by') && !lowerQuery.includes('limit')) {
      improvements.push('Consider adding LIMIT to ORDER BY queries');
      estimatedSpeedup *= 1.4;
    }

    // 5. Check for N+1 query patterns
    if (this.detectNPlusOnePattern(query)) {
      improvements.push('Potential N+1 query pattern detected - consider JOIN');
      estimatedSpeedup *= 2.0;
    }

    // Generate optimized query
    optimizedQuery = this.generateOptimizedQuery(query, improvements);

    return {
      originalQuery: query,
      optimizedQuery,
      improvements,
      estimatedSpeedup,
    };
  }

  async getSlowQueries(limit: number = 10): Promise<Array<{ query: string; avgTime: number; count: number }>> {
    try {
      // This would typically come from pg_stat_statements
      const result = await this.pool.query(`
        SELECT 
          query,
          mean_exec_time as avg_time,
          calls as count
        FROM pg_stat_statements
        WHERE mean_exec_time > 1000
        ORDER BY mean_exec_time DESC
        LIMIT $1
      `, [limit]);

      return result.rows.map(row => ({
        query: row.query,
        avgTime: parseFloat(row.avg_time),
        count: parseInt(row.count),
      }));
    } catch (error) {
      console.warn('Could not fetch slow queries (pg_stat_statements not enabled)');
      return this.slowQueries.slice(0, limit);
    }
  }

  async getTableStatistics(): Promise<Array<{
    table: string;
    rows: number;
    size: string;
    indexes: number;
    lastAnalyzed: Date;
  }>> {
    try {
      const result = await this.pool.query(`
        SELECT 
          t.tablename as table,
          t.n_tup_ins + t.n_tup_upd + t.n_tup_del as rows,
          pg_size_pretty(pg_total_relation_size(c.oid)) as size,
          (SELECT COUNT(*) FROM pg_indexes WHERE tablename = t.tablename) as indexes,
          t.last_analyze as last_analyzed
        FROM pg_stat_user_tables t
        JOIN pg_class c ON c.relname = t.tablename
        ORDER BY pg_total_relation_size(c.oid) DESC
      `);

      return result.rows.map(row => ({
        table: row.table,
        rows: parseInt(row.rows) || 0,
        size: row.size,
        indexes: parseInt(row.indexes) || 0,
        lastAnalyzed: row.last_analyzed,
      }));
    } catch (error) {
      console.error('Error fetching table statistics:', error);
      return [];
    }
  }

  async createIndex(table: string, columns: string[], type: string = 'btree'): Promise<boolean> {
    try {
      const indexName = `idx_${table}_${columns.join('_')}`;
      const query = `CREATE INDEX CONCURRENTLY ${indexName} ON ${table} USING ${type} (${columns.join(', ')})`;
      
      await this.pool.query(query);
      console.log(`✅ Created index: ${indexName}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to create index on ${table}:`, error);
      return false;
    }
  }

  async dropIndex(indexName: string): Promise<boolean> {
    try {
      await this.pool.query(`DROP INDEX CONCURRENTLY ${indexName}`);
      console.log(`✅ Dropped index: ${indexName}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to drop index ${indexName}:`, error);
      return false;
    }
  }

  async vacuumTable(table: string): Promise<boolean> {
    try {
      await this.pool.query(`VACUUM ANALYZE ${table}`);
      console.log(`✅ Vacuumed table: ${table}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to vacuum table ${table}:`, error);
      return false;
    }
  }

  async reindexTable(table: string): Promise<boolean> {
    try {
      await this.pool.query(`REINDEX TABLE ${table}`);
      console.log(`✅ Reindexed table: ${table}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to reindex table ${table}:`, error);
      return false;
    }
  }

  private detectNPlusOnePattern(query: string): boolean {
    // Simple heuristic to detect potential N+1 patterns
    const lowerQuery = query.toLowerCase();
    return lowerQuery.includes('select') && 
           lowerQuery.includes('where') && 
           lowerQuery.includes('in (') &&
           !lowerQuery.includes('join');
  }

  private generateOptimizedQuery(query: string, improvements: string[]): string {
    let optimized = query;

    // Apply basic optimizations
    if (improvements.some(imp => imp.includes('SELECT *'))) {
      // This would require schema knowledge to replace with specific columns
      optimized = optimized.replace(/select \*/gi, 'SELECT id, name, created_at'); // Example
    }

    if (improvements.some(imp => imp.includes('WHERE clause'))) {
      // Add a basic WHERE clause example
      optimized = optimized.replace(/from (\w+)/gi, 'FROM $1 WHERE created_at > NOW() - INTERVAL \'30 days\'');
    }

    return optimized;
  }

  private trackSlowQuery(query: string, executionTime: number): void {
    const existing = this.slowQueries.find(sq => sq.query === query);
    if (existing) {
      existing.avgTime = (existing.avgTime + executionTime) / 2;
      existing.count++;
    } else {
      this.slowQueries.push({
        query,
        avgTime: executionTime,
        count: 1,
      });
    }

    // Keep only top 100 slow queries
    if (this.slowQueries.length > 100) {
      this.slowQueries.sort((a, b) => b.avgTime - a.avgTime);
      this.slowQueries = this.slowQueries.slice(0, 100);
    }
  }

  // Performance monitoring
  async getPerformanceMetrics(): Promise<{
    totalQueries: number;
    avgQueryTime: number;
    slowQueries: number;
    cacheHitRate: number;
    connectionCount: number;
  }> {
    try {
      const stats = await this.pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM pg_stat_statements) as total_queries,
          (SELECT AVG(mean_exec_time) FROM pg_stat_statements) as avg_query_time,
          (SELECT COUNT(*) FROM pg_stat_statements WHERE mean_exec_time > 1000) as slow_queries,
          (SELECT ROUND(100.0 * sum(blks_hit) / (sum(blks_hit) + sum(blks_read)), 2) FROM pg_stat_database WHERE datname = current_database()) as cache_hit_rate
      `);

      const connectionStats = await this.pool.query(`
        SELECT COUNT(*) as connection_count
        FROM pg_stat_activity
        WHERE state = 'active'
      `);

      return {
        totalQueries: parseInt(stats.rows[0].total_queries) || 0,
        avgQueryTime: parseFloat(stats.rows[0].avg_query_time) || 0,
        slowQueries: parseInt(stats.rows[0].slow_queries) || 0,
        cacheHitRate: parseFloat(stats.rows[0].cache_hit_rate) || 0,
        connectionCount: parseInt(connectionStats.rows[0].connection_count) || 0,
      };
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
      return {
        totalQueries: 0,
        avgQueryTime: 0,
        slowQueries: 0,
        cacheHitRate: 0,
        connectionCount: 0,
      };
    }
  }
}
