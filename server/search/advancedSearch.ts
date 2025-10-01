import { z } from 'zod';
import { Pool } from 'pg';

export interface SearchFilters {
  query?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  numericRange?: {
    field: string;
    min?: number;
    max?: number;
  };
  enumFilters?: Array<{
    field: string;
    values: string[];
  }>;
  booleanFilters?: Array<{
    field: string;
    value: boolean;
  }>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface SearchResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  filters: SearchFilters;
  executionTime: number;
}

export interface SearchIndex {
  table: string;
  columns: string[];
  weights: Record<string, number>;
  searchable: boolean;
}

// Search schemas
const userSearchSchema = z.object({
  query: z.string().max(100).optional(),
  role: z.enum(['user', 'admin']).optional(),
  isBanned: z.boolean().optional(),
  isSuspended: z.boolean().optional(),
  creditRange: z.object({
    min: z.number().min(0),
    max: z.number().min(0),
  }).optional(),
  dateRange: z.object({
    start: z.date(),
    end: z.date(),
  }).optional(),
  sortBy: z.enum(['username', 'email', 'credits', 'createdAt', 'lastLoginAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

const packSearchSchema = z.object({
  query: z.string().max(100).optional(),
  packType: z.enum(['classic', 'special', 'mystery']).optional(),
  isActive: z.boolean().optional(),
  priceRange: z.object({
    min: z.number().min(0),
    max: z.number().min(0),
  }).optional(),
  dateRange: z.object({
    start: z.date(),
    end: z.date(),
  }).optional(),
  sortBy: z.enum(['name', 'price', 'createdAt', 'totalPacks']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

const inventorySearchSchema = z.object({
  query: z.string().max(100).optional(),
  tier: z.enum(['D', 'C', 'B', 'A', 'S', 'SS', 'SSS']).optional(),
  creditRange: z.object({
    min: z.number().min(0),
    max: z.number().min(0),
  }).optional(),
  dateRange: z.object({
    start: z.date(),
    end: z.date(),
  }).optional(),
  sortBy: z.enum(['name', 'credits', 'tier', 'createdAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

export class AdvancedSearchService {
  private static instance: AdvancedSearchService;
  private pool: Pool;
  private searchIndexes: Map<string, SearchIndex> = new Map();

  private constructor(pool: Pool) {
    this.pool = pool;
    this.initializeSearchIndexes();
  }

  static getInstance(pool: Pool): AdvancedSearchService {
    if (!AdvancedSearchService.instance) {
      AdvancedSearchService.instance = new AdvancedSearchService(pool);
    }
    return AdvancedSearchService.instance;
  }

  private initializeSearchIndexes(): void {
    this.searchIndexes.set('users', {
      table: 'users',
      columns: ['username', 'email'],
      weights: { username: 1.0, email: 0.8 },
      searchable: true,
    });

    this.searchIndexes.set('packs', {
      table: 'packs',
      columns: ['name', 'description'],
      weights: { name: 1.0, description: 0.6 },
      searchable: true,
    });

    this.searchIndexes.set('inventory', {
      table: 'inventory',
      columns: ['name'],
      weights: { name: 1.0 },
      searchable: true,
    });
  }

  async searchUsers(filters: z.infer<typeof userSearchSchema>): Promise<SearchResult<any>> {
    const startTime = Date.now();
    const validatedFilters = userSearchSchema.parse(filters);
    
    const { query, whereClause, params } = this.buildUserSearchQuery(validatedFilters);
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`;
    const countResult = await this.pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    const limit = validatedFilters.limit;
    const offset = validatedFilters.offset;
    const page = Math.floor(offset / limit) + 1;
    const totalPages = Math.ceil(total / limit);

    const dataQuery = `
      ${query}
      ORDER BY ${validatedFilters.sortBy} ${validatedFilters.sortOrder}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const dataResult = await this.pool.query(dataQuery, [...params, limit, offset]);

    return {
      data: dataResult.rows,
      total,
      page,
      pageSize: limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
      filters: validatedFilters,
      executionTime: Date.now() - startTime,
    };
  }

  async searchPacks(filters: z.infer<typeof packSearchSchema>): Promise<SearchResult<any>> {
    const startTime = Date.now();
    const validatedFilters = packSearchSchema.parse(filters);
    
    const { query, whereClause, params } = this.buildPackSearchQuery(validatedFilters);
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM packs ${whereClause}`;
    const countResult = await this.pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    const limit = validatedFilters.limit;
    const offset = validatedFilters.offset;
    const page = Math.floor(offset / limit) + 1;
    const totalPages = Math.ceil(total / limit);

    const dataQuery = `
      ${query}
      ORDER BY ${validatedFilters.sortBy} ${validatedFilters.sortOrder}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const dataResult = await this.pool.query(dataQuery, [...params, limit, offset]);

    return {
      data: dataResult.rows,
      total,
      page,
      pageSize: limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
      filters: validatedFilters,
      executionTime: Date.now() - startTime,
    };
  }

  async searchInventory(filters: z.infer<typeof inventorySearchSchema>): Promise<SearchResult<any>> {
    const startTime = Date.now();
    const validatedFilters = inventorySearchSchema.parse(filters);
    
    const { query, whereClause, params } = this.buildInventorySearchQuery(validatedFilters);
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM inventory ${whereClause}`;
    const countResult = await this.pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    const limit = validatedFilters.limit;
    const offset = validatedFilters.offset;
    const page = Math.floor(offset / limit) + 1;
    const totalPages = Math.ceil(total / limit);

    const dataQuery = `
      ${query}
      ORDER BY ${validatedFilters.sortBy} ${validatedFilters.sortOrder}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const dataResult = await this.pool.query(dataQuery, [...params, limit, offset]);

    return {
      data: dataResult.rows,
      total,
      page,
      pageSize: limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
      filters: validatedFilters,
      executionTime: Date.now() - startTime,
    };
  }

  private buildUserSearchQuery(filters: z.infer<typeof userSearchSchema>): {
    query: string;
    whereClause: string;
    params: any[];
  } {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Text search
    if (filters.query) {
      const searchIndex = this.searchIndexes.get('users');
      if (searchIndex?.searchable) {
        const searchColumns = searchIndex.columns.map(col => 
          `to_tsvector('english', ${col}) @@ plainto_tsquery('english', $${paramIndex})`
        ).join(' OR ');
        conditions.push(`(${searchColumns})`);
        params.push(filters.query);
        paramIndex++;
      } else {
        conditions.push(`(username ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
        params.push(`%${filters.query}%`);
        paramIndex++;
      }
    }

    // Role filter
    if (filters.role) {
      conditions.push(`role = $${paramIndex}`);
      params.push(filters.role);
      paramIndex++;
    }

    // Boolean filters
    if (filters.isBanned !== undefined) {
      conditions.push(`is_banned = $${paramIndex}`);
      params.push(filters.isBanned);
      paramIndex++;
    }

    if (filters.isSuspended !== undefined) {
      conditions.push(`is_suspended = $${paramIndex}`);
      params.push(filters.isSuspended);
      paramIndex++;
    }

    // Credit range
    if (filters.creditRange) {
      if (filters.creditRange.min !== undefined) {
        conditions.push(`credits >= $${paramIndex}`);
        params.push(filters.creditRange.min);
        paramIndex++;
      }
      if (filters.creditRange.max !== undefined) {
        conditions.push(`credits <= $${paramIndex}`);
        params.push(filters.creditRange.max);
        paramIndex++;
      }
    }

    // Date range
    if (filters.dateRange) {
      if (filters.dateRange.start) {
        conditions.push(`created_at >= $${paramIndex}`);
        params.push(filters.dateRange.start);
        paramIndex++;
      }
      if (filters.dateRange.end) {
        conditions.push(`created_at <= $${paramIndex}`);
        params.push(filters.dateRange.end);
        paramIndex++;
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `SELECT * FROM users ${whereClause}`;

    return { query, whereClause, params };
  }

  private buildPackSearchQuery(filters: z.infer<typeof packSearchSchema>): {
    query: string;
    whereClause: string;
    params: any[];
  } {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Text search
    if (filters.query) {
      const searchIndex = this.searchIndexes.get('packs');
      if (searchIndex?.searchable) {
        const searchColumns = searchIndex.columns.map(col => 
          `to_tsvector('english', ${col}) @@ plainto_tsquery('english', $${paramIndex})`
        ).join(' OR ');
        conditions.push(`(${searchColumns})`);
        params.push(filters.query);
        paramIndex++;
      } else {
        conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
        params.push(`%${filters.query}%`);
        paramIndex++;
      }
    }

    // Pack type filter
    if (filters.packType) {
      conditions.push(`pack_type = $${paramIndex}`);
      params.push(filters.packType);
      paramIndex++;
    }

    // Boolean filters
    if (filters.isActive !== undefined) {
      conditions.push(`is_active = $${paramIndex}`);
      params.push(filters.isActive);
      paramIndex++;
    }

    // Price range
    if (filters.priceRange) {
      if (filters.priceRange.min !== undefined) {
        conditions.push(`price >= $${paramIndex}`);
        params.push(filters.priceRange.min);
        paramIndex++;
      }
      if (filters.priceRange.max !== undefined) {
        conditions.push(`price <= $${paramIndex}`);
        params.push(filters.priceRange.max);
        paramIndex++;
      }
    }

    // Date range
    if (filters.dateRange) {
      if (filters.dateRange.start) {
        conditions.push(`created_at >= $${paramIndex}`);
        params.push(filters.dateRange.start);
        paramIndex++;
      }
      if (filters.dateRange.end) {
        conditions.push(`created_at <= $${paramIndex}`);
        params.push(filters.dateRange.end);
        paramIndex++;
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `SELECT * FROM packs ${whereClause}`;

    return { query, whereClause, params };
  }

  private buildInventorySearchQuery(filters: z.infer<typeof inventorySearchSchema>): {
    query: string;
    whereClause: string;
    params: any[];
  } {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Text search
    if (filters.query) {
      const searchIndex = this.searchIndexes.get('inventory');
      if (searchIndex?.searchable) {
        const searchColumns = searchIndex.columns.map(col => 
          `to_tsvector('english', ${col}) @@ plainto_tsquery('english', $${paramIndex})`
        ).join(' OR ');
        conditions.push(`(${searchColumns})`);
        params.push(filters.query);
        paramIndex++;
      } else {
        conditions.push(`name ILIKE $${paramIndex}`);
        params.push(`%${filters.query}%`);
        paramIndex++;
      }
    }

    // Tier filter
    if (filters.tier) {
      conditions.push(`tier = $${paramIndex}`);
      params.push(filters.tier);
      paramIndex++;
    }

    // Credit range
    if (filters.creditRange) {
      if (filters.creditRange.min !== undefined) {
        conditions.push(`credits >= $${paramIndex}`);
        params.push(filters.creditRange.min);
        paramIndex++;
      }
      if (filters.creditRange.max !== undefined) {
        conditions.push(`credits <= $${paramIndex}`);
        params.push(filters.creditRange.max);
        paramIndex++;
      }
    }

    // Date range
    if (filters.dateRange) {
      if (filters.dateRange.start) {
        conditions.push(`created_at >= $${paramIndex}`);
        params.push(filters.dateRange.start);
        paramIndex++;
      }
      if (filters.dateRange.end) {
        conditions.push(`created_at <= $${paramIndex}`);
        params.push(filters.dateRange.end);
        paramIndex++;
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `SELECT * FROM inventory ${whereClause}`;

    return { query, whereClause, params };
  }

  // Global search across multiple tables
  async globalSearch(
    query: string,
    tables: string[] = ['users', 'packs', 'inventory'],
    limit: number = 10
  ): Promise<{
    users: any[];
    packs: any[];
    inventory: any[];
    total: number;
  }> {
    const startTime = Date.now();
    const results: any = {
      users: [],
      packs: [],
      inventory: [],
      total: 0,
    };

    const searchPromises = [];

    if (tables.includes('users')) {
      searchPromises.push(
        this.searchUsers({ query, limit: Math.ceil(limit / 3) })
          .then(result => { results.users = result.data; })
      );
    }

    if (tables.includes('packs')) {
      searchPromises.push(
        this.searchPacks({ query, limit: Math.ceil(limit / 3) })
          .then(result => { results.packs = result.data; })
      );
    }

    if (tables.includes('inventory')) {
      searchPromises.push(
        this.searchInventory({ query, limit: Math.ceil(limit / 3) })
          .then(result => { results.inventory = result.data; })
      );
    }

    await Promise.all(searchPromises);

    results.total = results.users.length + results.packs.length + results.inventory.length;

    return results;
  }

  // Search suggestions/autocomplete
  async getSearchSuggestions(
    table: string,
    field: string,
    query: string,
    limit: number = 10
  ): Promise<string[]> {
    const searchIndex = this.searchIndexes.get(table);
    if (!searchIndex || !searchIndex.searchable) {
      return [];
    }

    const sql = `
      SELECT DISTINCT ${field}
      FROM ${table}
      WHERE ${field} ILIKE $1
      ORDER BY ${field}
      LIMIT $2
    `;

    const result = await this.pool.query(sql, [`%${query}%`, limit]);
    return result.rows.map(row => row[field]);
  }

  // Search analytics
  async getSearchAnalytics(timeRange: 'day' | 'week' | 'month' = 'day'): Promise<{
    totalSearches: number;
    popularQueries: Array<{ query: string; count: number }>;
    searchPerformance: {
      avgResponseTime: number;
      slowestQueries: Array<{ query: string; responseTime: number }>;
    };
  }> {
    // This would typically come from a search analytics table
    // For now, return mock data
    return {
      totalSearches: 0,
      popularQueries: [],
      searchPerformance: {
        avgResponseTime: 0,
        slowestQueries: [],
      },
    };
  }
}
