import { createLogger } from '@/utils/logger'
import { MemoryCache } from './memory-cache'

const logger = createLogger('cache')

export interface CacheService {
  get(key: string): Promise<any>
  set(key: string, value: any, ttl?: number): Promise<void>
  del(key: string): Promise<void>
  exists(key: string): Promise<boolean>
  expire(key: string, ttl: number): Promise<void>
  ttl(key: string): Promise<number>
  keys(pattern?: string): Promise<string[]>
  flushall(): Promise<void>
}

/**
 * キャッシュサービスのファクトリー
 * 環境に応じて Redis または MemoryCache を選択
 */
export async function createCacheService(): Promise<CacheService> {
  // 常にMemoryCacheを使用（シンプルで安定）
  logger.info('Using MemoryCache for caching')
  const memoryCache = new MemoryCache()
  return memoryCache
}

// グローバルキャッシュインスタンス
let cacheService: CacheService | null = null

export async function getCacheService(): Promise<CacheService> {
  if (!cacheService) {
    cacheService = await createCacheService()
  }
  return cacheService
}

// キャッシュキーのプレフィックス
export const CacheKeys = {
  BATTLE: (id: string) => `battle:${id}`,
  BATTLE_STATE: (id: string) => `battle:state:${id}`,
  BATTLE_VIEWERS: (id: string) => `battle:viewers:${id}`,
  SESSION: (id: string) => `session:${id}`,
  VOTE: (battleId: string, round: number, userId: string) => `vote:${battleId}:${round}:${userId}`,
  LYRIC: (battleId: string, round: number, ai: string) => `lyric:${battleId}:${round}:${ai}`,
  AUDIO: (battleId: string, round: number, ai: string) => `audio:${battleId}:${round}:${ai}`,
}