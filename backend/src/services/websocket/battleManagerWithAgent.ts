import { Server } from 'socket.io'
import { nanoid } from 'nanoid'
import { createLogger } from '@/utils/logger'
import { AgentService } from '../agent.service'
import { VertexAIService } from '../vertexai'
import { TextToSpeechService } from '../text-to-speech'
import { ComplianceService } from '../compliance'
import { FirestoreService } from '../firestore'
import { RedisService } from '../redis'
import type { Battle, Round, Lyric, BattleEvent, Verse } from '@/types'
import { config } from '@/config'

const logger = createLogger('battle-manager-agent')

/**
 * BattleManager with Mastra Agent Integration
 * This version can use either the traditional services or the new Mastra Agent
 */
export class BattleManagerWithAgent {
  private io: Server
  private battles: Map<string, Battle> = new Map()
  private agent: AgentService
  private vertexAI: VertexAIService
  private tts: TextToSpeechService
  private compliance: ComplianceService
  private firestore: FirestoreService
  private redis: RedisService
  private useAgent: boolean
  
  constructor(io: Server, useAgent = true) {
    this.io = io
    this.useAgent = useAgent
    
    // Initialize services
    this.agent = new AgentService()
    this.vertexAI = new VertexAIService()
    this.tts = new TextToSpeechService()
    this.compliance = new ComplianceService()
    this.firestore = new FirestoreService()
    this.redis = new RedisService()
    
    logger.info(`Battle Manager initialized with ${useAgent ? 'Mastra Agent' : 'traditional services'}`)
  }
  
  async createBattle(theme?: string, _creatorId?: string): Promise<Battle> {
    const battleId = `battle-${nanoid()}`
    
    // Use agent to generate theme if not provided
    if (!theme && this.useAgent) {
      const themeData = await this.agent.generateTheme()
      theme = themeData.theme
      logger.info(`Agent generated theme: ${theme}`)
    } else if (!theme) {
      theme = 'Freestyle Flow'
    }
    
    const battle: Battle = {
      id: battleId,
      status: 'waiting',
      theme,
      format: '8bars-3verses', // デフォルト形式
      startedAt: new Date(),
      rounds: [],
      participants: {
        ai1: {
          id: 'ai1',
          name: 'MC Flash',
          model: 'gemini-flash',
          style: 'Fast-paced, witty, and energetic. Uses wordplay and quick rhymes.',
          avatar: '/avatars/mc-flash.png',
        },
        ai2: {
          id: 'ai2',
          name: 'Professor Bars',
          model: 'gemini-pro',
          style: 'Deep, complex, and philosophical. Uses metaphors and storytelling.',
          avatar: '/avatars/professor-bars.png',
        },
      },
      votes: { ai1: 0, ai2: 0 },
      viewers: 1,
    }
    
    this.battles.set(battleId, battle)
    
    // Save to Firestore
    await this.firestore.saveBattle(battle)
    
    // Cache in Redis
    await this.redis.setBattle(battleId, battle)
    
    logger.info(`Battle created: ${battleId} with theme: ${theme}`)
    return battle
  }
  
  async startBattle(battleId: string) {
    const battle = this.battles.get(battleId)
    if (!battle) {
      throw new Error('Battle not found')
    }
    
    battle.status = 'in_progress'
    
    // Emit battle start event
    this.emitBattleEvent(battleId, {
      type: 'battle_start',
      battleId,
      data: { status: 'in_progress' },
      timestamp: new Date(),
    })
    
    // Start generating rounds
    this.generateRounds(battleId)
  }
  
  private async generateRounds(battleId: string) {
    const battle = this.battles.get(battleId)
    if (!battle) return
    
    const totalRounds = 3 // Always 3 verses for both formats
    const versesPerMC = 3 // 各MCは3バースずつ
    
    for (let roundNumber = 1; roundNumber <= totalRounds; roundNumber++) {
      if (battle.status !== 'in_progress') break
      
      try {
        // Emit round start event
        this.emitBattleEvent(battleId, {
          type: 'round_start',
          battleId,
          data: { roundNumber },
          timestamp: new Date(),
        })
        
        // Create round with empty verses array
        const round: Round = {
          number: roundNumber,
          verses: [],
          votes: {
            ai1: 0,
            ai2: 0,
          },
        }
        
        battle.rounds.push(round)
        
        // Generate verses sequentially (alternating between MCs)
        for (let verseNum = 1; verseNum <= versesPerMC * 2; verseNum++) {
          const participantId = verseNum % 2 === 1 ? 'ai1' : 'ai2' // Odd verses: ai1, Even verses: ai2
          // Generate lyric for this verse
          const lyric = await this.generateLyric(battle, participantId, roundNumber)
          
          // Create verse
          const verse: Verse = {
            number: verseNum,
            participantId,
            lyric,
          }
          
          if (round.verses) {
            round.verses.push(verse)
          }
          
          // Emit lyric generated event for this verse
          this.emitBattleEvent(battleId, {
            type: 'lyric_generated',
            battleId,
            data: { 
              roundNumber,
              verseNumber: verseNum,
              verse,
              participantId 
            },
            timestamp: new Date(),
          })
          
          // Generate audio for this verse
          const audioUrl = await this.generateAudio(lyric.content, participantId, roundNumber)
          lyric.audioUrl = audioUrl
          
          // Emit audio ready event for this verse
          this.emitBattleEvent(battleId, {
            type: 'audio_ready',
            battleId,
            data: { 
              roundNumber,
              verseNumber: verseNum,
              audioUrl,
              participantId 
            },
            timestamp: new Date(),
          })
          
          // Small delay between verses to simulate realistic pacing
          if (verseNum < versesPerMC * 2) {
            await new Promise(resolve => setTimeout(resolve, 2000)) // 2 second delay between verses
          }
        }
        
        // Save round to database after all verses are generated
        await this.firestore.saveRound(battleId, round)
        
        // Wait for round to complete (audio playback time + voting time)
        await this.waitForRoundCompletion(roundNumber)
        
        // Emit round end event
        this.emitBattleEvent(battleId, {
          type: 'round_end',
          battleId,
          data: { roundNumber },
          timestamp: new Date(),
        })
        
      } catch (error) {
        logger.error(`Error generating round ${roundNumber}:`, error)
        // Continue to next round even if this one fails
      }
    }
    
    // End battle
    await this.endBattle(battleId)
  }
  
  private async generateLyric(
    battle: Battle, 
    participantId: 'ai1' | 'ai2',
    roundNumber: number
  ): Promise<Lyric> {
    const startTime = Date.now()
    const participant = battle.participants[participantId]
    
    // Build context from previous rounds and current round
    const previousLyrics: string[] = []
    
    // Previous rounds' all verses
    for (let i = 0; i < roundNumber - 1; i++) {
      const prevRound = battle.rounds[i]
      if (prevRound?.verses) {
        previousLyrics.push(...prevRound.verses.map(v => v.lyric.content))
      }
    }
    
    // Current round's verses so far
    const currentRound = battle.rounds[roundNumber - 1]
    if (currentRound?.verses) {
      previousLyrics.push(...currentRound.verses.map(v => v.lyric.content))
    }
    
    try {
      if (this.useAgent) {
        // Use Mastra Agent for generation
        const lyric = await this.agent.generateLyrics({
          theme: battle.theme,
          bars: 8, // Fixed 8 bars per verse
          previousLyrics,
          style: participant.style,
          model: participant.model,
        })
        
        logger.info(`Agent generated lyric for ${participant.name} in ${lyric.generationTime}ms`)
        return lyric
        
      } else {
        // Use traditional service
        let content: string
        let complianceScore = 1.0
        
        content = await this.vertexAI.generateLyric({
          theme: battle.theme,
          bars: 8, // Fixed 8 bars per verse
          previousLyrics,
          style: participant.style,
          model: participant.model,
        })
        
        // Check compliance if enabled
        if (config.features.enableComplianceCheck) {
          const complianceResult = await this.compliance.checkContent(content)
          
          if (!complianceResult.safe) {
            logger.warn('Content failed compliance check, regenerating...')
            return this.generateLyric(battle, participantId, roundNumber)
          }
          
          complianceScore = complianceResult.score
        }
        
        const generationTime = Date.now() - startTime
        
        const lyric: Lyric = {
          id: nanoid(),
          content,
          bars: 8, // Fixed 8 bars per verse
          rhymes: [],
          punchlines: [],
          generatedAt: new Date(),
          complianceScore,
          generationTime,
        }
        
        logger.info(`Traditional service generated lyric for ${participant.name} in ${generationTime}ms`)
        return lyric
      }
      
    } catch (error) {
      logger.error('Error generating lyric:', error)
      // Return fallback lyric
      return {
        id: nanoid(),
        content: `Yo, I'm ${participant.name}, here to rock the mic\nDropping bars about ${battle.theme}, that's what I like`,
        bars: 8, // Fixed 8 bars per verse
        rhymes: [],
        punchlines: [],
        generatedAt: new Date(),
        complianceScore: 1.0,
        generationTime: Date.now() - startTime,
        // Don't include answerTo field to avoid undefined
      }
    }
  }
  
  private async generateAudio(text: string, _participantId?: 'ai1' | 'ai2', _roundNumber?: number): Promise<string> {
    try {
      const audioBuffer = await this.tts.synthesizeSpeech({
        text,
        voiceSettings: {
          speakingRate: config.tts.speakingRate,
          pitch: config.tts.pitch,
          volumeGainDb: config.tts.volumeGainDb,
        },
      })
      
      // In production, upload to Cloud Storage and return URL
      // For now, return base64 encoded audio
      const base64Audio = audioBuffer.toString('base64')
      return `data:audio/mp3;base64,${base64Audio}`
      
    } catch (error) {
      logger.error('Error generating audio:', error)
      return ''
    }
  }
  
  private async waitForRoundCompletion(_roundNumber: number) {
    // Audio playback time (estimated) + voting time
    const waitTime = 30000 // 30 seconds per round
    await new Promise(resolve => setTimeout(resolve, waitTime))
  }
  
  async endBattle(battleId: string) {
    const battle = this.battles.get(battleId)
    if (!battle) return
    
    battle.status = 'completed'
    battle.endedAt = new Date()
    
    // Calculate final scores
    let finalScores: { scores: { ai1: number; ai2: number }; winner: string }
    
    if (this.useAgent) {
      // Use agent to evaluate the battle
      const evaluation = await this.agent.evaluateBattle(battle)
      finalScores = {
        scores: evaluation.scores,
        winner: evaluation.winner,
      }
      
      logger.info(`Agent evaluation: ${evaluation.analysis}`)
    } else {
      // Use traditional scoring
      finalScores = this.calculateFinalScores(battle)
    }
    
    // Emit battle end event
    this.emitBattleEvent(battleId, {
      type: 'battle_end',
      battleId,
      data: { 
        winner: finalScores.winner,
        scores: finalScores.scores,
      },
      timestamp: new Date(),
    })
    
    // Save final battle state
    await this.firestore.saveBattle(battle)
    
    // Clean up
    this.battles.delete(battleId)
    await this.redis.deleteBattle(battleId)
    
    logger.info(`Battle ended: ${battleId}`)
  }
  
  private calculateFinalScores(battle: Battle) {
    const scores = {
      ai1: battle.votes.ai1,
      ai2: battle.votes.ai2,
    }
    
    const winner = scores.ai1 > scores.ai2 ? 'ai1' : 
                   scores.ai2 > scores.ai1 ? 'ai2' : 'tie'
    
    return { scores, winner }
  }
  
  async recordVote(
    battleId: string, 
    roundNumber: number, 
    votedFor: 'ai1' | 'ai2',
    userId: string
  ) {
    const battle = this.battles.get(battleId)
    if (!battle) return
    
    // Check if user already voted for this round
    const voteKey = `${battleId}:${roundNumber}:${userId}`
    const hasVoted = await this.redis.hasVoted(voteKey)
    if (hasVoted) {
      throw new Error('User has already voted for this round')
    }
    
    // Update vote counts
    const round = battle.rounds.find(r => r.number === roundNumber)
    if (round) {
      round.votes[votedFor]++
      battle.votes[votedFor]++
      
      // Record vote
      await this.redis.recordVote(voteKey)
      await this.firestore.saveVote(battleId, roundNumber, votedFor, userId)
    }
  }
  
  async getBattleState(battleId: string): Promise<Battle | null> {
    // Try memory first
    let battle = this.battles.get(battleId)
    
    // Try Redis cache
    if (!battle) {
      const redisBattle = await this.redis.getBattle(battleId)
      if (redisBattle) {
        battle = redisBattle
      }
    }
    
    // Try Firestore
    if (!battle) {
      const firestoreBattle = await this.firestore.getBattle(battleId)
      if (firestoreBattle) {
        battle = firestoreBattle
      }
    }
    
    return battle || null
  }
  
  addViewer(battleId: string, _socketId: string) {
    const battle = this.battles.get(battleId)
    if (battle) {
      battle.viewers++
    }
  }
  
  removeViewer(battleId: string, _socketId: string) {
    const battle = this.battles.get(battleId)
    if (battle && battle.viewers > 0) {
      battle.viewers--
    }
  }
  
  removeViewerFromAll(_socketId: string) {
    // In production, track which battles each socket is viewing
    this.battles.forEach(battle => {
      if (battle.viewers > 0) {
        battle.viewers--
      }
    })
  }
  
  private emitBattleEvent(battleId: string, event: BattleEvent) {
    logger.info(`Emitting battle event: ${event.type} to room ${battleId}`)
    this.io.to(battleId).emit('battle_event', event)
  }
  
  // Additional methods for agent-specific features
  async testAgentConnection(): Promise<boolean> {
    if (this.useAgent) {
      return await this.agent.testConnection()
    }
    return await this.vertexAI.testConnection()
  }
  
  async switchToAgent(enable: boolean) {
    this.useAgent = enable
    logger.info(`Switched to ${enable ? 'Mastra Agent' : 'traditional services'}`)
  }
}