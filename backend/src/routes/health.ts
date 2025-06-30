import { Router } from 'express'
import { VertexAIService } from '@/services/vertexai'
import { TextToSpeechService } from '@/services/text-to-speech'
import { FirestoreService } from '@/services/firestore'
import { RedisService } from '@/services/redis'

const router = Router()

// Basic health check
router.get('/', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  })
})

// Detailed health check
router.get('/detailed', async (_req, res) => {
  const services = {
    vertexAI: false,
    textToSpeech: false,
    firestore: false,
    redis: false,
  }
  
  // Check services in parallel
  await Promise.allSettled([
    new VertexAIService().testConnection()
      .then(result => { services.vertexAI = result }),
    new TextToSpeechService().testConnection()
      .then(result => { services.textToSpeech = result }),
    new FirestoreService().testConnection()
      .then(result => { services.firestore = result }),
    new RedisService().testConnection()
      .then(result => { services.redis = result }),
  ])
  
  const allHealthy = Object.values(services).every(status => status === true)
  
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    services,
    timestamp: new Date().toISOString(),
  })
})

// Readiness probe for Kubernetes/Cloud Run
router.get('/ready', async (_req, res) => {
  try {
    // Check if critical services are ready
    const vertexAI = await new VertexAIService().testConnection()
    const firestore = await new FirestoreService().testConnection()
    
    if (vertexAI && firestore) {
      res.json({ ready: true })
    } else {
      res.status(503).json({ ready: false })
    }
  } catch (error) {
    res.status(503).json({ ready: false })
  }
})

// Liveness probe
router.get('/live', (_req, res) => {
  res.json({ alive: true })
})

export const healthRouter = router