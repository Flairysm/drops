// Standardized error handling utilities

export interface ApiError {
  success: false;
  error: string;
  code?: string;
  details?: any;
}

export interface ApiSuccess<T = any> {
  success: true;
  data?: T;
  message?: string;
}

export type ApiResponse<T = any> = ApiError | ApiSuccess<T>;

// Standard error messages
export const ERROR_MESSAGES = {
  // Authentication errors
  UNAUTHORIZED: 'User not authenticated',
  FORBIDDEN: 'Access denied',
  
  // Validation errors
  INVALID_INPUT: 'Invalid input provided',
  MISSING_REQUIRED_FIELD: 'Required field is missing',
  INVALID_FORMAT: 'Invalid format provided',
  
  // Resource errors
  NOT_FOUND: 'Resource not found',
  ALREADY_EXISTS: 'Resource already exists',
  CONFLICT: 'Resource conflict',
  
  // Business logic errors
  INSUFFICIENT_CREDITS: 'Insufficient credits',
  RAFFLE_FULL: 'Raffle is full',
  RAFFLE_INACTIVE: 'Raffle is not active',
  RAFFLE_NOT_FOUND: 'Raffle not found',
  
  // System errors
  INTERNAL_ERROR: 'Internal server error',
  DATABASE_ERROR: 'Database operation failed',
  EXTERNAL_SERVICE_ERROR: 'External service error',
} as const;

// Error codes for client-side handling
export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  BUSINESS_LOGIC_ERROR: 'BUSINESS_LOGIC_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

// Create standardized error response
export function createErrorResponse(
  message: string,
  code?: string,
  details?: any,
  statusCode: number = 500
): { statusCode: number; response: ApiError } {
  return {
    statusCode,
    response: {
      success: false,
      error: message,
      code,
      details
    }
  };
}

// Create standardized success response
export function createSuccessResponse<T>(
  data?: T,
  message?: string
): ApiSuccess<T> {
  return {
    success: true,
    data,
    message
  };
}

// Handle different types of errors
export function handleError(error: unknown): { statusCode: number; response: ApiError } {
  console.error('Error occurred:', error);

  if (error instanceof Error) {
    // Database constraint errors
    if (error.message.includes('violates foreign key constraint')) {
      return createErrorResponse(
        ERROR_MESSAGES.NOT_FOUND,
        ERROR_CODES.NOT_FOUND,
        { originalError: error.message },
        404
      );
    }

    // Database unique constraint errors
    if (error.message.includes('violates unique constraint')) {
      return createErrorResponse(
        ERROR_MESSAGES.ALREADY_EXISTS,
        ERROR_CODES.CONFLICT,
        { originalError: error.message },
        409
      );
    }

    // Database connection errors
    if (error.message.includes('connection') || error.message.includes('timeout')) {
      return createErrorResponse(
        ERROR_MESSAGES.DATABASE_ERROR,
        ERROR_CODES.INTERNAL_ERROR,
        { originalError: error.message },
        500
      );
    }

    // Business logic errors (custom error messages)
    if (error.message.includes('Insufficient credits')) {
      return createErrorResponse(
        ERROR_MESSAGES.INSUFFICIENT_CREDITS,
        ERROR_CODES.BUSINESS_LOGIC_ERROR,
        null,
        400
      );
    }

    if (error.message.includes('Raffle is not full yet')) {
      return createErrorResponse(
        ERROR_MESSAGES.RAFFLE_FULL,
        ERROR_CODES.BUSINESS_LOGIC_ERROR,
        null,
        400
      );
    }

    if (error.message.includes('Raffle is no longer active')) {
      return createErrorResponse(
        ERROR_MESSAGES.RAFFLE_INACTIVE,
        ERROR_CODES.BUSINESS_LOGIC_ERROR,
        null,
        400
      );
    }

    if (error.message.includes('Raffle not found')) {
      return createErrorResponse(
        ERROR_MESSAGES.RAFFLE_NOT_FOUND,
        ERROR_CODES.NOT_FOUND,
        null,
        404
      );
    }

    // Generic error with message
    return createErrorResponse(
      error.message,
      ERROR_CODES.INTERNAL_ERROR,
      { originalError: error.message },
      500
    );
  }

  // Unknown error type
  return createErrorResponse(
    ERROR_MESSAGES.INTERNAL_ERROR,
    ERROR_CODES.INTERNAL_ERROR,
    { originalError: String(error) },
    500
  );
}

// Express error handler middleware
export function errorHandler(error: unknown, req: any, res: any, next: any) {
  const { statusCode, response } = handleError(error);
  res.status(statusCode).json(response);
}

// Async wrapper to catch errors in async route handlers
export function asyncHandler<T extends any[], R>(
  fn: (...args: T) => Promise<R>
) {
  return (...args: T): Promise<R> => {
    return Promise.resolve(fn(...args)).catch((error) => {
      throw error; // Let the error handler middleware handle it
    });
  };
}
