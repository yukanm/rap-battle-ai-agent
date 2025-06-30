export const config = {
  // Server
  port: parseInt(process.env.PORT || process.env.CLOUD_RUN_PORT || '8456'),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Google Cloud
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID!,
  region: process.env.GOOGLE_CLOUD_REGION || 'us-central1',
  
  // Vertex AI
  vertexAI: {
    location: process.env.VERTEX_AI_LOCATION || 'us-central1',
    geminiFlashModel: process.env.GEMINI_FLASH_MODEL || 'gemini-1.5-flash-latest',
    geminiProModel: process.env.GEMINI_PRO_MODEL || 'gemini-1.5-pro-latest',
  },
  
  // Gemini API
  geminiApiKey: process.env.GEMINI_API_KEY!,
  
  // Text-to-Speech
  tts: {
    languageCode: process.env.TTS_LANGUAGE_CODE || 'en-US',
    voiceName: process.env.TTS_VOICE_NAME || 'en-US-Studio-M',
    speakingRate: parseFloat(process.env.TTS_SPEAKING_RATE || '1.2'),
    pitch: parseFloat(process.env.TTS_PITCH || '0.0'),
    volumeGainDb: parseFloat(process.env.TTS_VOLUME_GAIN_DB || '0.0'),
  },
  
  // Security
  jwtSecret: process.env.JWT_SECRET!,
  sessionSecret: process.env.SESSION_SECRET!,
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
  
  // Database
  firestore: {
    battlesCollection: process.env.FIRESTORE_COLLECTION_BATTLES || 'battles',
    usersCollection: process.env.FIRESTORE_COLLECTION_USERS || 'users',
    lyricsCollection: process.env.FIRESTORE_COLLECTION_LYRICS || 'lyrics',
    votesCollection: process.env.FIRESTORE_COLLECTION_VOTES || 'votes',
  },
  
  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    ttl: parseInt(process.env.REDIS_TTL_SECONDS || '3600'),
  },
  
  // Performance
  performance: {
    lyricGenerationTimeout: parseInt(process.env.LYRIC_GENERATION_TIMEOUT_MS || '1000'),
    complianceCheckTimeout: parseInt(process.env.COMPLIANCE_CHECK_TIMEOUT_MS || '300'),
    ttsGenerationTimeout: parseInt(process.env.TTS_GENERATION_TIMEOUT_MS || '200'),
    websocketPingInterval: parseInt(process.env.WEBSOCKET_PING_INTERVAL_MS || '30000'),
  },
  
  // Rate Limiting
  rateLimitRequestsPerMinute: parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE || '60'),
  rateLimitWebsocketMessagesPerSecond: parseInt(process.env.RATE_LIMIT_WEBSOCKET_MESSAGES_PER_SECOND || '10'),
  
  // Features
  features: {
    enableVoting: process.env.ENABLE_VOTING === 'true',
    enableAnalytics: process.env.ENABLE_ANALYTICS === 'true',
    enableComplianceCheck: process.env.ENABLE_COMPLIANCE_CHECK === 'true',
    enableRateLimiting: process.env.ENABLE_RATE_LIMITING === 'true',
  },
  
  // Compliance
  complianceThreshold: parseFloat(process.env.COMPLIANCE_THRESHOLD || '0.8'),
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableCloudLogging: process.env.ENABLE_CLOUD_LOGGING === 'true',
    enableCloudTrace: process.env.ENABLE_CLOUD_TRACE === 'true',
    enableCloudProfiler: process.env.ENABLE_CLOUD_PROFILER === 'true',
  },
}

// Validate required environment variables
const requiredEnvVars = [
  'GOOGLE_CLOUD_PROJECT_ID',
  'JWT_SECRET',
  'SESSION_SECRET',
]

// Optional but important env vars
const optionalEnvVars = [
  'GEMINI_API_KEY',
  'GOOGLE_API_KEY',
  'GOOGLE_APPLICATION_CREDENTIALS',
]

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`)
  }
}

// Warn about missing optional vars
for (const envVar of optionalEnvVars) {
  if (!process.env[envVar]) {
    console.warn(`Warning: Optional environment variable ${envVar} is not set`)
  }
}