import { createLogger } from './logger'
import type { Socket } from 'socket.io'

const logger = createLogger('error-handler')

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string,
    public isOperational: boolean = true
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR')
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR')
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR')
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND')
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED')
  }
}

export class TimeoutError extends AppError {
  constructor(operation: string) {
    super(`${operation} timed out`, 504, 'TIMEOUT_ERROR')
  }
}

export function handleError(error: Error | AppError, socket?: Socket) {
  // Log the error
  if ((error as AppError).isOperational) {
    logger.warn('Operational error:', {
      message: error.message,
      code: (error as AppError).code,
      statusCode: (error as AppError).statusCode,
    })
  } else {
    logger.error('Unexpected error:', error)
  }

  // Send error to client if socket is provided
  if (socket) {
    const errorResponse = {
      error: true,
      message: error.message,
      code: (error as AppError).code || 'INTERNAL_ERROR',
    }
    
    socket.emit('error', errorResponse)
  }

  // Don't crash the process for operational errors
  if (!(error as AppError).isOperational) {
    // In production, you might want to restart the process
    // process.exit(1)
  }
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number
    delay?: number
    backoff?: number
    onRetry?: (error: Error, attempt: number) => void
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delay = 1000,
    backoff = 2,
    onRetry,
  } = options

  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      
      if (attempt === maxRetries) {
        throw lastError
      }

      if (onRetry) {
        onRetry(lastError, attempt)
      }

      const waitTime = delay * Math.pow(backoff, attempt - 1)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }

  throw lastError!
}

export function createCircuitBreaker(
  operation: Function,
  options: {
    failureThreshold?: number
    resetTimeout?: number
    monitoringPeriod?: number
  } = {}
) {
  const {
    failureThreshold = 5,
    resetTimeout = 60000, // 1 minute
    monitoringPeriod = 60000, // 1 minute
  } = options

  let failures = 0
  let lastFailureTime = 0
  let circuitState: 'closed' | 'open' | 'half-open' = 'closed'

  return async function(...args: any[]) {
    // Check if we should reset the failure count
    if (Date.now() - lastFailureTime > monitoringPeriod) {
      failures = 0
      circuitState = 'closed'
    }

    // If circuit is open, check if we should try half-open
    if (circuitState === 'open') {
      if (Date.now() - lastFailureTime > resetTimeout) {
        circuitState = 'half-open'
      } else {
        throw new AppError('Circuit breaker is open', 503, 'CIRCUIT_OPEN')
      }
    }

    try {
      const result = await operation(...args)
      
      // Success - reset failures if half-open
      if (circuitState === 'half-open') {
        failures = 0
        circuitState = 'closed'
      }
      
      return result
    } catch (error) {
      failures++
      lastFailureTime = Date.now()
      
      if (failures >= failureThreshold) {
        circuitState = 'open'
      }
      
      throw error
    }
  }
}

// Global error handlers
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error)
  // Give time to log the error before exiting
  setTimeout(() => process.exit(1), 1000)
})

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason)
  // Give time to log the error before exiting
  setTimeout(() => process.exit(1), 1000)
})