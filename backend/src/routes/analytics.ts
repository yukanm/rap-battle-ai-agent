import { Router } from 'express'
import { RedisService } from '@/services/redis'
// import { FirestoreService } from '@/services/firestore' // Will be used for stats implementation

const router = Router()
const redis = new RedisService()
// const firestore = new FirestoreService() - unused, will be used for stats implementation

// Get leaderboard
router.get('/leaderboard', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10
    const leaderboard = await redis.getLeaderboard(limit)
    
    res.json({ leaderboard })
  } catch (error) {
    next(error)
  }
})

// Get overall statistics
router.get('/stats', async (_req, res, next) => {
  try {
    // This would aggregate data from various sources
    const stats = {
      totalBattles: 0, // Would query from Firestore
      activeUsers: 0,  // Would query from Redis/Firestore
      averageBattleDuration: 0,
      popularThemes: [],
      peakConcurrentUsers: 0,
    }
    
    res.json({ stats })
  } catch (error) {
    next(error)
  }
})

export const analyticsRouter = router