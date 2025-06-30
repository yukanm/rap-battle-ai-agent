'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useBattleStore } from '@/store/battleStore'
import { useWebSocket } from '@/hooks/useWebSocket'
import { BattleSetup } from './BattleSetup'
import { BattleStage } from './BattleStage'
import { BattleControls } from './BattleControls'
import { VotingPanel } from './VotingPanel'
import { BattleStats } from './BattleStats'
import { BattleResult } from './BattleResult'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'

interface BattleArenaProps {
  onExit: () => void
}

export function BattleArena({ onExit }: BattleArenaProps) {
  const { 
    battleStatus, 
    battleTheme,
    setBattleTheme,
    startBattle, 
    endBattle,
    rounds,
    battleResult,
    resetBattle
  } = useBattleStore()
  const { isConnected, connect, disconnect, sendMessage } = useWebSocket()
  const [isStarting, setIsStarting] = useState(false)

  useEffect(() => {
    // Connect to WebSocket when component mounts
    connect()
    
    return () => {
      // Cleanup on unmount
      disconnect()
      if (battleStatus === 'active') {
        endBattle()
      }
    }
  }, [])

  const handleResetBattle = () => {
    resetBattle()
  }
  
  const handleStartBattle = async (theme: string, format: '3verses-3rounds' | '3verses-1round') => {
    if (!theme.trim()) {
      toast.error('テーマを入力してください')
      return
    }

    if (!isConnected) {
      toast.error('サーバーに接続されていません')
      connect()
      return
    }
    
    setIsStarting(true)
    try {
      // Reset previous battle state if completed
      if (battleStatus === 'completed') {
        resetBattle()
      }
      
      // Update battle theme and status
      setBattleTheme(theme.trim())
      startBattle()
      
      // Send message to server to create and start battle
      sendMessage({
        type: 'start_battle',
        data: { 
          theme: theme.trim(),
          format 
        }
      })
      
      toast.success('バトル開始！')
    } catch (error) {
      console.error('Failed to start battle:', error)
      toast.error('バトルの開始に失敗しました')
    } finally {
      setIsStarting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-black flex items-center justify-center px-4 py-8">
      <div className="container mx-auto max-w-3xl w-full">
        <div className="flex flex-col gap-8 items-center justify-center">
          <div className="w-full flex justify-end">
            <Button
              variant="ghost"
              size="icon"
              onClick={onExit}
              className="text-white/70 hover:text-white hover:bg-white/10 rounded-full w-12 h-12"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
          <AnimatePresence mode="wait">
            {battleStatus === 'idle' || battleStatus === 'waiting' ? (
              <motion.div
                key="setup"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                <BattleSetup 
                  onStartBattle={handleStartBattle}
                  isLoading={isStarting}
                />
              </motion.div>
            ) : battleStatus === 'completed' && battleResult ? (
              <motion.div
                key="result"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full"
              >
                <BattleResult />
                <div className="mt-8 flex justify-center">
                  <Button
                    onClick={handleResetBattle}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-8 rounded-full"
                  >
                    新しいバトルを開始
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="battle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full"
              >
                <div className="space-y-8">
                  <BattleStats />
                  <BattleStage />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <BattleControls />
                    <VotingPanel />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}