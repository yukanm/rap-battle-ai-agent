// Performance optimization configurations
const lyricTimeout = parseInt(process.env.LYRIC_GENERATION_TIMEOUT_MS || '30000')

export const performanceConfig = {
  // Parallel processing
  enableParallelGeneration: true,
  maxConcurrentRequests: 5,
  
  // Caching
  enableCaching: true,
  cacheExpiration: 3600000, // 1 hour in ms
  
  // Timeouts (in milliseconds)
  timeouts: {
    lyricGeneration: lyricTimeout, // 30 seconds max
    complianceCheck: parseInt(process.env.COMPLIANCE_CHECK_TIMEOUT_MS || '1000'), // 1 second max
    ttsGeneration: parseInt(process.env.TTS_GENERATION_TIMEOUT_MS || '5000'), // 5 seconds max
    totalRoundGeneration: 60000, // 60 seconds for entire round
  },
  
  // Retry configuration
  retry: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 5000,
    backoffFactor: 2,
  },
  
  // Text optimization
  textOptimization: {
    maxLyricLength: 500, // characters
    maxTTSLength: 400, // characters for TTS
  },
  
  // Model-specific optimizations
  modelOptimizations: {
    'gemini-flash': {
      maxOutputTokens: 400,
      temperature: 0.85,
      topP: 0.9,
      topK: 35,
    },
    'gemini-pro': {
      maxOutputTokens: 600,
      temperature: 0.8,
      topP: 0.85,
      topK: 30,
    }
  },
  
  // Batch processing
  batchProcessing: {
    enabled: true,
    maxBatchSize: 10,
    batchTimeout: 100, // ms to wait before processing
  }
}

// Helper to wrap async functions with timeout
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ])
}