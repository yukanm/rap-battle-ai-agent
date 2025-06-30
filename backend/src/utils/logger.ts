import winston from 'winston'
import { config } from '../config'

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length ? JSON.stringify(meta) : ''
    return `${timestamp} [${level.toUpperCase()}]: ${message} ${metaString}`
  })
)

// Create logger instance
export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: { service: 'rap-battle-backend' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
})

// Add file transport in production
if (config.nodeEnv === 'production') {
  logger.add(
    new winston.transports.File({
      filename: 'error.log',
      level: 'error',
    })
  )
  logger.add(
    new winston.transports.File({
      filename: 'combined.log',
    })
  )
}

// Create child loggers for specific components
export const createLogger = (component: string) => {
  return logger.child({ component })
}