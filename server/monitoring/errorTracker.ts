import { EventEmitter } from 'events';

export interface ErrorEvent {
  id: string;
  timestamp: Date;
  level: 'low' | 'medium' | 'high' | 'critical';
  category: 'database' | 'api' | 'auth' | 'validation' | 'system' | 'business';
  message: string;
  stack?: string;
  context: {
    userId?: string;
    adminId?: string;
    endpoint?: string;
    method?: string;
    ip?: string;
    userAgent?: string;
    requestId?: string;
    [key: string]: any;
  };
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: {
    category?: string;
    level?: string;
    messagePattern?: RegExp;
    countThreshold?: number;
    timeWindow?: number; // in minutes
  };
  actions: {
    email?: string[];
    webhook?: string;
    log?: boolean;
    dashboard?: boolean;
  };
  enabled: boolean;
  lastTriggered?: Date;
}

export class ErrorTracker extends EventEmitter {
  private static instance: ErrorTracker;
  private errors: ErrorEvent[] = [];
  private alertRules: AlertRule[] = [];
  private maxErrorsHistory = 10000;
  private maxAlertsHistory = 1000;

  private constructor() {
    super();
    this.initializeDefaultRules();
  }

  static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  private initializeDefaultRules(): void {
    this.alertRules = [
      {
        id: 'critical-errors',
        name: 'Critical Errors',
        description: 'Alert on any critical errors',
        condition: {
          level: 'critical',
        },
        actions: {
          email: ['admin@yourdomain.com'],
          log: true,
          dashboard: true,
        },
        enabled: true,
      },
      {
        id: 'database-errors',
        name: 'Database Errors',
        description: 'Alert on database connection issues',
        condition: {
          category: 'database',
          level: 'high',
        },
        actions: {
          email: ['admin@yourdomain.com'],
          log: true,
          dashboard: true,
        },
        enabled: true,
      },
      {
        id: 'auth-failures',
        name: 'Authentication Failures',
        description: 'Alert on multiple auth failures',
        condition: {
          category: 'auth',
          countThreshold: 10,
          timeWindow: 5,
        },
        actions: {
          email: ['security@yourdomain.com'],
          log: true,
          dashboard: true,
        },
        enabled: true,
      },
      {
        id: 'api-errors',
        name: 'API Error Rate',
        description: 'Alert on high API error rate',
        condition: {
          category: 'api',
          countThreshold: 50,
          timeWindow: 10,
        },
        actions: {
          log: true,
          dashboard: true,
        },
        enabled: true,
      },
    ];
  }

  async trackError(
    error: Error | string,
    context: ErrorEvent['context'] = {},
    level: ErrorEvent['level'] = 'medium',
    category: ErrorEvent['category'] = 'system'
  ): Promise<string> {
    const errorId = this.generateErrorId();
    const message = error instanceof Error ? error.message : error;
    const stack = error instanceof Error ? error.stack : undefined;

    const errorEvent: ErrorEvent = {
      id: errorId,
      timestamp: new Date(),
      level,
      category,
      message,
      stack,
      context,
      resolved: false,
    };

    // Store error
    this.errors.push(errorEvent);
    if (this.errors.length > this.maxErrorsHistory) {
      this.errors.shift();
    }

    // Log error
    console.error(`🚨 Error tracked [${level.toUpperCase()}] [${category}]:`, {
      id: errorId,
      message,
      context,
      stack: stack?.split('\n').slice(0, 5).join('\n'), // First 5 lines of stack
    });

    // Check alert rules
    await this.checkAlertRules(errorEvent);

    // Emit error event
    this.emit('error', errorEvent);

    return errorId;
  }

  private async checkAlertRules(errorEvent: ErrorEvent): Promise<void> {
    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;

      const shouldTrigger = this.evaluateRule(rule, errorEvent);
      if (shouldTrigger) {
        await this.triggerAlert(rule, errorEvent);
      }
    }
  }

  private evaluateRule(rule: AlertRule, errorEvent: ErrorEvent): boolean {
    const { condition } = rule;

    // Check category
    if (condition.category && errorEvent.category !== condition.category) {
      return false;
    }

    // Check level
    if (condition.level && errorEvent.level !== condition.level) {
      return false;
    }

    // Check message pattern
    if (condition.messagePattern && !condition.messagePattern.test(errorEvent.message)) {
      return false;
    }

    // Check count threshold
    if (condition.countThreshold && condition.timeWindow) {
      const timeWindow = condition.timeWindow * 60 * 1000; // Convert to milliseconds
      const cutoffTime = new Date(Date.now() - timeWindow);
      
      const recentErrors = this.errors.filter(error => 
        error.timestamp >= cutoffTime &&
        this.matchesCondition(error, condition)
      );

      if (recentErrors.length < condition.countThreshold) {
        return false;
      }
    }

    return true;
  }

  private matchesCondition(error: ErrorEvent, condition: AlertRule['condition']): boolean {
    if (condition.category && error.category !== condition.category) return false;
    if (condition.level && error.level !== condition.level) return false;
    if (condition.messagePattern && !condition.messagePattern.test(error.message)) return false;
    return true;
  }

  private async triggerAlert(rule: AlertRule, errorEvent: ErrorEvent): Promise<void> {
    rule.lastTriggered = new Date();

    console.log(`🚨 Alert triggered: ${rule.name}`, {
      ruleId: rule.id,
      errorId: errorEvent.id,
      errorMessage: errorEvent.message,
      errorCategory: errorEvent.category,
      errorLevel: errorEvent.level,
    });

    // Execute alert actions
    if (rule.actions.email) {
      await this.sendEmailAlert(rule, errorEvent);
    }

    if (rule.actions.webhook) {
      await this.sendWebhookAlert(rule, errorEvent);
    }

    if (rule.actions.log) {
      console.log(`📧 Alert logged: ${rule.name}`, errorEvent);
    }

    if (rule.actions.dashboard) {
      this.emit('alert', {
        rule,
        error: errorEvent,
        timestamp: new Date(),
      });
    }
  }

  private async sendEmailAlert(rule: AlertRule, errorEvent: ErrorEvent): Promise<void> {
    // In production, you would integrate with an email service
    console.log(`📧 Email alert would be sent to: ${rule.actions.email?.join(', ')}`, {
      subject: `Alert: ${rule.name}`,
      body: this.formatEmailAlert(rule, errorEvent),
    });
  }

  private async sendWebhookAlert(rule: AlertRule, errorEvent: ErrorEvent): Promise<void> {
    // In production, you would send to the webhook URL
    console.log(`🔗 Webhook alert would be sent to: ${rule.actions.webhook}`, {
      rule,
      error: errorEvent,
    });
  }

  private formatEmailAlert(rule: AlertRule, errorEvent: ErrorEvent): string {
    return `
Alert: ${rule.name}

Description: ${rule.description}

Error Details:
- ID: ${errorEvent.id}
- Time: ${errorEvent.timestamp.toISOString()}
- Level: ${errorEvent.level.toUpperCase()}
- Category: ${errorEvent.category}
- Message: ${errorEvent.message}

Context:
${JSON.stringify(errorEvent.context, null, 2)}

Stack Trace:
${errorEvent.stack || 'No stack trace available'}

---
This alert was triggered by rule: ${rule.id}
    `.trim();
  }

  getErrors(filters?: {
    level?: ErrorEvent['level'];
    category?: ErrorEvent['category'];
    resolved?: boolean;
    startDate?: Date;
    endDate?: Date;
  }, limit: number = 100, offset: number = 0): ErrorEvent[] {
    let filteredErrors = this.errors;

    if (filters) {
      filteredErrors = this.errors.filter(error => {
        if (filters.level && error.level !== filters.level) return false;
        if (filters.category && error.category !== filters.category) return false;
        if (filters.resolved !== undefined && error.resolved !== filters.resolved) return false;
        if (filters.startDate && error.timestamp < filters.startDate) return false;
        if (filters.endDate && error.timestamp > filters.endDate) return false;
        return true;
      });
    }

    return filteredErrors
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(offset, offset + limit);
  }

  getErrorStats(): {
    total: number;
    byLevel: Record<ErrorEvent['level'], number>;
    byCategory: Record<ErrorEvent['category'], number>;
    resolved: number;
    unresolved: number;
    last24Hours: number;
  } {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const byLevel: Record<ErrorEvent['level'], number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    const byCategory: Record<ErrorEvent['category'], number> = {
      database: 0,
      api: 0,
      auth: 0,
      validation: 0,
      system: 0,
      business: 0,
    };

    let resolved = 0;
    let unresolved = 0;
    let last24HoursCount = 0;

    for (const error of this.errors) {
      byLevel[error.level]++;
      byCategory[error.category]++;

      if (error.resolved) {
        resolved++;
      } else {
        unresolved++;
      }

      if (error.timestamp >= last24Hours) {
        last24HoursCount++;
      }
    }

    return {
      total: this.errors.length,
      byLevel,
      byCategory,
      resolved,
      unresolved,
      last24Hours: last24HoursCount,
    };
  }

  resolveError(errorId: string, resolvedBy: string): boolean {
    const error = this.errors.find(e => e.id === errorId);
    if (error && !error.resolved) {
      error.resolved = true;
      error.resolvedAt = new Date();
      error.resolvedBy = resolvedBy;
      
      this.emit('errorResolved', error);
      return true;
    }
    return false;
  }

  addAlertRule(rule: Omit<AlertRule, 'id'>): string {
    const ruleId = this.generateRuleId();
    const newRule: AlertRule = {
      ...rule,
      id: ruleId,
    };

    this.alertRules.push(newRule);
    this.emit('ruleAdded', newRule);
    
    return ruleId;
  }

  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const ruleIndex = this.alertRules.findIndex(r => r.id === ruleId);
    if (ruleIndex !== -1) {
      this.alertRules[ruleIndex] = { ...this.alertRules[ruleIndex], ...updates };
      this.emit('ruleUpdated', this.alertRules[ruleIndex]);
      return true;
    }
    return false;
  }

  deleteAlertRule(ruleId: string): boolean {
    const ruleIndex = this.alertRules.findIndex(r => r.id === ruleId);
    if (ruleIndex !== -1) {
      const rule = this.alertRules[ruleIndex];
      this.alertRules.splice(ruleIndex, 1);
      this.emit('ruleDeleted', rule);
      return true;
    }
    return false;
  }

  getAlertRules(): AlertRule[] {
    return [...this.alertRules];
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Utility methods for common error tracking
  trackDatabaseError(error: Error, context: ErrorEvent['context'] = {}): Promise<string> {
    return this.trackError(error, context, 'high', 'database');
  }

  trackAPIError(error: Error, context: ErrorEvent['context'] = {}): Promise<string> {
    return this.trackError(error, context, 'medium', 'api');
  }

  trackAuthError(error: Error, context: ErrorEvent['context'] = {}): Promise<string> {
    return this.trackError(error, context, 'high', 'auth');
  }

  trackValidationError(error: Error, context: ErrorEvent['context'] = {}): Promise<string> {
    return this.trackError(error, context, 'low', 'validation');
  }

  trackSystemError(error: Error, context: ErrorEvent['context'] = {}): Promise<string> {
    return this.trackError(error, context, 'critical', 'system');
  }

  trackBusinessError(error: Error, context: ErrorEvent['context'] = {}): Promise<string> {
    return this.trackError(error, context, 'medium', 'business');
  }
}
