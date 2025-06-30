import { Router, Request, Response } from 'express'
import { LiveAPIService, LiveSessionConfig } from '@/services/live-api.service'
import { AudioProcessorService } from '@/services/audio-processor.service'
import { EphemeralTokenService, TokenRequest } from '@/services/ephemeral-token.service'
import { validateRequest } from '@/middleware/validation'
import { body, param } from 'express-validator'
import { createLogger } from '@/utils/logger'

const router = Router()
const logger = createLogger('live-api-routes')

// サービスインスタンス
const liveApiService = new LiveAPIService()
const audioProcessor = new AudioProcessorService()
const tokenService = new EphemeralTokenService()

/**
 * Live API β版のヘルスチェック
 */
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const liveApiStatus = liveApiService.getServiceStatus()
    const audioStatus = audioProcessor.getProcessorStatus()
    const tokenStatus = tokenService.getServiceStatus()

    res.json({
      success: true,
      status: 'healthy',
      message: 'Live API services are operational (β版)',
      services: {
        liveApi: liveApiStatus,
        audioProcessor: audioStatus,
        tokenService: tokenStatus
      },
      beta: {
        version: '0.1.0',
        features: ['Real-time rap battles', 'Audio streaming', 'Text input'],
        limitations: ['Development only', 'Mock audio processing', 'Limited concurrent sessions']
      }
    })
  } catch (error) {
    logger.error('Live API health check failed:', error)
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: 'Live API services are not operational',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * ライブセッション作成
 */
router.post(
  '/session',
  [
    body('userId').isString().notEmpty().withMessage('User ID is required'),
    body('battleId').isString().notEmpty().withMessage('Battle ID is required'),
    body('theme').isString().notEmpty().withMessage('Theme is required'),
    body('rapperStyle').isString().notEmpty().withMessage('Rapper style is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { userId, battleId, theme, rapperStyle } = req.body

      const sessionConfig: LiveSessionConfig = {
        userId,
        battleId,
        theme,
        rapperStyle
      }

      const sessionId = await liveApiService.createLiveSession(sessionConfig)

      res.json({
        success: true,
        data: {
          sessionId,
          config: sessionConfig,
          websocketUrl: `${process.env.WEBSOCKET_URL || 'ws://localhost:8456'}/live-api`,
          createdAt: new Date().toISOString()
        }
      })

      logger.info('Live session created', {
        sessionId,
        userId,
        battleId,
        theme
      })

    } catch (error) {
      logger.error('Live session creation failed:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to create live session',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
)

/**
 * ライブセッション状態取得
 */
router.get(
  '/session/:sessionId',
  [
    param('sessionId').isString().notEmpty().withMessage('Session ID is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params

      const sessionState = liveApiService.getSessionState(sessionId)

      if (!sessionState) {
        res.status(404).json({
          success: false,
          error: 'Session not found'
        })
        return
      }

      res.json({
        success: true,
        data: {
          sessionId: sessionState.id,
          userId: sessionState.userId,
          battleId: sessionState.battleId,
          isActive: sessionState.isActive,
          lastActivity: sessionState.lastActivity,
          config: sessionState.config
        }
      })

    } catch (error) {
      logger.error('Session state retrieval failed:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve session state'
      })
    }
  }
)

/**
 * Ephemeralトークン生成
 */
router.post(
  '/token',
  [
    body('userId').isString().notEmpty().withMessage('User ID is required'),
    body('sessionId').isString().notEmpty().withMessage('Session ID is required'),
    body('scope').isArray().optional(),
    body('ttl').isInt({ min: 300, max: 7200 }).optional().withMessage('TTL must be between 300 and 7200 seconds'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { userId, sessionId, scope = ['live-api-access'], ttl = 3600 } = req.body

      const tokenRequest: TokenRequest = {
        userId,
        sessionId,
        scope,
        ttl
      }

      const ephemeralToken = await tokenService.generateToken(tokenRequest)

      res.json({
        success: true,
        data: {
          token: ephemeralToken.token,
          expiresAt: ephemeralToken.expiresAt,
          scope: ephemeralToken.scope,
          ttl
        }
      })

      logger.info('Ephemeral token generated', {
        userId,
        sessionId,
        scope,
        ttl
      })

    } catch (error) {
      logger.error('Token generation failed:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to generate token',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
)

/**
 * トークン検証
 */
router.post(
  '/token/validate',
  [
    body('token').isString().notEmpty().withMessage('Token is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { token } = req.body

      const validation = await tokenService.validateToken(token)

      res.json({
        success: true,
        data: {
          isValid: validation.isValid,
          token: validation.token ? {
            userId: validation.token.userId,
            sessionId: validation.token.sessionId,
            scope: validation.token.scope,
            expiresAt: validation.token.expiresAt
          } : undefined,
          error: validation.error
        }
      })

    } catch (error) {
      logger.error('Token validation failed:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to validate token'
      })
    }
  }
)

/**
 * テキスト入力でのライブ応答生成
 */
router.post(
  '/generate',
  [
    body('sessionId').isString().notEmpty().withMessage('Session ID is required'),
    body('text').isString().notEmpty().withMessage('Text input is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { sessionId, text } = req.body

      const response = await liveApiService.generateLiveResponse(sessionId, text)

      res.json({
        success: true,
        data: response
      })

      logger.info('Live response generated via REST', {
        sessionId,
        inputLength: text.length,
        responseType: response.type
      })

    } catch (error) {
      logger.error('Live response generation failed:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to generate live response',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
)

/**
 * 音声処理テスト（β版）
 */
router.post(
  '/audio/process',
  [
    body('sessionId').isString().notEmpty().withMessage('Session ID is required'),
    body('audioConfig').isObject().notEmpty().withMessage('Audio config is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { sessionId, audioConfig } = req.body
      const audioData = req.body.audioData ? Buffer.from(req.body.audioData, 'base64') : Buffer.alloc(0)

      if (audioData.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Audio data is required'
        })
        return
      }

      // 音声処理
      const processedAudio = await audioProcessor.convertAudioFormat(audioData, audioConfig)

      // Live API応答生成（音声アクティビティが検出された場合）
      let liveResponse = null
      if (processedAudio.activity.hasVoice) {
        liveResponse = await liveApiService.streamAudio(sessionId, processedAudio.processedData)
      }

      res.json({
        success: true,
        data: {
          processedAudio: {
            hasVoice: processedAudio.activity.hasVoice,
            volume: processedAudio.activity.volume,
            frequency: processedAudio.activity.frequency,
            confidence: processedAudio.activity.confidence,
            quality: processedAudio.metadata.quality
          },
          liveResponse
        }
      })

      logger.info('Audio processed via REST', {
        sessionId,
        audioSize: audioData.length,
        hasVoice: processedAudio.activity.hasVoice,
        quality: processedAudio.metadata.quality
      })

    } catch (error) {
      logger.error('Audio processing failed:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to process audio',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
)

/**
 * セッション終了
 */
router.delete(
  '/session/:sessionId',
  [
    param('sessionId').isString().notEmpty().withMessage('Session ID is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params

      await liveApiService.endLiveSession(sessionId)

      // 関連トークンも無効化
      await tokenService.revokeSessionTokens(sessionId)

      res.json({
        success: true,
        message: 'Session ended successfully'
      })

      logger.info('Live session ended', { sessionId })

    } catch (error) {
      logger.error('Session termination failed:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to end session'
      })
    }
  }
)

/**
 * ユーザーセッション管理
 */
router.get(
  '/user/:userId/sessions',
  [
    param('userId').isString().notEmpty().withMessage('User ID is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params

      const activeTokenCount = tokenService.getUserActiveTokenCount(userId)
      const activeSessionCount = liveApiService.getActiveSessionCount()

      res.json({
        success: true,
        data: {
          userId,
          activeTokens: activeTokenCount,
          totalActiveSessions: activeSessionCount,
          limits: {
            maxTokensPerUser: 5,
            maxSessionsPerUser: 2
          }
        }
      })

    } catch (error) {
      logger.error('User session retrieval failed:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve user sessions'
      })
    }
  }
)

/**
 * サービス統計情報
 */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = {
      activeSessions: liveApiService.getActiveSessionCount(),
      activeTokens: tokenService.getActiveTokenCount(),
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      beta: {
        version: '0.1.0',
        phase: 'development',
        features: [
          'Live session management',
          'Ephemeral token generation',
          'Audio processing (mock)',
          'Real-time text generation',
          'WebSocket integration'
        ]
      }
    }

    res.json({
      success: true,
      data: stats
    })

  } catch (error) {
    logger.error('Stats retrieval failed:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve stats'
    })
  }
})

/**
 * 開発用：全セッション・トークンクリア
 */
if (process.env.NODE_ENV === 'development') {
  router.post('/dev/clear', async (_req: Request, res: Response) => {
    try {
      await tokenService.clearAllTokens()
      
      res.json({
        success: true,
        message: 'All sessions and tokens cleared (development only)'
      })

      logger.warn('All Live API data cleared - Development only')

    } catch (error) {
      logger.error('Clear operation failed:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to clear data'
      })
    }
  })
}

export default router