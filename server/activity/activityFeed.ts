import { EventEmitter } from 'events';
import { z } from 'zod';

export interface ActivityEvent {
  id: string;
  timestamp: Date;
  adminId: string;
  adminUsername: string;
  action: string;
  resource: string;
  resourceId: string;
  details: {
    description: string;
    changes?: Record<string, any>;
    metadata?: Record<string, any>;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'user' | 'pack' | 'inventory' | 'system' | 'security' | 'data';
  ipAddress: string;
  userAgent: string;
}

export interface ActivityFilter {
  adminId?: string;
  action?: string;
  resource?: string;
  category?: ActivityEvent['category'];
  severity?: ActivityEvent['severity'];
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface ActivityStats {
  totalActivities: number;
  activitiesByCategory: Record<ActivityEvent['category'], number>;
  activitiesBySeverity: Record<ActivityEvent['severity'], number>;
  topAdmins: Array<{ adminId: string; adminUsername: string; count: number }>;
  recentActivities: ActivityEvent[];
  activityTrends: Array<{ date: string; count: number }>;
}

// Activity event schemas
const activityEventSchema = z.object({
  adminId: z.string().uuid(),
  adminUsername: z.string().min(1),
  action: z.string().min(1),
  resource: z.string().min(1),
  resourceId: z.string().min(1),
  details: z.object({
    description: z.string().min(1),
    changes: z.record(z.any()).optional(),
    metadata: z.record(z.any()).optional(),
  }),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  category: z.enum(['user', 'pack', 'inventory', 'system', 'security', 'data']),
  ipAddress: z.string().ip(),
  userAgent: z.string().min(1),
});

export class ActivityFeedService extends EventEmitter {
  private static instance: ActivityFeedService;
  private activities: ActivityEvent[] = [];
  private maxActivities = 10000;
  private subscribers: Map<string, (activity: ActivityEvent) => void> = new Map();

  private constructor() {
    super();
  }

  static getInstance(): ActivityFeedService {
    if (!ActivityFeedService.instance) {
      ActivityFeedService.instance = new ActivityFeedService();
    }
    return ActivityFeedService.instance;
  }

  async logActivity(activityData: z.infer<typeof activityEventSchema>): Promise<string> {
    const validatedData = activityEventSchema.parse(activityData);
    
    const activity: ActivityEvent = {
      id: this.generateActivityId(),
      timestamp: new Date(),
      ...validatedData,
    };

    // Store activity
    this.activities.push(activity);
    if (this.activities.length > this.maxActivities) {
      this.activities.shift();
    }

    // Emit to subscribers
    this.emit('activity', activity);
    
    // Notify real-time subscribers
    this.notifySubscribers(activity);

    // Log to console for development
    console.log(`📝 Activity: ${activity.action} on ${activity.resource}/${activity.resourceId} by ${activity.adminUsername}`, {
      severity: activity.severity,
      category: activity.category,
      description: activity.details.description,
    });

    return activity.id;
  }

  async getActivities(filter: ActivityFilter = {}): Promise<{
    activities: ActivityEvent[];
    total: number;
    hasMore: boolean;
  }> {
    let filteredActivities = this.activities;

    // Apply filters
    if (filter.adminId) {
      filteredActivities = filteredActivities.filter(a => a.adminId === filter.adminId);
    }
    
    if (filter.action) {
      filteredActivities = filteredActivities.filter(a => a.action === filter.action);
    }
    
    if (filter.resource) {
      filteredActivities = filteredActivities.filter(a => a.resource === filter.resource);
    }
    
    if (filter.category) {
      filteredActivities = filteredActivities.filter(a => a.category === filter.category);
    }
    
    if (filter.severity) {
      filteredActivities = filteredActivities.filter(a => a.severity === filter.severity);
    }
    
    if (filter.startDate) {
      filteredActivities = filteredActivities.filter(a => a.timestamp >= filter.startDate!);
    }
    
    if (filter.endDate) {
      filteredActivities = filteredActivities.filter(a => a.timestamp <= filter.endDate!);
    }

    // Sort by timestamp (newest first)
    filteredActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const total = filteredActivities.length;
    const limit = filter.limit || 50;
    const offset = filter.offset || 0;
    
    const paginatedActivities = filteredActivities.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return {
      activities: paginatedActivities,
      total,
      hasMore,
    };
  }

  async getActivityStats(timeRange: 'day' | 'week' | 'month' = 'day'): Promise<ActivityStats> {
    const now = new Date();
    const timeRangeMs = this.getTimeRangeMs(timeRange);
    const startDate = new Date(now.getTime() - timeRangeMs);
    
    const recentActivities = this.activities.filter(a => a.timestamp >= startDate);
    
    // Calculate stats
    const activitiesByCategory: Record<ActivityEvent['category'], number> = {
      user: 0,
      pack: 0,
      inventory: 0,
      system: 0,
      security: 0,
      data: 0,
    };

    const activitiesBySeverity: Record<ActivityEvent['severity'], number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    const adminCounts = new Map<string, { adminId: string; adminUsername: string; count: number }>();

    for (const activity of recentActivities) {
      activitiesByCategory[activity.category]++;
      activitiesBySeverity[activity.severity]++;
      
      const adminKey = activity.adminId;
      if (adminCounts.has(adminKey)) {
        adminCounts.get(adminKey)!.count++;
      } else {
        adminCounts.set(adminKey, {
          adminId: activity.adminId,
          adminUsername: activity.adminUsername,
          count: 1,
        });
      }
    }

    const topAdmins = Array.from(adminCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate activity trends
    const activityTrends = this.calculateActivityTrends(recentActivities, timeRange);

    return {
      totalActivities: recentActivities.length,
      activitiesByCategory,
      activitiesBySeverity,
      topAdmins,
      recentActivities: recentActivities.slice(0, 10),
      activityTrends,
    };
  }

  async getActivityById(activityId: string): Promise<ActivityEvent | null> {
    return this.activities.find(a => a.id === activityId) || null;
  }

  async getActivitiesByAdmin(adminId: string, limit: number = 50): Promise<ActivityEvent[]> {
    return this.activities
      .filter(a => a.adminId === adminId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async getActivitiesByResource(resource: string, resourceId: string, limit: number = 50): Promise<ActivityEvent[]> {
    return this.activities
      .filter(a => a.resource === resource && a.resourceId === resourceId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // Real-time activity feed
  subscribeToActivities(callback: (activity: ActivityEvent) => void): string {
    const subscriptionId = this.generateSubscriptionId();
    this.subscribers.set(subscriptionId, callback);
    return subscriptionId;
  }

  unsubscribeFromActivities(subscriptionId: string): void {
    this.subscribers.delete(subscriptionId);
  }

  private notifySubscribers(activity: ActivityEvent): void {
    for (const callback of this.subscribers.values()) {
      try {
        callback(activity);
      } catch (error) {
        console.error('Error notifying activity subscriber:', error);
      }
    }
  }

  private calculateActivityTrends(activities: ActivityEvent[], timeRange: 'day' | 'week' | 'month'): Array<{ date: string; count: number }> {
    const now = new Date();
    const timeRangeMs = this.getTimeRangeMs(timeRange);
    const startDate = new Date(now.getTime() - timeRangeMs);
    
    const intervals = this.getTimeIntervals(timeRange);
    const trends: Array<{ date: string; count: number }> = [];
    
    for (let i = 0; i < intervals; i++) {
      const intervalStart = new Date(startDate.getTime() + (i * timeRangeMs / intervals));
      const intervalEnd = new Date(startDate.getTime() + ((i + 1) * timeRangeMs / intervals));
      
      const count = activities.filter(a => 
        a.timestamp >= intervalStart && a.timestamp < intervalEnd
      ).length;
      
      trends.push({
        date: intervalStart.toISOString().split('T')[0],
        count,
      });
    }
    
    return trends;
  }

  private getTimeRangeMs(timeRange: 'day' | 'week' | 'month'): number {
    switch (timeRange) {
      case 'day': return 24 * 60 * 60 * 1000;
      case 'week': return 7 * 24 * 60 * 60 * 1000;
      case 'month': return 30 * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  }

  private getTimeIntervals(timeRange: 'day' | 'week' | 'month'): number {
    switch (timeRange) {
      case 'day': return 24; // Hourly intervals
      case 'week': return 7; // Daily intervals
      case 'month': return 30; // Daily intervals
      default: return 24;
    }
  }

  private generateActivityId(): string {
    return `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Activity event creators for common actions
  static createUserActivity(
    adminId: string,
    adminUsername: string,
    action: string,
    userId: string,
    description: string,
    changes?: Record<string, any>,
    severity: ActivityEvent['severity'] = 'medium',
    ipAddress: string = 'unknown',
    userAgent: string = 'unknown'
  ): z.infer<typeof activityEventSchema> {
    return {
      adminId,
      adminUsername,
      action,
      resource: 'users',
      resourceId: userId,
      details: { description, changes },
      severity,
      category: 'user',
      ipAddress,
      userAgent,
    };
  }

  static createPackActivity(
    adminId: string,
    adminUsername: string,
    action: string,
    packId: string,
    description: string,
    changes?: Record<string, any>,
    severity: ActivityEvent['severity'] = 'medium',
    ipAddress: string = 'unknown',
    userAgent: string = 'unknown'
  ): z.infer<typeof activityEventSchema> {
    return {
      adminId,
      adminUsername,
      action,
      resource: 'packs',
      resourceId: packId,
      details: { description, changes },
      severity,
      category: 'pack',
      ipAddress,
      userAgent,
    };
  }

  static createInventoryActivity(
    adminId: string,
    adminUsername: string,
    action: string,
    cardId: string,
    description: string,
    changes?: Record<string, any>,
    severity: ActivityEvent['severity'] = 'medium',
    ipAddress: string = 'unknown',
    userAgent: string = 'unknown'
  ): z.infer<typeof activityEventSchema> {
    return {
      adminId,
      adminUsername,
      action,
      resource: 'inventory',
      resourceId: cardId,
      details: { description, changes },
      severity,
      category: 'inventory',
      ipAddress,
      userAgent,
    };
  }

  static createSystemActivity(
    adminId: string,
    adminUsername: string,
    action: string,
    resourceId: string,
    description: string,
    changes?: Record<string, any>,
    severity: ActivityEvent['severity'] = 'high',
    ipAddress: string = 'unknown',
    userAgent: string = 'unknown'
  ): z.infer<typeof activityEventSchema> {
    return {
      adminId,
      adminUsername,
      action,
      resource: 'system',
      resourceId,
      details: { description, changes },
      severity,
      category: 'system',
      ipAddress,
      userAgent,
    };
  }

  static createSecurityActivity(
    adminId: string,
    adminUsername: string,
    action: string,
    resourceId: string,
    description: string,
    changes?: Record<string, any>,
    severity: ActivityEvent['severity'] = 'high',
    ipAddress: string = 'unknown',
    userAgent: string = 'unknown'
  ): z.infer<typeof activityEventSchema> {
    return {
      adminId,
      adminUsername,
      action,
      resource: 'security',
      resourceId,
      details: { description, changes },
      severity,
      category: 'security',
      ipAddress,
      userAgent,
    };
  }

  static createDataActivity(
    adminId: string,
    adminUsername: string,
    action: string,
    resourceId: string,
    description: string,
    changes?: Record<string, any>,
    severity: ActivityEvent['severity'] = 'medium',
    ipAddress: string = 'unknown',
    userAgent: string = 'unknown'
  ): z.infer<typeof activityEventSchema> {
    return {
      adminId,
      adminUsername,
      action,
      resource: 'data',
      resourceId,
      details: { description, changes },
      severity,
      category: 'data',
      ipAddress,
      userAgent,
    };
  }
}
