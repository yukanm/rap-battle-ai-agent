import { Firestore } from '@google-cloud/firestore'
import { config } from '@/config'
import { createLogger } from '@/utils/logger'
import type { Battle, Round, User } from '@/types'

const logger = createLogger('firestore')

export class FirestoreService {
  private db: Firestore | null
  
  constructor() {
    // Always initialize Firestore (no more development mode)
    this.db = new Firestore({
      projectId: config.projectId,
    })
  }
  
  // Battle operations
  async saveBattle(battle: Battle): Promise<void> {
    if (!this.db) {
      logger.info(`[Dev Mode] Would save battle ${battle.id}`)
      return
    }
    
    try {
      const docRef = this.db
        .collection(config.firestore.battlesCollection)
        .doc(battle.id)
      
      const battleData: any = {
        ...battle,
        startedAt: battle.startedAt.toISOString(),
        updatedAt: new Date().toISOString(),
      }
      
      // Only include endedAt if it exists
      if (battle.endedAt) {
        battleData.endedAt = battle.endedAt.toISOString()
      }
      
      await docRef.set(battleData)
      
      logger.info(`Battle saved: ${battle.id}`)
    } catch (error) {
      logger.error('Error saving battle:', error)
      throw error
    }
  }
  
  async getBattle(battleId: string): Promise<Battle | null> {
    if (!this.db) {
      logger.info(`[Dev Mode] Would get battle ${battleId}`)
      return null
    }
    
    try {
      const doc = await this.db
        .collection(config.firestore.battlesCollection)
        .doc(battleId)
        .get()
      
      if (!doc.exists) {
        return null
      }
      
      const data = doc.data()!
      return {
        ...data,
        startedAt: new Date(data.startedAt),
        endedAt: data.endedAt ? new Date(data.endedAt) : undefined,
      } as Battle
    } catch (error) {
      logger.error('Error getting battle:', error)
      throw error
    }
  }
  
  async listRecentBattles(limit: number = 10): Promise<Battle[]> {
    if (!this.db) {
      logger.info(`[Dev Mode] Would list recent battles with limit ${limit}`)
      return []
    }
    
    try {
      const snapshot = await this.db
        .collection(config.firestore.battlesCollection)
        .orderBy('startedAt', 'desc')
        .limit(limit)
        .get()
      
      return snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          ...data,
          id: doc.id,
          startedAt: new Date(data.startedAt),
          endedAt: data.endedAt ? new Date(data.endedAt) : undefined,
        } as Battle
      })
    } catch (error) {
      logger.error('Error listing battles:', error)
      throw error
    }
  }
  
  // Round operations
  async saveRound(battleId: string, round: Round): Promise<void> {
    if (!this.db) {
      logger.info(`[Dev Mode] Would save round ${round.number} for battle ${battleId}`)
      return
    }
    
    try {
      const roundRef = this.db
        .collection(config.firestore.battlesCollection)
        .doc(battleId)
        .collection('rounds')
        .doc(`round-${round.number}`)
      
      await roundRef.set({
        ...round,
        savedAt: new Date().toISOString(),
      })
      
      logger.info(`Round saved: ${battleId} - Round ${round.number}`)
    } catch (error) {
      logger.error('Error saving round:', error)
      throw error
    }
  }
  
  // Vote operations
  async saveVote(
    battleId: string,
    roundNumber: number,
    votedFor: 'ai1' | 'ai2',
    userId: string
  ): Promise<void> {
    if (!this.db) {
      logger.info(`[Dev Mode] Would save vote for ${votedFor} in battle ${battleId}`)
      return
    }
    
    try {
      const voteRef = this.db.collection(config.firestore.votesCollection).doc()
      
      await voteRef.set({
        battleId,
        roundNumber,
        votedFor,
        userId,
        timestamp: new Date().toISOString(),
      })
      
      logger.info(`Vote saved: ${battleId} - Round ${roundNumber} - ${votedFor}`)
    } catch (error) {
      logger.error('Error saving vote:', error)
      throw error
    }
  }
  
  async getVoteStats(battleId: string): Promise<{ [key: string]: number }> {
    if (!this.db) {
      logger.info(`[Dev Mode] Would get vote stats for battle ${battleId}`)
      return { ai1: 0, ai2: 0 }
    }
    
    try {
      const snapshot = await this.db
        .collection(config.firestore.votesCollection)
        .where('battleId', '==', battleId)
        .get()
      
      const stats: { [key: string]: number } = {
        ai1: 0,
        ai2: 0,
      }
      
      snapshot.forEach(doc => {
        const vote = doc.data()
        stats[vote.votedFor]++
      })
      
      return stats
    } catch (error) {
      logger.error('Error getting vote stats:', error)
      throw error
    }
  }
  
  // User operations
  async saveUser(user: User): Promise<void> {
    if (!this.db) {
      logger.info(`[Dev Mode] Would save user ${user.id}`)
      return
    }
    
    try {
      const userRef = this.db
        .collection(config.firestore.usersCollection)
        .doc(user.id)
      
      await userRef.set({
        ...user,
        createdAt: user.createdAt.toISOString(),
        updatedAt: new Date().toISOString(),
      })
      
      logger.info(`User saved: ${user.id}`)
    } catch (error) {
      logger.error('Error saving user:', error)
      throw error
    }
  }
  
  async getUser(userId: string): Promise<User | null> {
    if (!this.db) {
      logger.info(`[Dev Mode] Would get user ${userId}`)
      return null
    }
    
    try {
      const doc = await this.db
        .collection(config.firestore.usersCollection)
        .doc(userId)
        .get()
      
      if (!doc.exists) {
        return null
      }
      
      const data = doc.data()!
      return {
        ...data,
        createdAt: new Date(data.createdAt),
      } as User
    } catch (error) {
      logger.error('Error getting user:', error)
      throw error
    }
  }
  
  // Analytics operations
  async recordBattleAnalytics(battleId: string, analytics: any): Promise<void> {
    if (!this.db) {
      logger.info(`[Dev Mode] Would record analytics for battle ${battleId}`)
      return
    }
    
    try {
      const analyticsRef = this.db
        .collection('analytics')
        .doc(`battle-${battleId}`)
      
      await analyticsRef.set({
        battleId,
        ...analytics,
        recordedAt: new Date().toISOString(),
      })
      
      logger.info(`Analytics recorded for battle: ${battleId}`)
    } catch (error) {
      logger.error('Error recording analytics:', error)
      throw error
    }
  }
  
  async testConnection(): Promise<boolean> {
    if (!this.db) {
      logger.info('[Dev Mode] Firestore not initialized')
      return false
    }
    
    try {
      // Try to read from a system collection
      await this.db.listCollections()
      logger.info('Firestore connection test successful')
      return true
    } catch (error) {
      logger.error('Firestore connection test failed:', error)
      return false
    }
  }
}

export async function initializeFirestore() {
  try {
    const service = new FirestoreService()
    const isConnected = await service.testConnection()
    
    if (!isConnected) {
      throw new Error('Failed to connect to Firestore')
    }
    
    logger.info('Firestore service initialized successfully')
    return service
  } catch (error) {
    logger.error('Failed to initialize Firestore:', error)
    throw error
  }
}