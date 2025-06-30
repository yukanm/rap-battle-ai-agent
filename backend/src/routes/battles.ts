import { Router } from 'express'
import { FirestoreService } from '@/services/firestore'
import { AppError } from '@/middleware/errorHandler'
// import { logger } from '@/utils/logger' - unused import

const router = Router()
const firestore = new FirestoreService()

// Get battle by ID
router.get('/:battleId', async (req, res, next) => {
  try {
    const { battleId } = req.params
    
    const battle = await firestore.getBattle(battleId)
    
    if (!battle) {
      throw new AppError('Battle not found', 404)
    }
    
    res.json({ battle })
  } catch (error) {
    next(error)
  }
})

// List recent battles
router.get('/', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10
    const battles = await firestore.listRecentBattles(limit)
    
    res.json({ battles })
  } catch (error) {
    next(error)
  }
})

// Get battle analytics
router.get('/:battleId/analytics', async (req, res, next) => {
  try {
    const { battleId } = req.params
    
    const [battle, voteStats] = await Promise.all([
      firestore.getBattle(battleId),
      firestore.getVoteStats(battleId),
    ])
    
    if (!battle) {
      throw new AppError('Battle not found', 404)
    }
    
    const analytics = {
      battleId,
      duration: battle.endedAt ? 
        (battle.endedAt.getTime() - battle.startedAt.getTime()) / 1000 : null,
      totalRounds: battle.rounds.length,
      voteStats,
      averageGenerationTime: battle.rounds.reduce((sum, round) => {
        if (!round.lyrics) return sum
        const avgTime = (round.lyrics.ai1.generationTime + round.lyrics.ai2.generationTime) / 2
        return sum + avgTime
      }, 0) / battle.rounds.length,
    }
    
    res.json({ analytics })
  } catch (error) {
    next(error)
  }
})

export const battlesRouter = router