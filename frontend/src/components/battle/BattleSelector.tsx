'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useBattleStore } from '@/store/battleStore'
import { BattleArena } from './BattleArena'
import { BattleArenaWithAgent } from './BattleArenaWithAgent'
import { HumanVsAiBattleArena } from './HumanVsAiBattleArena'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Wifi, Brain, ArrowRight, Sparkles, Swords } from 'lucide-react'

interface BattleSelectorProps {
  onExit: () => void
}

type BattleMode = 'websocket' | 'agent' | 'human_vs_ai'

export function BattleSelector({ onExit }: BattleSelectorProps) {
  const { useAgentAPI, setUseAgentAPI } = useBattleStore()
  const [showArena, setShowArena] = useState(false)
  const [battleMode, setBattleMode] = useState<BattleMode>('websocket')

  if (showArena) {
    switch (battleMode) {
      case 'agent':
        return <BattleArenaWithAgent onExit={onExit} />
      case 'human_vs_ai':
        return <HumanVsAiBattleArena onExit={() => setShowArena(false)} />
      default:
        return <BattleArena onExit={onExit} />
    }
  }

  return (
    <div data-testid="battle-selector" className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-black flex items-center justify-center px-4 py-8">
      <div className="container mx-auto max-w-4xl w-full">
        <div className="flex flex-col gap-8 items-center justify-center">
          <div className="w-full flex justify-end">
            <Button
              variant="ghost"
              size="icon"
              onClick={onExit}
              className="text-white/70 hover:text-white hover:bg-white/10 rounded-full w-12 h-12"
            >
              <ArrowRight className="w-6 h-6" />
            </Button>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full"
          >
            <div className="text-center mb-8">
              <motion.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-5xl md:text-6xl font-black mb-4 text-white tracking-tight"
              >
                <span className="battle-text-jp text-5xl md:text-6xl">バトルモード選択</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-xl text-gray-400"
              >
                バトルモードを選択してください
              </motion.p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {/* WebSocket Mode */}
              <Card className={`bg-white/10 border-2 transition-all duration-300 cursor-pointer shadow-xl ${battleMode === 'websocket' ? 'border-purple-500 ring-2 ring-purple-400' : 'border-white/10'}`}
                onClick={() => setBattleMode('websocket')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-white">
                    <Wifi className="w-6 h-6 text-purple-400" />
                    シンプルバトルモード
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    基本的なリアルタイムバトル
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-gray-300 space-y-3">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400 mt-0.5">•</span>
                      <span>シンプルなGemini APIでリリック生成</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400 mt-0.5">•</span>
                      <span>基本的な音声合成機能</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400 mt-0.5">•</span>
                      <span>速いレスポンスでサクサク進行</span>
                    </li>
                  </ul>
                  <div className="pt-2">
                    <span className={`text-sm ${battleMode === 'websocket' ? 'text-green-400' : 'text-gray-500'}`}>
                      {battleMode === 'websocket' ? '● 選択中' : '○ 未選択'}
                    </span>
                  </div>
                </CardContent>
              </Card>
              {/* Agent API Mode */}
              <Card className={`bg-white/10 border-2 transition-all duration-300 cursor-pointer shadow-xl ${battleMode === 'agent' ? 'border-pink-500 ring-2 ring-pink-400' : 'border-white/10'}`}
                onClick={() => setBattleMode('agent')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-white">
                    <Brain className="w-6 h-6 text-pink-400" />
                    マルチエージェントモード
                    <span className="text-xs bg-pink-500/20 text-pink-300 px-2 py-1 rounded-full">NEW</span>
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    複数AIが協調する高度なバトル
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-gray-300 space-y-3">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-pink-400 mt-0.5">•</span>
                      <span>🤖 リリック生成エージェント</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-pink-400 mt-0.5">•</span>
                      <span>🚫 コンプライアンスエージェント</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-pink-400 mt-0.5">•</span>
                      <span>🏆 審査員エージェントが勝敗判定</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-pink-400 mt-0.5">•</span>
                      <span>🎭 テーマ生成エージェント</span>
                    </li>
                  </ul>
                  <div className="pt-2">
                    <span className={`text-sm ${battleMode === 'agent' ? 'text-green-400' : 'text-gray-500'}`}>
                      {battleMode === 'agent' ? '● 選択中' : '○ 未選択'}
                    </span>
                  </div>
                </CardContent>
              </Card>
              {/* Human vs AI Mode */}
              <Card className={`bg-white/10 border-2 transition-all duration-300 cursor-pointer shadow-xl ${battleMode === 'human_vs_ai' ? 'border-orange-500 ring-2 ring-orange-400' : 'border-white/10'}`}
                onClick={() => setBattleMode('human_vs_ai')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-white">
                    <Swords className="w-6 h-6 text-orange-400" />
                    人間 vs AI モード
                    <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-1 rounded-full">🔥 HOT</span>
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    究極の人間 vs AI バトル
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-gray-300 space-y-3">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-orange-400 mt-0.5">•</span>
                      <span>音声認識 & テキスト入力</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-400 mt-0.5">•</span>
                      <span>AI が人間のリリックを分析アンサー</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-400 mt-0.5">•</span>
                      <span>公平な制約とタイマーシステム</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-400 mt-0.5">•</span>
                      <span>感動的な結果発表と評価</span>
                    </li>
                  </ul>
                  <div className="pt-2">
                    <span className={`text-sm ${battleMode === 'human_vs_ai' ? 'text-green-400' : 'text-gray-500'}`}>
                      {battleMode === 'human_vs_ai' ? '● 選択中' : '○ 未選択'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
            {/* Selected Mode Display */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="text-center">
                <p className="text-gray-400 text-sm mb-2">選択されたモード</p>
                <div className="flex items-center gap-2 text-white font-semibold">
                  {battleMode === 'websocket' && (
                    <>
                      <Wifi className="w-5 h-5 text-purple-400" />
                      <span>シンプルモード</span>
                    </>
                  )}
                  {battleMode === 'agent' && (
                    <>
                      <Brain className="w-5 h-5 text-pink-400" />
                      <span>Agent API モード</span>
                    </>
                  )}
                  {battleMode === 'human_vs_ai' && (
                    <>
                      <Swords className="w-5 h-5 text-orange-400" />
                      <span>人間 vs AI モード</span>
                      <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-1 rounded-full">🔥 HOT</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            {/* Start Button */}
            <div className="flex justify-center">
              <Button
                size="lg"
                onClick={() => {
                  if (battleMode === 'agent') {
                    setUseAgentAPI(true)
                  } else {
                    setUseAgentAPI(false)
                  }
                  setShowArena(true)
                }}
                className="relative group bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-6 px-12 rounded-2xl shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300" />
                <span className="relative z-10 flex items-center gap-3 text-lg">
                  <Sparkles className="w-5 h-5" />
                  バトルを開始
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </Button>
            </div>
            {/* Back Button */}
            <div className="flex justify-center mt-4">
              <Button
                variant="ghost"
                onClick={onExit}
                className="text-gray-400 hover:text-white"
              >
                戻る
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}