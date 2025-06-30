import { TextToSpeechClient } from '@google-cloud/text-to-speech'
import { config } from '@/config'
import { createLogger } from '@/utils/logger'
import type { AudioGenerationRequest } from '@/types'
import crypto from 'crypto'

const logger = createLogger('text-to-speech')

export class TextToSpeechService {
  private client: TextToSpeechClient
  private audioCache: Map<string, Buffer> = new Map()
  private readonly CACHE_SIZE = 100
  
  constructor() {
    this.client = new TextToSpeechClient({
      projectId: config.projectId,
    })
  }
  
  async synthesizeSpeech(request: AudioGenerationRequest): Promise<Buffer> {
    const { text, voiceSettings = {} } = request
    
    // Merge with default settings
    const settings = {
      speakingRate: voiceSettings.speakingRate ?? config.tts.speakingRate,
      pitch: voiceSettings.pitch ?? config.tts.pitch,
      volumeGainDb: voiceSettings.volumeGainDb ?? config.tts.volumeGainDb,
    }
    
    // Generate cache key
    const cacheKey = crypto
      .createHash('md5')
      .update(`${text}:${JSON.stringify(settings)}:${config.tts.voiceName}`)
      .digest('hex')
    
    // Check cache
    if (this.audioCache.has(cacheKey)) {
      logger.info('Returning cached audio')
      return this.audioCache.get(cacheKey)!
    }
    
    try {
      logger.info('Synthesizing speech...')
      const startTime = Date.now()
      
      // Optimize text for faster synthesis (limit length)
      const optimizedText = text.length > 500 ? text.substring(0, 500) + '...' : text
      
      // Construct the request with optimized settings
      const [response] = await this.client.synthesizeSpeech({
        input: { text: optimizedText },
        voice: {
          languageCode: config.tts.languageCode,
          name: config.tts.voiceName,
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: Math.min(settings.speakingRate * 1.2, 2.0), // Slightly faster speech
          pitch: settings.pitch,
          volumeGainDb: settings.volumeGainDb,
          // Remove effectsProfileId for faster processing
        },
      })
      
      const synthesisTime = Date.now() - startTime
      logger.info(`Speech synthesized in ${synthesisTime}ms`)
      
      if (!response.audioContent) {
        throw new Error('No audio content received')
      }
      
      // Convert audio content to Buffer
      const audioBuffer = Buffer.from(response.audioContent as string, 'base64')
      
      // Cache the result
      if (this.audioCache.size >= this.CACHE_SIZE) {
        // Remove oldest entry
        const firstKey = this.audioCache.keys().next().value
        if (firstKey) {
          this.audioCache.delete(firstKey)
        }
      }
      this.audioCache.set(cacheKey, audioBuffer)
      
      return audioBuffer
      
    } catch (error) {
      logger.error('Error synthesizing speech:', error)
      throw error
    }
  }
  
  async listVoices(): Promise<any[]> {
    try {
      const [response] = await this.client.listVoices({
        languageCode: config.tts.languageCode,
      })
      
      return response.voices || []
    } catch (error) {
      logger.error('Error listing voices:', error)
      throw error
    }
  }
  
  async testConnection(): Promise<boolean> {
    try {
      const testText = 'Test'
      const [response] = await this.client.synthesizeSpeech({
        input: { text: testText },
        voice: {
          languageCode: 'en-US',
          ssmlGender: 'NEUTRAL',
        },
        audioConfig: {
          audioEncoding: 'MP3',
        },
      })
      
      logger.info('Text-to-Speech connection test successful')
      return !!response.audioContent
    } catch (error) {
      logger.error('Text-to-Speech connection test failed:', error)
      return false
    }
  }
}

export async function initializeTextToSpeech() {
  try {
    const service = new TextToSpeechService()
    const isConnected = await service.testConnection()
    
    if (!isConnected) {
      throw new Error('Failed to connect to Text-to-Speech API')
    }
    
    logger.info('Text-to-Speech service initialized successfully')
    return service
  } catch (error) {
    logger.error('Failed to initialize Text-to-Speech:', error)
    throw error
  }
}