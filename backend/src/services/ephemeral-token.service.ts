import { createLogger } from '@/utils/logger'
import { v4 as uuidv4 } from 'uuid'
import { GoogleAuth } from 'google-auth-library'

const logger = createLogger('ephemeral-token-service')

export interface TokenRequest {
  userId: string
  sessionId: string
  scope: string[]
  ttl: number // seconds
}

export interface EphemeralToken {
  token: string
  expiresAt: Date
  userId: string
  sessionId: string
  scope: string[]
  isActive: boolean
}

export interface TokenValidationResult {
  isValid: boolean
  token?: EphemeralToken
  error?: string
}

/**
 * Ephemeral Token Service for Live API
 * クライアント側でのセキュアなLive API接続用の一時トークン管理
 * β版実装 - セキュリティベストプラクティスに従った実装
 */
export class EphemeralTokenService {
  private activeTokens: Map<string, EphemeralToken> = new Map()
  private auth: GoogleAuth
  private projectId: string
  private defaultTTL: number = 3600 // 1時間
  private maxTTL: number = 7200 // 2時間

  constructor() {
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.LIVE_API_PROJECT_ID || ''
    
    if (!this.projectId) {
      throw new Error('Project ID not configured - GOOGLE_CLOUD_PROJECT or LIVE_API_PROJECT_ID required')
    }

    this.auth = new GoogleAuth({
      keyFilename: process.env.LIVE_API_SERVICE_ACCOUNT_KEY,
      scopes: [
        'https://www.googleapis.com/auth/generative-language.retriever',
        'https://www.googleapis.com/auth/cloud-platform'
      ]
    })

    this.startCleanupTask()
    
    logger.info('Ephemeral Token Service initialized (β版)', {
      projectId: this.projectId,
      defaultTTL: this.defaultTTL,
      maxTTL: this.maxTTL
    })
  }

  /**
   * 一時トークンを生成
   */
  async generateToken(request: TokenRequest): Promise<EphemeralToken> {
    try {
      // TTL検証
      const ttl = Math.min(request.ttl || this.defaultTTL, this.maxTTL)
      
      // スコープ検証
      const validatedScope = this.validateScope(request.scope)
      
      // β版実装: 簡易トークン生成
      // 本格実装では Google Live API の公式エンドポイントを使用
      const tokenString = await this.createTokenString(request.userId, request.sessionId, validatedScope)
      
      const expiresAt = new Date(Date.now() + ttl * 1000)
      
      const token: EphemeralToken = {
        token: tokenString,
        expiresAt,
        userId: request.userId,
        sessionId: request.sessionId,
        scope: validatedScope,
        isActive: true
      }

      // トークンをメモリに保存（β版）
      this.activeTokens.set(tokenString, token)

      logger.info('Ephemeral token generated', {
        userId: request.userId,
        sessionId: request.sessionId,
        scope: validatedScope,
        expiresAt: expiresAt.toISOString(),
        ttl
      })

      return token

    } catch (error) {
      logger.error('Token generation failed:', error)
      throw new Error(`Token generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * トークンの検証
   */
  async validateToken(tokenString: string): Promise<TokenValidationResult> {
    try {
      const token = this.activeTokens.get(tokenString)
      
      if (!token) {
        return {
          isValid: false,
          error: 'Token not found'
        }
      }

      if (!token.isActive) {
        return {
          isValid: false,
          error: 'Token is inactive'
        }
      }

      if (token.expiresAt <= new Date()) {
        // トークン期限切れ
        token.isActive = false
        this.activeTokens.delete(tokenString)
        
        return {
          isValid: false,
          error: 'Token expired'
        }
      }

      return {
        isValid: true,
        token
      }

    } catch (error) {
      logger.error('Token validation error:', error)
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Validation error'
      }
    }
  }

  /**
   * トークンの無効化
   */
  async revokeToken(tokenString: string): Promise<boolean> {
    try {
      const token = this.activeTokens.get(tokenString)
      
      if (token) {
        token.isActive = false
        this.activeTokens.delete(tokenString)
        
        logger.info('Token revoked', {
          userId: token.userId,
          sessionId: token.sessionId
        })
        
        return true
      }
      
      return false

    } catch (error) {
      logger.error('Token revocation error:', error)
      return false
    }
  }

  /**
   * ユーザーの全トークンを無効化
   */
  async revokeUserTokens(userId: string): Promise<number> {
    try {
      let revokedCount = 0
      
      for (const [tokenString, token] of this.activeTokens.entries()) {
        if (token.userId === userId && token.isActive) {
          token.isActive = false
          this.activeTokens.delete(tokenString)
          revokedCount++
        }
      }

      logger.info(`Revoked ${revokedCount} tokens for user ${userId}`)
      return revokedCount

    } catch (error) {
      logger.error('User tokens revocation error:', error)
      return 0
    }
  }

  /**
   * セッションの全トークンを無効化
   */
  async revokeSessionTokens(sessionId: string): Promise<number> {
    try {
      let revokedCount = 0
      
      for (const [tokenString, token] of this.activeTokens.entries()) {
        if (token.sessionId === sessionId && token.isActive) {
          token.isActive = false
          this.activeTokens.delete(tokenString)
          revokedCount++
        }
      }

      logger.info(`Revoked ${revokedCount} tokens for session ${sessionId}`)
      return revokedCount

    } catch (error) {
      logger.error('Session tokens revocation error:', error)
      return 0
    }
  }

  /**
   * アクティブトークン数の取得
   */
  getActiveTokenCount(): number {
    return Array.from(this.activeTokens.values())
      .filter(token => token.isActive && token.expiresAt > new Date()).length
  }

  /**
   * ユーザーのアクティブトークン数
   */
  getUserActiveTokenCount(userId: string): number {
    return Array.from(this.activeTokens.values())
      .filter(token => 
        token.userId === userId && 
        token.isActive && 
        token.expiresAt > new Date()
      ).length
  }

  /**
   * Google認証トークンの取得
   */
  async getServiceAccountToken(): Promise<string> {
    try {
      const client = await this.auth.getClient()
      const accessToken = await client.getAccessToken()
      
      if (!accessToken.token) {
        throw new Error('Failed to obtain service account access token')
      }

      return accessToken.token

    } catch (error) {
      logger.error('Service account token error:', error)
      throw new Error(`Service account authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * サービス状態の取得
   */
  getServiceStatus() {
    const activeCount = this.getActiveTokenCount()
    
    return {
      serviceName: 'Ephemeral Token Service (β版)',
      status: 'operational',
      activeTokens: activeCount,
      totalTokensInMemory: this.activeTokens.size,
      projectId: this.projectId,
      defaultTTL: this.defaultTTL,
      maxTTL: this.maxTTL,
      features: [
        'Secure token generation',
        'Token validation',
        'Automatic token expiration',
        'User/Session token management',
        'Service account integration'
      ],
      limitations: [
        'Beta implementation',
        'In-memory token storage',
        'Limited to development environment',
        'No persistent token storage'
      ]
    }
  }

  /**
   * スコープの検証
   */
  private validateScope(scope: string[]): string[] {
    const validScopes = [
      'live-api-access',
      'audio-streaming',
      'text-generation',
      'rap-battle'
    ]

    const validated = scope.filter(s => validScopes.includes(s))
    
    if (validated.length === 0) {
      validated.push('live-api-access') // デフォルトスコープ
    }

    return validated
  }

  /**
   * トークン文字列の生成（β版実装）
   */
  private async createTokenString(userId: string, sessionId: string, scope: string[]): Promise<string> {
    // β版では簡易的なトークン生成
    // 本格実装では Google Live API の公式エンドポイントを使用
    
    const timestamp = Date.now()
    const randomId = uuidv4()
    const payload = {
      userId,
      sessionId,
      scope,
      timestamp,
      randomId
    }

    // Base64エンコード（β版実装）
    const tokenData = Buffer.from(JSON.stringify(payload)).toString('base64')
    return `live_token_${tokenData}_${randomId.slice(0, 8)}`
  }

  /**
   * 期限切れトークンのクリーンアップタスク
   */
  private startCleanupTask(): void {
    setInterval(() => {
      this.cleanupExpiredTokens()
    }, 5 * 60 * 1000) // 5分ごと

    logger.info('Token cleanup task started')
  }

  /**
   * 期限切れトークンのクリーンアップ
   */
  private cleanupExpiredTokens(): void {
    const now = new Date()
    let cleanedCount = 0

    for (const [tokenString, token] of this.activeTokens.entries()) {
      if (token.expiresAt <= now || !token.isActive) {
        this.activeTokens.delete(tokenString)
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} expired tokens`)
    }
  }

  /**
   * 開発用：すべてのトークンをクリア
   */
  async clearAllTokens(): Promise<void> {
    const count = this.activeTokens.size
    this.activeTokens.clear()
    
    logger.warn(`Cleared all tokens (${count} tokens removed) - Development only`)
  }
}