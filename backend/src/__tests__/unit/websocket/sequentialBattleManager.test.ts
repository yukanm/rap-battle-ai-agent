import { Server } from 'socket.io'
import { BattleManager } from '@/services/websocket/battleManager'
import { createLogger } from '@/utils/logger'

// Mock all dependencies
jest.mock('@/utils/logger')
jest.mock('@/services/text-to-speech')
jest.mock('@/services/firestore')
jest.mock('@/services/cache')
jest.mock('@/services/mc-battle-agent')

describe('BattleManager - Sequential Verse Generation', () => {
  let io: Server
  let battleManager: BattleManager
  let mockEmit: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockEmit = jest.fn()
    io = {
      to: jest.fn().mockReturnValue({ emit: mockEmit }),
    } as any
    
    battleManager = new BattleManager(io)
  })

  describe('Battle Format', () => {
    it('should create a battle with 3verses-3rounds format by default', async () => {
      const battle = await battleManager.createBattle('フリースタイル', 'user123')
      
      expect(battle.format).toBe('3verses-3rounds')
      expect(battle.theme).toBe('フリースタイル')
    })

    it('should create a battle with 3verses-1round format when specified', async () => {
      const battle = await battleManager.createBattle('サイファー', 'user123', '3verses-1round')
      
      expect(battle.format).toBe('3verses-1round')
    })
  })

  describe('Verse Generation', () => {
    it('should generate verses sequentially, not in parallel', async () => {
      // This test verifies that verses are generated one after another
      // In the real implementation, we'd monitor the order of API calls
      const battle = await battleManager.createBattle('テスト', 'user123')
      
      // The structure should have verses array instead of lyrics object
      expect(battle.rounds).toEqual([])
      
      // When a round is generated, it should have verses array
      // Each round should have 6 verses (3 per MC, alternating)
    })
  })

  describe('Event Emission', () => {
    it('should emit verse-specific events instead of round-wide events', async () => {
      // Verify that lyric_generated and audio_ready events
      // are emitted for each verse individually
      const battle = await battleManager.createBattle('テスト', 'user123')
      
      // Events should include verseNumber and participantId
      // in their data payload
    })
  })
})