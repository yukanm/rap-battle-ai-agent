import { Server, Socket } from 'socket.io'
import { createLogger } from '@/utils/logger'
import { BattleManager } from './battleManager'
import type { WebSocketMessage } from '@/types'

const logger = createLogger('websocket')

export function setupSocketHandlers(io: Server) {
  const battleManager = new BattleManager(io)
  
  // Middleware for optional authentication
  io.use(async (_socket, next) => {
    // Currently no authentication required for rap battles
    // Future: implement JWT authentication if needed
    next()
  })

  io.on('connection', (socket: Socket) => {
    logger.info(`Client connected: ${socket.id}`)
    
    // Join battle room
    socket.on('join_battle', async (battleId: string) => {
      try {
        await socket.join(battleId)
        battleManager.addViewer(battleId, socket.id)
        logger.info(`Socket ${socket.id} joined battle ${battleId}`)
        
        // Send current battle state
        const battleState = await battleManager.getBattleState(battleId)
        if (battleState) {
          socket.emit('battle_state', battleState)
        }
      } catch (error) {
        logger.error('Error joining battle:', error)
        socket.emit('error', { message: 'Failed to join battle' })
      }
    })
    
    // Leave battle room
    socket.on('leave_battle', async (battleId: string) => {
      try {
        await socket.leave(battleId)
        battleManager.removeViewer(battleId, socket.id)
        logger.info(`Socket ${socket.id} left battle ${battleId}`)
      } catch (error) {
        logger.error('Error leaving battle:', error)
      }
    })
    
    // Handle messages
    socket.on('message', async (message: WebSocketMessage) => {
      try {
        await handleMessage(socket, message, battleManager)
      } catch (error) {
        logger.error('Error handling message:', error, { 
          messageType: message.type, 
          socketId: socket.id,
          stack: error instanceof Error ? error.stack : undefined 
        })
        socket.emit('error', { 
          message: 'Failed to process message',
          type: message.type,
          details: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    })
    
    // Handle voting
    socket.on('vote', async (data: { battleId: string; roundNumber: number; votedFor: 'ai1' | 'ai2' }) => {
      try {
        const { battleId, roundNumber, votedFor } = data
        const userId = socket.id // In production, use authenticated user ID
        
        await battleManager.recordVote(battleId, roundNumber, votedFor, userId)
        
        // Broadcast vote update to all clients in the battle
        io.to(battleId).emit('battle_event', {
          type: 'vote_update',
          battleId,
          data: { roundNumber, votedFor },
          timestamp: new Date(),
        })
      } catch (error) {
        logger.error('Error recording vote:', error)
        socket.emit('error', { message: 'Failed to record vote' })
      }
    })
    
    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`)
      // Clean up viewer from all battles
      battleManager.removeViewerFromAll(socket.id)
    })
  })
}

async function handleMessage(
  socket: Socket,
  message: WebSocketMessage,
  battleManager: BattleManager
) {
  logger.info(`Processing message: ${message.type}`, { socketId: socket.id, data: message.data })
  
  try {
    switch (message.type) {
      case 'start_battle':
        const { theme, format } = message.data
        if (!theme || typeof theme !== 'string') {
          throw new Error('Invalid or missing theme')
        }
        
        // フォーマットのバリデーション
        const validFormats = ['8bars-3verses', '16bars-3verses']
        const battleFormat = validFormats.includes(format) ? format : '8bars-3verses'
        
        logger.info(`バトル作成中 - テーマ: ${theme}, 形式: ${battleFormat}`)
        const battle = await battleManager.createBattle(theme, socket.id, battleFormat)
        
        // Join the battle room first
        await socket.join(battle.id)
        battleManager.addViewer(battle.id, socket.id)
        logger.info(`Socket ${socket.id} joined battle room ${battle.id}`)
        
        // Notify all clients in the battle room
        socket.emit('battle_event', {
          type: 'battle_start',
          battleId: battle.id,
          data: battle,
          timestamp: new Date(),
        })
        
        // Start the battle rounds
        logger.info(`Starting battle: ${battle.id}`)
        await battleManager.startBattle(battle.id)
        break
        
      case 'join_battle':
        const joinBattleId = message.data.battleId
        if (!joinBattleId) {
          throw new Error('Missing battleId')
        }
        
        await socket.join(joinBattleId)
        battleManager.addViewer(joinBattleId, socket.id)
        
        // Send current battle state
        const battleState = await battleManager.getBattleState(joinBattleId)
        if (battleState) {
          socket.emit('battle_state', battleState)
        }
        break
        
      case 'end_battle':
        const { battleId } = message.data
        if (!battleId) {
          throw new Error('Missing battleId')
        }
        
        await battleManager.endBattle(battleId)
        break
        
      default:
        logger.warn(`Unknown message type: ${message.type}`)
        throw new Error(`Unsupported message type: ${message.type}`)
    }
  } catch (error) {
    logger.error(`Error in handleMessage for type ${message.type}:`, error)
    throw error // Re-throw to be handled by the calling function
  }
}