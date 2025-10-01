import Joi from 'joi';
import { z } from 'zod';

// Joi schemas for comprehensive validation
export const adminSchemas = {
  // User management schemas
  createUser: Joi.object({
    username: Joi.string().min(3).max(50).alphanum().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])')).required(),
    role: Joi.string().valid('user', 'admin').default('user'),
    credits: Joi.number().min(0).default(0),
  }),

  updateUser: Joi.object({
    username: Joi.string().min(3).max(50).alphanum(),
    email: Joi.string().email(),
    credits: Joi.number().min(0),
    isBanned: Joi.boolean(),
    isSuspended: Joi.boolean(),
    role: Joi.string().valid('user', 'admin'),
  }),

  // Pack management schemas
  createPack: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    description: Joi.string().max(500),
    imageUrl: Joi.string().uri().required(),
    price: Joi.number().positive().required(),
    packType: Joi.string().valid('classic', 'special', 'mystery').required(),
    isActive: Joi.boolean().default(true),
    totalPacks: Joi.number().min(0).default(0),
    guarantee: Joi.string().max(200),
  }),

  updatePack: Joi.object({
    name: Joi.string().min(1).max(100),
    description: Joi.string().max(500),
    imageUrl: Joi.string().uri(),
    price: Joi.number().positive(),
    isActive: Joi.boolean(),
    totalPacks: Joi.number().min(0),
    guarantee: Joi.string().max(200),
  }),

  // Inventory management schemas
  createInventoryCard: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    imageUrl: Joi.string().uri().required(),
    credits: Joi.number().min(0).required(),
    tier: Joi.string().valid('D', 'C', 'B', 'A', 'S', 'SS', 'SSS').required(),
  }),

  updateInventoryCard: Joi.object({
    name: Joi.string().min(1).max(100),
    imageUrl: Joi.string().uri(),
    credits: Joi.number().min(0),
    tier: Joi.string().valid('D', 'C', 'B', 'A', 'S', 'SS', 'SSS'),
  }),

  // Pack card management schemas
  addCardToPack: Joi.object({
    cardId: Joi.string().uuid().required(),
    quantity: Joi.number().integer().min(1).required(),
  }),

  updatePackCardQuantity: Joi.object({
    quantity: Joi.number().integer().min(0).required(),
  }),

  // Bulk operations schemas
  bulkUpdateUsers: Joi.object({
    userIds: Joi.array().items(Joi.string().uuid()).min(1).max(100).required(),
    updates: Joi.object({
      credits: Joi.number().min(0),
      isBanned: Joi.boolean(),
      isSuspended: Joi.boolean(),
    }).required(),
  }),

  bulkDeleteCards: Joi.object({
    cardIds: Joi.array().items(Joi.string().uuid()).min(1).max(50).required(),
  }),

  // Search and filter schemas
  searchUsers: Joi.object({
    query: Joi.string().max(100),
    role: Joi.string().valid('user', 'admin'),
    isBanned: Joi.boolean(),
    isSuspended: Joi.boolean(),
    creditRange: Joi.object({
      min: Joi.number().min(0),
      max: Joi.number().min(0),
    }),
    dateRange: Joi.object({
      start: Joi.date(),
      end: Joi.date(),
    }),
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0),
  }),

  searchPacks: Joi.object({
    query: Joi.string().max(100),
    packType: Joi.string().valid('classic', 'special', 'mystery'),
    isActive: Joi.boolean(),
    priceRange: Joi.object({
      min: Joi.number().min(0),
      max: Joi.number().min(0),
    }),
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0),
  }),

  // System settings schemas
  updateSystemSettings: Joi.object({
    maintenanceMode: Joi.boolean(),
    registrationEnabled: Joi.boolean(),
    maxCreditsPerUser: Joi.number().min(0),
    defaultUserCredits: Joi.number().min(0),
    sessionTimeout: Joi.number().min(300).max(86400), // 5 minutes to 24 hours
  }),

  // Export/Import schemas
  exportData: Joi.object({
    type: Joi.string().valid('users', 'packs', 'inventory', 'transactions').required(),
    format: Joi.string().valid('csv', 'json').default('json'),
    filters: Joi.object(),
  }),

  importData: Joi.object({
    type: Joi.string().valid('users', 'packs', 'inventory').required(),
    data: Joi.array().items(Joi.object()).min(1).max(1000).required(),
    options: Joi.object({
      skipDuplicates: Joi.boolean().default(true),
      updateExisting: Joi.boolean().default(false),
    }),
  }),
};

// Zod schemas for type-safe validation
export const zodSchemas = {
  // User schemas
  userCreate: z.object({
    username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/),
    email: z.string().email(),
    password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])/),
    role: z.enum(['user', 'admin']).default('user'),
    credits: z.number().min(0).default(0),
  }),

  userUpdate: z.object({
    username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/).optional(),
    email: z.string().email().optional(),
    credits: z.number().min(0).optional(),
    isBanned: z.boolean().optional(),
    isSuspended: z.boolean().optional(),
    role: z.enum(['user', 'admin']).optional(),
  }),

  // Pack schemas
  packCreate: z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    imageUrl: z.string().url(),
    price: z.number().positive(),
    packType: z.enum(['classic', 'special', 'mystery']),
    isActive: z.boolean().default(true),
    totalPacks: z.number().min(0).default(0),
    guarantee: z.string().max(200).optional(),
  }),

  packUpdate: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    imageUrl: z.string().url().optional(),
    price: z.number().positive().optional(),
    isActive: z.boolean().optional(),
    totalPacks: z.number().min(0).optional(),
    guarantee: z.string().max(200).optional(),
  }),

  // Inventory schemas
  inventoryCardCreate: z.object({
    name: z.string().min(1).max(100),
    imageUrl: z.string().url(),
    credits: z.number().min(0),
    tier: z.enum(['D', 'C', 'B', 'A', 'S', 'SS', 'SSS']),
  }),

  inventoryCardUpdate: z.object({
    name: z.string().min(1).max(100).optional(),
    imageUrl: z.string().url().optional(),
    credits: z.number().min(0).optional(),
    tier: z.enum(['D', 'C', 'B', 'A', 'S', 'SS', 'SSS']).optional(),
  }),

  // Search schemas
  searchQuery: z.object({
    query: z.string().max(100).optional(),
    limit: z.number().int().min(1).max(100).default(20),
    offset: z.number().int().min(0).default(0),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),

  userSearch: searchQuery.extend({
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
  }),

  packSearch: searchQuery.extend({
    packType: z.enum(['classic', 'special', 'mystery']).optional(),
    isActive: z.boolean().optional(),
    priceRange: z.object({
      min: z.number().min(0),
      max: z.number().min(0),
    }).optional(),
  }),
};

// Validation middleware factory
export function createValidationMiddleware(schema: Joi.ObjectSchema) {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

      return res.status(400).json({
        error: 'Validation failed',
        details: errors,
      });
    }

    req.body = value;
    next();
  };
}

// Zod validation middleware factory
export function createZodValidationMiddleware<T>(schema: z.ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
    try {
      const validatedData = schema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        return res.status(400).json({
          error: 'Validation failed',
          details: errors,
        });
      }

      return res.status(500).json({
        error: 'Internal validation error',
      });
    }
  };
}

// Custom validation functions
export const customValidators = {
  // Validate UUID format
  isValidUUID: (value: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  },

  // Validate credit amount
  isValidCreditAmount: (value: number): boolean => {
    return Number.isFinite(value) && value >= 0 && value <= 1000000;
  },

  // Validate tier
  isValidTier: (value: string): boolean => {
    return ['D', 'C', 'B', 'A', 'S', 'SS', 'SSS'].includes(value);
  },

  // Validate pack type
  isValidPackType: (value: string): boolean => {
    return ['classic', 'special', 'mystery'].includes(value);
  },

  // Sanitize HTML content
  sanitizeHtml: (value: string): string => {
    return value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  },

  // Validate image URL
  isValidImageUrl: (value: string): boolean => {
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol) && 
             /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url.pathname);
    } catch {
      return false;
    }
  },
};

// Rate limiting validation
export const rateLimitSchemas = {
  adminAction: Joi.object({
    action: Joi.string().required(),
    resource: Joi.string().required(),
    resourceId: Joi.string().optional(),
  }),

  bulkOperation: Joi.object({
    operation: Joi.string().valid('update', 'delete', 'export', 'import').required(),
    resource: Joi.string().required(),
    itemCount: Joi.number().integer().min(1).max(1000).required(),
  }),
};
