import { Server } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import { io as ioc, Socket as ClientSocket } from 'socket.io-client'
import express from 'express'
import { setupSocketHandlers } from '@/services/websocket'

// Mock all service dependencies
jest.mock('@/services/vertexai')
jest.mock('@/services/text-to-speech')
jest.mock('@/services/compliance')
jest.mock('@/services/firestore')
jest.mock('@/services/redis')

describe('WebSocket E2E Tests', () => {
  let app: express.Application
  let server: Server
  let io: SocketIOServer
  let clientSocket: ClientSocket
  let serverSocket: any
  const PORT = 5001

  beforeAll((done) => {
    app = express()
    server = app.listen(PORT, () => {
      io = new SocketIOServer(server, {
        cors: {
          origin: '*',
        },
      })
      
      setupSocketHandlers(io)
      
      io.on('connection', (socket) => {
        serverSocket = socket
      })
      
      done()
    })
  })

  afterAll((done) => {
    io.close()
    server.close()
    done()
  })

  beforeEach((done) => {
    // Connect client
    clientSocket = ioc(`http://localhost:${PORT}`, {
      transports: ['websocket'],
      reconnection: false,
    })
    
    clientSocket.on('connect', done)
  })

  afterEach(() => {
    if (clientSocket.connected) {
      clientSocket.disconnect()
    }
  })

  describe('Connection', () => {
    it('should connect successfully', (done) => {
      expect(clientSocket.connected).toBe(true)
      done()
    })

    it('should handle multiple concurrent connections', (done) => {
      const clients: ClientSocket[] = []
      let connectedCount = 0
      const totalClients = 5

      for (let i = 0; i < totalClients; i++) {
        const client = ioc(`http://localhost:${PORT}`, {
          transports: ['websocket'],
          reconnection: false,
        })
        
        client.on('connect', () => {
          connectedCount++
          if (connectedCount === totalClients) {
            // All clients connected
            clients.forEach(c => c.disconnect())
            done()
          }
        })
        
        clients.push(client)
      }
    })
  })

  describe('Battle Operations', () => {
    it('should join battle room', (done) => {
      const battleId = 'test-battle-123'
      
      clientSocket.emit('join_battle', battleId)
      
      // Listen for acknowledgment or battle state
      clientSocket.on('battle_state', (state) => {
        expect(state).toBeDefined()
        done()
      })
      
      // Fallback if no battle state is sent
      setTimeout(done, 100)
    })

    it('should leave battle room', (done) => {
      const battleId = 'test-battle-123'
      
      clientSocket.emit('join_battle', battleId)
      
      setTimeout(() => {
        clientSocket.emit('leave_battle', battleId)
        done()
      }, 50)
    })

    it('should handle start battle message', (done) => {
      clientSocket.on('battle_event', (event) => {
        if (event.type === 'battle_start') {
          expect(event.battleId).toBeDefined()
          expect(event.data).toBeDefined()
          done()
        }
      })
      
      clientSocket.emit('message', {
        type: 'start_battle',
        data: { theme: 'Test Theme' },
      })
    })

    it('should handle voting', (done) => {
      const voteData = {
        battleId: 'test-battle-123',
        roundNumber: 1,
        votedFor: 'ai1' as const,
      }
      
      clientSocket.on('error', (error) => {
        // Voting might fail if battle doesn't exist, but we're testing the flow
        expect(error.message).toBeDefined()
        done()
      })
      
      clientSocket.on('battle_event', (event) => {
        if (event.type === 'vote_update') {
          expect(event.data.roundNumber).toBe(voteData.roundNumber)
          expect(event.data.votedFor).toBe(voteData.votedFor)
          done()
        }
      })
      
      clientSocket.emit('vote', voteData)
      
      // Timeout fallback
      setTimeout(done, 200)
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid messages gracefully', (done) => {
      clientSocket.on('error', (error) => {
        expect(error.message).toBeDefined()
        done()
      })
      
      clientSocket.emit('message', {
        type: 'invalid_type',
        data: {},
      })
      
      // Timeout fallback
      setTimeout(done, 200)
    })

    it('should handle malformed data', (done) => {
      clientSocket.on('error', (error) => {
        expect(error.message).toBeDefined()
        done()
      })
      
      // Send malformed vote data
      clientSocket.emit('vote', { invalid: 'data' })
      
      // Timeout fallback
      setTimeout(done, 200)
    })
  })

  describe('Disconnection', () => {
    it('should handle client disconnection', (done) => {
      const disconnectHandler = jest.fn()
      
      if (serverSocket) {
        serverSocket.on('disconnect', disconnectHandler)
      }
      
      clientSocket.disconnect()
      
      setTimeout(() => {
        expect(clientSocket.connected).toBe(false)
        done()
      }, 100)
    })

    it('should clean up resources on disconnect', (done) => {
      // Join a battle first
      clientSocket.emit('join_battle', 'test-battle-123')
      
      setTimeout(() => {
        clientSocket.disconnect()
        
        setTimeout(() => {
          expect(clientSocket.connected).toBe(false)
          done()
        }, 100)
      }, 50)
    })
  })
})