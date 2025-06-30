import request from 'supertest'
import express from 'express'
import { setupRoutes } from '@/routes'
import { errorHandler } from '@/middleware/errorHandler'
import { FirestoreService } from '@/services/firestore'
import { RedisService } from '@/services/redis'

// Mock services
jest.mock('@/services/firestore')
jest.mock('@/services/redis')
jest.mock('@/services/vertexai')
jest.mock('@/services/text-to-speech')

describe('API Integration Tests', () => {
  let app: express.Application
  let mockFirestore: jest.Mocked<FirestoreService>
  let mockRedis: jest.Mocked<RedisService>

  beforeEach(() => {
    app = express()
    app.use(express.json())
    setupRoutes(app)
    app.use(errorHandler)

    // Setup mocks
    mockFirestore = new FirestoreService() as jest.Mocked<FirestoreService>
    mockRedis = new RedisService() as jest.Mocked<RedisService>
  })

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200)

      expect(response.body).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
      })
    })
  })

  describe('Battles API', () => {
    const mockBattle = {
      id: 'battle-123',
      status: 'completed',
      theme: 'Test Theme',
      startedAt: new Date('2024-01-01T00:00:00Z'),
      endedAt: new Date('2024-01-01T00:30:00Z'),
      rounds: [
        {
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
          votes: { ai1: 10, ai2: 8 },
        },
      ],
      participants: {
        ai1: { id: 'ai1', name: 'MC Flash', model: 'gemini-flash' as const, style: 'Fast' },
        ai2: { id: 'ai2', name: 'Professor Bars', model: 'gemini-pro' as const, style: 'Deep' },
      },
      votes: { ai1: 10, ai2: 8 },
      viewers: 100,
    }

    describe('GET /api/battles/:battleId', () => {
      it('should return battle details', async () => {
        mockFirestore.getBattle = jest.fn().mockResolvedValue(mockBattle)

        const response = await request(app)
          .get('/api/battles/battle-123')
          .expect(200)

        expect(response.body.battle).toMatchObject({
          id: 'battle-123',
          status: 'completed',
          theme: 'Test Theme',
        })
      })

      it('should return 404 for non-existent battle', async () => {
        mockFirestore.getBattle = jest.fn().mockResolvedValue(null)

        const response = await request(app)
          .get('/api/battles/non-existent')
          .expect(404)

        expect(response.body.error.message).toBe('Battle not found')
      })
    })

    describe('GET /api/battles', () => {
      it('should list recent battles', async () => {
        mockFirestore.listRecentBattles = jest.fn().mockResolvedValue([mockBattle])

        const response = await request(app)
          .get('/api/battles?limit=5')
          .expect(200)

        expect(response.body.battles).toHaveLength(1)
        expect(response.body.battles[0]).toMatchObject({
          id: 'battle-123',
          status: 'completed',
        })
      })

      it('should use default limit if not provided', async () => {
        mockFirestore.listRecentBattles = jest.fn().mockResolvedValue([])

        await request(app)
          .get('/api/battles')
          .expect(200)

        expect(mockFirestore.listRecentBattles).toHaveBeenCalledWith(10)
      })
    })

    describe('GET /api/battles/:battleId/analytics', () => {
      it('should return battle analytics', async () => {
        mockFirestore.getBattle = jest.fn().mockResolvedValue(mockBattle)
        mockFirestore.getVoteStats = jest.fn().mockResolvedValue({ ai1: 10, ai2: 8 })

        const response = await request(app)
          .get('/api/battles/battle-123/analytics')
          .expect(200)

        expect(response.body.analytics).toMatchObject({
          battleId: 'battle-123',
          duration: 1800, // 30 minutes in seconds
          totalRounds: 1,
          voteStats: { ai1: 10, ai2: 8 },
          averageGenerationTime: 550,
        })
      })

      it('should return 404 for non-existent battle analytics', async () => {
        mockFirestore.getBattle = jest.fn().mockResolvedValue(null)

        await request(app)
          .get('/api/battles/non-existent/analytics')
          .expect(404)
      })
    })
  })

  describe('Analytics API', () => {
    describe('GET /api/analytics/leaderboard', () => {
      it('should return leaderboard', async () => {
        const mockLeaderboard = [
          { userId: 'user1', score: 100 },
          { userId: 'user2', score: 80 },
        ]
        mockRedis.getLeaderboard = jest.fn().mockResolvedValue(mockLeaderboard)

        const response = await request(app)
          .get('/api/analytics/leaderboard?limit=5')
          .expect(200)

        expect(response.body.leaderboard).toEqual(mockLeaderboard)
        expect(mockRedis.getLeaderboard).toHaveBeenCalledWith(5)
      })
    })

    describe('GET /api/analytics/stats', () => {
      it('should return overall statistics', async () => {
        const response = await request(app)
          .get('/api/analytics/stats')
          .expect(200)

        expect(response.body.stats).toMatchObject({
          totalBattles: expect.any(Number),
          activeUsers: expect.any(Number),
          averageBattleDuration: expect.any(Number),
          popularThemes: expect.any(Array),
          peakConcurrentUsers: expect.any(Number),
        })
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/unknown')
        .expect(404)

      expect(response.body.error).toMatchObject({
        message: 'Route not found',
        statusCode: 404,
      })
    })

    it('should handle internal server errors', async () => {
      mockFirestore.getBattle = jest.fn().mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .get('/api/battles/battle-123')
        .expect(500)

      expect(response.body.error).toMatchObject({
        message: 'Internal Server Error',
        statusCode: 500,
      })
    })
  })
})