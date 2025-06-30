import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import { rateLimit } from 'express-rate-limit'
import 'express-async-errors'

import { logger } from './utils/logger'
import { initializeServices } from './services'
import { errorHandler } from './middleware/errorHandler'
import { setupRoutes } from './routes'
import { setupSocketHandlers } from './services/websocket'
import { config } from './config'

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: ["https://rap-battle-frontend-bslarjwwyq-uc.a.run.app", "http://localhost:3000", "http://localhost:3456"],
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"]
  },
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
  // Cloud Run対応の追加設定
  allowRequest: (_req, callback) => {
    // Cloud RunのヘルスチェックとWebSocket接続を許可
    callback(null, true)
  }
})

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // We'll configure CSP separately for WebSocket support
}))
app.use(compression())
app.use(cors({
  origin: ["https://rap-battle-frontend-bslarjwwyq-uc.a.run.app", "http://localhost:3000", "http://localhost:3456"],
  credentials: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: config.rateLimitRequestsPerMinute,
  message: 'Too many requests from this IP',
})
app.use('/api/', limiter)

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() })
})

// WebSocket debugging endpoint
app.get('/socket.io/debug', (_req, res) => {
  res.json({
    status: 'WebSocket endpoint available',
    transports: ['websocket', 'polling'],
    cors: {
      origin: ["https://rap-battle-frontend-bslarjwwyq-uc.a.run.app", "http://localhost:3000", "http://localhost:3456"]
    },
    timestamp: new Date().toISOString()
  })
})

// Initialize services
async function startServer() {
  try {
    // Initialize Google Cloud services
    await initializeServices()
    
    // Setup routes
    setupRoutes(app)
    
    // Setup WebSocket handlers
    setupSocketHandlers(io)
    
    // Error handler (must be last)
    app.use(errorHandler)
    
    // Start server
    const port = process.env.PORT || config.port
    httpServer.listen(port, () => {
      logger.info(`Server running on port ${port}`)
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`)
      logger.info(`WebSocket enabled`)
    })
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM signal received: closing HTTP server')
      httpServer.close(() => {
        logger.info('HTTP server closed')
      })
      io.close(() => {
        logger.info('WebSocket server closed')
      })
      process.exit(0)
    })
    
  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()