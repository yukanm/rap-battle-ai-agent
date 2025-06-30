'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useBattleStore } from '@/store/battleStore'
import type { BattleEvent, WebSocketMessage } from '@/types'
import toast from 'react-hot-toast'

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const { updateBattle, addRound, voteForAI, setBattleId, setBattleStatus, setError, setBattleResult, addLyric } = useBattleStore()

  // attemptReconnect will be defined after connect
  const attemptReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    
    reconnectTimeoutRef.current = setTimeout(() => {
      if (!socketRef.current?.connected) {
        console.log('Attempting to reconnect...')
        const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:8456'
        
        // 本番環境でHTTPSを使用している場合、自動的にWSSに切り替える
        const socketUrl = wsUrl.startsWith('https://') ? wsUrl : wsUrl
        
        socketRef.current = io(socketUrl, {
          transports: ['websocket', 'polling'],
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          upgrade: true,
          // Cloud Run対応のための追加設定
          path: '/socket.io/',
          secure: socketUrl.startsWith('https://'),
          rejectUnauthorized: false, // 開発環境用、本番では true にすることを推奨
        })
        
        // Re-setup event listeners (simplified)
        socketRef.current.on('connect', () => {
          setIsConnected(true)
          setConnectionError(null)
          setReconnectAttempts(0)
        })
      }
    }, 2000)
  }, [])

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return

    const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:8456'
    
    // 本番環境でHTTPSを使用している場合、自動的にWSSに切り替える
    const socketUrl = wsUrl.startsWith('https://') ? wsUrl : wsUrl
    
    socketRef.current = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      upgrade: true,
      // Cloud Run対応のための追加設定
      path: '/socket.io/',
      secure: socketUrl.startsWith('https://'),
      rejectUnauthorized: false, // 開発環境用、本番では true にすることを推奨
    })

    socketRef.current.on('connect', () => {
      console.log('WebSocket connected')
      setIsConnected(true)
      setConnectionError(null)
      setReconnectAttempts(0)
      toast.success('バトルサーバーに接続しました')
    })

    socketRef.current.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason)
      setIsConnected(false)
      if (reason === 'io server disconnect') {
        toast.error('サーバーから切断されました')
      } else if (reason === 'transport close' || reason === 'transport error') {
        // Attempt to reconnect
        toast.error('接続が失われました。再接続中...')
        attemptReconnect()
      }
    })

    socketRef.current.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error)
      setConnectionError(error.message)
      
      if (reconnectAttempts < 3) {
        toast.error(`接続エラー: ${error.message}. 再試行中...`)
      } else {
        toast.error('バトルサーバーへの接続に失敗しました')
        setError('サーバーへの接続ができません')
      }
    })

    // Battle events
    socketRef.current.on('battle_event', (event: BattleEvent) => {
      handleBattleEvent(event)
    })

    // Error events
    socketRef.current.on('error', (error: any) => {
      console.error('WebSocket error:', error)
      const errorMessage = error.message || 'エラーが発生しました'
      toast.error(errorMessage)
      setError(errorMessage)
    })
    
    // Reconnection events
    socketRef.current.on('reconnect', (attemptNumber) => {
      console.log('Reconnected after', attemptNumber, 'attempts')
      toast.success('再接続しました')
      setReconnectAttempts(0)
    })
    
    socketRef.current.on('reconnect_attempt', (attemptNumber) => {
      console.log('Reconnection attempt', attemptNumber)
      setReconnectAttempts(attemptNumber)
    })
    
    socketRef.current.on('reconnect_failed', () => {
      console.error('Reconnection failed')
      toast.error('再接続に失敗しました')
      setError('サーバーへの再接続ができませんでした')
    })
  }, [attemptReconnect])

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
      setIsConnected(false)
    }
  }, [])

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (!socketRef.current?.connected) {
      toast.error('サーバーに接続されていません')
      // Attempt to reconnect and retry
      connect()
      setTimeout(() => {
        if (socketRef.current?.connected) {
          socketRef.current.emit('message', message)
        }
      }, 1000)
      return
    }
    
    try {
      socketRef.current.emit('message', message)
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('メッセージの送信に失敗しました')
    }
  }, [connect])

  const handleBattleEvent = (event: BattleEvent) => {
    console.log('Received battle event:', event)
    try {
      switch (event.type) {
        case 'battle_start':
          setBattleId(event.battleId)
          setBattleStatus('active')
          updateBattle({ status: 'in_progress', id: event.battleId })
          toast.success('バトル開始！')
          break
          
        case 'round_start':
          toast(`バース ${event.data.roundNumber} 開始...`)
          break
          
        case 'lyric_generated':
          // Debug: Log the event data
          console.log('🔍 DEBUG lyric_generated event:', {
            eventType: event.type,
            eventData: event.data,
            hasRound: !!event.data?.round,
            hasIndividualLyric: !!event.data?.lyric,
            roundData: event.data?.round,
            roundNumber: event.data?.roundNumber
          })
          
          // Only handle individual lyric events for real-time display
          // Ignore complete round events to avoid duplicates
          if (event.data.lyric && event.data.participant) {
            // Individual lyric generation (for streaming display)
            console.log('📝 Individual lyric generated:', {
              participant: event.data.participant,
              position: event.data.position,
              verseNumber: event.data.roundNumber
            })
            
            // Add individual lyric to store immediately for real-time display
            if (event.data.roundNumber && event.data.participant && event.data.lyric) {
              addLyric(event.data.roundNumber, event.data.participant, event.data.lyric)
              
              // Show toast when first lyric is generated
              if (event.data.position === 'first') {
                toast(`バース ${event.data.roundNumber} - ${event.data.participant === 'ai1' ? 'MC Flash' : 'MC Gemin'} がリリックを生成しました`)
              }
            }
          } else if (event.data.round) {
            // Complete round event - ignore to avoid duplicates
            console.log('🔄 Complete round event received but ignored (using individual events):', event.data.round.number)
          } else {
            console.error('❌ Invalid lyric_generated event format')
            // Don't show error to user, just log it
          }
          break
          
        case 'audio_ready':
          // Audio URL is available
          if (event.data.audioUrls && event.data.roundNumber) {
            console.log('🎵 Audio ready for round:', event.data.roundNumber, event.data.audioUrls)
            // Don't show toast here as it's premature
            // The audio will be available when the complete round is received
          }
          break
          
        case 'vote_update':
          // Vote updates are handled via store
          break
          
        case 'battle_end':
          setBattleStatus('completed')
          updateBattle({ status: 'completed' })
          
          // バトル評価結果を保存
          if (event.data.winner && event.data.scores) {
            setBattleResult({
              winner: event.data.winner,
              scores: event.data.scores,
              analysis: event.data.analysis,
              breakdown: event.data.breakdown
            })
          }
          
          const winner = event.data.winner === 'ai1' ? 'MC フラッシュ' : event.data.winner === 'ai2' ? 'プロフェッサー・バーズ' : '引き分け'
          toast.success(`バトル終了！ 勝者: ${winner}`)
          break
          
        default:
          console.log('Unknown event type:', event.type)
      }
    } catch (error) {
      console.error('Error handling battle event:', error)
      toast.error('イベントの処理中にエラーが発生しました')
    }
  }

  // Auto-connect on mount
  useEffect(() => {
    connect()
    return () => {
      disconnect()
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [connect, disconnect])

  return {
    isConnected,
    connectionError,
    connect,
    disconnect,
    sendMessage,
    reconnectAttempts,
  }
}