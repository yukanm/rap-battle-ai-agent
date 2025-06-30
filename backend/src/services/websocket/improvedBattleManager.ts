import { Server } from 'socket.io'
import { nanoid } from 'nanoid'
import { createLogger } from '@/utils/logger'
import { TextToSpeechService } from '../text-to-speech'
import { FirestoreService } from '../firestore'
import { RedisService } from '../redis'
import { MCBattleAgentService } from '../mc-battle-agent'
import type { Battle, Round, Lyric, BattleEvent } from '@/types'
import { config } from '@/config'

const logger = createLogger('improved-battle-manager')

/**
 * 改善されたバトルマネージャー
 * - 真の交互システム（先行 → 後攻 → 先行 → 後攻）
 * - アンサー機能の強化
 * - スタイルの差別化
 */
export class ImprovedBattleManager {
  private io: Server
  private battles: Map<string, Battle> = new Map()
  private tts: TextToSpeechService
  private firestore: FirestoreService
  private redis: RedisService
  private mcBattleAgent: MCBattleAgentService
  
  constructor(io: Server) {
    this.io = io
    this.tts = new TextToSpeechService()
    this.firestore = new FirestoreService()
    this.redis = new RedisService()
    this.mcBattleAgent = new MCBattleAgentService()
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
          name: 'MC Flash',
          model: 'gemini-flash',
          style: '超高速フロウ、瞬発力重視。相手の隙を突く鋭いカウンターとクイックな韻踏みが得意。話し方はまくし立てるような勢いで、テンポを重視する。',
          avatar: '/avatars/mc-flash.png',
        },
        ai2: {
          id: 'ai2',
          name: 'MC Gemin aka アンサーマシン',
          model: 'gemini-pro',
          style: 'アンサー特化型。相手のリリックを完全に分析し、言葉を拾って韻で返すカウンター型。話し口調で聴衆に語りかけながら相手を論破する。',
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
    
    // Start generating rounds with alternating system
    this.generateAlternatingRounds(battleId)
  }
  
  /**
   * 真の交互システムでラウンドを生成
   * 8小節x4ラウンド形式では：
   * - ラウンド1: ai1先行 → ai2アンサー
   * - ラウンド2: ai2先行 → ai1アンサー
   * - ラウンド3: ai1先行 → ai2アンサー
   * - ラウンド4: ai2先行 → ai1アンサー
   */
  private async generateAlternatingRounds(battleId: string) {
    const battle = this.battles.get(battleId)
    if (!battle) return
    
    const totalRounds = 3 // Always 3 verses for both formats
    
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
        
        // 先行・後攻を決定（奇数ラウンド: ai1先行、偶数ラウンド: ai2先行）
        const firstParticipant = roundNumber % 2 === 1 ? 'ai1' : 'ai2'
        const secondParticipant = firstParticipant === 'ai1' ? 'ai2' : 'ai1'
        
        logger.info(`Round ${roundNumber}: ${firstParticipant}先行 → ${secondParticipant}後攻`)
        
        // 1. 先行のリリック生成
        const firstLyric = await this.generateLyric(battle, firstParticipant, roundNumber, 'first')
        
        // 先行リリック完了イベント
        this.emitBattleEvent(battleId, {
          type: 'lyric_generated',
          battleId,
          data: { 
            roundNumber, 
            participant: firstParticipant,
            lyric: firstLyric,
            position: 'first'
          },
          timestamp: new Date(),
        })
        
        // 2. 少し間を置いて後攻のリリック生成（アンサー）
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        const secondLyric = await this.generateLyric(battle, secondParticipant, roundNumber, 'second', firstLyric.content)
        
        // Create round
        const round: Round = {
          number: roundNumber,
          lyrics: {
            [firstParticipant]: firstLyric,
            [secondParticipant]: secondLyric,
          } as any,
          votes: {
            ai1: 0,
            ai2: 0,
          },
        }
        
        battle.rounds.push(round)
        
        // 後攻リリック完了（ラウンド完了）イベント
        this.emitBattleEvent(battleId, {
          type: 'lyric_generated',
          battleId,
          data: { 
            round, 
            roundNumber,
            participant: secondParticipant,
            lyric: secondLyric,
            position: 'second'
          },
          timestamp: new Date(),
        })
        
        // Generate audio for both lyrics in parallel
        const [audio1, audio2] = await Promise.all([
          this.generateAudio(firstLyric.content, firstParticipant, roundNumber),
          this.generateAudio(secondLyric.content, secondParticipant, roundNumber),
        ])
        
        // Update lyrics with audio URLs
        firstLyric.audioUrl = audio1
        secondLyric.audioUrl = audio2
        
        // Emit audio ready events
        this.emitBattleEvent(battleId, {
          type: 'audio_ready',
          battleId,
          data: { 
            roundNumber, 
            audioUrls: { 
              [firstParticipant]: audio1, 
              [secondParticipant]: audio2 
            } 
          },
          timestamp: new Date(),
        })
        
        // Save round to database
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
  
  /**
   * 改善されたリリック生成（先行・後攻、アンサー対応）
   */
  private async generateLyric(
    battle: Battle, 
    participantId: 'ai1' | 'ai2',
    roundNumber: number,
    position: 'first' | 'second',
    opponentCurrentLyric?: string
  ): Promise<Lyric> {
    const participant = battle.participants[participantId]
    
    // 前のラウンドのリリックを構築
    const previousLyrics = battle.rounds
      .slice(0, roundNumber - 1)
      .flatMap(r => r.lyrics ? [r.lyrics.ai1.content, r.lyrics.ai2.content] : [])
    
    // 相手の最新リリック（アンサー用）
    let opponentLatestLyric: string | undefined = opponentCurrentLyric
    
    // 後攻でない場合は前ラウンドの相手リリックを参照
    if (!opponentLatestLyric && roundNumber > 1) {
      const lastRound = battle.rounds[roundNumber - 2]
      if (lastRound.lyrics) {
        opponentLatestLyric = participantId === 'ai1' 
          ? lastRound.lyrics.ai2.content 
          : lastRound.lyrics.ai1.content
      }
    }
    
    try {
      // バトル形式に応じた小節数
      const bars = 8 // 固定で8小節
      
      // 参加者に応じたスタイル調整
      let enhancedStyle = participant.style
      
      if (position === 'second' && opponentCurrentLyric) {
        // 後攻（アンサー）の場合は特別なプロンプト強化
        if (participantId === 'ai2') {
          enhancedStyle += `\n\n【重要】あなたは「アンサーマシン」として、相手のリリック「${opponentCurrentLyric}」に対して完璧なアンサー（返し）をしてください。相手の言葉を引用し、韻で返し、論理的に反撃してください。話し口調でまくし立てるように。`
        } else {
          enhancedStyle += `\n\n【重要】相手のリリック「${opponentCurrentLyric}」に対してスピード感あふれるカウンターアタックをしてください。相手の隙を突き、クイックな韻で攻撃してください。`
        }
      } else if (position === 'first') {
        // 先行の場合は攻撃的なスタイル
        enhancedStyle += '\n\n【重要】あなたは先行です。テーマに沿って積極的に攻め、相手に隙を与えないような強力なリリックを作ってください。'
      }
      
      // MCバトルエージェントを使用してリリック生成
      const lyric = await this.mcBattleAgent.generateLyrics({
        theme: battle.theme,
        bars,
        style: enhancedStyle,
        opponentLatestLyric,
        previousLyrics,
        model: participant.model,
        roundNumber,
        totalRounds: 3 // Always 3 verses for both formats
      })
      
      logger.info(`MCバトルリリック生成完了 - ${participant.name} (${position}): ${lyric.generationTime}ms`)
      return lyric
      
    } catch (error) {
      logger.error('MCバトルリリック生成エラー:', error)
      // フォールバックを使用
      const startTime = Date.now()
      return {
        id: nanoid(),
        content: `俺は${participant.name}、${position === 'first' ? '先行で' : 'アンサーで'}攻める\n${battle.theme}について韻を踏む`,
        bars: 8, // 固定で8小節
        rhymes: [],
        punchlines: [],
        generatedAt: new Date(),
        complianceScore: 1.0,
        generationTime: Date.now() - startTime,
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
    await this.redis.deleteBattle(battleId)
    
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
}