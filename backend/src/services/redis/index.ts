import Redis from 'ioredis'
import { config } from '@/config'
import { createLogger } from '@/utils/logger'
import type { Battle } from '@/types'

const logger = createLogger('redis')

export class RedisService {
  private client: Redis
  private isConnected: boolean = false
  
  constructor() {
    this.client = new Redis(config.redis.url, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000)
        return delay
      },
      maxRetriesPerRequest: 3,
    })
    
    this.client.on('connect', () => {
      logger.info('Connected to Redis')
      this.isConnected = true
    })
    
    this.client.on('error', (error) => {
      logger.error('Redis error:', error)
      this.isConnected = false
    })
  }
  
  async connect(): Promise<void> {
    if (this.isConnected) {
      return
    }
    
    try {
      await this.client.ping()
      this.isConnected = true
    } catch (error) {
      logger.error('Failed to connect to Redis:', error)
      throw error
    }
  }
  
  // Battle caching
  async setBattle(battleId: string, battle: Battle): Promise<void> {
    try {
      const key = `battle:${battleId}`
      const value = JSON.stringify(battle)
      await this.client.setex(key, config.redis.ttl, value)
      logger.debug(`Battle cached: ${battleId}`)
    } catch (error) {
      logger.error('Error caching battle:', error)
      // Don't throw - caching is non-critical
    }
  }
  
  async getBattle(battleId: string): Promise<Battle | null> {
    try {
      const key = `battle:${battleId}`
      const value = await this.client.get(key)
      
      if (!value) {
        return null
      }
      
      return JSON.parse(value) as Battle
    } catch (error) {
      logger.error('Error getting cached battle:', error)
      return null
    }
  }
  
  async deleteBattle(battleId: string): Promise<void> {
    try {
      const key = `battle:${battleId}`
      await this.client.del(key)
      logger.debug(`Battle cache deleted: ${battleId}`)
    } catch (error) {
      logger.error('Error deleting battle cache:', error)
    }
  }
  
  // Vote tracking
  async recordVote(voteKey: string): Promise<void> {
    try {
      await this.client.setex(voteKey, 3600, '1') // 1 hour expiry
    } catch (error) {
      logger.error('Error recording vote:', error)
      throw error
    }
  }
  
  async hasVoted(voteKey: string): Promise<boolean> {
    try {
      const exists = await this.client.exists(voteKey)
      return exists === 1
    } catch (error) {
      logger.error('Error checking vote:', error)
      return false
    }
  }
  
  // Session management
  async setSession(sessionId: string, data: any, ttl: number = 3600): Promise<void> {
    try {
      const key = `session:${sessionId}`
      const value = JSON.stringify(data)
      await this.client.setex(key, ttl, value)
    } catch (error) {
      logger.error('Error setting session:', error)
      throw error
    }
  }
  
  async getSession(sessionId: string): Promise<any | null> {
    try {
      const key = `session:${sessionId}`
      const value = await this.client.get(key)
      
      if (!value) {
        return null
      }
      
      return JSON.parse(value)
    } catch (error) {
      logger.error('Error getting session:', error)
      return null
    }
  }
  
  async deleteSession(sessionId: string): Promise<void> {
    try {
      const key = `session:${sessionId}`
      await this.client.del(key)
    } catch (error) {
      logger.error('Error deleting session:', error)
    }
  }
  
  // Rate limiting
  async incrementRateLimit(identifier: string, window: number = 60): Promise<number> {
    try {
      const key = `ratelimit:${identifier}`
      const multi = this.client.multi()
      
      multi.incr(key)
      multi.expire(key, window)
      
      const results = await multi.exec()
      return results?.[0]?.[1] as number || 0
    } catch (error) {
      logger.error('Error incrementing rate limit:', error)
      return 0
    }
  }
  
  async getRateLimit(identifier: string): Promise<number> {
    try {
      const key = `ratelimit:${identifier}`
      const count = await this.client.get(key)
      return parseInt(count || '0', 10)
    } catch (error) {
      logger.error('Error getting rate limit:', error)
      return 0
    }
  }
  
  // CacheService implementation
  async get(key: string): Promise<any> {
    try {
      const value = await this.client.get(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      logger.error('Error getting from cache:', error)
      return null
    }
  }
  
  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    try {
      await this.client.setex(key, ttl, JSON.stringify(value))
    } catch (error) {
      logger.error('Error setting cache:', error)
    }
  }
  
  async del(key: string): Promise<void> {
    try {
      await this.client.del(key)
    } catch (error) {
      logger.error('Error deleting from cache:', error)
    }
  }
  
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key)
      return result === 1
    } catch (error) {
      logger.error('Error checking cache existence:', error)
      return false
    }
  }
  
  async expire(key: string, ttl: number): Promise<void> {
    try {
      await this.client.expire(key, ttl)
    } catch (error) {
      logger.error('Error setting expiry:', error)
    }
  }
  
  async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key)
    } catch (error) {
      logger.error('Error getting TTL:', error)
      return -1
    }
  }
  
  async keys(pattern: string = '*'): Promise<string[]> {
    try {
      return await this.client.keys(pattern)
    } catch (error) {
      logger.error('Error getting keys:', error)
      return []
    }
  }
  
  async flushall(): Promise<void> {
    try {
      await this.client.flushall()
    } catch (error) {
      logger.error('Error flushing cache:', error)
    }
  }
  
  // Real-time battle state
  async updateBattleState(battleId: string, state: any): Promise<void> {
    try {
      const key = `battlestate:${battleId}`
      const value = JSON.stringify(state)
      await this.client.setex(key, 300, value) // 5 minute expiry
      
      // Publish update to subscribers
      await this.client.publish(`battle:${battleId}:updates`, value)
    } catch (error) {
      logger.error('Error updating battle state:', error)
    }
  }
  
  async subscribeToBattleUpdates(
    battleId: string,
    callback: (data: any) => void
  ): Promise<() => void> {
    const subscriber = new Redis(config.redis.url)
    const channel = `battle:${battleId}:updates`
    
    subscriber.on('message', (receivedChannel, message) => {
      if (receivedChannel === channel) {
        try {
          const data = JSON.parse(message)
          callback(data)
        } catch (error) {
          logger.error('Error parsing battle update:', error)
        }
      }
    })
    
    await subscriber.subscribe(channel)
    
    // Return unsubscribe function
    return () => {
      subscriber.unsubscribe(channel)
      subscriber.disconnect()
    }
  }
  
  // Leaderboard
  async updateLeaderboard(userId: string, score: number): Promise<void> {
    try {
      await this.client.zadd('leaderboard', score, userId)
    } catch (error) {
      logger.error('Error updating leaderboard:', error)
    }
  }
  
  async getLeaderboard(limit: number = 10): Promise<Array<{ userId: string; score: number }>> {
    try {
      const results = await this.client.zrevrange('leaderboard', 0, limit - 1, 'WITHSCORES')
      
      const leaderboard: Array<{ userId: string; score: number }> = []
      for (let i = 0; i < results.length; i += 2) {
        leaderboard.push({
          userId: results[i],
          score: parseInt(results[i + 1], 10),
        })
      }
      
      return leaderboard
    } catch (error) {
      logger.error('Error getting leaderboard:', error)
      return []
    }
  }
  
  async testConnection(): Promise<boolean> {
    try {
      const pong = await this.client.ping()
      logger.info('Redis connection test successful')
      return pong === 'PONG'
    } catch (error) {
      logger.error('Redis connection test failed:', error)
      return false
    }
  }
  
  async disconnect(): Promise<void> {
    await this.client.quit()
  }
}

export async function initializeRedis() {
  try {
    const service = new RedisService()
    const isConnected = await service.testConnection()
    
    if (!isConnected) {
      throw new Error('Failed to connect to Redis')
    }
    
    logger.info('Redis service initialized successfully')
    return service
  } catch (error) {
    logger.error('Failed to initialize Redis:', error)
    throw error
  }
}