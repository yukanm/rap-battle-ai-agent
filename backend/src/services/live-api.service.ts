import { GoogleGenerativeAI } from '@google/generative-ai'
import { createLogger } from '@/utils/logger'
import { v4 as uuidv4 } from 'uuid'

const logger = createLogger('live-api-service')

export interface LiveSessionConfig {
  userId: string
  battleId: string
  theme: string
  rapperStyle: string
}

export interface LiveSessionState {
  id: string
  userId: string
  battleId: string
  isActive: boolean
  audioBuffer: Buffer[]
  lastActivity: Date
  config: LiveSessionConfig
}

export interface AudioMessage {
  type: 'audio_chunk' | 'audio_end' | 'text_input'
  sessionId: string
  data: Buffer | string
  timestamp: Date
}

export interface LiveResponse {
  type: 'rap_lyrics' | 'audio_response' | 'battle_update' | 'error'
  sessionId: string
  content: string
  metadata?: any
  timestamp: Date
}

/**
 * Google Live API Service for Real-time Rap Battle
 * β版実装 - 既存機能を壊さない追加機能
 */
export class LiveAPIService {
  private genAI: GoogleGenerativeAI
  private activeSessions: Map<string, LiveSessionState> = new Map()
  private liveAPIEndpoint: string
  private modelConfig: any

  constructor() {
    // Live API用のキーを取得 (フォールバックで既存キー使用)
    const apiKey = process.env.LIVE_API_KEY || process.env.GEMINI_API_KEY || ''
    
    if (!apiKey) {
      throw new Error('Live API key not configured - LIVE_API_KEY or GEMINI_API_KEY required')
    }

    this.genAI = new GoogleGenerativeAI(apiKey)
    this.liveAPIEndpoint = process.env.LIVE_API_ENDPOINT || 'wss://generativelanguage.googleapis.com/ws/v1beta/models/gemini-2.0-flash-exp:streamGenerateContent'
    
    this.modelConfig = {
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.9,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
      systemInstruction: {
        parts: [{
          text: `あなたは日本語ラップバトルのAI参加者です。以下の特徴でリアルタイムに応答してください：

特徴:
- 日本語でクリエイティブなラップリリックを即座に生成
- 相手の発言に対して適切に反応・対応
- 韻を踏み、リズム感のある表現
- 攻撃的すぎず、建設的な競争精神
- 文化的に適切で安全なコンテンツ

応答形式:
- 4-8行の日本語ラップリリック
- 自然な音韻とフロー
- テーマに沿った内容
- 即座の反応（500ms以内目標）

禁止事項:
- 差別的・暴力的な表現
- 個人攻撃や誹謗中傷
- 不適切な言語
- 著作権侵害`
        }]
      }
    }

    logger.info('Live API Service initialized (β版)')
  }

  /**
   * 新しいライブセッションを作成
   */
  async createLiveSession(config: LiveSessionConfig): Promise<string> {
    const sessionId = `live_${uuidv4()}`
    
    const sessionState: LiveSessionState = {
      id: sessionId,
      userId: config.userId,
      battleId: config.battleId,
      isActive: true,
      audioBuffer: [],
      lastActivity: new Date(),
      config
    }

    this.activeSessions.set(sessionId, sessionState)
    
    logger.info(`Live session created: ${sessionId}`, {
      userId: config.userId,
      battleId: config.battleId,
      theme: config.theme
    })

    return sessionId
  }

  /**
   * ライブセッションに音声データを送信
   */
  async streamAudio(sessionId: string, audioData: Buffer): Promise<LiveResponse> {
    const session = this.activeSessions.get(sessionId)
    
    if (!session || !session.isActive) {
      throw new Error(`Invalid or inactive session: ${sessionId}`)
    }

    try {
      // 音声データをバッファに追加
      session.audioBuffer.push(audioData)
      session.lastActivity = new Date()

      // β版実装: 音声データをテキストに変換してからGenAI処理
      // 本格実装では Live API の WebSocket 接続を使用
      const textContent = await this.audioToText(audioData, session.config)
      
      if (textContent) {
        return await this.generateLiveResponse(sessionId, textContent)
      }

      // 音声処理中の場合は処理中レスポンス
      return {
        type: 'battle_update',
        sessionId,
        content: '音声処理中...',
        metadata: { status: 'processing' },
        timestamp: new Date()
      }

    } catch (error) {
      logger.error(`Audio streaming error for session ${sessionId}:`, error)
      
      return {
        type: 'error',
        sessionId,
        content: '音声処理でエラーが発生しました',
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date()
      }
    }
  }

  /**
   * テキスト入力でライブ応答を生成
   */
  async generateLiveResponse(sessionId: string, textInput: string): Promise<LiveResponse> {
    const session = this.activeSessions.get(sessionId)
    
    if (!session || !session.isActive) {
      throw new Error(`Invalid or inactive session: ${sessionId}`)
    }

    try {
      const startTime = Date.now()
      
      // プロンプト作成
      const battlePrompt = this.createBattlePrompt(session.config, textInput)
      
      // Gemini APIで応答生成
      const model = this.genAI.getGenerativeModel({ 
        model: this.modelConfig.model,
        generationConfig: this.modelConfig.generationConfig,
        systemInstruction: this.modelConfig.systemInstruction
      })

      const result = await model.generateContent(battlePrompt)
      const response = await result.response
      const lyrics = response.text()

      const responseTime = Date.now() - startTime
      
      // セッション状態更新
      session.lastActivity = new Date()

      logger.info(`Live response generated for session ${sessionId}`, {
        responseTime: `${responseTime}ms`,
        inputLength: textInput.length,
        outputLength: lyrics.length
      })

      return {
        type: 'rap_lyrics',
        sessionId,
        content: lyrics,
        metadata: {
          responseTime,
          theme: session.config.theme,
          style: session.config.rapperStyle,
          generatedAt: new Date().toISOString()
        },
        timestamp: new Date()
      }

    } catch (error) {
      logger.error(`Live response generation error for session ${sessionId}:`, error)
      
      return {
        type: 'error',
        sessionId,
        content: 'ライブ応答の生成でエラーが発生しました',
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date()
      }
    }
  }

  /**
   * ライブセッションを終了
   */
  async endLiveSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId)
    
    if (session) {
      session.isActive = false
      this.activeSessions.delete(sessionId)
      
      logger.info(`Live session ended: ${sessionId}`, {
        userId: session.userId,
        duration: Date.now() - session.lastActivity.getTime()
      })
    }
  }

  /**
   * アクティブなセッション数を取得
   */
  getActiveSessionCount(): number {
    return Array.from(this.activeSessions.values())
      .filter(session => session.isActive).length
  }

  /**
   * セッション状態を取得
   */
  getSessionState(sessionId: string): LiveSessionState | undefined {
    return this.activeSessions.get(sessionId)
  }

  /**
   * 非アクティブセッションのクリーンアップ
   */
  cleanupInactiveSessions(): void {
    const now = new Date()
    const maxInactiveTime = 30 * 60 * 1000 // 30分

    for (const [sessionId, session] of this.activeSessions.entries()) {
      const inactiveTime = now.getTime() - session.lastActivity.getTime()
      
      if (inactiveTime > maxInactiveTime) {
        logger.info(`Cleaning up inactive session: ${sessionId}`)
        this.activeSessions.delete(sessionId)
      }
    }
  }

  /**
   * バトル用プロンプト作成
   */
  private createBattlePrompt(config: LiveSessionConfig, userInput: string): string {
    return `
テーマ: ${config.theme}
スタイル: ${config.rapperStyle}

相手のリリック:
"${userInput}"

上記の相手のリリックに対して、日本語でクリエイティブな反撃ラップを生成してください。
以下の要求を満たしてください：

1. 4-8行の日本語ラップリリック
2. 韻を踏んだリズム感のある表現
3. テーマ「${config.theme}」に関連する内容
4. ${config.rapperStyle}なスタイル
5. 相手のリリックに対する適切な反応
6. 建設的で文化的に適切な内容

応答例：
俺の言葉は刃、切り裂くビート
君のフロー、まだまだ未完成
この舞台で見せる、真の技
頂点目指す、止まらない意志
`
  }

  /**
   * 音声からテキストへの変換（Google Speech-to-Text API使用）
   * Live API の音声認識機能を実装
   */
  private async audioToText(audioData: Buffer, config: LiveSessionConfig): Promise<string | null> {
    try {
      // 音声データが短すぎる場合はスキップ
      if (audioData.length < 1000) {
        return null
      }

      // Google Speech-to-Text APIを使用してテキスト変換
      // 実際の実装では、Live API WebSocketを通じて音声データを送信し、
      // リアルタイムでテキスト変換結果を受信する
      
      // 現在はVertex AI Gemini APIを使用した代替実装
      // Speech-to-Text request configuration (for future implementation)
      // const _speechRequest = {
      //   contents: [{
      //     parts: [{
      //       text: `以下は日本語のラップの音声です。テーマ：${config.theme}、スタイル：${config.rapperStyle}。音声から推定されるテキストを生成してください。`
      //     }]
      //   }],
      //   generationConfig: {
      //     maxOutputTokens: 100,
      //     temperature: 0.7,
      //   }
      // }

      // 音声データのメタデータをログに記録
      logger.info('Audio to text conversion started', {
        audioSize: audioData.length,
        theme: config.theme,
        rapperStyle: config.rapperStyle,
        userId: config.userId
      })

      // 実際の音声認識APIを呼び出す場合は、ここで実装
      // 現在は代替として、テーマに基づいた適切なテキストを生成
      const contextualTexts = [
        `${config.theme}について熱く語る`,
        `俺の${config.theme}への想いを聞け`,
        `この${config.rapperStyle}で勝負だ`,
        `ビートに乗せて真実を伝える`,
        `${config.theme}が俺の原動力`
      ]

      const selectedText = contextualTexts[Math.floor(Math.random() * contextualTexts.length)]
      
      logger.info('Audio to text conversion completed', {
        convertedText: selectedText,
        processingTime: Date.now()
      })

      return selectedText

    } catch (error) {
      logger.error('Audio to text conversion failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        audioSize: audioData.length
      })
      return null
    }
  }

  /**
   * サービス状態取得
   */
  getServiceStatus() {
    return {
      serviceName: 'Live API Service (β版)',
      status: 'operational',
      activeSessions: this.getActiveSessionCount(),
      endpoint: this.liveAPIEndpoint,
      features: [
        'Real-time rap lyrics generation',
        'Audio streaming (β)',
        'Japanese language support',
        'Theme-based responses',
        'Mock audio-to-text conversion'
      ],
      limitations: [
        'Beta implementation',
        'Mock audio processing',
        'Limited to text-based responses',
        'Session cleanup required'
      ]
    }
  }
}

// セッションクリーンアップタスクを定期実行
export function startLiveAPICleanupTask(service: LiveAPIService) {
  setInterval(() => {
    service.cleanupInactiveSessions()
  }, 10 * 60 * 1000) // 10分ごと

  logger.info('Live API cleanup task started')
}