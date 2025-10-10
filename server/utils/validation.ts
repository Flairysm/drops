import { z } from 'zod';

// Common validation schemas
export const commonSchemas = {
  // ID validation
  id: z.string().min(1, 'ID is required').max(255, 'ID too long'),
  
  // User ID validation
  userId: z.string().uuid('Invalid user ID format'),
  
  // Credit amount validation
  credits: z.number().min(0, 'Credits must be non-negative').max(1000000, 'Credits amount too large'),
  
  // Slot validation
  slots: z.number().int('Slots must be an integer').min(1, 'At least 1 slot required').max(100, 'Maximum 100 slots allowed'),
  
  // Price validation
  price: z.number().min(0, 'Price must be non-negative').max(10000, 'Price too high'),
  
  // Text validation
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  
  // URL validation
  url: z.string().url('Invalid URL format').optional(),
  
  // Status validation
  status: z.enum(['active', 'filled', 'completed', 'cancelled']),
  
  // Prize type validation
  prizeType: z.enum(['pack', 'card', 'credits', 'physical']),
  
  // Position validation
  position: z.number().int('Position must be an integer').min(1, 'Position must be at least 1'),
};

// Raffle validation schemas
export const raffleSchemas = {
  // Create/Update raffle
  createRaffle: z.object({
    title: commonSchemas.title,
    description: commonSchemas.description,
    imageUrl: commonSchemas.url,
    totalSlots: z.number().int('Total slots must be an integer').min(1, 'At least 1 slot required').max(10000, 'Too many slots'),
    pricePerSlot: commonSchemas.price,
    maxWinners: z.number().int('Max winners must be an integer').min(1, 'At least 1 winner required').max(100, 'Too many winners'),
    autoDraw: z.boolean().optional().default(true),
  }),

  // Join raffle
  joinRaffle: z.object({
    slots: commonSchemas.slots,
  }),

  // Create/Update prize
  createPrize: z.object({
    position: commonSchemas.position,
    name: commonSchemas.title,
    type: commonSchemas.prizeType,
    value: z.string().max(255, 'Value too long').optional(),
    imageUrl: commonSchemas.url,
  }),

  // Update raffle
  updateRaffle: z.object({
    title: commonSchemas.title.optional(),
    description: commonSchemas.description,
    imageUrl: commonSchemas.url,
    totalSlots: z.number().int('Total slots must be an integer').min(1, 'At least 1 slot required').max(10000, 'Too many slots').optional(),
    pricePerSlot: commonSchemas.price.optional(),
    maxWinners: z.number().int('Max winners must be an integer').min(1, 'At least 1 winner required').max(100, 'Too many winners').optional(),
    status: commonSchemas.status.optional(),
    autoDraw: z.boolean().optional(),
  }),
};

// User validation schemas
export const userSchemas = {
  // Register user
  register: z.object({
    username: z.string().min(3, 'Username must be at least 3 characters').max(50, 'Username too long'),
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters').max(100, 'Password too long'),
  }),

  // Login user
  login: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
  }),

  // Update user credits
  updateCredits: z.object({
    amount: commonSchemas.credits,
  }),
};

// Pack validation schemas
export const packSchemas = {
  // Create pack
  createPack: z.object({
    name: commonSchemas.title,
    description: commonSchemas.description,
    imageUrl: commonSchemas.url,
    price: commonSchemas.price,
    totalCards: z.number().int('Total cards must be an integer').min(1, 'At least 1 card required').max(1000, 'Too many cards').optional(),
    totalPacks: z.number().int('Total packs must be an integer').min(1, 'At least 1 pack required').max(10000, 'Too many packs').optional(),
    isActive: z.boolean().optional().default(true),
  }),

  // Open pack
  openPack: z.object({
    packId: commonSchemas.id,
  }),
};

// Validation middleware factory
export function createValidationMiddleware<T>(schema: z.ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
    try {
      const result = schema.safeParse(req.body);
      
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: errors
        });
      }
      
      // Replace req.body with validated data
      req.body = result.data;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Validation error',
        code: 'INTERNAL_ERROR'
      });
    }
  };
}

// Parameter validation middleware
export function createParamValidationMiddleware<T>(schema: z.ZodSchema<T>, paramName: string) {
  return (req: any, res: any, next: any) => {
    try {
      const result = schema.safeParse(req.params[paramName]);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: `Invalid ${paramName}`,
          code: 'VALIDATION_ERROR',
          details: result.error.flatten().fieldErrors
        });
      }
      
      req.params[paramName] = result.data;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Parameter validation error',
        code: 'INTERNAL_ERROR'
      });
    }
  };
}

// Query validation middleware
export function createQueryValidationMiddleware<T>(schema: z.ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
    try {
      const result = schema.safeParse(req.query);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          code: 'VALIDATION_ERROR',
          details: result.error.flatten().fieldErrors
        });
      }
      
      req.query = result.data;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Query validation error',
        code: 'INTERNAL_ERROR'
      });
    }
  };
}
