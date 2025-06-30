import { Storage } from '@google-cloud/storage'
import { config } from '@/config'
import { createLogger } from '@/utils/logger'
import { nanoid } from 'nanoid'

const logger = createLogger('storage')

export class StorageService {
  private storage: Storage
  private bucketName: string
  
  constructor() {
    this.storage = new Storage({
      projectId: config.projectId,
    })
    
    // バケット名を設定（環境変数から取得、またはプロジェクトIDから生成）
    this.bucketName = process.env.AUDIO_STORAGE_BUCKET || `${config.projectId}-rap-battle-audio`
  }
  
  /**
   * 音声データをCloud Storageにアップロードし、公開URLを返す
   */
  async uploadAudio(audioBuffer: Buffer, metadata?: {
    battleId?: string
    roundNumber?: number
    participantId?: string
  }): Promise<string> {
    try {
      // ファイル名を生成
      const timestamp = Date.now()
      const randomId = nanoid(10)
      const folder = metadata?.battleId ? `battles/${metadata.battleId}` : 'audio'
      const fileName = `${folder}/audio_${timestamp}_${randomId}.mp3`
      
      const bucket = this.storage.bucket(this.bucketName)
      const file = bucket.file(fileName)
      
      // アップロード
      await file.save(audioBuffer, {
        metadata: {
          contentType: 'audio/mpeg',
          cacheControl: 'public, max-age=3600', // 1時間キャッシュ
          metadata: {
            battleId: metadata?.battleId || '',
            roundNumber: metadata?.roundNumber?.toString() || '',
            participantId: metadata?.participantId || '',
            uploadedAt: new Date().toISOString(),
          },
        },
      })
      
      // 公開URLを生成 (バケットレベルで公開設定されているため、個別設定は不要)
      const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${fileName}`
      
      logger.info(`Audio uploaded successfully: ${fileName}`)
      return publicUrl
      
    } catch (error) {
      logger.error('Error uploading audio to storage:', error)
      throw error
    }
  }
  
  /**
   * バケットが存在するか確認し、存在しない場合は作成
   */
  async ensureBucket(): Promise<void> {
    try {
      const bucket = this.storage.bucket(this.bucketName)
      const [exists] = await bucket.exists()
      
      if (!exists) {
        logger.info(`Creating bucket: ${this.bucketName}`)
        await this.storage.createBucket(this.bucketName, {
          location: config.region,
          storageClass: 'STANDARD',
          iamConfiguration: {
            uniformBucketLevelAccess: {
              enabled: true,
            },
          },
        })
        
        logger.info(`Bucket created: ${this.bucketName}`)
      } else {
        logger.info(`Bucket already exists: ${this.bucketName}`)
      }
    } catch (error) {
      logger.error('Error ensuring bucket:', error)
      // バケット作成エラーは警告として扱い、処理を続行
      logger.warn('Continuing without bucket creation. Audio uploads may fail.')
    }
  }
  
  /**
   * ストレージ接続テスト
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.storage.getBuckets()
      logger.info('Storage connection test successful')
      return true
    } catch (error) {
      logger.error('Storage connection test failed:', error)
      return false
    }
  }
}

export async function initializeStorage() {
  try {
    const service = new StorageService()
    const isConnected = await service.testConnection()
    
    if (!isConnected) {
      throw new Error('Failed to connect to Cloud Storage')
    }
    
    // バケットの確認/作成
    await service.ensureBucket()
    
    logger.info('Storage service initialized successfully')
    return service
  } catch (error) {
    logger.error('Failed to initialize Storage:', error)
    throw error
  }
}