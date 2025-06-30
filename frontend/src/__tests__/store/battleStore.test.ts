import { renderHook, act } from '@testing-library/react'
import { useBattleStore } from '@/store/battleStore'

describe('Battle Store', () => {
  beforeEach(() => {
    // Reset store state
    const { result } = renderHook(() => useBattleStore())
    act(() => {
      result.current.battle = null
      result.current.currentRound = 0
      result.current.isLoading = false
      result.current.error = null
    })
  })

  describe('startBattle', () => {
    it('should create a new battle', async () => {
      const { result } = renderHook(() => useBattleStore())

      await act(async () => {
        await result.current.startBattle('Technology vs Nature')
      })

      expect(result.current.battle).toMatchObject({
        status: 'waiting',
        theme: 'Technology vs Nature',
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
        rounds: [],
        votes: { ai1: 0, ai2: 0 },
        viewers: 1,
      })
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should handle errors during battle creation', async () => {
      const { result } = renderHook(() => useBattleStore())

      // Mock an error by passing an invalid theme
      jest.spyOn(console, 'error').mockImplementation(() => {})
      
      await act(async () => {
        // Simulate an error condition
        result.current.setError('Failed to start battle')
      })

      expect(result.current.error).toBe('Failed to start battle')
      
      jest.restoreAllMocks()
    })
  })

  describe('endBattle', () => {
    it('should mark battle as completed', async () => {
      const { result } = renderHook(() => useBattleStore())

      // First create a battle
      await act(async () => {
        await result.current.startBattle('Test Theme')
      })

      // Then end it
      act(() => {
        result.current.endBattle()
      })

      expect(result.current.battle?.status).toBe('completed')
      expect(result.current.battle?.endedAt).toBeDefined()
    })

    it('should do nothing if no battle exists', () => {
      const { result } = renderHook(() => useBattleStore())

      act(() => {
        result.current.endBattle()
      })

      expect(result.current.battle).toBeNull()
    })
  })

  describe('addRound', () => {
    it('should add a round to the battle', async () => {
      const { result } = renderHook(() => useBattleStore())

      await act(async () => {
        await result.current.startBattle('Test Theme')
      })

      const newRound = {
        number: 1,
        lyrics: {
          ai1: {
            id: 'lyric-1',
            content: 'Test lyric 1',
            generatedAt: new Date(),
            complianceScore: 0.9,
            generationTime: 500,
          },
          ai2: {
            id: 'lyric-2',
            content: 'Test lyric 2',
            generatedAt: new Date(),
            complianceScore: 0.95,
            generationTime: 600,
          },
        },
        votes: { ai1: 0, ai2: 0 },
      }

      act(() => {
        result.current.addRound(newRound)
      })

      expect(result.current.battle?.rounds).toHaveLength(1)
      expect(result.current.battle?.rounds[0]).toEqual(newRound)
      expect(result.current.currentRound).toBe(1)
    })
  })

  describe('updateVotes', () => {
    it('should update vote counts for a round', async () => {
      const { result } = renderHook(() => useBattleStore())

      await act(async () => {
        await result.current.startBattle('Test Theme')
      })

      // Add a round first
      const round = {
        number: 1,
        lyrics: {
          ai1: {
            id: 'lyric-1',
            content: 'Test',
            generatedAt: new Date(),
            complianceScore: 1,
            generationTime: 100,
          },
          ai2: {
            id: 'lyric-2',
            content: 'Test',
            generatedAt: new Date(),
            complianceScore: 1,
            generationTime: 100,
          },
        },
        votes: { ai1: 0, ai2: 0 },
      }

      act(() => {
        result.current.addRound(round)
      })

      // Update votes
      act(() => {
        result.current.updateVotes(1, 'ai1')
      })

      expect(result.current.battle?.rounds[0].votes.ai1).toBe(1)
      expect(result.current.battle?.votes.ai1).toBe(1)
    })

    it('should handle multiple rounds correctly', async () => {
      const { result } = renderHook(() => useBattleStore())

      await act(async () => {
        await result.current.startBattle('Test Theme')
      })

      // Add multiple rounds
      const rounds = [1, 2].map(num => ({
        number: num,
        lyrics: {
          ai1: {
            id: `lyric-${num}-1`,
            content: 'Test',
            generatedAt: new Date(),
            complianceScore: 1,
            generationTime: 100,
          },
          ai2: {
            id: `lyric-${num}-2`,
            content: 'Test',
            generatedAt: new Date(),
            complianceScore: 1,
            generationTime: 100,
          },
        },
        votes: { ai1: 0, ai2: 0 },
      }))

      act(() => {
        rounds.forEach(round => result.current.addRound(round))
      })

      // Update votes for different rounds
      act(() => {
        result.current.updateVotes(1, 'ai1')
        result.current.updateVotes(2, 'ai2')
        result.current.updateVotes(1, 'ai1')
      })

      expect(result.current.battle?.rounds[0].votes.ai1).toBe(2)
      expect(result.current.battle?.rounds[1].votes.ai2).toBe(1)
      expect(result.current.battle?.votes.ai1).toBe(2)
      expect(result.current.battle?.votes.ai2).toBe(1)
    })
  })

  describe('updateBattle', () => {
    it('should update battle properties', async () => {
      const { result } = renderHook(() => useBattleStore())

      await act(async () => {
        await result.current.startBattle('Test Theme')
      })

      act(() => {
        result.current.updateBattle({
          status: 'in_progress',
          viewers: 50,
        })
      })

      expect(result.current.battle?.status).toBe('in_progress')
      expect(result.current.battle?.viewers).toBe(50)
    })
  })
})