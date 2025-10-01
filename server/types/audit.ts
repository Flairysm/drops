// Audit logging types and utilities
export interface AuditLog {
  id: string;
  adminId: string;
  adminUsername: string;
  action: string;
  resource: string;
  resourceId: string;
  changes: Record<string, any>;
  metadata: {
    ipAddress: string;
    userAgent: string;
    timestamp: Date;
    sessionId?: string;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'success' | 'failure' | 'partial';
  errorMessage?: string;
}

export interface AuditLogEntry {
  id: string;
  adminId: string;
  action: string;
  resource: string;
  resourceId: string;
  changes: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'success' | 'failure' | 'partial';
  errorMessage?: string;
}

// Audit action types
export type AuditAction = 
  | 'user.create' | 'user.update' | 'user.delete' | 'user.ban' | 'user.unban'
  | 'pack.create' | 'pack.update' | 'pack.delete' | 'pack.activate' | 'pack.deactivate'
  | 'inventory.create' | 'inventory.update' | 'inventory.delete'
  | 'transaction.create' | 'transaction.update' | 'transaction.delete'
  | 'settings.update' | 'settings.reset'
  | 'system.backup' | 'system.restore' | 'system.maintenance'
  | 'auth.login' | 'auth.logout' | 'auth.failed_login'
  | 'bulk.operation' | 'export.data' | 'import.data';

// Audit severity levels
export const AUDIT_SEVERITY = {
  LOW: 'low' as const,
  MEDIUM: 'medium' as const,
  HIGH: 'high' as const,
  CRITICAL: 'critical' as const,
} as const;

// Audit status
export const AUDIT_STATUS = {
  SUCCESS: 'success' as const,
  FAILURE: 'failure' as const,
  PARTIAL: 'partial' as const,
} as const;

// Audit logger class
export class AuditLogger {
  private static instance: AuditLogger;
  private logs: AuditLog[] = [];

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  async log(
    adminId: string,
    adminUsername: string,
    action: AuditAction,
    resource: string,
    resourceId: string,
    changes: Record<string, any> = {},
    metadata: {
      ipAddress: string;
      userAgent: string;
      sessionId?: string;
    },
    severity: AuditLog['severity'] = 'medium',
    status: AuditLog['status'] = 'success',
    errorMessage?: string
  ): Promise<void> {
    const auditLog: AuditLog = {
      id: this.generateId(),
      adminId,
      adminUsername,
      action,
      resource,
      resourceId,
      changes,
      metadata: {
        ...metadata,
        timestamp: new Date(),
      },
      severity,
      status,
      errorMessage,
    };

    // Store in memory (in production, this would go to database)
    this.logs.push(auditLog);

    // Log to console for development
    console.log(`🔍 AUDIT: ${action} on ${resource}/${resourceId} by ${adminUsername}`, {
      severity,
      status,
      changes: Object.keys(changes).length > 0 ? changes : undefined,
      errorMessage,
    });

    // In production, you would also:
    // 1. Store in database
    // 2. Send to external logging service
    // 3. Alert on critical actions
  }

  async getLogs(
    filters?: {
      adminId?: string;
      action?: AuditAction;
      resource?: string;
      severity?: AuditLog['severity'];
      status?: AuditLog['status'];
      startDate?: Date;
      endDate?: Date;
    },
    limit: number = 100,
    offset: number = 0
  ): Promise<AuditLog[]> {
    let filteredLogs = this.logs;

    if (filters) {
      filteredLogs = this.logs.filter(log => {
        if (filters.adminId && log.adminId !== filters.adminId) return false;
        if (filters.action && log.action !== filters.action) return false;
        if (filters.resource && log.resource !== filters.resource) return false;
        if (filters.severity && log.severity !== filters.severity) return false;
        if (filters.status && log.status !== filters.status) return false;
        if (filters.startDate && log.metadata.timestamp < filters.startDate) return false;
        if (filters.endDate && log.metadata.timestamp > filters.endDate) return false;
        return true;
      });
    }

    return filteredLogs
      .sort((a, b) => b.metadata.timestamp.getTime() - a.metadata.timestamp.getTime())
      .slice(offset, offset + limit);
  }

  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Helper function to extract audit metadata from request
export function extractAuditMetadata(req: any): {
  ipAddress: string;
  userAgent: string;
  sessionId?: string;
} {
  return {
    ipAddress: req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown',
    userAgent: req.get('User-Agent') || 'unknown',
    sessionId: req.sessionID,
  };
}
