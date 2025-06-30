import { Express } from 'express'
import { battlesRouter } from './battles'
import { healthRouter } from './health'
import { analyticsRouter } from './analytics'
import agentRouter from './agent.routes'
import liveApiRouter from './live-api.routes'
import ngWordRouter from './ng-word.routes'

export function setupRoutes(app: Express) {
  // API routes
  app.use('/api/battles', battlesRouter)
  app.use('/api/health', healthRouter)
  app.use('/api/analytics', analyticsRouter)
  app.use('/api/agent', agentRouter)
  app.use('/api/live', liveApiRouter) // β版 Live API routes
  app.use('/api/ng-words', ngWordRouter) // NG word management routes
  
  // 404 handler
  app.use('*', (_req, res) => {
    res.status(404).json({
      error: {
        message: 'Route not found',
        statusCode: 404,
      },
    })
  })
}