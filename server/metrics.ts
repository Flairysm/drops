import { db } from './db';
import { 
  auditLogs, 
  businessMetrics, 
  userMetrics, 
  packAnalytics, 
  gameAnalytics,
  transactions,
  users,
  userCards,
  userPacks
} from '../shared/schema';
import { eq, sql, desc, and, gte, lte, count, sum } from 'drizzle-orm';
import type { 
  InsertAuditLog, 
  InsertBusinessMetrics, 
  InsertUserMetrics, 
  InsertPackAnalytics, 
  InsertGameAnalytics 
} from '../shared/schema';

// ============================================================================
// METRICS SERVICE
// ============================================================================

export class MetricsService {
  
  // ============================================================================
  // AUDIT LOGGING
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
    try {
      const auditData: InsertAuditLog = {
        id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`,
        userId: data.userId,
        action: data.action,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        oldValues: data.oldValues,
        newValues: data.newValues,
        metadata: data.metadata,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      };

      await db.insert(auditLogs).values(auditData);
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }

  // ============================================================================
  // BUSINESS METRICS
  // ============================================================================

  async updateBusinessMetric(
    metricType: string, 
    metricDate: string, 
    value: number, 
    metadata?: any
  ): Promise<void> {
    try {
      const metricData: InsertBusinessMetrics = {
        id: `bm-${metricType}-${metricDate}-${Date.now()}`,
        metricType,
        metricDate,
        metricValue: value.toString(),
        metadata,
      };

      await db.insert(businessMetrics).values(metricData);
    } catch (error) {
      console.error('Failed to update business metric:', error);
    }
  }

  async getBusinessMetrics(
    metricType?: string, 
    startDate?: string, 
    endDate?: string
  ): Promise<any[]> {
    try {
      let query = db.select().from(businessMetrics);
      
      const conditions = [];
      if (metricType) conditions.push(eq(businessMetrics.metricType, metricType));
      if (startDate) conditions.push(gte(businessMetrics.metricDate, startDate));
      if (endDate) conditions.push(lte(businessMetrics.metricDate, endDate));
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      return await query.orderBy(desc(businessMetrics.metricDate));
    } catch (error) {
      console.error('Failed to get business metrics:', error);
      return [];
    }
  }

  // ============================================================================
  // USER METRICS
  // ============================================================================

  async updateUserMetric(
    userId: string, 
    metricType: string, 
    value: number
  ): Promise<void> {
    try {
      const metricData: InsertUserMetrics = {
        id: `um-${userId}-${metricType}-${Date.now()}`,
        userId,
        metricType,
        metricValue: value.toString(),
      };

      await db.insert(userMetrics).values(metricData);
    } catch (error) {
      console.error('Failed to update user metric:', error);
    }
  }

  async getUserMetrics(userId: string): Promise<any[]> {
    try {
      return await db
        .select()
        .from(userMetrics)
        .where(eq(userMetrics.userId, userId))
        .orderBy(desc(userMetrics.lastUpdated));
    } catch (error) {
      console.error('Failed to get user metrics:', error);
      return [];
    }
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
  // PACK ANALYTICS
  // ============================================================================

  async logPackEvent(data: {
    packType: string;
    packId?: string;
    action: string;
    userId?: string;
    creditsSpent?: number;
    cardsReceived?: any[];
  }): Promise<void> {
    try {
      const analyticsData: InsertPackAnalytics = {
        id: `pa-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`,
        packType: data.packType,
        packId: data.packId,
        action: data.action,
        userId: data.userId,
        creditsSpent: data.creditsSpent?.toString(),
        cardsReceived: data.cardsReceived,
      };

      await db.insert(packAnalytics).values(analyticsData);
    } catch (error) {
      console.error('Failed to log pack event:', error);
    }
  }

  async getPackAnalytics(
    packType?: string, 
    startDate?: string, 
    endDate?: string
  ): Promise<any[]> {
    try {
      let query = db.select().from(packAnalytics);
      
      const conditions = [];
      if (packType) conditions.push(eq(packAnalytics.packType, packType));
      if (startDate) conditions.push(gte(packAnalytics.createdAt, new Date(startDate)));
      if (endDate) conditions.push(lte(packAnalytics.createdAt, new Date(endDate)));
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      return await query.orderBy(desc(packAnalytics.createdAt));
    } catch (error) {
      console.error('Failed to get pack analytics:', error);
      return [];
    }
  }

  // ============================================================================
  // GAME ANALYTICS
  // ============================================================================

  async logGameEvent(data: {
    gameType: string;
    userId?: string;
    betAmount: number;
    winAmount?: number;
    cardsWon?: any[];
    sessionId?: string;
  }): Promise<void> {
    try {
      const analyticsData: InsertGameAnalytics = {
        id: `ga-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`,
        gameType: data.gameType,
        userId: data.userId,
        betAmount: data.betAmount.toString(),
        winAmount: (data.winAmount || 0).toString(),
        cardsWon: data.cardsWon,
        sessionId: data.sessionId,
      };

      await db.insert(gameAnalytics).values(analyticsData);
    } catch (error) {
      console.error('Failed to log game event:', error);
    }
  }

  async getGameAnalytics(
    gameType?: string, 
    startDate?: string, 
    endDate?: string
  ): Promise<any[]> {
    try {
      let query = db.select().from(gameAnalytics);
      
      const conditions = [];
      if (gameType) conditions.push(eq(gameAnalytics.gameType, gameType));
      if (startDate) conditions.push(gte(gameAnalytics.createdAt, new Date(startDate)));
      if (endDate) conditions.push(lte(gameAnalytics.createdAt, new Date(endDate)));
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      return await query.orderBy(desc(gameAnalytics.createdAt));
    } catch (error) {
      console.error('Failed to get game analytics:', error);
      return [];
    }
  }

  // ============================================================================
  // COMPREHENSIVE BUSINESS DASHBOARD
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

      // Pack Sales
      const packSalesResult = await db
        .select({
          packType: packAnalytics.packType,
          count: sql<number>`count(*)`,
          totalCredits: sql<number>`COALESCE(SUM(CAST(${packAnalytics.creditsSpent} AS DECIMAL)), 0)`
        })
        .from(packAnalytics)
        .where(
          and(
            eq(packAnalytics.action, 'opened'),
            gte(packAnalytics.createdAt, start),
            lte(packAnalytics.createdAt, end)
          )
        )
        .groupBy(packAnalytics.packType);

      // Game Activity
      const gameActivityResult = await db
        .select({
          gameType: gameAnalytics.gameType,
          count: sql<number>`count(*)`,
          totalBet: sql<number>`COALESCE(SUM(CAST(${gameAnalytics.betAmount} AS DECIMAL)), 0)`,
          totalWin: sql<number>`COALESCE(SUM(CAST(${gameAnalytics.winAmount} AS DECIMAL)), 0)`
        })
        .from(gameAnalytics)
        .where(
          and(
            gte(gameAnalytics.createdAt, start),
            lte(gameAnalytics.createdAt, end)
          )
        )
        .groupBy(gameAnalytics.gameType);

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
        packSales: packSalesResult.map(sale => ({
          packType: sale.packType,
          count: Number(sale.count),
          totalCredits: Number(sale.totalCredits)
        })),
        gameActivity: gameActivityResult.map(game => ({
          gameType: game.gameType,
          count: Number(game.count),
          totalBet: Number(game.totalBet),
          totalWin: Number(game.totalWin),
          netProfit: Number(game.totalBet) - Number(game.totalWin)
        })),
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
  // TRANSACTION HISTORY
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
