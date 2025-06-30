'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Volume2, Zap, Music, Sparkles, MessageCircle, Target, Clock, Award } from 'lucide-react'
import { useBattleStore } from '@/store/battleStore'
import { useEffect, useRef, useState } from 'react'
import { BattleLoading } from '@/components/ui/loading'
import LyricWithViolations from './LyricWithViolations'

interface RoundPosition {
  first: 'ai1' | 'ai2'
  second: 'ai1' | 'ai2'
}

export function ImprovedBattleStage() {
  const { battleTheme, currentRound, totalRounds, rounds, battleStatus } = useBattleStore()
  const [playingAudio, setPlayingAudio] = useState<'ai1' | 'ai2' | null>(null)
  const [loadingStage, setLoadingStage] = useState<'generating' | 'audio' | null>('generating')
  const [currentPosition, setCurrentPosition] = useState<'first' | 'second' | 'complete'>('first')
  const audioRef = useRef<HTMLAudioElement>(null)
  const currentRoundData = rounds.find(r => r.number === currentRound) || rounds[rounds.length - 1]

  // ラウンドごとの先行・後攻を決定
  const getRoundPosition = (roundNumber: number): RoundPosition => {
    if (roundNumber % 2 === 1) {
      // 奇数ラウンド: ai1先行
      return { first: 'ai1', second: 'ai2' }
    } else {
      // 偶数ラウンド: ai2先行
      return { first: 'ai2', second: 'ai1' }
    }
  }

  const currentRoundPosition = currentRound ? getRoundPosition(currentRound) : { first: 'ai1', second: 'ai2' }

  const playAudio = async (audioUrl: string, participant: 'ai1' | 'ai2') => {
    if (audioRef.current) {
      try {
        audioRef.current.src = audioUrl
        await audioRef.current.play()
        setPlayingAudio(participant)
      } catch (error) {
        console.error('Error playing audio:', error)
      }
    }
  }

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onended = () => setPlayingAudio(null)
    }
  }, [])
  
  useEffect(() => {
    if (currentRoundData) {
      const firstParticipant = currentRoundPosition.first
      const secondParticipant = currentRoundPosition.second
      
      // バース構造を使用して状態を判定
      const firstVerses = currentRoundData.verses?.filter(v => v.participantId === firstParticipant) || []
      const secondVerses = currentRoundData.verses?.filter(v => v.participantId === secondParticipant) || []
      
      const hasFirstLyric = firstVerses.length > 0 && firstVerses.every(v => v.lyric?.content)
      const hasSecondLyric = secondVerses.length > 0 && secondVerses.every(v => v.lyric?.content)
      
      if (hasFirstLyric && hasSecondLyric) {
        // 両方完了
        const hasFirstAudio = firstVerses.every(v => v.lyric?.audioUrl)
        const hasSecondAudio = secondVerses.every(v => v.lyric?.audioUrl)
        
        if (hasFirstAudio && hasSecondAudio) {
          setLoadingStage(null)
          setCurrentPosition('complete')
        } else {
          setLoadingStage('audio')
          setCurrentPosition('complete')
        }
      } else if (hasFirstLyric) {
        // 先行のみ完了、後攻待ち
        setLoadingStage('generating')
        setCurrentPosition('second')
      } else {
        // 先行待ち
        setLoadingStage('generating')
        setCurrentPosition('first')
      }
    } else {
      setLoadingStage('generating')
      setCurrentPosition('first')
    }
  }, [currentRoundData, currentRoundPosition])

  const getParticipantStyle = (participantId: 'ai1' | 'ai2') => {
    if (participantId === 'ai1') {
      return {
        name: 'MC Gemini-Flash',
        description: '超高速フロウ、瞬発力重視',
        icon: Zap,
        color: 'purple',
        gradient: 'from-purple-600 to-purple-400'
      }
    } else {
      return {
        name: 'MC Gemin aka アンサーマシン',
        description: 'アンサー特化、論破型',
        icon: MessageCircle,
        color: 'pink',
        gradient: 'from-pink-600 to-pink-400'
      }
    }
  }

  const renderParticipantCard = (participantId: 'ai1' | 'ai2', position: 'first' | 'second') => {
    const style = getParticipantStyle(participantId)
    const isCurrentTurn = currentPosition === position
    // バース構造から該当するバースを取得
    const participantVerses = currentRoundData?.verses?.filter(v => v.participantId === participantId) || []
    const hasLyric = participantVerses.length > 0 && participantVerses.every(v => v.lyric?.content)
    const lyric = participantVerses.length > 0 ? participantVerses[0].lyric : null
    const isFirstPosition = currentRoundPosition.first === participantId
    const isSecondPosition = currentRoundPosition.second === participantId
    
    return (
      <motion.div
        initial={{ opacity: 0, x: participantId === 'ai1' ? -50 : 50 }}
        animate={{ opacity: 1, x: 0 }}
        className={`relative ${playingAudio === participantId ? 'scale-105' : ''} transition-transform duration-300`}
      >
        <div className={`bg-black/60 rounded-2xl p-8 border border-${style.color}-500/30 shadow-lg flex flex-col items-center ${
          isCurrentTurn && !hasLyric ? 'ring-2 ring-yellow-400 ring-pulse' : ''
        }`}>
          {/* ポジション表示 */}
          <div className="absolute -top-3 left-4 px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r from-gray-700 to-gray-600 shadow-md">
            {isFirstPosition && '先行'}
            {isSecondPosition && (currentPosition === 'second' || currentPosition === 'complete') && 'アンサー'}
            {isSecondPosition && currentPosition === 'first' && '待機中'}
          </div>
          
          {/* ターン表示 */}
          {isCurrentTurn && !hasLyric && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute -top-3 -right-3 px-2 py-1 bg-yellow-500 rounded-full shadow-md"
            >
              <span className="text-xs font-bold text-black">NOW</span>
            </motion.div>
          )}
          
          <div className="flex items-center gap-4 mb-6">
            <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${style.gradient} flex items-center justify-center shadow-md`}>
              <style.icon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">{style.name}</h3>
              <p className={`text-${style.color}-400`}>{style.description}</p>
            </div>
          </div>
          
          <div className="bg-black/30 rounded-xl p-6 min-h-[200px] w-full">
            {hasLyric ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <LyricWithViolations
                  content={lyric?.content || ''}
                  violations={lyric?.violations || []}
                  className="mb-4"
                />
                
                {/* 韻・パンチライン・アンサー表示 */}
                <div className="space-y-2 mt-4 border-t border-gray-500/20 pt-4">
                  {lyric?.rhymes && lyric.rhymes.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Target className={`w-4 h-4 text-${style.color}-400 mt-0.5`} />
                      <div>
                        <p className={`text-xs text-${style.color}-400 font-semibold`}>韻</p>
                        <p className={`text-sm text-${style.color}-300`}>{lyric.rhymes.slice(0, 3).join('、')}</p>
                      </div>
                    </div>
                  )}
                  
                  {lyric?.punchlines && lyric.punchlines.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-yellow-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-yellow-400 font-semibold">パンチライン</p>
                        <p className="text-sm text-yellow-300">{lyric.punchlines[0]}</p>
                      </div>
                    </div>
                  )}
                  
                  {lyric?.answerTo && (
                    <div className="flex items-start gap-2">
                      <MessageCircle className="w-4 h-4 text-green-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-green-400 font-semibold">アンサー</p>
                        <p className="text-sm text-green-300">{lyric.answerTo}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* 生成時間表示 */}
                  <div className="flex items-center gap-2 pt-2">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-400">{lyric?.generationTime || 0}ms</span>
                  </div>
                </div>
                
                {lyric?.audioUrl && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    onClick={() => playAudio(lyric.audioUrl!, participantId)}
                    className={`mt-4 flex items-center gap-2 px-4 py-2 bg-${style.color}-600/80 hover:bg-${style.color}-700 border border-${style.color}-500/30 rounded-full shadow-md transition-all duration-200 group`}
                    disabled={playingAudio !== null}
                  >
                    {playingAudio === participantId ? (
                      <Music className="w-4 h-4 animate-pulse" />
                    ) : (
                      <Volume2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    )}
                    <span className="text-sm">{playingAudio === participantId ? '再生中...' : '再生'}</span>
                  </motion.button>
                )}
              </motion.div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  {isCurrentTurn ? (
                    <>
                      <Mic className={`w-12 h-12 text-${style.color}-400 mx-auto mb-2 animate-pulse`} />
                      <p className="text-gray-400">
                        {isFirstPosition ? 'リリック生成中...' : 'アンサー生成中...'}
                      </p>
                      <div className="mt-2 flex justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-400"></div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={`w-12 h-12 rounded-full bg-${style.color}-500/20 flex items-center justify-center mx-auto mb-2`}>
                        <style.icon className={`w-6 h-6 text-${style.color}-400`} />
                      </div>
                      <p className="text-gray-500">待機中...</p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {playingAudio === participantId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`absolute -top-2 -right-2 px-3 py-1 bg-${style.color}-600 rounded-full shadow-md`}
            >
              <span className="text-xs font-bold text-white">NOW PLAYING</span>
            </motion.div>
          )}
        </div>
      </motion.div>
    )
  }

  return (
    <div className="w-full">
      <audio ref={audioRef} />
      
      {/* Battle Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h2 className="text-3xl md:text-4xl font-black text-white mb-2">
          ラウンド {currentRound || 0} / {totalRounds}
        </h2>
        <p className="text-xl text-purple-400 mb-4">テーマ: {battleTheme}</p>
        
        {/* 交互システム表示 */}
        {currentRound && (
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className={`px-4 py-2 rounded-full text-sm font-bold ${
              currentRoundPosition.first === 'ai1' 
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                : 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
            }`}>
              {getParticipantStyle(currentRoundPosition.first as 'ai1' | 'ai2').name} 先行
            </div>
            <div className="text-gray-400">→</div>
            <div className={`px-4 py-2 rounded-full text-sm font-bold ${
              currentRoundPosition.second === 'ai2' 
                ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30' 
                : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
            }`}>
              {getParticipantStyle(currentRoundPosition.second as 'ai1' | 'ai2').name} アンサー
            </div>
          </div>
        )}
      </motion.div>
      
      {/* Loading State */}
      <AnimatePresence>
        {loadingStage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mb-8"
          >
            <BattleLoading stage={loadingStage} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Battle Stage - 交互システム対応 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 先行 */}
        {renderParticipantCard(currentRoundPosition.first as 'ai1' | 'ai2', 'first')}
        
        {/* 後攻 */}
        {renderParticipantCard(currentRoundPosition.second as 'ai1' | 'ai2', 'second')}
      </div>
      
      {/* ラウンド進行状況 */}
      {currentRound && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 bg-black/40 rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">ラウンド進行状況</span>
            <span className="text-xs text-gray-500">
              {currentPosition === 'first' && '先行リリック生成中'}
              {currentPosition === 'second' && 'アンサーリリック生成中'}
              {currentPosition === 'complete' && 'ラウンド完了'}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <motion.div
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
              initial={{ width: '0%' }}
              animate={{ 
                width: currentPosition === 'first' ? '25%' : 
                       currentPosition === 'second' ? '75%' : '100%' 
              }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </motion.div>
      )}
    </div>
  )
}