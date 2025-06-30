import { Server } from 'socket.io'
import { BattleManager } from '@/services/websocket/battleManager'
import { VertexAIService } from '@/services/vertexai'
import { TextToSpeechService } from '@/services/text-to-speech'
import { ComplianceService } from '@/services/compliance'
import { FirestoreService } from '@/services/firestore'
import { RedisService } from '@/services/redis'

// Mock all dependencies
jest.mock('@/services/vertexai')
jest.mock('@/services/text-to-speech')
jest.mock('@/services/compliance')
jest.mock('@/services/firestore')
jest.mock('@/services/redis')
jest.mock('socket.io')

describe('BattleManager', () => {
  let battleManager: BattleManager
  let mockIo: jest.Mocked<Server>
  let mockVertexAI: jest.Mocked<VertexAIService>
  let mockTTS: jest.Mocked<TextToSpeechService>
  let mockCompliance: jest.Mocked<ComplianceService>
  let mockFirestore: jest.Mocked<FirestoreService>
  let mockRedis: jest.Mocked<RedisService>

  beforeEach(() => {
    // Create mock instances
    mockIo = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as any

    mockVertexAI = new VertexAIService() as jest.Mocked<VertexAIService>
    mockTTS = new TextToSpeechService() as jest.Mocked<TextToSpeechService>
    mockCompliance = new ComplianceService() as jest.Mocked<ComplianceService>
    mockFirestore = new FirestoreService() as jest.Mocked<FirestoreService>
    mockRedis = new RedisService() as jest.Mocked<RedisService>

    // Setup default mock implementations
    mockVertexAI.generateLyric = jest.fn().mockResolvedValue('Generated lyric content')
    mockTTS.synthesizeSpeech = jest.fn().mockResolvedValue(Buffer.from('audio data'))
    mockCompliance.checkContent = jest.fn().mockResolvedValue({ safe: true, score: 0.9 })
    mockFirestore.saveBattle = jest.fn().mockResolvedValue(undefined)
    mockFirestore.saveRound = jest.fn().mockResolvedValue(undefined)
    mockRedis.setBattle = jest.fn().mockResolvedValue(undefined)
    mockRedis.hasVoted = jest.fn().mockResolvedValue(false)
    mockRedis.recordVote = jest.fn().mockResolvedValue(undefined)

    battleManager = new BattleManager(mockIo)
  })

  describe('createBattle', () => {
    it('should create a new battle with correct structure', async () => {
      const theme = 'Technology vs Nature'
      const creatorId = 'user123'

      const battle = await battleManager.createBattle(theme, creatorId)

      expect(battle).toMatchObject({
        status: 'waiting',
        theme,
        participants: {
          ai1: {
            id: 'ai1',
            name: 'MC Flash',
            model: 'gemini-flash',
          },
          ai2: {
            id: 'ai2',
            name: 'Professor Bars',
            model: 'gemini-pro',
          },
        },
        votes: { ai1: 0, ai2: 0 },
        viewers: 1,
      })
      expect(battle.id).toMatch(/^battle-/)
      expect(mockFirestore.saveBattle).toHaveBeenCalledWith(battle)
      expect(mockRedis.setBattle).toHaveBeenCalledWith(battle.id, battle)
    })
  })

  describe('startBattle', () => {
    it('should start battle and emit events', async () => {
      const battle = await battleManager.createBattle('Test Theme', 'user123')
      
      // Start battle without waiting for rounds to complete
      const startPromise = battleManager.startBattle(battle.id)

      // Wait a bit for the battle to start
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(mockIo.to).toHaveBeenCalledWith(battle.id)
      expect(mockIo.emit).toHaveBeenCalledWith('battle_event', expect.objectContaining({
        type: 'battle_start',
        battleId: battle.id,
      }))

      // Clean up
      await battleManager.endBattle(battle.id)
    })

    it('should throw error if battle not found', async () => {
      await expect(battleManager.startBattle('non-existent')).rejects.toThrow('Battle not found')
    })
  })

  describe('recordVote', () => {
    it('should record vote successfully', async () => {
      const battle = await battleManager.createBattle('Test Theme', 'user123')
      battle.rounds.push({
        number: 1,
        lyrics: {
          ai1: { id: '1', content: 'test', generatedAt: new Date(), complianceScore: 1, generationTime: 100 },
          ai2: { id: '2', content: 'test', generatedAt: new Date(), complianceScore: 1, generationTime: 100 },
        },
        votes: { ai1: 0, ai2: 0 },
      })

      await battleManager.recordVote(battle.id, 1, 'ai1', 'user123')

      expect(mockRedis.hasVoted).toHaveBeenCalled()
      expect(mockRedis.recordVote).toHaveBeenCalled()
      expect(mockFirestore.saveVote).toHaveBeenCalledWith(battle.id, 1, 'ai1', 'user123')
    })

    it('should prevent duplicate voting', async () => {
      mockRedis.hasVoted.mockResolvedValue(true)
      
      const battle = await battleManager.createBattle('Test Theme', 'user123')
      battle.rounds.push({
        number: 1,
        lyrics: {
          ai1: { id: '1', content: 'test', generatedAt: new Date(), complianceScore: 1, generationTime: 100 },
          ai2: { id: '2', content: 'test', generatedAt: new Date(), complianceScore: 1, generationTime: 100 },
        },
        votes: { ai1: 0, ai2: 0 },
      })

      await expect(
        battleManager.recordVote(battle.id, 1, 'ai1', 'user123')
      ).rejects.toThrow('User has already voted for this round')
    })
  })

  describe('getBattleState', () => {
    it('should get battle from memory first', async () => {
      const battle = await battleManager.createBattle('Test Theme', 'user123')
      
      const retrieved = await battleManager.getBattleState(battle.id)
      
      expect(retrieved).toEqual(battle)
      expect(mockRedis.getBattle).not.toHaveBeenCalled()
      expect(mockFirestore.getBattle).not.toHaveBeenCalled()
    })

    it('should fallback to Redis if not in memory', async () => {
      const mockBattle = { id: 'battle-123' } as any
      mockRedis.getBattle.mockResolvedValue(mockBattle)
      
      const retrieved = await battleManager.getBattleState('battle-123')
      
      expect(retrieved).toEqual(mockBattle)
      expect(mockRedis.getBattle).toHaveBeenCalledWith('battle-123')
    })

    it('should fallback to Firestore if not in Redis', async () => {
      const mockBattle = { id: 'battle-123' } as any
      mockRedis.getBattle.mockResolvedValue(null)
      mockFirestore.getBattle.mockResolvedValue(mockBattle)
      
      const retrieved = await battleManager.getBattleState('battle-123')
      
      expect(retrieved).toEqual(mockBattle)
      expect(mockFirestore.getBattle).toHaveBeenCalledWith('battle-123')
    })
  })

  describe('viewer management', () => {
    it('should add viewer to battle', async () => {
      const battle = await battleManager.createBattle('Test Theme', 'user123')
      const initialViewers = battle.viewers
      
      battleManager.addViewer(battle.id, 'socket123')
      
      expect(battle.viewers).toBe(initialViewers + 1)
    })

    it('should remove viewer from battle', async () => {
      const battle = await battleManager.createBattle('Test Theme', 'user123')
      battleManager.addViewer(battle.id, 'socket123')
      const viewersAfterAdd = battle.viewers
      
      battleManager.removeViewer(battle.id, 'socket123')
      
      expect(battle.viewers).toBe(viewersAfterAdd - 1)
    })

    it('should not go below 0 viewers', async () => {
      const battle = await battleManager.createBattle('Test Theme', 'user123')
      battle.viewers = 0
      
      battleManager.removeViewer(battle.id, 'socket123')
      
      expect(battle.viewers).toBe(0)
    })
  })
})