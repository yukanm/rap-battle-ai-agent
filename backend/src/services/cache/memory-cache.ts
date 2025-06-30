import { createLogger } from '@/utils/logger'

const logger = createLogger('memory-cache')

interface CacheItem {
  value: any
  expiry: number
}

/**
 * メモリベースのキャッシュ実装
 * Redis の代替として使用（コスト削減のため）
 */
export class MemoryCache {
  private cache = new Map<string, CacheItem>()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    this.startCleanup()
  }

  async get(key: string): Promise<any> {
    const item = this.cache.get(key)
    if (!item) {
      return null
    }

    if (Date.now() > item.expiry) {
      this.cache.delete(key)
      return null
    }

    return item.value
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    this.cache.set(key, {
      value,
      expiry: Date.now() + (ttl * 1000)
    })
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key)
  }

  async exists(key: string): Promise<boolean> {
    const item = this.cache.get(key)
    if (!item) return false
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key)
      return false
    }
    
    return true
  }

  async expire(key: string, ttl: number): Promise<void> {
    const item = this.cache.get(key)
    if (item) {
      item.expiry = Date.now() + (ttl * 1000)
    }
  }

  async ttl(key: string): Promise<number> {
    const item = this.cache.get(key)
    if (!item) return -2
    
    const remaining = Math.floor((item.expiry - Date.now()) / 1000)
    return remaining > 0 ? remaining : -1
  }

  async keys(pattern: string = '*'): Promise<string[]> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'))
    const matchingKeys: string[] = []
    
    for (const [key, item] of this.cache.entries()) {
      if (Date.now() <= item.expiry && regex.test(key)) {
        matchingKeys.push(key)
      }
    }
    
    return matchingKeys
  }

  async flushall(): Promise<void> {
    this.cache.clear()
    logger.info('Cache cleared')
  }

  // 定期的なクリーンアップ
  private startCleanup() {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      let deletedCount = 0
      
      for (const [key, item] of this.cache.entries()) {
        if (now > item.expiry) {
          this.cache.delete(key)
          deletedCount++
        }
      }
      
      if (deletedCount > 0) {
        logger.debug(`Cleaned up ${deletedCount} expired cache entries`)
      }
    }, 60000) // 1分ごと
  }

  // クリーンアップ停止
  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  // キャッシュ統計
  getStats() {
    return {
      size: this.cache.size,
      memoryUsage: process.memoryUsage().heapUsed
    }
  }
}

// シングルトンインスタンス
export const memoryCache = new MemoryCache()