'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useBattleStore } from '@/store/battleStore'
import { useAgentAPI } from '@/hooks/useAgentAPI'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Mic, 
  MicOff, 
  Send, 
  User, 
  Bot, 
  Timer, 
  Zap,
  Brain,
  Volume2,
  Pause,
  Play,
  ArrowRight,
  Trophy,
  X
} from 'lucide-react'
import toast from 'react-hot-toast'

// 人間 vs AI バトルの状態管理
type BattlePhase = 'setup' | 'round1_human' | 'round1_ai' | 'round2_human' | 'round2_ai' | 'round3_human' | 'round3_ai' | 'evaluation' | 'result'
type InputMode = 'text' | 'voice' | 'hybrid'

interface HumanVsAiBattleArenaProps {
  onExit: () => void
}

/**
 * 🥊 完璧な人間 vs AI ラップバトルアリーナ
 * - 公平性確保の制約システム
 * - リアルタイム音声認識
 * - AI アンサー特化システム
 * - 感動的な演出とフィードバック
 */
export function HumanVsAiBattleArena({ onExit }: HumanVsAiBattleArenaProps) {
  // ストア
  const { battleTheme, setBattleTheme, currentRound, rounds, addLyric } = useBattleStore()
  const { generateLyrics, evaluateBattle, checkCompliance } = useAgentAPI()

  // バトル状態
  const [battlePhase, setBattlePhase] = useState<BattlePhase>('setup')
  const [inputMode, setInputMode] = useState<InputMode>('text')
  const [humanName, setHumanName] = useState('')
  const [theme, setTheme] = useState('')
  const [timeLeft, setTimeLeft] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  
  // 入力状態
  const [currentInput, setCurrentInput] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [voicePermissionGranted, setVoicePermissionGranted] = useState(false)
  
  // バトル履歴
  const [humanLyrics, setHumanLyrics] = useState<string[]>([])
  const [aiLyrics, setAiLyrics] = useState<string[]>([])
  const [battleResult, setBattleResult] = useState<any>(null)

  // 音声認識
  const [recognition, setRecognition] = useState<any | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 音声認識の初期化（Web Speech API + Live API準備）
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const speechRecognition = new (window as any).webkitSpeechRecognition()
      speechRecognition.continuous = true
      speechRecognition.interimResults = true
      speechRecognition.lang = 'ja-JP'
      
      speechRecognition.onresult = (event: any) => {
        let finalTranscript = ''
        let interimTranscript = ''
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }
        
        if (finalTranscript) {
          setCurrentInput(prev => prev + finalTranscript)
          console.log('Voice input received:', finalTranscript)
        }
      }

      speechRecognition.onstart = () => {
        console.log('Voice recognition started')
        setIsRecording(true)
        setVoicePermissionGranted(true)
      }

      speechRecognition.onend = () => {
        console.log('Voice recognition ended')
        setIsRecording(false)
      }

      speechRecognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        toast.error(`音声認識エラー: ${event.error}`)
        setIsRecording(false)
      }

      setRecognition(speechRecognition)
    } else {
      console.warn('Web Speech API not supported')
      toast.error('音声認識機能はこのブラウザではサポートされていません')
    }
  }, [])

  // タイマー管理
  const startTimer = useCallback((seconds: number) => {
    setTimeLeft(seconds)
    timeoutRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleTimeUp()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  const stopTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearInterval(timeoutRef.current)
      timeoutRef.current = null
    }
    setTimeLeft(0)
  }, [])

  // 時間切れ処理
  const handleTimeUp = useCallback(() => {
    stopTimer()
    if (battlePhase.includes('human')) {
      if (currentInput.trim()) {
        handleHumanSubmit()
      } else {
        toast.error('時間切れ！空のリリックで次に進みます')
        proceedToNextPhase()
      }
    }
  }, [battlePhase, currentInput])

  // バトル開始
  const handleStartBattle = async () => {
    if (!humanName.trim() || !theme.trim()) {
      toast.error('名前とテーマを入力してください')
      return
    }

    setBattleTheme(theme)
    setBattlePhase('round1_human')
    toast.success(`${humanName} vs AI バトル開始！`)
    
    // 人間の1ラウンド目開始（60秒）
    startTimer(60)
  }

  // 人間のリリック提出
  const handleHumanSubmit = async () => {
    if (!currentInput.trim()) {
      toast.error('リリックを入力してください')
      return
    }

    setIsProcessing(true)
    stopTimer()

    try {
      // コンプライアンスチェック
      const compliance = await checkCompliance({ content: currentInput })
      
      if (compliance.violations && compliance.violations.length > 0) {
        toast.error('不適切な内容が検出されました。修正してください。')
        setIsProcessing(false)
        startTimer(30) // 30秒の修正時間
        return
      }

      // 人間のリリックを保存
      const roundNum = Math.ceil((humanLyrics.length + 1))
      setHumanLyrics(prev => [...prev, currentInput])
      
      addLyric(roundNum, 'ai1', {
        id: `human-round-${roundNum}`,
        content: currentInput,
        generatedAt: new Date(),
        complianceScore: 1,
        generationTime: 0,
        violations: []
      })

      toast.success('リリック提出完了！AIが応答中...')
      setCurrentInput('')
      proceedToNextPhase()

    } catch (error) {
      console.error('Error submitting human lyrics:', error)
      toast.error('リリック提出に失敗しました')
    } finally {
      setIsProcessing(false)
    }
  }

  // AIのリリック生成
  const handleAiGenerate = async () => {
    setIsProcessing(true)

    try {
      const roundNum = Math.ceil(aiLyrics.length + 1)
      const previousHumanLyric = humanLyrics[humanLyrics.length - 1] || ''

      // AI アンサー生成（人間のリリックに対する応答）
      const aiResponse = await generateLyrics({
        theme: battleTheme,
        rapperStyle: `【AI アンサー特化】人間「${humanName}」のリリック「${previousHumanLyric}」に対する完全論破アンサー。相手の言葉を5つ以上拾って韻を踏みつつ、論理的かつ創造的に反撃。8小節構成。`,
        userName: 'AI バトルマシン'
      })

      // AIのリリックを保存
      setAiLyrics(prev => [...prev, aiResponse.lyrics])
      
      addLyric(roundNum, 'ai2', {
        id: `ai-round-${roundNum}`,
        content: aiResponse.lyrics,
        generatedAt: new Date(),
        complianceScore: aiResponse.metadata.complianceScore,
        generationTime: aiResponse.metadata.generationTime,
        violations: []
      })

      toast.success('AI アンサー完了！')
      
      // 次のフェーズへ
      setTimeout(() => {
        proceedToNextPhase()
      }, 2000)

    } catch (error) {
      console.error('Error generating AI lyrics:', error)
      toast.error('AI リリック生成に失敗しました')
    } finally {
      setIsProcessing(false)
    }
  }

  // 次のフェーズに進む
  const proceedToNextPhase = () => {
    const phaseSequence: BattlePhase[] = [
      'setup', 'round1_human', 'round1_ai', 'round2_human', 'round2_ai', 'round3_human', 'round3_ai', 'evaluation', 'result'
    ]
    
    const currentIndex = phaseSequence.indexOf(battlePhase)
    const nextPhase = phaseSequence[currentIndex + 1]
    
    if (nextPhase) {
      setBattlePhase(nextPhase)
      
      // 人間のターンの場合タイマー開始
      if (nextPhase.includes('human')) {
        startTimer(60)
      }
      // AIのターンの場合自動生成
      else if (nextPhase.includes('ai')) {
        setTimeout(() => handleAiGenerate(), 1000)
      }
      // 評価フェーズ
      else if (nextPhase === 'evaluation') {
        handleBattleEvaluation()
      }
    }
  }

  // バトル評価
  const handleBattleEvaluation = async () => {
    setIsProcessing(true)
    
    try {
      const evaluation = await evaluateBattle({
        battleId: `human-vs-ai-${Date.now()}`,
        rapper1Lyrics: humanLyrics,
        rapper2Lyrics: aiLyrics
      })

      setBattleResult({
        winner: evaluation.winner === 'rapper1' ? 'human' : evaluation.winner === 'rapper2' ? 'ai' : 'tie',
        humanScore: evaluation.scores.rapper1,
        aiScore: evaluation.scores.rapper2,
        analysis: evaluation.judgeCommentary
      })

      setBattlePhase('result')
      toast.success('バトル評価完了！')

    } catch (error) {
      console.error('Error evaluating battle:', error)
      toast.error('バトル評価に失敗しました')
    } finally {
      setIsProcessing(false)
    }
  }

  // 音声録音制御
  const toggleRecording = async () => {
    if (!recognition) {
      toast.error('音声認識がサポートされていません')
      return
    }

    if (!voicePermissionGranted) {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true })
        setVoicePermissionGranted(true)
      } catch (error) {
        toast.error('マイクの許可が必要です')
        return
      }
    }

    if (isRecording) {
      recognition.stop()
      setIsRecording(false)
    } else {
      recognition.start()
      setIsRecording(true)
    }
  }

  // クリーンアップ
  useEffect(() => {
    return () => {
      stopTimer()
      if (recognition) {
        recognition.stop()
      }
    }
  }, [])

  // 現在のラウンド番号を計算
  const getCurrentRound = () => {
    if (battlePhase.includes('round1')) return 1
    if (battlePhase.includes('round2')) return 2
    if (battlePhase.includes('round3')) return 3
    return 0
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-black p-4">
      <div className="container mx-auto max-w-4xl">
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-black text-white">
            🥊 人間 vs AI ラップバトル
          </h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={onExit}
            className="text-white/70 hover:text-white"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        <AnimatePresence mode="wait">
          {/* セットアップフェーズ */}
          {battlePhase === 'setup' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <Card className="bg-black/40 border-purple-500/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <User className="w-5 h-5" />
                    バトル設定
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-white font-semibold mb-2 block">あなたの名前</label>
                    <input
                      type="text"
                      value={humanName}
                      onChange={(e) => setHumanName(e.target.value)}
                      placeholder="MC ネーム"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40"
                      maxLength={20}
                    />
                  </div>
                  
                  <div>
                    <label className="text-white font-semibold mb-2 block">バトルテーマ</label>
                    <input
                      type="text"
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                      placeholder="例: 未来の技術、音楽の力、人生の挑戦..."
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40"
                      maxLength={100}
                    />
                  </div>

                  <div>
                    <label className="text-white font-semibold mb-2 block">入力方法</label>
                    <div className="flex gap-3">
                      <Button
                        onClick={() => setInputMode('text')}
                        variant={inputMode === 'text' ? 'default' : 'outline'}
                        className="flex-1"
                      >
                        📝 テキスト入力
                      </Button>
                      <Button
                        onClick={() => setInputMode('voice')}
                        variant={inputMode === 'voice' ? 'default' : 'outline'}
                        className="flex-1"
                      >
                        🎤 音声認識
                      </Button>
                      <Button
                        onClick={() => setInputMode('hybrid')}
                        variant={inputMode === 'hybrid' ? 'default' : 'outline'}
                        className="flex-1"
                      >
                        🔄 ハイブリッド
                      </Button>
                    </div>
                  </div>

                  <Button
                    onClick={handleStartBattle}
                    disabled={!humanName.trim() || !theme.trim()}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 py-3 text-lg font-bold"
                  >
                    <Trophy className="w-5 h-5 mr-2" />
                    バトル開始
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* バトルフェーズ */}
          {(battlePhase !== 'setup' && battlePhase !== 'result') && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {/* バトル状況表示 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-black/40 border-blue-500/30">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-400">{getCurrentRound()}</div>
                    <div className="text-sm text-gray-300">ラウンド / 3</div>
                  </CardContent>
                </Card>
                
                <Card className="bg-black/40 border-yellow-500/30">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-400">{timeLeft}</div>
                    <div className="text-sm text-gray-300">残り時間（秒）</div>
                  </CardContent>
                </Card>
                
                <Card className="bg-black/40 border-green-500/30">
                  <CardContent className="p-4 text-center">
                    <div className="text-lg font-bold text-green-400">
                      {battlePhase.includes('human') ? `${humanName}のターン` : 'AI のターン'}
                    </div>
                    <div className="text-sm text-gray-300">
                      {battlePhase.includes('human') ? '🎤 リリック入力中' : '🤖 AI 思考中'}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 人間のターン */}
              {battlePhase.includes('human') && (
                <Card className="bg-black/40 border-purple-500/30">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <User className="w-5 h-5" />
                      {humanName} のリリック入力
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      value={currentInput}
                      onChange={(e) => setCurrentInput(e.target.value)}
                      placeholder="あなたのリリックを入力してください..."
                      className="min-h-[120px] bg-white/10 border-white/20 text-white placeholder-white/40"
                      disabled={isProcessing}
                    />
                    
                    <div className="flex gap-3">
                      {(inputMode === 'voice' || inputMode === 'hybrid') && (
                        <Button
                          onClick={toggleRecording}
                          variant={isRecording ? 'destructive' : 'outline'}
                          className="flex-1"
                        >
                          {isRecording ? <MicOff className="w-4 h-4 mr-2" /> : <Mic className="w-4 h-4 mr-2" />}
                          {isRecording ? '録音停止' : '音声入力'}
                        </Button>
                      )}
                      
                      <Button
                        onClick={handleHumanSubmit}
                        disabled={!currentInput.trim() || isProcessing}
                        className="flex-1 bg-purple-600 hover:bg-purple-700"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {isProcessing ? '処理中...' : 'リリック提出'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* AI のターン */}
              {battlePhase.includes('ai') && (
                <Card className="bg-black/40 border-pink-500/30">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Bot className="w-5 h-5" />
                      AI バトルマシン のアンサー生成中
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <Brain className="w-12 h-12 text-pink-400 mx-auto mb-4 animate-pulse" />
                        <p className="text-white text-lg">あなたのリリックを分析中...</p>
                        <p className="text-gray-400">韻とロジックで完全論破を準備中</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 評価フェーズ */}
              {battlePhase === 'evaluation' && (
                <Card className="bg-black/40 border-yellow-500/30">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Trophy className="w-5 h-5" />
                      バトル評価中
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-4 animate-pulse" />
                        <p className="text-white text-lg">AI 審査員が判定中...</p>
                        <p className="text-gray-400">韻、フロウ、アンサー、創造性を総合評価</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}

          {/* 結果フェーズ */}
          {battlePhase === 'result' && battleResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <Card className="bg-black/40 border-yellow-500/30">
                <CardHeader>
                  <CardTitle className="text-white text-center text-3xl">
                    🏆 バトル結果発表 🏆
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-6">
                  <div className="text-6xl">
                    {battleResult.winner === 'human' ? '🎉' : battleResult.winner === 'ai' ? '🤖' : '🤝'}
                  </div>
                  
                  <div className="text-3xl font-bold text-white">
                    {battleResult.winner === 'human' 
                      ? `${humanName} の勝利！` 
                      : battleResult.winner === 'ai' 
                      ? 'AI の勝利！' 
                      : '引き分け！'
                    }
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-400">{battleResult.humanScore}</div>
                      <div className="text-white">{humanName}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-pink-400">{battleResult.aiScore}</div>
                      <div className="text-white">AI バトルマシン</div>
                    </div>
                  </div>

                  <div className="bg-white/10 rounded-lg p-4">
                    <h3 className="text-white font-bold mb-2">審査員コメント</h3>
                    <p className="text-gray-300">{battleResult.analysis}</p>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => {
                        setBattlePhase('setup')
                        setHumanLyrics([])
                        setAiLyrics([])
                        setBattleResult(null)
                        setCurrentInput('')
                      }}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      もう一度バトル
                    </Button>
                    <Button
                      onClick={onExit}
                      variant="outline"
                      className="flex-1"
                    >
                      終了
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}