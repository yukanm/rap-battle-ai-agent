'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import toast from 'react-hot-toast'

// Dynamic import for SSR compatibility  
let RecordRTC: any = null
const loadRecordRTC = async () => {
  if (typeof window !== 'undefined' && !RecordRTC) {
    const module = await import('recordrtc')
    RecordRTC = module.default
  }
  return RecordRTC
}

export interface AudioStreamConfig {
  sampleRate: number
  channels: 1 | 2
  bitDepth: number
  format: 'wav' | 'webm'
  chunkSizeMs: number
}

export interface AudioStreamState {
  isRecording: boolean
  isPaused: boolean
  isProcessing: boolean
  duration: number
  volume: number
  hasPermission: boolean
}

export interface AudioChunk {
  data: ArrayBuffer
  timestamp: number
  duration: number
  volume: number
}

export interface AudioStreamHookReturn {
  // 録音制御
  startRecording: () => Promise<void>
  stopRecording: () => void
  pauseRecording: () => void
  resumeRecording: () => void
  
  // 設定
  requestPermission: () => Promise<boolean>
  setConfig: (config: Partial<AudioStreamConfig>) => void
  
  // 状態
  state: AudioStreamState
  config: AudioStreamConfig
  
  // データ
  audioChunks: AudioChunk[]
  latestChunk: AudioChunk | null
  
  // イベントハンドラー
  onAudioChunk: (callback: (chunk: AudioChunk) => void) => void
  onRecordingComplete: (callback: (audioData: ArrayBuffer) => void) => void
  onVolumeChange: (callback: (volume: number) => void) => void
  
  // ユーティリティ
  clearChunks: () => void
  getRecordedAudio: () => ArrayBuffer | null
  downloadRecording: (filename?: string) => void
}

/**
 * Audio Stream Hook for Live API
 * マイク録音、リアルタイム音声処理、チャンク配信機能
 * β版実装 - ブラウザ音声API使用
 */
export function useAudioStream(): AudioStreamHookReturn {
  // デフォルト設定（Live API要件）
  const defaultConfig: AudioStreamConfig = {
    sampleRate: 16000,  // Live API要件
    channels: 1,        // Live API要件（モノ）
    bitDepth: 16,       // Live API要件
    format: 'wav',      // ブラウザ互換性（PCMはRecordRTCで直接サポートなし）
    chunkSizeMs: 1000   // 1秒チャンク
  }

  // State
  const [config, setConfigState] = useState<AudioStreamConfig>(defaultConfig)
  const [state, setState] = useState<AudioStreamState>({
    isRecording: false,
    isPaused: false,
    isProcessing: false,
    duration: 0,
    volume: 0,
    hasPermission: false
  })
  const [audioChunks, setAudioChunks] = useState<AudioChunk[]>([])
  const [latestChunk, setLatestChunk] = useState<AudioChunk | null>(null)

  // Refs
  const recorderRef = useRef<any | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const volumeTimerRef = useRef<NodeJS.Timeout | null>(null)
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null)
  const chunkTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Event callbacks
  const audioChunkCallbackRef = useRef<((chunk: AudioChunk) => void) | null>(null)
  const recordingCompleteCallbackRef = useRef<((audioData: ArrayBuffer) => void) | null>(null)
  const volumeChangeCallbackRef = useRef<((volume: number) => void) | null>(null)

  /**
   * マイク許可要求
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: config.sampleRate,
          channelCount: config.channels,
          sampleSize: config.bitDepth,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })

      // 許可取得後すぐにストリーム停止
      stream.getTracks().forEach(track => track.stop())

      setState(prev => ({ ...prev, hasPermission: true }))
      toast.success('マイクの使用が許可されました')
      return true

    } catch (error) {
      setState(prev => ({ ...prev, hasPermission: false }))
      const errorMessage = error instanceof Error ? error.message : 'Permission denied'
      toast.error(`マイク許可エラー: ${errorMessage}`)
      return false
    }
  }, [config])

  /**
   * 音量監視の開始
   */
  const startVolumeMonitoring = useCallback(() => {
    if (!streamRef.current) return

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const analyser = audioContext.createAnalyser()
      const microphone = audioContext.createMediaStreamSource(streamRef.current)
      
      analyser.smoothingTimeConstant = 0.8
      analyser.fftSize = 1024
      
      microphone.connect(analyser)
      
      audioContextRef.current = audioContext
      analyserRef.current = analyser

      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      
      const updateVolume = () => {
        if (analyserRef.current && state.isRecording && !state.isPaused) {
          analyserRef.current.getByteFrequencyData(dataArray)
          
          // 音量計算（RMS）
          const sum = dataArray.reduce((acc, value) => acc + value * value, 0)
          const rms = Math.sqrt(sum / dataArray.length)
          const volume = rms / 255 // 0-1に正規化

          setState(prev => ({ ...prev, volume }))
          
          // コールバック実行
          if (volumeChangeCallbackRef.current) {
            volumeChangeCallbackRef.current(volume)
          }
        }
      }

      volumeTimerRef.current = setInterval(updateVolume, 100) // 10fps

    } catch (error) {
      console.error('Volume monitoring setup failed:', error)
    }
  }, [state.isRecording, state.isPaused])

  /**
   * 録音開始
   */
  const startRecording = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isProcessing: true }))

      // ストリーム取得
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: config.sampleRate,
          channelCount: config.channels,
          sampleSize: config.bitDepth,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })

      streamRef.current = stream

      // RecordRTC設定 - Load if needed
      const RecordRTCLib = await loadRecordRTC()
      if (!RecordRTCLib) {
        throw new Error('RecordRTC not loaded - please wait for library initialization')
      }
      
      const recorder = new RecordRTCLib(stream, {
        type: 'audio',
        mimeType: `audio/${config.format}`,
        recorderType: RecordRTCLib.StereoAudioRecorder,
        numberOfAudioChannels: config.channels,
        desiredSampRate: config.sampleRate,
        timeSlice: config.chunkSizeMs,
        ondataavailable: (blob: Blob) => {
          // チャンクデータ処理
          blob.arrayBuffer().then(arrayBuffer => {
            const chunk: AudioChunk = {
              data: arrayBuffer,
              timestamp: Date.now(),
              duration: config.chunkSizeMs,
              volume: state.volume
            }

            setAudioChunks(prev => [...prev, chunk])
            setLatestChunk(chunk)

            // コールバック実行
            if (audioChunkCallbackRef.current) {
              audioChunkCallbackRef.current(chunk)
            }
          })
        }
      })

      recorderRef.current = recorder
      recorder.startRecording()

      // 音量監視開始
      startVolumeMonitoring()

      // 時間カウンター開始
      durationTimerRef.current = setInterval(() => {
        setState(prev => ({ ...prev, duration: prev.duration + 100 }))
      }, 100)

      setState(prev => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        isProcessing: false,
        duration: 0
      }))

      toast.success('録音を開始しました')

    } catch (error) {
      setState(prev => ({ ...prev, isProcessing: false, isRecording: false }))
      const errorMessage = error instanceof Error ? error.message : 'Recording failed'
      toast.error(`録音開始エラー: ${errorMessage}`)
      throw error
    }
  }, [config, state.volume, startVolumeMonitoring])

  /**
   * 録音停止
   */
  const stopRecording = useCallback(() => {
    try {
      if (recorderRef.current && state.isRecording) {
        recorderRef.current.stopRecording(() => {
          const blob = recorderRef.current?.getBlob()
          if (blob && recordingCompleteCallbackRef.current) {
            blob.arrayBuffer().then((arrayBuffer: ArrayBuffer) => {
              recordingCompleteCallbackRef.current?.(arrayBuffer)
            })
          }
        })
      }

      // ストリーム停止
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }

      // AudioContext停止
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }

      // タイマー停止
      if (volumeTimerRef.current) {
        clearInterval(volumeTimerRef.current)
        volumeTimerRef.current = null
      }

      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current)
        durationTimerRef.current = null
      }

      setState(prev => ({
        ...prev,
        isRecording: false,
        isPaused: false,
        volume: 0
      }))

      toast.success('録音を停止しました')

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Stop recording failed'
      toast.error(`録音停止エラー: ${errorMessage}`)
    }
  }, [state.isRecording])

  /**
   * 録音一時停止
   */
  const pauseRecording = useCallback(() => {
    if (recorderRef.current && state.isRecording && !state.isPaused) {
      recorderRef.current.pauseRecording()
      setState(prev => ({ ...prev, isPaused: true }))
      toast('録音を一時停止しました')
    }
  }, [state.isRecording, state.isPaused])

  /**
   * 録音再開
   */
  const resumeRecording = useCallback(() => {
    if (recorderRef.current && state.isRecording && state.isPaused) {
      recorderRef.current.resumeRecording()
      setState(prev => ({ ...prev, isPaused: false }))
      toast('録音を再開しました')
    }
  }, [state.isRecording, state.isPaused])

  /**
   * 設定更新
   */
  const setConfig = useCallback((newConfig: Partial<AudioStreamConfig>) => {
    setConfigState(prev => ({ ...prev, ...newConfig }))
  }, [])

  /**
   * イベントハンドラー設定
   */
  const onAudioChunk = useCallback((callback: (chunk: AudioChunk) => void) => {
    audioChunkCallbackRef.current = callback
  }, [])

  const onRecordingComplete = useCallback((callback: (audioData: ArrayBuffer) => void) => {
    recordingCompleteCallbackRef.current = callback
  }, [])

  const onVolumeChange = useCallback((callback: (volume: number) => void) => {
    volumeChangeCallbackRef.current = callback
  }, [])

  /**
   * チャンククリア
   */
  const clearChunks = useCallback(() => {
    setAudioChunks([])
    setLatestChunk(null)
  }, [])

  /**
   * 録音データ取得
   */
  const getRecordedAudio = useCallback((): ArrayBuffer | null => {
    if (!recorderRef.current) return null

    const blob = recorderRef.current.getBlob()
    return blob ? blob.arrayBuffer() as any : null
  }, [])

  /**
   * 録音データダウンロード
   */
  const downloadRecording = useCallback((filename: string = 'recording.wav') => {
    if (!recorderRef.current) {
      toast.error('録音データがありません')
      return
    }

    try {
      const blob = recorderRef.current.getBlob()
      const url = typeof window !== 'undefined' ? URL.createObjectURL(blob) : ''
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      if (typeof window !== 'undefined') {
        URL.revokeObjectURL(url)
      }

      toast.success('録音データをダウンロードしました')

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Download failed'
      toast.error(`ダウンロードエラー: ${errorMessage}`)
    }
  }, [])

  // 初期化時に許可チェック
  useEffect(() => {
    navigator.permissions?.query({ name: 'microphone' as PermissionName })
      .then(result => {
        setState(prev => ({ ...prev, hasPermission: result.state === 'granted' }))
      })
      .catch(() => {
        // permissions APIが利用できない場合は何もしない
      })
  }, [])

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (state.isRecording) {
        stopRecording()
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    // 録音制御
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    
    // 設定
    requestPermission,
    setConfig,
    
    // 状態
    state,
    config,
    
    // データ
    audioChunks,
    latestChunk,
    
    // イベントハンドラー
    onAudioChunk,
    onRecordingComplete,
    onVolumeChange,
    
    // ユーティリティ
    clearChunks,
    getRecordedAudio,
    downloadRecording
  }
}