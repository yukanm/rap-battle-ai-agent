'use client'

import { motion } from 'framer-motion'
import { Trophy, Target, Sparkles, MessageCircle, Star, Music, Mic, ChevronDown, ChevronUp } from 'lucide-react'
import { useBattleStore } from '@/store/battleStore'
import { useState } from 'react'

export function BattleResult() {
  const { battleResult, battleTheme, rounds } = useBattleStore()
  const [showLyrics, setShowLyrics] = useState(false)
  
  if (!battleResult) return null
  
  const winner = battleResult.winner === 'ai1' ? 'MC Flash' : 'MC Gemin aka アンサーマシン'
  const winnerColor = battleResult.winner === 'ai1' ? 'purple' : 'pink'
  const scores = battleResult.scores || { ai1: 0, ai2: 0 }
  const breakdown = battleResult.breakdown
  const analysis = battleResult.analysis
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-4xl mx-auto p-8"
    >
      <div className="bg-gradient-to-br from-gray-900 to-black rounded-3xl p-10 border border-white/10 shadow-2xl">
        {/* 勝者発表 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-10"
        >
          <Trophy className={`w-20 h-20 mx-auto mb-4 text-${winnerColor}-400`} />
          <h1 className="text-5xl font-black text-white mb-4">
            バトル終了！
          </h1>
          <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            勝者: {winner}
          </p>
        </motion.div>
        
        {/* スコア表示 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-2 gap-6 mb-8"
        >
          <div className={`bg-black/40 rounded-xl p-6 border ${battleResult.winner === 'ai1' ? 'border-purple-500' : 'border-gray-700'}`}>
            <h3 className="text-xl font-bold text-purple-400 mb-2">MC Flash</h3>
            <p className="text-4xl font-black text-white">{scores.ai1}点</p>
            {battleResult.winner === 'ai1' && (
              <div className="mt-2 text-yellow-400 text-sm font-semibold">★ WINNER ★</div>
            )}
          </div>
          <div className={`bg-black/40 rounded-xl p-6 border ${battleResult.winner === 'ai2' ? 'border-pink-500' : 'border-gray-700'}`}>
            <h3 className="text-xl font-bold text-pink-400 mb-2">MC Gemin aka アンサーマシン</h3>
            <p className="text-4xl font-black text-white">{scores.ai2}点</p>
            {battleResult.winner === 'ai2' && (
              <div className="mt-2 text-yellow-400 text-sm font-semibold">★ WINNER ★</div>
            )}
          </div>
        </motion.div>
        
        {/* 詳細評価 */}
        {breakdown && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mb-8"
          >
            <h3 className="text-xl font-bold text-white mb-4">評価内訳</h3>
            <div className="grid grid-cols-2 gap-6">
              {/* AI 1 */}
              <div className="bg-black/30 rounded-lg p-4 space-y-3">
                <h4 className="text-purple-400 font-semibold mb-2">MC Flash</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-purple-400" />
                      <span className="text-sm text-gray-300">韻</span>
                    </div>
                    <span className="text-white font-semibold">{breakdown.ai1.rhyme}点</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Music className="w-4 h-4 text-purple-400" />
                      <span className="text-sm text-gray-300">フロウ</span>
                    </div>
                    <span className="text-white font-semibold">{breakdown.ai1.flow}点</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-purple-400" />
                      <span className="text-sm text-gray-300">アンサー</span>
                    </div>
                    <span className="text-white font-semibold">{breakdown.ai1.answer}点</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span className="text-sm text-gray-300">パンチライン</span>
                    </div>
                    <span className="text-white font-semibold">{breakdown.ai1.punchline}点</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-purple-400" />
                      <span className="text-sm text-gray-300">アティチュード</span>
                    </div>
                    <span className="text-white font-semibold">{breakdown.ai1.attitude}点</span>
                  </div>
                </div>
              </div>
              
              {/* AI 2 */}
              <div className="bg-black/30 rounded-lg p-4 space-y-3">
                <h4 className="text-pink-400 font-semibold mb-2">MC Gemin aka アンサーマシン</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-pink-400" />
                      <span className="text-sm text-gray-300">韻</span>
                    </div>
                    <span className="text-white font-semibold">{breakdown.ai2.rhyme}点</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Music className="w-4 h-4 text-pink-400" />
                      <span className="text-sm text-gray-300">フロウ</span>
                    </div>
                    <span className="text-white font-semibold">{breakdown.ai2.flow}点</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-pink-400" />
                      <span className="text-sm text-gray-300">アンサー</span>
                    </div>
                    <span className="text-white font-semibold">{breakdown.ai2.answer}点</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-pink-400" />
                      <span className="text-sm text-gray-300">パンチライン</span>
                    </div>
                    <span className="text-white font-semibold">{breakdown.ai2.punchline}点</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-pink-400" />
                      <span className="text-sm text-gray-300">アティチュード</span>
                    </div>
                    <span className="text-white font-semibold">{breakdown.ai2.attitude}点</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        
        {/* 総評 */}
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 rounded-xl p-6 border border-white/10"
          >
            <h3 className="text-xl font-bold text-white mb-3">審査員総評</h3>
            <p className="text-gray-300 leading-relaxed whitespace-pre-line">
              {analysis}
            </p>
          </motion.div>
        )}
        
        {/* バトルリリック表示 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="mt-8"
        >
          <button
            onClick={() => setShowLyrics(!showLyrics)}
            className="w-full bg-gradient-to-r from-purple-600/20 to-pink-600/20 hover:from-purple-600/30 hover:to-pink-600/30 rounded-xl p-6 border border-white/10 transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Mic className="w-6 h-6" />
                バトルリリック
              </h3>
              {showLyrics ? (
                <ChevronUp className="w-6 h-6 text-white" />
              ) : (
                <ChevronDown className="w-6 h-6 text-white" />
              )}
            </div>
          </button>
          
          {showLyrics && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 space-y-6"
            >
              {rounds.map((round) => (
                <div key={round.number} className="bg-black/40 rounded-xl p-6 border border-white/10">
                  <h4 className="text-lg font-bold text-white mb-4">バース {round.number}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* AI1 (MC Flash) */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-purple-400 flex items-center justify-center">
                          <Mic className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h5 className="text-purple-400 font-semibold">MC Flash</h5>
                          <p className="text-xs text-gray-400">先行</p>
                        </div>
                      </div>
                      {round.lyrics?.ai1 ? (
                        <div className="bg-purple-900/20 rounded-lg p-4 border border-purple-500/30">
                          <p className="text-sm text-gray-200 whitespace-pre-line">
                            {round.lyrics.ai1.content}
                          </p>
                        </div>
                      ) : round.verses ? (
                        round.verses
                          .filter(v => v.participantId === 'ai1')
                          .sort((a, b) => a.number - b.number)
                          .map(verse => (
                            <div key={verse.number} className="bg-purple-900/20 rounded-lg p-4 border border-purple-500/30">
                              <p className="text-sm text-gray-200 whitespace-pre-line">
                                {verse.lyric.content}
                              </p>
                            </div>
                          ))
                      ) : null}
                    </div>
                    
                    {/* AI2 (MC Gemin) */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-600 to-pink-400 flex items-center justify-center">
                          <Mic className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h5 className="text-pink-400 font-semibold">MC Gemin aka アンサーマシン</h5>
                          <p className="text-xs text-gray-400">後攻</p>
                        </div>
                      </div>
                      {round.lyrics?.ai2 ? (
                        <div className="bg-pink-900/20 rounded-lg p-4 border border-pink-500/30">
                          <p className="text-sm text-gray-200 whitespace-pre-line">
                            {round.lyrics.ai2.content}
                          </p>
                        </div>
                      ) : round.verses ? (
                        round.verses
                          .filter(v => v.participantId === 'ai2')
                          .sort((a, b) => a.number - b.number)
                          .map(verse => (
                            <div key={verse.number} className="bg-pink-900/20 rounded-lg p-4 border border-pink-500/30">
                              <p className="text-sm text-gray-200 whitespace-pre-line">
                                {verse.lyric.content}
                              </p>
                            </div>
                          ))
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </div>
    </motion.div>
  )
}