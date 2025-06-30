'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { io, Socket } from 'socket.io-client'
import toast from 'react-hot-toast'

export interface LiveSession {
  sessionId: string
  userId: string
  battleId: string
  theme: string
  rapperStyle: string
  isActive: boolean
}

export interface LiveResponse {
  type: 'rap_lyrics' | 'audio_response' | 'battle_update' | 'error'
  sessionId: string
  content: string
  metadata?: any
  timestamp: Date
}

export interface LiveBattleEvent {
  type: 'battle_start' | 'battle_turn' | 'battle_end' | 'participant_join' | 'participant_leave' | 'error'
  battleId: string
  data: any
  timestamp: Date
}

export interface AudioConfig {
  sampleRate: number
  channels: 1 | 2
  bitDepth: number
  format: 'wav' | 'webm' | 'mp3'
}

export interface LiveAPIHookReturn {
  // セッション管理
  createSession: (config: {
    userId: string
    battleId: string
    theme: string
    rapperStyle: string
  }) => Promise<LiveSession>
  endSession: () => Promise<void>
  session: LiveSession | null
  
  // WebSocket接続
  connect: () => void
  disconnect: () => void
  isConnected: boolean
  
  // バトル管理
  joinBattle: (battleId: string, userName: string) => Promise<void>
  leaveBattle: () => Promise<void>
  startBattle: () => Promise<void>
  
  // テキスト送信
  sendText: (text: string) => Promise<void>
  
  // 音声ストリーミング
  startAudioStream: () => Promise<void>
  sendAudioChunk: (audioData: ArrayBuffer) => void
  stopAudioStream: () => void
  isAudioStreaming: boolean
  
  // 状態
  isLoading: boolean
  error: string | null
  responses: LiveResponse[]
  battleEvents: LiveBattleEvent[]
  
  // トークン管理
  generateToken: () => Promise<string>
  
  // ユーティリティ
  clearResponses: () => void
  clearBattleEvents: () => void
}

/**
 * Live API Hook for Real-time Rap Battles
 * β版実装 - WebSocketとREST APIを組み合わせたリアルタイム機能
 */
export function useLiveAPI(): LiveAPIHookReturn {
  // State
  const [session, setSession] = useState<LiveSession | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [responses, setResponses] = useState<LiveResponse[]>([])
  const [battleEvents, setBattleEvents] = useState<LiveBattleEvent[]>([])
  const [isAudioStreaming, setIsAudioStreaming] = useState(false)
  const [isClient, setIsClient] = useState(false)
  
  // Refs
  const socketRef = useRef<Socket | null>(null)
  const tokenRef = useRef<string | null>(null)
  
  // Client-side check
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  // API URL - safe for SSR
  const apiUrl = useMemo(() => {
    if (typeof window === 'undefined') return '' // Server-side
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8456'
  }, [])
  
  const wsUrl = useMemo(() => {
    if (typeof window === 'undefined' || !apiUrl) return '' // Server-side safe
    return apiUrl.replace('http', 'ws')
  }, [apiUrl])

  /**
   * セッション作成
   */
  const createSession = useCallback(async (config: {
    userId: string
    battleId: string
    theme: string
    rapperStyle: string
  }): Promise<LiveSession> => {
    if (typeof window === 'undefined' || !apiUrl) {
      throw new Error('Live API not available on server side')
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${apiUrl}/api/live/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      })

      if (!response.ok) {
        throw new Error(`Session creation failed: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Session creation failed')
      }

      const newSession: LiveSession = {
        sessionId: result.data.sessionId,
        userId: config.userId,
        battleId: config.battleId,
        theme: config.theme,
        rapperStyle: config.rapperStyle,
        isActive: true
      }

      setSession(newSession)
      
      toast.success('ライブセッションが作成されました')
      return newSession

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      toast.error(`セッション作成に失敗: ${errorMessage}`)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [apiUrl])

  /**
   * トークン生成
   */
  const generateToken = useCallback(async (): Promise<string> => {
    if (!session) {
      throw new Error('No active session')
    }

    try {
      const response = await fetch(`${apiUrl}/api/live/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.userId,
          sessionId: session.sessionId,
          scope: ['live-api-access', 'audio-streaming'],
          ttl: 3600
        }),
      })

      if (!response.ok) {
        throw new Error(`Token generation failed: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Token generation failed')
      }

      tokenRef.current = result.data.token
      return result.data.token

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    }
  }, [session, apiUrl])

  /**
   * WebSocket接続
   */
  const connect = useCallback(() => {
    if (typeof window === 'undefined' || !wsUrl) {
      return
    }
    
    if (socketRef.current?.connected) {
      return
    }

    try {
      socketRef.current = io(wsUrl, {
        auth: {
          token: tokenRef.current
        },
        transports: ['websocket']
      })

      const socket = socketRef.current

      socket.on('connect', () => {
        setIsConnected(true)
        setError(null)
        toast.success('WebSocket接続が確立されました')
      })

      socket.on('disconnect', () => {
        setIsConnected(false)
        toast.error('WebSocket接続が切断されました')
      })

      socket.on('live-response', (response: LiveResponse) => {
        setResponses(prev => [...prev, response])
      })

      socket.on('live-battle-event', (event: LiveBattleEvent) => {
        setBattleEvents(prev => [...prev, event])
        
        // イベントタイプ別の処理
        switch (event.type) {
          case 'battle_start':
            toast.success('バトルが開始されました！')
            break
          case 'battle_end':
            toast('バトルが終了しました')
            break
          case 'participant_join':
            toast(`${event.data.participant?.userName || '参加者'}が参加しました`)
            break
          case 'participant_leave':
            toast('参加者が離脱しました')
            break
        }
      })

      socket.on('live-battle-error', (data: { error: string, details?: string }) => {
        setError(data.error)
        toast.error(`バトルエラー: ${data.error}`)
      })

      socket.on('audio-stream-ready', () => {
        setIsAudioStreaming(true)
        toast.success('音声ストリーミング準備完了')
      })

      socket.on('audio-stream-error', (data: { error: string }) => {
        setError(data.error)
        setIsAudioStreaming(false)
        toast.error(`音声エラー: ${data.error}`)
      })

      socket.on('error', (error: any) => {
        setError(error.message || 'WebSocket error')
        toast.error(`接続エラー: ${error.message || 'Unknown error'}`)
      })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection failed'
      setError(errorMessage)
      toast.error(`接続失敗: ${errorMessage}`)
    }
  }, [wsUrl])

  /**
   * WebSocket切断
   */
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
      setIsConnected(false)
    }
  }, [])

  /**
   * バトル参加
   */
  const joinBattle = useCallback(async (battleId: string, userName: string) => {
    if (!session || !socketRef.current) {
      throw new Error('No active session or connection')
    }

    setIsLoading(true)
    
    try {
      socketRef.current.emit('live-battle-join', {
        battleId,
        userId: session.userId,
        userName,
        theme: session.theme,
        rapperStyle: session.rapperStyle
      })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Join battle failed'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [session])

  /**
   * バトル開始
   */
  const startBattle = useCallback(async () => {
    if (!session || !socketRef.current) {
      throw new Error('No active session or connection')
    }

    try {
      socketRef.current.emit('live-battle-start', {
        battleId: session.battleId,
        userId: session.userId
      })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Start battle failed'
      setError(errorMessage)
      throw err
    }
  }, [session])

  /**
   * バトル離脱
   */
  const leaveBattle = useCallback(async () => {
    if (!session || !socketRef.current) {
      return
    }

    try {
      socketRef.current.emit('live-battle-leave', {
        battleId: session.battleId,
        userId: session.userId
      })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Leave battle failed'
      setError(errorMessage)
    }
  }, [session])

  /**
   * テキスト送信
   */
  const sendText = useCallback(async (text: string) => {
    if (!session) {
      throw new Error('No active session')
    }

    setIsLoading(true)
    
    try {
      if (socketRef.current?.connected) {
        // WebSocket経由
        socketRef.current.emit('text-input', {
          sessionId: session.sessionId,
          text
        })
      } else {
        // REST API経由（フォールバック）
        const response = await fetch(`${apiUrl}/api/live/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: session.sessionId,
            text
          }),
        })

        if (!response.ok) {
          throw new Error(`Text generation failed: ${response.statusText}`)
        }

        const result = await response.json()
        
        if (!result.success) {
          throw new Error(result.error || 'Text generation failed')
        }

        setResponses(prev => [...prev, result.data])
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Send text failed'
      setError(errorMessage)
      toast.error(`テキスト送信失敗: ${errorMessage}`)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [session, apiUrl])

  /**
   * 音声ストリーミング開始
   */
  const startAudioStream = useCallback(async () => {
    if (!session || !socketRef.current) {
      throw new Error('No active session or connection')
    }

    try {
      const audioConfig: AudioConfig = {
        sampleRate: 16000,
        channels: 1,
        bitDepth: 16,
        format: 'wav'
      }

      socketRef.current.emit('audio-stream-start', {
        sessionId: session.sessionId,
        audioConfig
      })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Start audio stream failed'
      setError(errorMessage)
      throw err
    }
  }, [session])

  /**
   * 音声チャンク送信
   */
  const sendAudioChunk = useCallback((audioData: ArrayBuffer) => {
    if (!session || !socketRef.current?.connected || !isAudioStreaming) {
      return
    }

    try {
      const audioConfig: AudioConfig = {
        sampleRate: 16000,
        channels: 1,
        bitDepth: 16,
        format: 'wav'
      }

      socketRef.current.emit('audio-chunk', {
        sessionId: session.sessionId,
        audioData: Buffer.from(audioData),
        audioConfig
      })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Send audio chunk failed'
      setError(errorMessage)
    }
  }, [session, isAudioStreaming])

  /**
   * 音声ストリーミング停止
   */
  const stopAudioStream = useCallback(() => {
    if (!session || !socketRef.current) {
      return
    }

    try {
      socketRef.current.emit('audio-stream-end', {
        sessionId: session.sessionId
      })
      
      setIsAudioStreaming(false)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Stop audio stream failed'
      setError(errorMessage)
    }
  }, [session])

  /**
   * セッション終了
   */
  const endSession = useCallback(async () => {
    if (!session) {
      return
    }

    setIsLoading(true)
    
    try {
      // WebSocket切断
      disconnect()
      
      // REST API経由でセッション終了
      await fetch(`${apiUrl}/api/live/session/${session.sessionId}`, {
        method: 'DELETE',
      })

      setSession(null)
      setResponses([])
      setBattleEvents([])
      setError(null)
      tokenRef.current = null
      
      toast.success('セッションが終了されました')

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'End session failed'
      setError(errorMessage)
      toast.error(`セッション終了失敗: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }, [session, disconnect, apiUrl])

  /**
   * レスポンスクリア
   */
  const clearResponses = useCallback(() => {
    setResponses([])
  }, [])

  /**
   * バトルイベントクリア
   */
  const clearBattleEvents = useCallback(() => {
    setBattleEvents([])
  }, [])

  // クリーンアップ
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    // セッション管理
    createSession,
    endSession,
    session,
    
    // WebSocket接続
    connect,
    disconnect,
    isConnected,
    
    // バトル管理
    joinBattle,
    leaveBattle,
    startBattle,
    
    // テキスト送信
    sendText,
    
    // 音声ストリーミング
    startAudioStream,
    sendAudioChunk,
    stopAudioStream,
    isAudioStreaming,
    
    // 状態
    isLoading,
    error,
    responses,
    battleEvents,
    
    // トークン管理
    generateToken,
    
    // ユーティリティ
    clearResponses,
    clearBattleEvents
  }
}