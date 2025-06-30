import { Request, Response, NextFunction } from 'express'
import { logger } from '@/utils/logger'

export class AppError extends Error {
  statusCode: number
  isOperational: boolean
  
  constructor(message: string, statusCode: number = 500) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true
    
    Error.captureStackTrace(this, this.constructor)
  }
}

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // Default error values
  let statusCode = 500
  let message = 'Internal Server Error'
  let isOperational = false
  
  // Handle known operational errors
  if (err instanceof AppError) {
    statusCode = err.statusCode
    message = err.message
    isOperational = err.isOperational
  } else if (err.name === 'ValidationError') {
    statusCode = 400
    message = 'Validation Error'
    isOperational = true
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401
    message = 'Unauthorized'
    isOperational = true
  }
  
  // Log error
  if (!isOperational) {
    logger.error('Unexpected error:', {
      error: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      body: req.body,
    })
  } else {
    logger.warn('Operational error:', {
      error: err.message,
      url: req.url,
      method: req.method,
    })
  }
  
  // Send error response
  res.status(statusCode).json({
    error: {
      message: message,
      statusCode: statusCode,
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
        details: err,
      }),
    },
    timestamp: new Date().toISOString(),
  })
}