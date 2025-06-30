'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useBattleStore } from '@/store/battleStore'
import { useAgentAPI } from '@/hooks/useAgentAPI'
import { BattleStage } from './BattleStage'
import { BattleControlsEnhanced } from './BattleControlsEnhanced'
import { VotingPanel } from './VotingPanel'
import { BattleStats } from './BattleStats'
import { Button } from '@/components/ui/button'
import { X, Mic, Sparkles, Wand2, Brain, Shuffle } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Lyric, Verse } from '@/types'

interface BattleArenaWithAgentProps {
  onExit: () => void
}

export function BattleArenaWithAgent({ onExit }: BattleArenaWithAgentProps) {
  const { 
    battleStatus, 
    battleTheme,
    setBattleTheme,
    startBattle, 
    endBattle,
    setBattleStatus,
    setBattleId,
    currentRound,
    totalRounds,
    rounds,
    addLyric,
    addVerse,
    setBattleEvaluation,
    setTotalRounds
  } = useBattleStore()
  
  const { generateLyrics, generateTheme, evaluateBattle, checkCompliance, isLoading } = useAgentAPI()
  const [theme, setTheme] = useState('')
  const [isStarting, setIsStarting] = useState(false)
  const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false)
  const [isGeneratingTheme, setIsGeneratingTheme] = useState(false)
  const [battleFormat, setBattleFormat] = useState<'8bars-3verses' | '16bars-3verses'>('8bars-3verses')

  // Auto-generate lyrics when battle starts or round changes
  useEffect(() => {
    if (battleStatus === 'active' && currentRound > 0) {
      generateRoundLyrics(currentRound)
    }
  }, [battleStatus, currentRound])

  // Evaluate battle when completed
  useEffect(() => {
    if (battleStatus === 'completed' && rounds.length === totalRounds) {
      evaluateCompletedBattle()
    }
  }, [battleStatus, rounds.length])

  const generateRoundLyrics = async (roundNumber: number) => {
    generateRoundLyricsWithTheme(roundNumber, battleTheme)
  }

  const generateRoundLyricsWithTheme = async (roundNumber: number, themeToUse: string) => {
    if (isGeneratingLyrics) return
    
    setIsGeneratingLyrics(true)
    
    try {
      // 各ラウンドで6バース (3バースずつ交互に)
      const previousLyrics: string[] = []
      
      for (let verseNum = 1; verseNum <= 6; verseNum++) {
        const isAI1Turn = verseNum % 2 === 1 // 奇数バースはAI1、偶数バースはAI2
        const participant = isAI1Turn ? 'ai1' : 'ai2'
        const mcName = isAI1Turn ? 'MC Flash' : 'MC Gemin aka アンサーマシン'
        
        // バース位置に応じたスタイル調整
        const versePosition = Math.ceil(verseNum / 2) // 1-2: 1st verse, 3-4: 2nd verse, 5-6: 3rd verse
        const positionStyle = versePosition === 1 ? '序盤' : versePosition === 2 ? '中盤' : '終盤'
        
        // リリック生成
        const response = await generateLyrics({
          theme: themeToUse,
          rapperStyle: isAI1Turn 
            ? `【${positionStyle}8小節】瞬発力とテクニック勝負。超高速フロウで相手を圧倒。各行は韻を踏み、4行×2セットの8小節で構成。改行で小節を区切る。スピード感重視。${previousLyrics.length > 0 ? `相手の前のバース「${previousLyrics[previousLyrics.length - 1]}」にアンサーする。` : ''}` 
            : `【${positionStyle}8小節】アンサー特化スタイル。相手の弱点を論破。話し口調でまくし立てる。各行は韻を踏み、4行×2セットの8小節で構成。改行で小節を区切る。${previousLyrics.length > 0 ? `相手の前のバース「${previousLyrics[previousLyrics.length - 1]}」に完全アンサー。` : ''}`,
          userName: mcName
        })

        // コンプライアンスチェック
        const compliance = await checkCompliance({ content: response.lyrics })

        // バースを追加
        const lyric: Lyric = {
          id: `${participant}-round-${roundNumber}-verse-${verseNum}`,
          content: response.lyrics,
          generatedAt: new Date(),
          complianceScore: response.metadata.complianceScore,
          generationTime: response.metadata.generationTime,
          violations: compliance.violations
        }
        
        const verse: Verse = {
          number: verseNum,
          participantId: participant,
          lyric
        }
        
        addVerse(roundNumber, verse)
        previousLyrics.push(response.lyrics)
        
        toast.success(`${mcName} ${Math.ceil(verseNum / 2)}バース目完了！`)
        
        // 8小節分の時間を確保（1小節 = 約4秒、8小節 = 32秒）
        if (verseNum < 6) { // 最後のバース以外は待機
          const barDuration = 4000 // 1小節 = 4秒
          const eightBarsDuration = barDuration * 8 // 32秒
          const actualGenerationTime = response.metadata.generationTime
          const remainingTime = Math.max(8000, eightBarsDuration - actualGenerationTime)
          
          await new Promise(resolve => setTimeout(resolve, remainingTime))
        }
      }

      toast.success(`ラウンド ${roundNumber} 完了！合計48小節の激闘！`)
    } catch (error) {
      console.error('Failed to generate lyrics:', error)
      toast.error('リリックの生成に失敗しました')
    } finally {
      setIsGeneratingLyrics(false)
    }
  }

  const evaluateCompletedBattle = async () => {
    try {
      // 各MCのリリックを収集（バース順に）
      const rapper1Lyrics: string[] = []
      const rapper2Lyrics: string[] = []
      
      rounds.forEach(round => {
        // バース構造からリリックを抽出
        round.verses.forEach(verse => {
          if (verse.participantId === 'ai1') {
            rapper1Lyrics.push(verse.lyric.content)
          } else {
            rapper2Lyrics.push(verse.lyric.content)
          }
        })
      })

      const evaluation = await evaluateBattle({
        battleId: battleTheme,
        rapper1Lyrics,
        rapper2Lyrics
      })

      setBattleEvaluation({
        winner: evaluation.winner === 'rapper1' ? 'ai1' : evaluation.winner === 'rapper2' ? 'ai2' : 'tie',
        scores: { ai1: evaluation.scores.rapper1, ai2: evaluation.scores.rapper2 },
        analysis: evaluation.judgeCommentary || '評価完了'
      })

      const winnerName = evaluation.winner === 'rapper1' ? 'MC Flash' : 
                        evaluation.winner === 'rapper2' ? 'MC Gemin aka アンサーマシン' : '引き分け'
      toast.success(`バトル終了！勝者: ${winnerName}`)
    } catch (error) {
      console.error('Failed to evaluate battle:', error)
      toast.error('バトルの評価に失敗しました')
    }
  }

  const handleGenerateTheme = async () => {
    if (isGeneratingTheme) return
    
    setIsGeneratingTheme(true)
    try {
      const themeData = await generateTheme({
        categories: ['Street Life', 'Technology', 'Success', 'Competition', 'Philosophy']
      })
      
      setTheme(themeData.theme)
      toast.success('テーマが生成されました！')
    } catch (error) {
      console.error('Failed to generate theme:', error)
      toast.error('テーマの生成に失敗しました')
    } finally {
      setIsGeneratingTheme(false)
    }
  }

  const handleStartBattle = async () => {
    if (!theme.trim()) {
      toast.error('テーマを入力してください')
      return
    }
    
    setIsStarting(true)
    try {
      // Set total rounds based on format
      const rounds = battleFormat === '3verses-3rounds' ? 3 : 1
      setTotalRounds(rounds)
      
      // Update battle theme and status
      setBattleTheme(theme.trim())
      setBattleId(`battle-${Date.now()}`)
      startBattle()
      
      // Set battle to active and trigger first round
      setTimeout(() => {
        setBattleStatus('active')
      }, 100)
      
      // Generate first round lyrics after theme is set
      setTimeout(() => {
        generateRoundLyricsWithTheme(1, theme.trim())
      }, 200)
      
      toast.success('バトル開始！')
    } catch (error) {
      console.error('Failed to start battle:', error)
      toast.error('バトルの開始に失敗しました')
    } finally {
      setIsStarting(false)
    }
  }

  const handleNextRound = () => {
    if (currentRound < totalRounds) {
      generateRoundLyrics(currentRound + 1)
    } else {
      endBattle()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-black flex items-center justify-center px-4 py-4 sm:py-6 lg:py-8 overflow-hidden">
      <div className="container mx-auto max-w-7xl w-full">
        <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8 items-center justify-center">
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
                <div className="bg-black/60 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-2xl border border-white/10">
                  <div className="text-center mb-6 sm:mb-8">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-3 sm:mb-4 text-white tracking-tight">
                      <span className="">AI ラップバトルアリーナ</span>
                    </h1>
                    <p className="text-sm sm:text-base lg:text-lg text-gray-300">
                      AIエージェントが自動でリリックを生成し、評価します
                    </p>
                  </div>
                  <div className="space-y-6">
                    <div className="relative">
                      <input
                        type="text"
                        value={theme}
                        onChange={(e) => setTheme(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleStartBattle()}
                        placeholder="例: 宇宙探査、ピザ vs ハンバーガー、未来の技術..."
                        className="w-full px-8 py-6 bg-white/10 border-2 border-white/20 rounded-2xl text-white text-lg placeholder-white/40 focus:outline-none focus:border-purple-500 focus:bg-white/20 transition-all duration-300 shadow-inner"
                        disabled={isStarting || isGeneratingTheme}
                        maxLength={100}
                      />
                      <Button
                        onClick={handleGenerateTheme}
                        disabled={isGeneratingTheme}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-purple-600/80 hover:bg-purple-700 border border-purple-500/30 rounded-xl px-4 py-2 shadow-lg"
                        size="sm"
                      >
                        {isGeneratingTheme ? (
                          <Shuffle className="w-4 h-4 animate-spin" />
                        ) : (
                          <Wand2 className="w-4 h-4" />
                        )}
                        <span className="ml-2">テーマ生成</span>
                      </Button>
                    </div>
                    
                    {/* バトル形式選択 */}
                    <div className="space-y-3">
                      <p className="text-center text-sm text-gray-400">バトル形式を選択</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <button
                          onClick={() => setBattleFormat('8bars-3verses')}
                          className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                            battleFormat === '8bars-3verses' 
                              ? 'bg-purple-600/20 border-purple-500 text-white' 
                              : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                          }`}
                        >
                          <div className="font-bold mb-1">8小節 × 3バース</div>
                          <div className="text-xs">スピード重視の短期決戦（24小節）</div>
                        </button>
                        <button
                          onClick={() => setBattleFormat('16bars-3verses')}
                          className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                            battleFormat === '16bars-3verses' 
                              ? 'bg-purple-600/20 border-purple-500 text-white' 
                              : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                          }`}
                        >
                          <div className="font-bold mb-1">16小節 × 3バース</div>
                          <div className="text-xs">じっくり展開する本格バトル（48小節）</div>
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-3 justify-center">
                      <div className="px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full">
                        <span className="text-sm text-purple-300">🤖 AI自動リリック生成</span>
                      </div>
                      <div className="px-4 py-2 bg-pink-500/10 border border-pink-500/20 rounded-full">
                        <span className="text-sm text-pink-300">📊 AI自動評価</span>
                      </div>
                      <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full">
                        <span className="text-sm text-blue-300">✅ コンプライアンスチェック</span>
                      </div>
                    </div>
                    <div className="flex justify-center pt-4">
                      <Button
                        size="lg"
                        onClick={handleStartBattle}
                        disabled={!theme.trim() || isStarting}
                        className="relative group bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-6 px-12 rounded-2xl shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-lg"
                      >
                        <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300" />
                        <span className="relative z-10 flex items-center gap-3">
                          <Mic className="w-6 h-6" />
                          {isStarting ? 'バトル開始中...' : 'AI バトル開始'}
                          <Sparkles className="w-5 h-5" />
                        </span>
                      </Button>
                    </div>
                  </div>
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
                <div className="space-y-4 sm:space-y-6 lg:space-y-8 w-full">
                  <BattleStats />
                  <BattleStage />
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                    <div className="space-y-3 sm:space-y-4">
                      <BattleControlsEnhanced />
                      {battleStatus === 'active' && currentRound < totalRounds && (
                        <Button
                          onClick={handleNextRound}
                          disabled={isGeneratingLyrics || !rounds.find(r => r.number === currentRound)}
                          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 sm:py-4 rounded-xl shadow-lg text-sm sm:text-base"
                        >
                          {isGeneratingLyrics ? '生成中...' : '次のラウンドへ'}
                        </Button>
                      )}
                    </div>
                    <div className="w-full">
                      <VotingPanel />
                    </div>
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