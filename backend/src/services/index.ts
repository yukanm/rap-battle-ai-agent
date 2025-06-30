import { initializeVertexAI } from './vertexai'
import { initializeFirestore } from './firestore'
import { initializeTextToSpeech } from './text-to-speech'
import { initializeStorage } from './storage'
import { logger } from '../utils/logger'
import { config } from '../config'

export async function initializeServices() {
  logger.info('Initializing services...')
  
  try {
    // Initialize all services (no more mock data)
    await Promise.all([
      initializeVertexAI(),
      initializeTextToSpeech(),
    ])
    
    // Initialize Storage service for audio files
    try {
      await initializeStorage()
    } catch (error) {
      logger.warn('Storage initialization failed, will use base64 encoding:', error)
    }
    
    // Initialize Firestore separately (optional for now)
    try {
      await initializeFirestore()
    } catch (error) {
      logger.warn('Firestore initialization failed, continuing without database:', error)
    }
    
    // Initialize cache service (will use Redis or MemoryCache)
    try {
      const { getCacheService } = await import('./cache')
      await getCacheService()
      logger.info('Cache service initialized')
    } catch (error) {
      logger.warn('Cache initialization failed, continuing without cache:', error)
    }
    
    // Initialize monitoring services in production
    if (config.nodeEnv === 'production') {
      if (config.logging.enableCloudTrace) {
        require('@google-cloud/trace-agent').start()
      }
      
      if (config.logging.enableCloudProfiler) {
        require('@google-cloud/profiler').start({
          serviceContext: {
            service: 'rap-battle-backend',
            version: '1.0.0',
          },
        })
      }
    }
    
    logger.info('All services initialized successfully')
  } catch (error) {
    logger.error('Service initialization failed:', error)
    throw error
  }
}