import { renderHook, act } from '@testing-library/react'
import { useWebSocket } from '@/hooks/useWebSocket'
import { io, Socket } from 'socket.io-client'
import toast from 'react-hot-toast'

// Mock dependencies
jest.mock('socket.io-client')
jest.mock('react-hot-toast')
jest.mock('@/store/battleStore', () => {
  const updateBattle = jest.fn()
  const addRound = jest.fn()
  const updateVotes = jest.fn()
  
  return {
    useBattleStore: () => ({
      updateBattle,
      addRound,
      updateVotes,
    }),
  }
})

describe('useWebSocket Hook', () => {
  let mockSocket: Partial<Socket>
  let mockOn: jest.Mock
  let mockEmit: jest.Mock
  let mockDisconnect: jest.Mock

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()

    // Setup socket mock
    mockOn = jest.fn()
    mockEmit = jest.fn()
    mockDisconnect = jest.fn()

    mockSocket = {
      connected: true,
      on: mockOn,
      emit: mockEmit,
      disconnect: mockDisconnect,
    }

    ;(io as jest.Mock).mockReturnValue(mockSocket)
  })

  it('should connect on mount', () => {
    renderHook(() => useWebSocket())

    expect(io).toHaveBeenCalledWith(
      'ws://localhost:8080',
      expect.objectContaining({
        transports: ['websocket'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      })
    )
  })

  it('should handle connection success', () => {
    renderHook(() => useWebSocket())

    // Simulate connection
    const connectHandler = mockOn.mock.calls.find(call => call[0] === 'connect')?.[1]
    act(() => {
      connectHandler?.()
    })

    expect(toast.success).toHaveBeenCalledWith('Connected to battle server')
  })

  it('should handle connection error', () => {
    renderHook(() => useWebSocket())

    // Simulate connection error
    const errorHandler = mockOn.mock.calls.find(call => call[0] === 'connect_error')?.[1]
    act(() => {
      errorHandler?.(new Error('Connection failed'))
    })

    expect(toast.error).toHaveBeenCalledWith('Failed to connect to battle server')
  })

  it('should send messages when connected', () => {
    const { result } = renderHook(() => useWebSocket())

    const message = { type: 'test', data: { foo: 'bar' } }
    act(() => {
      result.current.sendMessage(message)
    })

    expect(mockEmit).toHaveBeenCalledWith('message', message)
  })

  it('should show error when sending message while disconnected', () => {
    mockSocket.connected = false
    const { result } = renderHook(() => useWebSocket())

    act(() => {
      result.current.sendMessage({ type: 'test', data: {} })
    })

    expect(toast.error).toHaveBeenCalledWith('Not connected to server')
    expect(mockEmit).not.toHaveBeenCalled()
  })

  it('should handle battle events', () => {
    renderHook(() => useWebSocket())
    const { updateBattle } = jest.requireMock('@/store/battleStore').useBattleStore()

    // Simulate battle start event
    const eventHandler = mockOn.mock.calls.find(call => call[0] === 'battle_event')?.[1]
    act(() => {
      eventHandler?.({
        type: 'battle_start',
        battleId: 'battle-123',
        data: { status: 'in_progress' },
        timestamp: new Date(),
      })
    })

    expect(updateBattle).toHaveBeenCalledWith({ status: 'in_progress' })
    expect(toast.success).toHaveBeenCalledWith('Battle started!')
  })

  it('should disconnect on unmount', () => {
    const { unmount } = renderHook(() => useWebSocket())

    unmount()

    expect(mockDisconnect).toHaveBeenCalled()
  })

  it('should handle vote updates', () => {
    renderHook(() => useWebSocket())
    const { updateVotes } = jest.requireMock('@/store/battleStore').useBattleStore()

    const eventHandler = mockOn.mock.calls.find(call => call[0] === 'battle_event')?.[1]
    act(() => {
      eventHandler?.({
        type: 'vote_update',
        battleId: 'battle-123',
        data: { roundNumber: 1, votedFor: 'ai1' },
        timestamp: new Date(),
      })
    })

    expect(updateVotes).toHaveBeenCalledWith(1, 'ai1')
  })

  it('should handle error events', () => {
    renderHook(() => useWebSocket())

    const errorHandler = mockOn.mock.calls.find(call => call[0] === 'error')?.[1]
    act(() => {
      errorHandler?.({ message: 'Something went wrong' })
    })

    expect(toast.error).toHaveBeenCalledWith('Something went wrong')
  })
})