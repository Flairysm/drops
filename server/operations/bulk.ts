import { Request, Response } from 'express';
import { z } from 'zod';
import { TransactionManager } from '../database/transactions';
import { AuditLogger } from '../types/audit';
import { ErrorTracker } from '../monitoring/errorTracker';

export interface BulkOperationResult {
  success: boolean;
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  errors: Array<{
    item: any;
    error: string;
  }>;
  duration: number;
  operationId: string;
}

export interface BulkOperationOptions {
  batchSize?: number;
  continueOnError?: boolean;
  validateItems?: boolean;
  transactionTimeout?: number;
}

// Bulk operation schemas
const bulkUserUpdateSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(1000),
  updates: z.object({
    credits: z.number().min(0).optional(),
    isBanned: z.boolean().optional(),
    isSuspended: z.boolean().optional(),
    role: z.enum(['user', 'admin']).optional(),
  }),
});

const bulkCardDeleteSchema = z.object({
  cardIds: z.array(z.string().uuid()).min(1).max(500),
});

const bulkPackUpdateSchema = z.object({
  packIds: z.array(z.string().uuid()).min(1).max(100),
  updates: z.object({
    isActive: z.boolean().optional(),
    price: z.number().positive().optional(),
    totalPacks: z.number().min(0).optional(),
  }),
});

const bulkInventoryUpdateSchema = z.object({
  cardIds: z.array(z.string().uuid()).min(1).max(500),
  updates: z.object({
    credits: z.number().min(0).optional(),
    tier: z.enum(['D', 'C', 'B', 'A', 'S', 'SS', 'SSS']).optional(),
  }),
});

export class BulkOperationsService {
  private static instance: BulkOperationsService;
  private transactionManager: TransactionManager;
  private auditLogger: AuditLogger;
  private errorTracker: ErrorTracker;

  private constructor(
    transactionManager: TransactionManager,
    auditLogger: AuditLogger,
    errorTracker: ErrorTracker
  ) {
    this.transactionManager = transactionManager;
    this.auditLogger = auditLogger;
    this.errorTracker = errorTracker;
  }

  static getInstance(
    transactionManager: TransactionManager,
    auditLogger: AuditLogger,
    errorTracker: ErrorTracker
  ): BulkOperationsService {
    if (!BulkOperationsService.instance) {
      BulkOperationsService.instance = new BulkOperationsService(
        transactionManager,
        auditLogger,
        errorTracker
      );
    }
    return BulkOperationsService.instance;
  }

  async bulkUpdateUsers(
    data: z.infer<typeof bulkUserUpdateSchema>,
    adminId: string,
    adminUsername: string,
    options: BulkOperationOptions = {}
  ): Promise<BulkOperationResult> {
    const operationId = this.generateOperationId();
    const startTime = Date.now();
    
    try {
      // Validate input
      const validatedData = bulkUserUpdateSchema.parse(data);
      
      const result = await this.transactionManager.withTransaction(
        async (transactionId) => {
          return await this.processBulkUpdate(
            transactionId,
            'users',
            validatedData.userIds,
            validatedData.updates,
            options,
            (itemId, updates) => this.updateUser(transactionId, itemId, updates)
          );
        },
        { timeout: options.transactionTimeout || 30000 }
      );

      // Audit log
      await this.auditLogger.log(
        adminId,
        adminUsername,
        'bulk.operation',
        'users',
        operationId,
        {
          operation: 'bulkUpdateUsers',
          totalItems: validatedData.userIds.length,
          successfulItems: result.successfulItems,
          failedItems: result.failedItems,
        },
        { ipAddress: 'unknown', userAgent: 'unknown' },
        result.failedItems > 0 ? 'partial' : 'success'
      );

      return {
        ...result,
        operationId,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      await this.errorTracker.trackBusinessError(
        error instanceof Error ? error : new Error('Bulk user update failed'),
        { operationId, adminId, data }
      );
      
      throw error;
    }
  }

  async bulkDeleteCards(
    data: z.infer<typeof bulkCardDeleteSchema>,
    adminId: string,
    adminUsername: string,
    options: BulkOperationOptions = {}
  ): Promise<BulkOperationResult> {
    const operationId = this.generateOperationId();
    const startTime = Date.now();
    
    try {
      const validatedData = bulkCardDeleteSchema.parse(data);
      
      const result = await this.transactionManager.withTransaction(
        async (transactionId) => {
          return await this.processBulkDelete(
            transactionId,
            'inventory',
            validatedData.cardIds,
            options,
            (itemId) => this.deleteCard(transactionId, itemId)
          );
        },
        { timeout: options.transactionTimeout || 30000 }
      );

      // Audit log
      await this.auditLogger.log(
        adminId,
        adminUsername,
        'bulk.operation',
        'inventory',
        operationId,
        {
          operation: 'bulkDeleteCards',
          totalItems: validatedData.cardIds.length,
          successfulItems: result.successfulItems,
          failedItems: result.failedItems,
        },
        { ipAddress: 'unknown', userAgent: 'unknown' },
        result.failedItems > 0 ? 'partial' : 'success'
      );

      return {
        ...result,
        operationId,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      await this.errorTracker.trackBusinessError(
        error instanceof Error ? error : new Error('Bulk card delete failed'),
        { operationId, adminId, data }
      );
      
      throw error;
    }
  }

  async bulkUpdatePacks(
    data: z.infer<typeof bulkPackUpdateSchema>,
    adminId: string,
    adminUsername: string,
    options: BulkOperationOptions = {}
  ): Promise<BulkOperationResult> {
    const operationId = this.generateOperationId();
    const startTime = Date.now();
    
    try {
      const validatedData = bulkPackUpdateSchema.parse(data);
      
      const result = await this.transactionManager.withTransaction(
        async (transactionId) => {
          return await this.processBulkUpdate(
            transactionId,
            'packs',
            validatedData.packIds,
            validatedData.updates,
            options,
            (itemId, updates) => this.updatePack(transactionId, itemId, updates)
          );
        },
        { timeout: options.transactionTimeout || 30000 }
      );

      // Audit log
      await this.auditLogger.log(
        adminId,
        adminUsername,
        'bulk.operation',
        'packs',
        operationId,
        {
          operation: 'bulkUpdatePacks',
          totalItems: validatedData.packIds.length,
          successfulItems: result.successfulItems,
          failedItems: result.failedItems,
        },
        { ipAddress: 'unknown', userAgent: 'unknown' },
        result.failedItems > 0 ? 'partial' : 'success'
      );

      return {
        ...result,
        operationId,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      await this.errorTracker.trackBusinessError(
        error instanceof Error ? error : new Error('Bulk pack update failed'),
        { operationId, adminId, data }
      );
      
      throw error;
    }
  }

  async bulkUpdateInventory(
    data: z.infer<typeof bulkInventoryUpdateSchema>,
    adminId: string,
    adminUsername: string,
    options: BulkOperationOptions = {}
  ): Promise<BulkOperationResult> {
    const operationId = this.generateOperationId();
    const startTime = Date.now();
    
    try {
      const validatedData = bulkInventoryUpdateSchema.parse(data);
      
      const result = await this.transactionManager.withTransaction(
        async (transactionId) => {
          return await this.processBulkUpdate(
            transactionId,
            'inventory',
            validatedData.cardIds,
            validatedData.updates,
            options,
            (itemId, updates) => this.updateInventoryCard(transactionId, itemId, updates)
          );
        },
        { timeout: options.transactionTimeout || 30000 }
      );

      // Audit log
      await this.auditLogger.log(
        adminId,
        adminUsername,
        'bulk.operation',
        'inventory',
        operationId,
        {
          operation: 'bulkUpdateInventory',
          totalItems: validatedData.cardIds.length,
          successfulItems: result.successfulItems,
          failedItems: result.failedItems,
        },
        { ipAddress: 'unknown', userAgent: 'unknown' },
        result.failedItems > 0 ? 'partial' : 'success'
      );

      return {
        ...result,
        operationId,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      await this.errorTracker.trackBusinessError(
        error instanceof Error ? error : new Error('Bulk inventory update failed'),
        { operationId, adminId, data }
      );
      
      throw error;
    }
  }

  private async processBulkUpdate<T>(
    transactionId: string,
    resource: string,
    itemIds: string[],
    updates: Record<string, any>,
    options: BulkOperationOptions,
    updateFunction: (itemId: string, updates: Record<string, any>) => Promise<void>
  ): Promise<Omit<BulkOperationResult, 'operationId' | 'duration'>> {
    const batchSize = options.batchSize || 50;
    const continueOnError = options.continueOnError !== false;
    
    let processedItems = 0;
    let successfulItems = 0;
    let failedItems = 0;
    const errors: BulkOperationResult['errors'] = [];

    // Process in batches
    for (let i = 0; i < itemIds.length; i += batchSize) {
      const batch = itemIds.slice(i, i + batchSize);
      
      for (const itemId of batch) {
        try {
          await updateFunction(itemId, updates);
          successfulItems++;
        } catch (error) {
          failedItems++;
          errors.push({
            item: { id: itemId },
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          
          if (!continueOnError) {
            throw error;
          }
        }
        
        processedItems++;
      }
    }

    return {
      success: failedItems === 0,
      totalItems: itemIds.length,
      processedItems,
      successfulItems,
      failedItems,
      errors,
    };
  }

  private async processBulkDelete<T>(
    transactionId: string,
    resource: string,
    itemIds: string[],
    options: BulkOperationOptions,
    deleteFunction: (itemId: string) => Promise<void>
  ): Promise<Omit<BulkOperationResult, 'operationId' | 'duration'>> {
    const batchSize = options.batchSize || 50;
    const continueOnError = options.continueOnError !== false;
    
    let processedItems = 0;
    let successfulItems = 0;
    let failedItems = 0;
    const errors: BulkOperationResult['errors'] = [];

    // Process in batches
    for (let i = 0; i < itemIds.length; i += batchSize) {
      const batch = itemIds.slice(i, i + batchSize);
      
      for (const itemId of batch) {
        try {
          await deleteFunction(itemId);
          successfulItems++;
        } catch (error) {
          failedItems++;
          errors.push({
            item: { id: itemId },
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          
          if (!continueOnError) {
            throw error;
          }
        }
        
        processedItems++;
      }
    }

    return {
      success: failedItems === 0,
      totalItems: itemIds.length,
      processedItems,
      successfulItems,
      failedItems,
      errors,
    };
  }

  // Individual operation implementations (these would use your actual database operations)
  private async updateUser(transactionId: string, userId: string, updates: Record<string, any>): Promise<void> {
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');

    const query = `
      UPDATE users
      SET ${setClause}
      WHERE id = $1
    `;

    const params = [userId, ...Object.values(updates)];
    await this.transactionManager.executeInTransaction(transactionId, query, params);
  }

  private async deleteCard(transactionId: string, cardId: string): Promise<void> {
    const query = `DELETE FROM inventory WHERE id = $1`;
    await this.transactionManager.executeInTransaction(transactionId, query, [cardId]);
  }

  private async updatePack(transactionId: string, packId: string, updates: Record<string, any>): Promise<void> {
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');

    const query = `
      UPDATE packs
      SET ${setClause}
      WHERE id = $1
    `;

    const params = [packId, ...Object.values(updates)];
    await this.transactionManager.executeInTransaction(transactionId, query, params);
  }

  private async updateInventoryCard(transactionId: string, cardId: string, updates: Record<string, any>): Promise<void> {
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');

    const query = `
      UPDATE inventory
      SET ${setClause}
      WHERE id = $1
    `;

    const params = [cardId, ...Object.values(updates)];
    await this.transactionManager.executeInTransaction(transactionId, query, params);
  }

  private generateOperationId(): string {
    return `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Express route handlers
export const createBulkOperationRoutes = (
  bulkService: BulkOperationsService
) => {
  return {
    // Bulk update users
    bulkUpdateUsers: async (req: Request, res: Response) => {
      try {
        const adminId = (req as any).user?.id;
        const adminUsername = (req as any).user?.username;
        
        if (!adminId || !adminUsername) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        const result = await bulkService.bulkUpdateUsers(
          req.body,
          adminId,
          adminUsername,
          req.body.options
        );

        res.json(result);
      } catch (error) {
        console.error('Bulk user update error:', error);
        res.status(400).json({
          error: 'Bulk operation failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },

    // Bulk delete cards
    bulkDeleteCards: async (req: Request, res: Response) => {
      try {
        const adminId = (req as any).user?.id;
        const adminUsername = (req as any).user?.username;
        
        if (!adminId || !adminUsername) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        const result = await bulkService.bulkDeleteCards(
          req.body,
          adminId,
          adminUsername,
          req.body.options
        );

        res.json(result);
      } catch (error) {
        console.error('Bulk card delete error:', error);
        res.status(400).json({
          error: 'Bulk operation failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },

    // Bulk update packs
    bulkUpdatePacks: async (req: Request, res: Response) => {
      try {
        const adminId = (req as any).user?.id;
        const adminUsername = (req as any).user?.username;
        
        if (!adminId || !adminUsername) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        const result = await bulkService.bulkUpdatePacks(
          req.body,
          adminId,
          adminUsername,
          req.body.options
        );

        res.json(result);
      } catch (error) {
        console.error('Bulk pack update error:', error);
        res.status(400).json({
          error: 'Bulk operation failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },

    // Bulk update inventory
    bulkUpdateInventory: async (req: Request, res: Response) => {
      try {
        const adminId = (req as any).user?.id;
        const adminUsername = (req as any).user?.username;
        
        if (!adminId || !adminUsername) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        const result = await bulkService.bulkUpdateInventory(
          req.body,
          adminId,
          adminUsername,
          req.body.options
        );

        res.json(result);
      } catch (error) {
        console.error('Bulk inventory update error:', error);
        res.status(400).json({
          error: 'Bulk operation failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  };
};
