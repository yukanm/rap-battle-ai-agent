import { Server as SocketIOServer, Socket } from 'socket.io'
import { LiveAPIService, LiveSessionConfig, LiveResponse } from '@/services/live-api.service'
import { AudioProcessorService, AudioConfig, ProcessedAudio } from '@/services/audio-processor.service'
import { createLogger } from '@/utils/logger'

const logger = createLogger('live-api-manager')

export interface LiveBattleParticipant {
  socketId: string
  userId: string
  userName: string
  sessionId?: string
  isReady: boolean
  isActive: boolean
}

export interface LiveBattleRoom {
  id: string
  theme: string
  participants: LiveBattleParticipant[]
  createdAt: Date
  isActive: boolean
  turnCount: number
  maxTurns: number
}

export interface LiveAudioMessage {
  type: 'audio_chunk' | 'audio_end' | 'text_input' | 'battle_action'
  sessionId?: string
  battleId?: string
  data?: Buffer | string
  metadata?: any
}

export interface LiveBattleEvent {
  type: 'battle_start' | 'battle_turn' | 'battle_end' | 'participant_join' | 'participant_leave' | 'error'
  battleId: string
  data: any
  timestamp: Date
}

/**
 * Live API WebSocket Manager
 * リアルタイムラップバトル用WebSocket管理
 * β版実装 - 既存のWebSocketシステムと並行動作
 */
export class LiveAPIManager {
  private io: SocketIOServer
  private liveApiService: LiveAPIService
  private audioProcessor: AudioProcessorService
  private activeBattles: Map<string, LiveBattleRoom> = new Map()
  private userSessions: Map<string, string> = new Map() // userId -> sessionId

  constructor(io: SocketIOServer) {
    this.io = io
    this.liveApiService = new LiveAPIService()
    this.audioProcessor = new AudioProcessorService()
    
    this.setupEventHandlers()
    this.startCleanupTasks()
    
    logger.info('Live API Manager initialized (β版)')
  }

  /**
   * WebSocketイベントハンドラーの設定
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      logger.info(`Live API client connected: ${socket.id}`)

      // Live Battle関連イベント
      socket.on('live-battle-join', this.handleLiveBattleJoin.bind(this, socket))
      socket.on('live-battle-start', this.handleLiveBattleStart.bind(this, socket))
      socket.on('live-battle-leave', this.handleLiveBattleLeave.bind(this, socket))
      
      // オーディオストリーミングイベント
      socket.on('audio-stream-start', this.handleAudioStreamStart.bind(this, socket))
      socket.on('audio-chunk', this.handleAudioChunk.bind(this, socket))
      socket.on('audio-stream-end', this.handleAudioStreamEnd.bind(this, socket))
      
      // テキスト入力イベント
      socket.on('text-input', this.handleTextInput.bind(this, socket))
      
      // 切断処理
      socket.on('disconnect', this.handleDisconnect.bind(this, socket))
    })
  }

  /**
   * ライブバトルへの参加
   */
  private async handleLiveBattleJoin(socket: Socket, data: {
    battleId: string
    userId: string
    userName: string
    theme: string
    rapperStyle: string
  }): Promise<void> {
    try {
      const { battleId, userId, userName, theme, rapperStyle } = data

      // バトルルーム取得または作成
      let battle = this.activeBattles.get(battleId)
      if (!battle) {
        battle = {
          id: battleId,
          theme,
          participants: [],
          createdAt: new Date(),
          isActive: false,
          turnCount: 0,
          maxTurns: 10
        }
        this.activeBattles.set(battleId, battle)
      }

      // 参加者追加
      const participant: LiveBattleParticipant = {
        socketId: socket.id,
        userId,
        userName,
        isReady: false,
        isActive: false
      }

      battle.participants.push(participant)
      socket.join(battleId)

      // ライブセッション作成
      const sessionConfig: LiveSessionConfig = {
        userId,
        battleId,
        theme,
        rapperStyle
      }

      const sessionId = await this.liveApiService.createLiveSession(sessionConfig)
      participant.sessionId = sessionId
      this.userSessions.set(userId, sessionId)

      // 参加通知
      const joinEvent: LiveBattleEvent = {
        type: 'participant_join',
        battleId,
        data: {
          participant,
          totalParticipants: battle.participants.length
        },
        timestamp: new Date()
      }

      socket.emit('live-battle-joined', {
        success: true,
        battleId,
        sessionId,
        participant
      })

      socket.to(battleId).emit('live-battle-event', joinEvent)

      logger.info(`User ${userId} joined live battle ${battleId}`, {
        sessionId,
        participantCount: battle.participants.length
      })

    } catch (error) {
      logger.error('Live battle join error:', error)
      socket.emit('live-battle-error', {
        error: 'バトルへの参加に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * ライブバトル開始
   */
  private async handleLiveBattleStart(socket: Socket, data: {
    battleId: string
    userId: string
  }): Promise<void> {
    try {
      const { battleId } = data
      const battle = this.activeBattles.get(battleId)

      if (!battle) {
        throw new Error(`Battle not found: ${battleId}`)
      }

      // 参加者が2人以上いるかチェック
      if (battle.participants.length < 2) {
        socket.emit('live-battle-error', {
          error: 'バトル開始には2人以上の参加者が必要です'
        })
        return
      }

      // バトル開始
      battle.isActive = true
      battle.participants.forEach(p => p.isActive = true)

      const startEvent: LiveBattleEvent = {
        type: 'battle_start',
        battleId,
        data: {
          participants: battle.participants,
          theme: battle.theme,
          maxTurns: battle.maxTurns
        },
        timestamp: new Date()
      }

      this.io.to(battleId).emit('live-battle-event', startEvent)

      logger.info(`Live battle started: ${battleId}`, {
        participantCount: battle.participants.length,
        theme: battle.theme
      })

    } catch (error) {
      logger.error('Live battle start error:', error)
      socket.emit('live-battle-error', {
        error: 'バトルの開始に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * 音声ストリーミング開始
   */
  private async handleAudioStreamStart(socket: Socket, data: {
    sessionId: string
    audioConfig: AudioConfig
  }): Promise<void> {
    try {
      const { sessionId, audioConfig } = data
      
      const sessionState = this.liveApiService.getSessionState(sessionId)
      if (!sessionState) {
        throw new Error(`Invalid session: ${sessionId}`)
      }

      socket.emit('audio-stream-ready', {
        sessionId,
        targetConfig: {
          sampleRate: 16000,
          channels: 1,
          bitDepth: 16,
          format: 'pcm'
        }
      })

      logger.info(`Audio streaming started for session: ${sessionId}`, {
        audioConfig
      })

    } catch (error) {
      logger.error('Audio stream start error:', error)
      socket.emit('audio-stream-error', {
        error: '音声ストリーミングの開始に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * 音声チャンク処理
   */
  private async handleAudioChunk(socket: Socket, data: {
    sessionId: string
    audioData: Buffer
    audioConfig: AudioConfig
  }): Promise<void> {
    try {
      const { sessionId, audioData, audioConfig } = data

      // 音声データ処理
      const processedAudio: ProcessedAudio = await this.audioProcessor.convertAudioFormat(
        audioData,
        audioConfig
      )

      // 音声アクティビティチェック
      if (!processedAudio.activity.hasVoice) {
        // 音声が検出されない場合はスキップ
        return
      }

      // Live APIで応答生成
      const liveResponse: LiveResponse = await this.liveApiService.streamAudio(
        sessionId,
        processedAudio.processedData
      )

      // バトルイベントとして配信
      const battle = this.findBattleBySessionId(sessionId)
      if (battle) {
        const turnEvent: LiveBattleEvent = {
          type: 'battle_turn',
          battleId: battle.id,
          data: {
            sessionId,
            response: liveResponse,
            audioMetadata: processedAudio.metadata,
            turnNumber: ++battle.turnCount
          },
          timestamp: new Date()
        }

        this.io.to(battle.id).emit('live-battle-event', turnEvent)
      }

      socket.emit('live-response', liveResponse)

      logger.debug(`Audio chunk processed for session: ${sessionId}`, {
        audioSize: audioData.length,
        hasVoice: processedAudio.activity.hasVoice,
        responseType: liveResponse.type
      })

    } catch (error) {
      logger.error('Audio chunk processing error:', error)
      socket.emit('audio-stream-error', {
        error: '音声処理でエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * テキスト入力処理
   */
  private async handleTextInput(socket: Socket, data: {
    sessionId: string
    text: string
  }): Promise<void> {
    try {
      const { sessionId, text } = data

      // Live APIで応答生成
      const liveResponse: LiveResponse = await this.liveApiService.generateLiveResponse(
        sessionId,
        text
      )

      // バトルイベントとして配信
      const battle = this.findBattleBySessionId(sessionId)
      if (battle) {
        const turnEvent: LiveBattleEvent = {
          type: 'battle_turn',
          battleId: battle.id,
          data: {
            sessionId,
            inputText: text,
            response: liveResponse,
            turnNumber: ++battle.turnCount
          },
          timestamp: new Date()
        }

        this.io.to(battle.id).emit('live-battle-event', turnEvent)

        // バトル終了条件チェック
        if (battle.turnCount >= battle.maxTurns) {
          await this.endBattle(battle.id)
        }
      }

      socket.emit('live-response', liveResponse)

      logger.info(`Text input processed for session: ${sessionId}`, {
        inputLength: text.length,
        responseType: liveResponse.type
      })

    } catch (error) {
      logger.error('Text input processing error:', error)
      socket.emit('live-response-error', {
        error: 'テキスト処理でエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * 音声ストリーミング終了
   */
  private async handleAudioStreamEnd(socket: Socket, data: {
    sessionId: string
  }): Promise<void> {
    try {
      const { sessionId } = data

      socket.emit('audio-stream-ended', { sessionId })

      logger.info(`Audio streaming ended for session: ${sessionId}`)

    } catch (error) {
      logger.error('Audio stream end error:', error)
    }
  }

  /**
   * ライブバトル離脱
   */
  private async handleLiveBattleLeave(socket: Socket, data: {
    battleId: string
    userId: string
  }): Promise<void> {
    try {
      const { battleId, userId } = data
      await this.removeParticipantFromBattle(battleId, userId, socket.id)

    } catch (error) {
      logger.error('Live battle leave error:', error)
    }
  }

  /**
   * 切断処理
   */
  private async handleDisconnect(socket: Socket): Promise<void> {
    try {
      // 参加中のバトルから除去
      for (const [battleId, battle] of this.activeBattles) {
        const participant = battle.participants.find(p => p.socketId === socket.id)
        if (participant) {
          await this.removeParticipantFromBattle(battleId, participant.userId, socket.id)
          break
        }
      }

      logger.info(`Live API client disconnected: ${socket.id}`)

    } catch (error) {
      logger.error('Disconnect handling error:', error)
    }
  }

  /**
   * バトルからの参加者除去
   */
  private async removeParticipantFromBattle(battleId: string, userId: string, socketId: string): Promise<void> {
    const battle = this.activeBattles.get(battleId)
    if (!battle) return

    // 参加者除去
    battle.participants = battle.participants.filter(p => p.socketId !== socketId)

    // セッション終了
    const sessionId = this.userSessions.get(userId)
    if (sessionId) {
      await this.liveApiService.endLiveSession(sessionId)
      this.userSessions.delete(userId)
    }

    // 離脱通知
    const leaveEvent: LiveBattleEvent = {
      type: 'participant_leave',
      battleId,
      data: {
        userId,
        remainingParticipants: battle.participants.length
      },
      timestamp: new Date()
    }

    this.io.to(battleId).emit('live-battle-event', leaveEvent)

    // 参加者がいなくなったらバトル終了
    if (battle.participants.length === 0) {
      await this.endBattle(battleId)
    }

    logger.info(`Participant ${userId} removed from battle ${battleId}`)
  }

  /**
   * バトル終了
   */
  private async endBattle(battleId: string): Promise<void> {
    const battle = this.activeBattles.get(battleId)
    if (!battle) return

    battle.isActive = false

    const endEvent: LiveBattleEvent = {
      type: 'battle_end',
      battleId,
      data: {
        reason: battle.participants.length === 0 ? 'no_participants' : 'max_turns_reached',
        finalTurnCount: battle.turnCount,
        duration: Date.now() - battle.createdAt.getTime()
      },
      timestamp: new Date()
    }

    this.io.to(battleId).emit('live-battle-event', endEvent)

    // セッション終了
    for (const participant of battle.participants) {
      if (participant.sessionId) {
        await this.liveApiService.endLiveSession(participant.sessionId)
      }
    }

    // バトル除去
    this.activeBattles.delete(battleId)

    logger.info(`Battle ended: ${battleId}`, {
      turnCount: battle.turnCount,
      participantCount: battle.participants.length
    })
  }

  /**
   * セッションIDからバトルを検索
   */
  private findBattleBySessionId(sessionId: string): LiveBattleRoom | undefined {
    for (const battle of this.activeBattles.values()) {
      const participant = battle.participants.find(p => p.sessionId === sessionId)
      if (participant) {
        return battle
      }
    }
    return undefined
  }

  /**
   * クリーンアップタスク開始
   */
  private startCleanupTasks(): void {
    // 非アクティブバトルのクリーンアップ
    setInterval(() => {
      const now = new Date()
      const maxInactiveTime = 60 * 60 * 1000 // 1時間

      for (const [battleId, battle] of this.activeBattles) {
        const inactiveTime = now.getTime() - battle.createdAt.getTime()
        
        if (!battle.isActive && inactiveTime > maxInactiveTime) {
          logger.info(`Cleaning up inactive battle: ${battleId}`)
          this.endBattle(battleId)
        }
      }
    }, 15 * 60 * 1000) // 15分ごと

    logger.info('Live API cleanup tasks started')
  }

  /**
   * サービス状態取得
   */
  getServiceStatus() {
    return {
      serviceName: 'Live API Manager (β版)',
      status: 'operational',
      activeBattles: this.activeBattles.size,
      activeSessions: this.liveApiService.getActiveSessionCount(),
      features: [
        'Real-time rap battles',
        'Audio streaming support',
        'Text input support',
        'WebSocket communication',
        'Session management'
      ],
      limitations: [
        'Beta implementation',
        'Limited to development environment',
        'Basic audio processing',
        'No persistent storage'
      ]
    }
  }
}