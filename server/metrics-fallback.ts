import { db } from './db';
import { 
  transactions,
  users,
  userCards,
  userPacks
} from '../shared/schema';
import { eq, sql, desc, and, gte, lte, count, sum } from 'drizzle-orm';

// ============================================================================
// SIMPLIFIED METRICS SERVICE (Fallback until new tables are created)
// ============================================================================

export class MetricsService {
  
  // ============================================================================
  // AUDIT LOGGING (Fallback - just log to console for now)
  // ============================================================================

  async logAuditEvent(data: {
    userId?: string;
    action: string;
    resourceType?: string;
    resourceId?: string;
    oldValues?: any;
    newValues?: any;
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    // For now, just log to console until audit_logs table is created
    console.log('🔍 Audit Event:', {
      action: data.action,
      userId: data.userId,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      timestamp: new Date().toISOString()
    });
  }

  // ============================================================================
  // BUSINESS METRICS (Fallback - just log to console for now)
  // ============================================================================

  async updateBusinessMetric(
    metricType: string, 
    metricDate: string, 
    value: number, 
    metadata?: any
  ): Promise<void> {
    // For now, just log to console until business_metrics table is created
    console.log('📊 Business Metric:', {
      metricType,
      metricDate,
      value,
      metadata
    });
  }

  async getBusinessMetrics(
    metricType?: string, 
    startDate?: string, 
    endDate?: string
  ): Promise<any[]> {
    // Return empty array until business_metrics table is created
    return [];
  }

  // ============================================================================
  // USER METRICS (Fallback - just log to console for now)
  // ============================================================================

  async updateUserMetric(
    userId: string, 
    metricType: string, 
    value: number
  ): Promise<void> {
    // For now, just log to console until user_metrics table is created
    console.log('👤 User Metric:', {
      userId,
      metricType,
      value
    });
  }

  async getUserMetrics(userId: string): Promise<any[]> {
    // Return empty array until user_metrics table is created
    return [];
  }

  async getUserSpendingSummary(userId: string): Promise<any> {
    try {
      const result = await db
        .select({
          totalSpent: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('purchase', 'raffle_entry', 'credit_reload') THEN CAST(${transactions.amount} AS DECIMAL) ELSE 0 END), 0)`,
          totalGamesSpent: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'game_play' THEN CAST(${transactions.amount} AS DECIMAL) ELSE 0 END), 0)`,
          totalRefunded: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'refund' THEN CAST(${transactions.amount} AS DECIMAL) ELSE 0 END), 0)`,
          purchaseCount: sql<number>`COUNT(CASE WHEN ${transactions.type} IN ('purchase', 'raffle_entry', 'credit_reload') THEN 1 END)`,
          gameCount: sql<number>`COUNT(CASE WHEN ${transactions.type} = 'game_play' THEN 1 END)`,
          refundCount: sql<number>`COUNT(CASE WHEN ${transactions.type} = 'refund' THEN 1 END)`,
        })
        .from(transactions)
        .where(eq(transactions.userId, userId));

      return result[0] || {
        totalSpent: 0,
        totalGamesSpent: 0,
        totalRefunded: 0,
        purchaseCount: 0,
        gameCount: 0,
        refundCount: 0,
      };
    } catch (error) {
      console.error('Failed to get user spending summary:', error);
      return {
        totalSpent: 0,
        totalGamesSpent: 0,
        totalRefunded: 0,
        purchaseCount: 0,
        gameCount: 0,
        refundCount: 0,
      };
    }
  }

  // ============================================================================
  // PACK ANALYTICS (Fallback - just log to console for now)
  // ============================================================================

  async logPackEvent(data: {
    packType: string;
    packId?: string;
    action: string;
    userId?: string;
    creditsSpent?: number;
    cardsReceived?: any[];
  }): Promise<void> {
    // For now, just log to console until pack_analytics table is created
    console.log('📦 Pack Event:', {
      packType: data.packType,
      packId: data.packId,
      action: data.action,
      userId: data.userId,
      creditsSpent: data.creditsSpent
    });
  }

  async getPackAnalytics(
    packType?: string, 
    startDate?: string, 
    endDate?: string
  ): Promise<any[]> {
    // Return empty array until pack_analytics table is created
    return [];
  }

  // ============================================================================
  // GAME ANALYTICS (Fallback - just log to console for now)
  // ============================================================================

  async logGameEvent(data: {
    gameType: string;
    userId?: string;
    betAmount: number;
    winAmount?: number;
    cardsWon?: any[];
    sessionId?: string;
  }): Promise<void> {
    // For now, just log to console until game_analytics table is created
    console.log('🎮 Game Event:', {
      gameType: data.gameType,
      userId: data.userId,
      betAmount: data.betAmount,
      winAmount: data.winAmount,
      sessionId: data.sessionId
    });
  }

  async getGameAnalytics(
    gameType?: string, 
    startDate?: string, 
    endDate?: string
  ): Promise<any[]> {
    // Return empty array until game_analytics table is created
    return [];
  }

  // ============================================================================
  // COMPREHENSIVE BUSINESS DASHBOARD (Using existing tables)
  // ============================================================================

  async getBusinessDashboard(startDate?: string, endDate?: string): Promise<any> {
    try {
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const end = endDate ? new Date(endDate) : new Date();

      // Total Revenue
      const revenueResult = await db
        .select({ 
          total: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('purchase', 'raffle_entry', 'credit_reload') THEN CAST(${transactions.amount} AS DECIMAL) ELSE 0 END), 0)` 
        })
        .from(transactions)
        .where(
          and(
            gte(transactions.createdAt, start),
            lte(transactions.createdAt, end)
          )
        );

      // Total Users
      const userCountResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(users);

      // Top Spenders
      const topSpendersResult = await db
        .select({
          userId: transactions.userId,
          totalSpent: sql<number>`COALESCE(SUM(CAST(${transactions.amount} AS DECIMAL)), 0)`,
          email: users.email,
          username: users.username
        })
        .from(transactions)
        .leftJoin(users, eq(transactions.userId, users.id))
        .where(
          and(
            sql`${transactions.type} IN ('purchase', 'raffle_entry', 'credit_reload')`,
            gte(transactions.createdAt, start),
            lte(transactions.createdAt, end)
          )
        )
        .groupBy(transactions.userId, users.email, users.username)
        .orderBy(sql`COALESCE(SUM(CAST(${transactions.amount} AS DECIMAL)), 0) DESC`)
        .limit(10);

      return {
        period: { start, end },
        totalRevenue: Number(revenueResult[0]?.total || 0),
        totalUsers: Number(userCountResult[0]?.count || 0),
        packSales: [], // Will be populated when pack_analytics table exists
        gameActivity: [], // Will be populated when game_analytics table exists
        topSpenders: topSpendersResult.map(spender => ({
          userId: spender.userId,
          totalSpent: Number(spender.totalSpent),
          email: spender.email || 'Unknown',
          username: spender.username || 'Unknown'
        }))
      };
    } catch (error) {
      console.error('Failed to get business dashboard:', error);
      return {
        period: { start: new Date(), end: new Date() },
        totalRevenue: 0,
        totalUsers: 0,
        packSales: [],
        gameActivity: [],
        topSpenders: []
      };
    }
  }

  // ============================================================================
  // TRANSACTION HISTORY (Using existing transactions table)
  // ============================================================================

  async getTransactionHistory(
    userId?: string,
    startDate?: string,
    endDate?: string,
    limit: number = 100
  ): Promise<any[]> {
    try {
      let query = db
        .select({
          id: transactions.id,
          userId: transactions.userId,
          email: users.email,
          username: users.username,
          type: transactions.type,
          amount: transactions.amount,
          description: transactions.description,
          packId: transactions.packId,
          packType: transactions.packType,
          metadata: transactions.metadata,
          ipAddress: transactions.ipAddress,
          userAgent: transactions.userAgent,
          sessionId: transactions.sessionId,
          createdAt: transactions.createdAt,
        })
        .from(transactions)
        .leftJoin(users, eq(transactions.userId, users.id));

      const conditions = [];
      if (userId) conditions.push(eq(transactions.userId, userId));
      if (startDate) conditions.push(gte(transactions.createdAt, new Date(startDate)));
      if (endDate) conditions.push(lte(transactions.createdAt, new Date(endDate)));

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      return await query
        .orderBy(desc(transactions.createdAt))
        .limit(limit);
    } catch (error) {
      console.error('Failed to get transaction history:', error);
      return [];
    }
  }
}

// Export singleton instance
export const metricsService = new MetricsService();
