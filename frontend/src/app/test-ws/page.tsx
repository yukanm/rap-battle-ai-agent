'use client'

import { useWebSocket } from '@/hooks/useWebSocket'
import { useBattleStore } from '@/store/battleStore'
import { Button } from '@/components/ui/button'

export default function TestWebSocketPage() {
  const { isConnected, connectionError, sendMessage } = useWebSocket()
  const { battleId, battleStatus, battleTheme, rounds, votes } = useBattleStore()

  const handleStartBattle = () => {
    sendMessage({
      type: 'start_battle',
      data: {
        theme: 'Technology vs Nature',
      },
    })
  }

  const handleJoinBattle = () => {
    sendMessage({
      type: 'join_battle',
      data: {
        battleId: 'test-battle-123',
      },
    })
  }

  const handleVote = (rapper: 'ai1' | 'ai2') => {
    sendMessage({
      type: 'vote',
      data: {
        battleId: battleId || 'test-battle-123',
        roundNumber: 1,
        votedFor: rapper,
      },
    })
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">WebSocket Connection Test</h1>
        
        <div className="mb-8">
          <h2 className="text-xl mb-4">Connection Status</h2>
          <div className="space-y-2">
            <p>Connected: <span className={isConnected ? 'text-green-500' : 'text-red-500'}>
              {isConnected ? 'Yes' : 'No'}
            </span></p>
            {connectionError && (
              <p className="text-red-500">Error: {connectionError}</p>
            )}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl mb-4">Actions</h2>
          <div className="space-x-4">
            <Button onClick={handleJoinBattle}>Join Battle</Button>
            <Button onClick={handleStartBattle}>Start Battle</Button>
            <Button onClick={() => handleVote('ai1')}>Vote AI1</Button>
            <Button onClick={() => handleVote('ai2')}>Vote AI2</Button>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl mb-4">Battle State</h2>
          <pre className="bg-gray-800 p-4 rounded overflow-auto">
            {JSON.stringify({ battleId, battleStatus, battleTheme, rounds, votes }, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}