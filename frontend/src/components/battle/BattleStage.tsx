'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Volume2, Zap, Music, Sparkles, MessageCircle, Target } from 'lucide-react'
import { useBattleStore } from '@/store/battleStore'
import { useEffect, useRef, useState } from 'react'
import { BattleLoading } from '@/components/ui/loading'
import LyricWithViolations from './LyricWithViolations'

// 自動再生の状態管理
type AudioPlayMode = 'manual' | 'auto_sequential' | 'auto_simultaneous'
type PlaybackStatus = 'waiting' | 'playing_first' | 'interval' | 'playing_second' | 'completed'

export function BattleStage() {
  const { battleTheme, currentRound, totalRounds, rounds, battleStatus } = useBattleStore()
  const [currentVerseNumber, setCurrentVerseNumber] = useState(1) // Track current verse being displayed
  const [playingAudio, setPlayingAudio] = useState<'ai1' | 'ai2' | null>(null)
  const [loadingStage, setLoadingStage] = useState<'generating' | 'audio' | null>('generating')
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>('waiting')
  const [audioPermissionGranted, setAudioPermissionGranted] = useState(false)
  const [playMode, setPlayMode] = useState<AudioPlayMode>('auto_sequential')
  const [userCanControl, setUserCanControl] = useState(true)
  const [processedRounds, setProcessedRounds] = useState<Set<number>>(new Set())
  const [displayUpToVerse, setDisplayUpToVerse] = useState<{round: number, verse: number}>({ round: 1, verse: 0 })
  const [streamingLyrics, setStreamingLyrics] = useState<{[key: string]: boolean}>({}) // Track which lyrics are streaming
  const [currentShowingVerse, setCurrentShowingVerse] = useState<{round: number, participant: 'ai1' | 'ai2', verseIndex: number} | null>(null) // Track specific verse being shown
  const [verseHistory, setVerseHistory] = useState<Array<{round: number, participant: 'ai1' | 'ai2', verseIndex: number}>>([]) // Track verse display history
  
  const audioRef = useRef<HTMLAudioElement>(null)
  const secondAudioRef = useRef<HTMLAudioElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const currentRoundData = rounds.find(r => r.number === currentRound) || rounds[rounds.length - 1]

  // Track newly generated lyrics for streaming effect
  useEffect(() => {
    // Hide loading when battle starts
    if (battleStatus === 'active' && rounds.length > 0) {
      setLoadingStage(null)
    }
    
    rounds.forEach(round => {
      if (!processedRounds.has(round.number)) {
        setProcessedRounds(prev => new Set([...prev, round.number]))
        
        // Mark verses for streaming in sequence (先行→後攻)
        if (round.verses && round.verses.length > 0) {
          const sortedVerses = [...round.verses].sort((a, b) => {
            // AI1 (先行) comes first
            if (a.participantId === 'ai1' && b.participantId === 'ai2') return -1
            if (a.participantId === 'ai2' && b.participantId === 'ai1') return 1
            return a.number - b.number
          })
          
          let totalDelay = 0
          sortedVerses.forEach((verse, index) => {
            const key = `${round.number}-${verse.participantId}-${verse.number}`
            if (!streamingLyrics[key]) {
              // Start streaming with delay to ensure sequential display
              setTimeout(() => {
                setStreamingLyrics(prev => ({ ...prev, [key]: true }))
                // Stop streaming after completion
                const streamDuration = (verse.lyric.content.length / 25) * 1000 // 25 chars/sec
                setTimeout(() => {
                  setStreamingLyrics(prev => ({ ...prev, [key]: false }))
                }, streamDuration + 500) // Add small buffer
              }, totalDelay)
              
              // Calculate delay for next verse
              totalDelay += (verse.lyric.content.length / 25) * 1000 + 2000 // Stream time + 2s pause
            }
          })
        }
      }
    })
  }, [rounds, battleStatus])

  // Check if a round is newly generated (for streaming)
  const isNewRound = (roundNumber: number) => {
    return roundNumber === currentRound && !processedRounds.has(roundNumber)
  }

  // 音声許可取得
  const requestAudioPermission = async (): Promise<boolean> => {
    try {
      // ユーザーの操作で音声再生を試す
      const audio = new Audio()
      audio.muted = true
      await audio.play()
      audio.pause()
      setAudioPermissionGranted(true)
      return true
    } catch (error) {
      console.log('Audio permission not granted yet')
      return false
    }
  }

  // 手動再生（従来の機能）
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

  // 自動順次再生（新機能）
  const startAutoSequentialPlay = async () => {
    // バース構造に対応
    const hasVerses = currentRoundData?.verses && currentRoundData.verses.length > 0
    
    if (!hasVerses) return
    if (!audioPermissionGranted) {
      const granted = await requestAudioPermission()
      if (!granted) return
    }

    try {
      setPlaybackStatus('playing_first')
      
      if (hasVerses) {
        // 新しいバース構造の場合（バースを順番に再生）
        const sortedVerses = currentRoundData.verses.sort((a, b) => a.number - b.number)
        
        for (let i = 0; i < sortedVerses.length; i++) {
          const verse = sortedVerses[i]
          if (verse.lyric.audioUrl && audioRef.current) {
            audioRef.current.src = verse.lyric.audioUrl
            await audioRef.current.play()
            setPlayingAudio(verse.participantId)
            
            await new Promise<void>((resolve) => {
              audioRef.current!.onended = () => {
                setPlayingAudio(null)
                if (i < sortedVerses.length - 1) {
                  setPlaybackStatus('interval')
                  setTimeout(() => {
                    setPlaybackStatus('playing_first')
                    resolve()
                  }, 2000) // 2秒のインターバル
                } else {
                  setPlaybackStatus('completed')
                  resolve()
                }
              }
            })
          }
        }
      }
    } catch (error) {
      console.error('Auto play failed:', error)
      setPlaybackStatus('waiting')
    }
  }

  // 緊急停止
  const stopAllAudio = () => {
    if (audioRef.current) audioRef.current.pause()
    if (secondAudioRef.current) secondAudioRef.current.pause()
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setPlayingAudio(null)
    setPlaybackStatus('waiting')
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])
  
  useEffect(() => {
    if (currentRoundData?.verses && currentRoundData.verses.length > 0) {
      // バースがあるかチェック
      const hasAllContent = currentRoundData.verses.every(verse => verse.lyric?.content)
      const hasAllAudio = currentRoundData.verses.every(verse => verse.lyric?.audioUrl)
      
      if (hasAllContent && hasAllAudio) {
        setLoadingStage(null)
        
        // 自動再生モードの場合、音声準備完了と同時に自動再生開始
        if (playMode === 'auto_sequential' && playbackStatus === 'waiting') {
          setTimeout(() => {
            startAutoSequentialPlay()
          }, 1000) // 1秒後に自動再生開始（没入感のための小さな間）
        }
      } else if (hasAllContent && !hasAllAudio) {
        setLoadingStage('audio')
      } else {
        setLoadingStage('generating')
      }
    } else {
      setLoadingStage('generating')
    }
  }, [currentRoundData, playMode, playbackStatus])

  // Update display state when new verses are added - implement turn-based display
  useEffect(() => {
    // Collect all verses across all rounds in order
    const allVerses: Array<{round: number, participant: 'ai1' | 'ai2', verseIndex: number}> = []
    
    rounds.forEach(round => {
      if (round.verses) {
        // Get verses for each participant
        const ai1Verses = round.verses.filter(v => v.participantId === 'ai1').sort((a, b) => a.number - b.number)
        const ai2Verses = round.verses.filter(v => v.participantId === 'ai2').sort((a, b) => a.number - b.number)
        
        // Add verses in alternating order (先行→後攻)
        for (let i = 0; i < Math.max(ai1Verses.length, ai2Verses.length); i++) {
          if (ai1Verses[i]) {
            allVerses.push({ round: round.number, participant: 'ai1', verseIndex: i })
          }
          if (ai2Verses[i]) {
            allVerses.push({ round: round.number, participant: 'ai2', verseIndex: i })
          }
        }
      }
    })
    
    // If we have new verses that aren't in history, start displaying them
    if (allVerses.length > verseHistory.length) {
      // Show the next verse
      const nextVerseIndex = verseHistory.length
      if (nextVerseIndex < allVerses.length) {
        const nextVerse = allVerses[nextVerseIndex]
        setCurrentShowingVerse(nextVerse)
        setVerseHistory(prev => [...prev, nextVerse])
        
        // Start streaming for this verse when it's displayed
        const key = `${nextVerse.round}-${nextVerse.participant}-display`
        setStreamingLyrics(prev => ({ ...prev, [key]: true }))
        
        // Stop streaming after duration
        const round = rounds.find(r => r.number === nextVerse.round)
        if (round && round.verses) {
          const verses = round.verses.filter(v => v.participantId === nextVerse.participant)
          const verse = verses[nextVerse.verseIndex]
          if (verse) {
            const streamDuration = (verse.lyric.content.length / 25) * 1000
            setTimeout(() => {
              setStreamingLyrics(prev => ({ ...prev, [key]: false }))
            }, streamDuration + 500)
          }
        }
      }
    }
  }, [rounds, verseHistory])
  
  // Automatic verse advancement timer
  useEffect(() => {
    if (!currentShowingVerse) return
    
    const timer = setTimeout(() => {
      // Collect all verses to find the next one
      const allVerses: Array<{round: number, participant: 'ai1' | 'ai2', verseIndex: number}> = []
      
      rounds.forEach(round => {
        if (round.verses) {
          const ai1Verses = round.verses.filter(v => v.participantId === 'ai1').sort((a, b) => a.number - b.number)
          const ai2Verses = round.verses.filter(v => v.participantId === 'ai2').sort((a, b) => a.number - b.number)
          
          for (let i = 0; i < Math.max(ai1Verses.length, ai2Verses.length); i++) {
            if (ai1Verses[i]) {
              allVerses.push({ round: round.number, participant: 'ai1', verseIndex: i })
            }
            if (ai2Verses[i]) {
              allVerses.push({ round: round.number, participant: 'ai2', verseIndex: i })
            }
          }
        }
      })
      
      // Find current verse index and show next
      const currentIndex = verseHistory.length - 1
      if (currentIndex + 1 < allVerses.length) {
        const nextVerse = allVerses[currentIndex + 1]
        setCurrentShowingVerse(nextVerse)
        setVerseHistory(prev => [...prev, nextVerse])
      }
    }, 8000) // 8 seconds per verse
    
    return () => clearTimeout(timer)
  }, [currentShowingVerse, rounds, verseHistory])

  // 音声許可が必要な場合の初回クリックハンドラー
  const handleFirstUserInteraction = async () => {
    if (!audioPermissionGranted) {
      const granted = await requestAudioPermission()
      if (granted && playMode === 'auto_sequential') {
        startAutoSequentialPlay()
      }
    }
  }

  return (
    <div className="w-full">
      <audio ref={audioRef} />
      <audio ref={secondAudioRef} />
      
      {/* 自動再生コントロールパネル */}
      <div className="mb-6 bg-black/40 rounded-xl p-4 border border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Music className="w-5 h-5 text-purple-400" />
              <span className="text-white font-semibold">音声再生</span>
            </div>
            
            {playbackStatus === 'waiting' && !audioPermissionGranted && (
              <button
                onClick={handleFirstUserInteraction}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                🎵 自動再生を開始
              </button>
            )}
            
            {playbackStatus === 'playing_first' && (
              <div className="flex items-center gap-2 px-3 py-1 bg-purple-600/80 rounded-full">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-white text-sm font-semibold">先行MC再生中</span>
              </div>
            )}
            
            {playbackStatus === 'interval' && (
              <div className="flex items-center gap-2 px-3 py-1 bg-yellow-600/80 rounded-full">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-white text-sm font-semibold">インターバル（2秒）</span>
              </div>
            )}
            
            {playbackStatus === 'playing_second' && (
              <div className="flex items-center gap-2 px-3 py-1 bg-pink-600/80 rounded-full">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-white text-sm font-semibold">後攻MC再生中</span>
              </div>
            )}
            
            {playbackStatus === 'completed' && (
              <div className="flex items-center gap-2 px-3 py-1 bg-green-600/80 rounded-full">
                <span className="text-white text-sm font-semibold">✅ 再生完了</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {(playbackStatus === 'playing_first' || playbackStatus === 'interval' || playbackStatus === 'playing_second') && (
              <button
                onClick={stopAllAudio}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-semibold transition-colors"
              >
                ⏹️ 停止
              </button>
            )}
            
            {playbackStatus === 'waiting' && currentRoundData?.verses?.some(verse => verse.lyric?.audioUrl) && (
              <button
                onClick={startAutoSequentialPlay}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-semibold transition-colors"
              >
                🔄 再生
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Battle Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h2 className="text-3xl md:text-4xl font-black text-white mb-2">
          バース {currentRound || 0} / {totalRounds || 3}
        </h2>
        <p className="text-xl text-purple-400">テーマ: {battleTheme}</p>
        {currentRound > 0 && (
          <div className="mt-4 flex justify-center gap-4">
            <div className="px-4 py-2 rounded-full text-sm font-bold bg-purple-600/80 text-white">
              🎤 先行: MC Flash
            </div>
            <div className="px-4 py-2 rounded-full text-sm font-bold bg-pink-600/80 text-white">
              📢 後攻: MC Gemin aka アンサーマシン
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

      {/* Battle Stage - Turn-based Verse Display */}
      <AnimatePresence mode="wait">
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:gap-8">
        {/* Display current verse based on turn */}
        {(!currentShowingVerse && rounds.length === 0) ? (
          // Initial waiting state
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-black/60 rounded-2xl p-8 border border-white/10 text-center"
          >
            <Mic className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-400 text-lg">バトル開始を待機中...</p>
          </motion.div>
        ) : currentShowingVerse && currentShowingVerse.participant === 'ai1' ? (
        <motion.div
          key="mc-flash"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className={`relative ${playingAudio === 'ai1' ? 'scale-105' : ''} transition-transform duration-300`}
        >
          <div className="bg-black/60 rounded-2xl p-4 sm:p-6 lg:p-8 border border-purple-500/30 shadow-lg flex flex-col items-center h-full">
            <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6 w-full">
              <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full bg-gradient-to-br from-purple-600 to-purple-400 flex items-center justify-center shadow-md flex-shrink-0">
                <Zap className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white truncate">MC Flash</h3>
                <p className="text-xs sm:text-sm lg:text-base text-purple-400 line-clamp-2">瞬発力と技巧で勝負する超高速フロウ</p>
              </div>
            </div>
            
            {/* 現在のバースのみを表示 */}
            <div className="w-full space-y-3 sm:space-y-4 flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 400px)' }}>
              {(() => {
                const round = rounds.find(r => r.number === currentShowingVerse.round)
                if (!round) return null
                
                const ai1Verses = round.verses?.filter(v => v.participantId === 'ai1').sort((a, b) => a.number - b.number) || []
                const verse = ai1Verses[currentShowingVerse.verseIndex]
                
                if (!verse) {
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-black/30 rounded-xl p-4 border border-purple-400/50 bg-purple-900/20"
                    >
                      <h4 className="text-sm font-bold text-purple-300 mb-2">
                        バース {currentShowingVerse.round}
                      </h4>
                      <div className="text-gray-400 text-sm italic">
                        リリック生成中...
                      </div>
                    </motion.div>
                  )
                }
                
                return (
                  <motion.div
                    key={`ai1-round-${round.number}-verse-${verse.number}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.5 }}
                    className="bg-black/30 rounded-xl p-4 border border-purple-400/50 bg-purple-900/20"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-sm font-bold text-purple-300">
                        バース {currentShowingVerse.round} - 先行
                      </h5>
                      {verse.lyric.audioUrl && (
                        <button
                          onClick={() => playAudio(verse.lyric.audioUrl!, 'ai1')}
                          className="p-1 rounded bg-purple-600/20 hover:bg-purple-600/40 transition-colors"
                        >
                          <Volume2 className="w-4 h-4 text-purple-400" />
                        </button>
                      )}
                    </div>
                    
                    <LyricWithViolations
                      content={verse.lyric.content}
                      violations={verse.lyric.violations}
                      className="text-sm"
                      enableStreaming={true}
                      streamingSpeed={25}
                      isNewContent={streamingLyrics[`${round.number}-ai1-display`] || false}
                    />
                  </motion.div>
                )
              })()}
            </div>
          </div>
        </motion.div>
        ) : currentShowingVerse && currentShowingVerse.participant === 'ai2' ? (
        <motion.div
          key="mc-gemin"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 50 }}
          className={`relative ${playingAudio === 'ai2' ? 'scale-105' : ''} transition-transform duration-300`}
        >
          <div className="bg-black/60 rounded-2xl p-4 sm:p-6 lg:p-8 border border-pink-500/30 shadow-lg flex flex-col items-center h-full">
            <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6 w-full">
              <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full bg-gradient-to-br from-pink-600 to-pink-400 flex items-center justify-center shadow-md flex-shrink-0">
                <Mic className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white truncate">MC Gemin aka アンサーマシン</h3>
                <p className="text-xs sm:text-sm lg:text-base text-pink-400 line-clamp-2">相手の言葉を拾って韻で返すアンサー特化</p>
              </div>
            </div>
            
            {/* 現在のバースのみを表示 */}
            <div className="w-full space-y-3 sm:space-y-4 flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 400px)' }}>
              {(() => {
                const round = rounds.find(r => r.number === currentShowingVerse.round)
                if (!round) return null
                
                const ai2Verses = round.verses?.filter(v => v.participantId === 'ai2').sort((a, b) => a.number - b.number) || []
                const verse = ai2Verses[currentShowingVerse.verseIndex]
                
                if (!verse) {
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-black/30 rounded-xl p-4 border border-pink-400/50 bg-pink-900/20"
                    >
                      <h4 className="text-sm font-bold text-pink-300 mb-2">
                        バース {currentShowingVerse.round}
                      </h4>
                      <div className="text-gray-400 text-sm italic">
                        リリック生成中...
                      </div>
                    </motion.div>
                  )
                }
                
                return (
                  <motion.div
                    key={`ai2-round-${round.number}-verse-${verse.number}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.5 }}
                    className="bg-black/30 rounded-xl p-4 border border-pink-400/50 bg-pink-900/20"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-sm font-bold text-pink-300">
                        バース {currentShowingVerse.round} - 後攻
                      </h5>
                      {verse.lyric.audioUrl && (
                        <button
                          onClick={() => playAudio(verse.lyric.audioUrl!, 'ai2')}
                          className="p-1 rounded bg-pink-600/20 hover:bg-pink-600/40 transition-colors"
                        >
                          <Volume2 className="w-4 h-4 text-pink-400" />
                        </button>
                      )}
                    </div>
                    
                    <LyricWithViolations
                      content={verse.lyric.content}
                      violations={verse.lyric.violations}
                      className="text-sm"
                      enableStreaming={true}
                      streamingSpeed={25}
                      isNewContent={streamingLyrics[`${round.number}-ai2-display`] || false}
                    />
                  </motion.div>
                )
              })()}
            </div>
          </div>
        </motion.div>
        ) : null}
      </div>
      </AnimatePresence>
    </div>
  )
}