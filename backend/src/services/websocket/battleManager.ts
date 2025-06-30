import { Server } from 'socket.io'
import { nanoid } from 'nanoid'
import { createLogger } from '@/utils/logger'
import { TextToSpeechService } from '../text-to-speech'
import { FirestoreService } from '../firestore'
import { StorageService } from '../storage'
import { getCacheService, CacheService, CacheKeys } from '../cache'
import { MCBattleAgentService } from '../mc-battle-agent'
import type { Battle, Round, Lyric, BattleEvent } from '@/types'
import { config } from '@/config'
// Mock data removed - using real APIs only

const logger = createLogger('battle-manager')

export class BattleManager {
  private io: Server
  private battles: Map<string, Battle> = new Map()
  private tts: TextToSpeechService
  private firestore: FirestoreService
  private storage: StorageService | null = null
  private cache: CacheService | null = null
  private mcBattleAgent: MCBattleAgentService
  
  constructor(io: Server) {
    this.io = io
    this.tts = new TextToSpeechService()
    this.firestore = new FirestoreService()
    this.mcBattleAgent = new MCBattleAgentService()
    this.initializeStorage()
    this.initializeCache()
  }
  
  private async initializeStorage() {
    try {
      this.storage = new StorageService()
      logger.info('Storage service initialized in BattleManager')
    } catch (error) {
      logger.warn('Storage initialization failed in BattleManager:', error)
    }
  }
  
  private async initializeCache() {
    try {
      this.cache = await getCacheService()
      logger.info('Cache service initialized in BattleManager')
    } catch (error) {
      logger.error('Failed to initialize cache service:', error)
    }
  }
  
  async createBattle(theme: string, _creatorId: string, format: '8bars-3verses' | '16bars-3verses' = '8bars-3verses'): Promise<Battle> {
    const battleId = `battle-${nanoid()}`
    
    const battle: Battle = {
      id: battleId,
      status: 'waiting',
      theme,
      format,
      startedAt: new Date(),
      rounds: [],
      participants: {
        ai1: {
          id: 'ai1',
          name: 'MC フラッシュ',
          model: 'gemini-flash',
          style: 'スピード感あふれるフロウで韻を踏む。言葉遊びとクイックなライムが得意。',
          avatar: '/avatars/mc-flash.png',
        },
        ai2: {
          id: 'ai2',
          name: 'プロフェッサー・バーズ',
          model: 'gemini-pro',
          style: '深く複雑で哲学的。メタファーとストーリーテリングで観客を魅了。',
          avatar: '/avatars/professor-bars.png',
        },
      },
      votes: { ai1: 0, ai2: 0 },
      viewers: 1,
    }
    
    this.battles.set(battleId, battle)
    
    // Save to Firestore
    await this.firestore.saveBattle(battle)
    
    // Cache using cache service
    if (this.cache) {
      await this.cache.set(CacheKeys.BATTLE(battleId), battle, config.redis.ttl)
    }
    
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
    
    // バトル形式に応じたバース数を設定（1バース = 1リリックペア）
    const totalVerses = 3 // 3バース固定
    
    for (let verseNumber = 1; verseNumber <= totalVerses; verseNumber++) {
      if (battle.status !== 'in_progress') break
      
      try {
        // Emit verse start event
        this.emitBattleEvent(battleId, {
          type: 'round_start',
          battleId,
          data: { roundNumber: verseNumber },
          timestamp: new Date(),
        })
        
        // Always maintain the same order: ai1先行 → ai2後攻
        const firstParticipant = 'ai1'
        const secondParticipant = 'ai2'
        
        logger.info(`バース ${verseNumber}: ${firstParticipant}先行 → ${secondParticipant}後攻`)
        
        // 1. 先行のリリック生成
        const lyric1 = await this.generateLyric(battle, firstParticipant, verseNumber)
        
        // 先行リリック完了を通知
        this.emitBattleEvent(battleId, {
          type: 'lyric_generated',
          battleId,
          data: { 
            roundNumber: verseNumber, 
            participant: firstParticipant,
            lyric: lyric1,
            position: 'first'
          },
          timestamp: new Date(),
        })
        
        // 2. 少し間を置いて後攻のリリック生成（アンサー）
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        const lyric2 = await this.generateLyric(battle, secondParticipant, verseNumber, lyric1.content)
        
        // 後攻リリック完了を通知
        this.emitBattleEvent(battleId, {
          type: 'lyric_generated',
          battleId,
          data: { 
            roundNumber: verseNumber, 
            participant: secondParticipant,
            lyric: lyric2,
            position: 'second'
          },
          timestamp: new Date(),
        })
        
        // Create verse (using Round structure for minimal changes)
        const round: Round = {
          number: verseNumber,
          lyrics: {
            [firstParticipant]: lyric1,
            [secondParticipant]: lyric2,
          } as any,
          votes: {
            ai1: 0,
            ai2: 0,
          },
        }
        
        battle.rounds.push(round)
        
        // Emit lyric generated event
        this.emitBattleEvent(battleId, {
          type: 'lyric_generated',
          battleId,
          data: { round, roundNumber: verseNumber },
          timestamp: new Date(),
        })
        
        // Generate audio for both lyrics in parallel
        const [audio1, audio2] = await Promise.all([
          this.generateAudio(lyric1.content, battleId, 'ai1', verseNumber),
          this.generateAudio(lyric2.content, battleId, 'ai2', verseNumber),
        ])
        
        // Update lyrics with audio URLs
        lyric1.audioUrl = audio1
        lyric2.audioUrl = audio2
        
        // Emit audio ready event
        this.emitBattleEvent(battleId, {
          type: 'audio_ready',
          battleId,
          data: { 
            roundNumber: verseNumber, 
            audioUrls: { ai1: audio1, ai2: audio2 } 
          },
          timestamp: new Date(),
        })
        
        // Save verse to database
        await this.firestore.saveRound(battleId, round)
        
        // Wait for verse to complete (audio playback time + voting time)
        await this.waitForRoundCompletion(verseNumber)
        
        // Emit verse end event
        this.emitBattleEvent(battleId, {
          type: 'round_end',
          battleId,
          data: { roundNumber: verseNumber },
          timestamp: new Date(),
        })
        
      } catch (error) {
        logger.error(`Error generating verse ${verseNumber}:`, error)
        // Continue to next verse even if this one fails
      }
    }
    
    // End battle
    await this.endBattle(battleId)
  }
  
  private async generateLyric(
    battle: Battle, 
    participantId: 'ai1' | 'ai2',
    roundNumber: number,
    opponentCurrentLyric?: string
  ): Promise<Lyric> {
    const participant = battle.participants[participantId]
    
    // 前のバースと現在のバースのリリックを構築
    const previousLyrics: string[] = []
    
    // 前のバース番号のすべてのバース
    for (let i = 0; i < roundNumber - 1; i++) {
      const prevRound = battle.rounds[i]
      if (prevRound?.verses) {
        previousLyrics.push(...prevRound.verses.map(v => v.lyric.content))
      }
    }
    
    // 現在のバース番号のこれまでのバース
    const currentRound = battle.rounds[roundNumber - 1]
    if (currentRound?.verses) {
      previousLyrics.push(...currentRound.verses.map(v => v.lyric.content))
    }
    
    // 相手の最新リリック（アンサー用）
    let opponentLatestLyric: string | undefined = opponentCurrentLyric
    
    if (!opponentLatestLyric && roundNumber > 1) {
      // 前のバースから相手の最後のリリックを取得
      const lastRound = battle.rounds[roundNumber - 2]
      if (lastRound?.lyrics) {
        opponentLatestLyric = participantId === 'ai1' 
          ? lastRound.lyrics.ai2?.content 
          : lastRound.lyrics.ai1?.content
      }
    }
    
    try {
      // バースごとの小節数（今回は固定で良さそう）
      const bars = 8 // 各バース8小節
      
      // MCバトルエージェントを使用してリリック生成
      const lyric = await this.mcBattleAgent.generateLyrics({
        theme: battle.theme,
        bars,
        style: participant.style,
        opponentLatestLyric,
        previousLyrics,
        model: participant.model,
        roundNumber,
        totalRounds: 3 // Always 3 verses/rounds for both formats
      })
      
      logger.info(`MCバトルリリック生成完了 - ${participant.name}: ${lyric.generationTime}ms`)
      return lyric
      
    } catch (error) {
      logger.error('MCバトルリリック生成エラー:', error)
      // フォールバックを使用
      const startTime = Date.now()
      return {
        id: nanoid(),
        content: `俺は${participant.name}、マイクを握る\n${battle.theme}について韻を踏む`,
        bars: 8,
        rhymes: [],
        punchlines: [],
        generatedAt: new Date(),
        complianceScore: 1.0,
        generationTime: Date.now() - startTime,
      }
    }
  }
  
  private async generateAudio(text: string, battleId?: string, participantId?: 'ai1' | 'ai2', roundNumber?: number): Promise<string> {
    try {
      // Always use real TTS
      
      const audioBuffer = await this.tts.synthesizeSpeech({
        text,
        voiceSettings: {
          speakingRate: config.tts.speakingRate,
          pitch: config.tts.pitch,
          volumeGainDb: config.tts.volumeGainDb,
        },
      })
      
      // Upload to Cloud Storage if available
      if (this.storage) {
        try {
          const audioUrl = await this.storage.uploadAudio(audioBuffer, {
            battleId,
            roundNumber,
            participantId,
          })
          logger.info(`Audio uploaded to Cloud Storage: ${audioUrl}`)
          return audioUrl
        } catch (storageError) {
          logger.error('Failed to upload audio to Cloud Storage:', storageError)
          // Fall back to base64 if storage fails
        }
      }
      
      // Fallback: return base64 encoded audio (but keep it small to avoid Firestore limit)
      logger.warn('Using base64 audio encoding - this may cause Firestore document size issues')
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
    
    // MCバトルエージェントによる評価
    let finalScores
    let analysis = ''
    let breakdown = null
    
    try {
      const evaluation = await this.mcBattleAgent.evaluateBattle(battle)
      finalScores = {
        winner: evaluation.winner,
        scores: evaluation.scores
      }
      analysis = evaluation.analysis
      breakdown = evaluation.breakdown
    } catch (error) {
      logger.error('MCバトル評価エラー:', error)
      // フォールバック評価
      finalScores = this.calculateFinalScores(battle)
    }
    
    // Emit battle end event
    this.emitBattleEvent(battleId, {
      type: 'battle_end',
      battleId,
      data: { 
        winner: finalScores.winner,
        scores: finalScores.scores,
        analysis,
        breakdown
      },
      timestamp: new Date(),
    })
    
    // Save final battle state
    await this.firestore.saveBattle(battle)
    
    // Clean up
    this.battles.delete(battleId)
    if (this.cache) {
      await this.cache.del(CacheKeys.BATTLE(battleId))
    }
    
    logger.info(`バトル終了: ${battleId} - 勝者: ${finalScores.winner}`)
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
    const voteKey = CacheKeys.VOTE(battleId, roundNumber, userId)
    if (this.cache) {
      const hasVoted = await this.cache.exists(voteKey)
      if (hasVoted) {
        throw new Error('User has already voted for this round')
      }
    }
    
    // Update vote counts
    const round = battle.rounds.find(r => r.number === roundNumber)
    if (round) {
      round.votes[votedFor]++
      battle.votes[votedFor]++
      
      // Record vote
      if (this.cache) {
        await this.cache.set(voteKey, '1', 3600) // 1 hour expiry
      }
      await this.firestore.saveVote(battleId, roundNumber, votedFor, userId)
    }
  }
  
  async getBattleState(battleId: string): Promise<Battle | null> {
    // Try memory first
    let battle = this.battles.get(battleId)
    
    // Try cache service
    if (!battle && this.cache) {
      const cachedBattle = await this.cache.get(CacheKeys.BATTLE(battleId))
      if (cachedBattle) {
        battle = cachedBattle as Battle
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
}