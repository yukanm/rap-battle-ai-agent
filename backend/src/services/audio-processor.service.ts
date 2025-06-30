import { createLogger } from '@/utils/logger'

const logger = createLogger('audio-processor')

export interface AudioConfig {
  sampleRate: number
  channels: number
  bitDepth: number
  format: 'pcm' | 'wav' | 'webm' | 'mp3'
}

export interface AudioChunk {
  data: Buffer
  timestamp: Date
  duration: number
  config: AudioConfig
}

export interface AudioActivity {
  hasVoice: boolean
  volume: number
  frequency: number
  confidence: number
}

export interface ProcessedAudio {
  originalData: Buffer
  processedData: Buffer
  config: AudioConfig
  activity: AudioActivity
  metadata: {
    originalSize: number
    processedSize: number
    processingTime: number
    quality: 'high' | 'medium' | 'low'
  }
}

/**
 * Audio Processor Service for Live API
 * 音声データの処理、変換、および分析を担当
 * β版実装 - Live API要件に合わせた16-bit PCM, 16kHz, mono変換
 */
export class AudioProcessorService {
  private readonly targetConfig: AudioConfig = {
    sampleRate: 16000,  // Live API要件: 16kHz
    channels: 1,        // Live API要件: mono
    bitDepth: 16,       // Live API要件: 16-bit
    format: 'pcm'       // Live API要件: PCM
  }

  private audioBuffer: Buffer[] = []
  private isProcessing = false

  constructor() {
    logger.info('Audio Processor Service initialized', {
      targetConfig: this.targetConfig
    })
  }

  /**
   * 音声データをLive API要件に合わせて変換
   */
  async convertAudioFormat(audioData: Buffer, sourceConfig: AudioConfig): Promise<ProcessedAudio> {
    const startTime = Date.now()
    
    try {
      logger.debug('Starting audio format conversion', {
        sourceConfig,
        targetConfig: this.targetConfig,
        inputSize: audioData.length
      })

      // β版実装: 基本的な音声フォーマット変換
      const processedData = await this.performAudioConversion(audioData, sourceConfig)
      
      // 音声アクティビティ検出
      const activity = this.detectAudioActivity(processedData)
      
      const processingTime = Date.now() - startTime
      
      const result: ProcessedAudio = {
        originalData: audioData,
        processedData,
        config: this.targetConfig,
        activity,
        metadata: {
          originalSize: audioData.length,
          processedSize: processedData.length,
          processingTime,
          quality: this.assessAudioQuality(processedData, activity)
        }
      }

      logger.info('Audio conversion completed', {
        processingTime: `${processingTime}ms`,
        originalSize: result.metadata.originalSize,
        processedSize: result.metadata.processedSize,
        hasVoice: activity.hasVoice,
        quality: result.metadata.quality
      })

      return result

    } catch (error) {
      logger.error('Audio conversion failed:', error)
      throw new Error(`Audio conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 音声アクティビティ検出 (Voice Activity Detection)
   */
  detectAudioActivity(audioData: Buffer): AudioActivity {
    try {
      // β版実装: 簡易的な音声アクティビティ検出
      const samples = this.bufferToSamples(audioData)
      
      // 音量計算
      const volume = this.calculateVolume(samples)
      
      // 周波数分析（簡易版）
      const frequency = this.analyzeFrequency(samples)
      
      // 音声判定（しきい値ベース）
      const hasVoice = volume > 0.01 && frequency > 50 && frequency < 8000
      
      // 信頼度計算
      const confidence = this.calculateConfidence(volume, frequency)

      const activity: AudioActivity = {
        hasVoice,
        volume,
        frequency,
        confidence
      }

      logger.debug('Audio activity detected', activity)
      return activity

    } catch (error) {
      logger.error('Audio activity detection failed:', error)
      
      return {
        hasVoice: false,
        volume: 0,
        frequency: 0,
        confidence: 0
      }
    }
  }

  /**
   * 音声データをチャンクに分割
   */
  createAudioChunks(audioData: Buffer, chunkSizeMs: number = 1000): AudioChunk[] {
    const chunks: AudioChunk[] = []
    const bytesPerMs = (this.targetConfig.sampleRate * this.targetConfig.channels * this.targetConfig.bitDepth / 8) / 1000
    const chunkSize = Math.floor(bytesPerMs * chunkSizeMs)
    
    for (let i = 0; i < audioData.length; i += chunkSize) {
      const chunkData = audioData.slice(i, i + chunkSize)
      
      chunks.push({
        data: chunkData,
        timestamp: new Date(),
        duration: chunkSizeMs,
        config: this.targetConfig
      })
    }

    logger.debug(`Created ${chunks.length} audio chunks`, {
      totalSize: audioData.length,
      chunkSize,
      chunkDuration: chunkSizeMs
    })

    return chunks
  }

  /**
   * 音声品質評価
   */
  assessAudioQuality(audioData: Buffer, activity: AudioActivity): 'high' | 'medium' | 'low' {
    const samples = this.bufferToSamples(audioData)
    
    // ノイズレベル計算
    const noiseLevel = this.calculateNoiseLevel(samples)
    
    // 信号対ノイズ比
    const snr = activity.volume / (noiseLevel || 0.001)
    
    if (snr > 10 && activity.confidence > 0.8) {
      return 'high'
    } else if (snr > 5 && activity.confidence > 0.5) {
      return 'medium'
    } else {
      return 'low'
    }
  }

  /**
   * 音声データのバッファリング
   */
  addToBuffer(audioData: Buffer): void {
    this.audioBuffer.push(audioData)
    
    // バッファサイズ制限（10MB）
    const maxBufferSize = 10 * 1024 * 1024
    let totalSize = this.audioBuffer.reduce((sum, buf) => sum + buf.length, 0)
    
    while (totalSize > maxBufferSize && this.audioBuffer.length > 0) {
      const removed = this.audioBuffer.shift()
      if (removed) {
        totalSize -= removed.length
      }
    }
  }

  /**
   * バッファからまとまった音声データを取得
   */
  getBufferedAudio(): Buffer | null {
    if (this.audioBuffer.length === 0) {
      return null
    }

    const combined = Buffer.concat(this.audioBuffer)
    this.audioBuffer = []
    
    return combined
  }

  /**
   * 処理状態を取得
   */
  getProcessorStatus() {
    return {
      serviceName: 'Audio Processor Service (β版)',
      status: 'operational',
      isProcessing: this.isProcessing,
      bufferSize: this.audioBuffer.length,
      targetConfig: this.targetConfig,
      features: [
        '16-bit PCM, 16kHz, mono conversion',
        'Voice Activity Detection',
        'Audio quality assessment',
        'Chunk-based processing',
        'Real-time buffering'
      ],
      limitations: [
        'Beta implementation',
        'Basic noise reduction',
        'Simple frequency analysis',
        'Limited format support'
      ]
    }
  }

  /**
   * 実際の音声変換処理（β版実装）
   */
  private async performAudioConversion(audioData: Buffer, sourceConfig: AudioConfig): Promise<Buffer> {
    // β版では基本的な変換のみ実装
    // 本格実装では ffmpeg や Web Audio API を使用
    
    if (sourceConfig.format === 'pcm' && 
        sourceConfig.sampleRate === this.targetConfig.sampleRate &&
        sourceConfig.channels === this.targetConfig.channels &&
        sourceConfig.bitDepth === this.targetConfig.bitDepth) {
      // すでに目的の形式
      return audioData
    }

    // 簡易的なサンプルレート変換
    if (sourceConfig.sampleRate !== this.targetConfig.sampleRate) {
      return this.resampleAudio(audioData, sourceConfig.sampleRate, this.targetConfig.sampleRate)
    }

    // チャネル変換（ステレオ→モノ）
    if (sourceConfig.channels === 2 && this.targetConfig.channels === 1) {
      return this.stereoToMono(audioData)
    }

    return audioData
  }

  /**
   * サンプルレート変換（簡易版）
   */
  private resampleAudio(audioData: Buffer, fromRate: number, toRate: number): Buffer {
    const ratio = toRate / fromRate
    const samples = this.bufferToSamples(audioData)
    const resampledSamples: number[] = []
    
    for (let i = 0; i < samples.length * ratio; i++) {
      const sourceIndex = Math.floor(i / ratio)
      resampledSamples.push(samples[sourceIndex] || 0)
    }
    
    return this.samplesToBuffer(resampledSamples)
  }

  /**
   * ステレオからモノラルに変換
   */
  private stereoToMono(audioData: Buffer): Buffer {
    const samples = this.bufferToSamples(audioData)
    const monoSamples: number[] = []
    
    for (let i = 0; i < samples.length; i += 2) {
      const left = samples[i] || 0
      const right = samples[i + 1] || 0
      monoSamples.push((left + right) / 2)
    }
    
    return this.samplesToBuffer(monoSamples)
  }

  /**
   * BufferをPCMサンプル配列に変換
   */
  private bufferToSamples(buffer: Buffer): number[] {
    const samples: number[] = []
    
    for (let i = 0; i < buffer.length; i += 2) {
      const sample = buffer.readInt16LE(i)
      samples.push(sample / 32768) // -1.0 to 1.0 に正規化
    }
    
    return samples
  }

  /**
   * PCMサンプル配列をBufferに変換
   */
  private samplesToBuffer(samples: number[]): Buffer {
    const buffer = Buffer.alloc(samples.length * 2)
    
    for (let i = 0; i < samples.length; i++) {
      const sample = Math.max(-1, Math.min(1, samples[i])) // クランプ
      buffer.writeInt16LE(Math.round(sample * 32767), i * 2)
    }
    
    return buffer
  }

  /**
   * 音量計算
   */
  private calculateVolume(samples: number[]): number {
    if (samples.length === 0) return 0
    
    const rms = Math.sqrt(
      samples.reduce((sum, sample) => sum + sample * sample, 0) / samples.length
    )
    
    return rms
  }

  /**
   * 周波数分析（簡易版）
   */
  private analyzeFrequency(samples: number[]): number {
    if (samples.length === 0) return 0
    
    // 簡易的なゼロクロッシング率による周波数推定
    let crossings = 0
    for (let i = 1; i < samples.length; i++) {
      if ((samples[i] >= 0) !== (samples[i - 1] >= 0)) {
        crossings++
      }
    }
    
    const frequency = (crossings / 2) * (this.targetConfig.sampleRate / samples.length)
    return frequency
  }

  /**
   * ノイズレベル計算
   */
  private calculateNoiseLevel(samples: number[]): number {
    if (samples.length === 0) return 0
    
    // 最小音量の部分をノイズとして扱う
    const sortedSamples = samples.map(Math.abs).sort((a, b) => a - b)
    const noiseThreshold = Math.floor(sortedSamples.length * 0.1) // 下位10%
    
    return sortedSamples.slice(0, noiseThreshold)
      .reduce((sum, sample) => sum + sample, 0) / noiseThreshold
  }

  /**
   * 信頼度計算
   */
  private calculateConfidence(volume: number, frequency: number): number {
    // 音量と周波数から信頼度を計算
    const volumeScore = Math.min(volume * 10, 1) // 0-1
    const frequencyScore = (frequency > 50 && frequency < 8000) ? 1 : 0 // 音声範囲内か
    
    return (volumeScore + frequencyScore) / 2
  }
}