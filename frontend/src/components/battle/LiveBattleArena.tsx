'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLiveAPI } from '@/hooks/useLiveAPI'
import { useAudioStream } from '@/hooks/useAudioStream'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Mic, 
  MicOff, 
  Play, 
  Pause, 
  Square, 
  Wifi, 
  WifiOff, 
  Users, 
  Crown,
  MessageCircle,
  Volume2,
  Activity,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Send
} from 'lucide-react'
import toast from 'react-hot-toast'

interface LiveBattleArenaProps {
  theme: string
  rapperStyle: string
  onBack: () => void
}

/**
 * Live Battle Arena Component
 * β版実装 - リアルタイム音声ラップバトル UI
 */
export function LiveBattleArena({ theme, rapperStyle, onBack }: LiveBattleArenaProps) {
  // States
  const [userName, setUserName] = useState('')
  const [textInput, setTextInput] = useState('')
  const [battleId, setBattleId] = useState('')
  const [userId] = useState(() => `user_${Math.random().toString(36).substr(2, 9)}`)
  const [isSetupComplete, setIsSetupComplete] = useState(false)
  const [battlePhase, setBattlePhase] = useState<'setup' | 'waiting' | 'active' | 'ended'>('setup')
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [response, setResponse] = useState('')

  // Use actual hooks
  const liveAPI = useLiveAPI()
  const audioStream = useAudioStream()

  // β版バッジ表示
  const betaBadge = (
    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-500/20 text-yellow-400 rounded-full border border-yellow-500/30">
      β版
    </span>
  )

  /**
   * セットアップ完了処理
   */
  const handleSetup = useCallback(async () => {
    if (!userName.trim()) {
      toast.error('ユーザー名を入力してください')
      return
    }

    try {
      // 音声許可要求
      const hasPermission = await audioStream.requestPermission()
      if (!hasPermission) {
        toast.error('マイクの許可が必要です')
        return
      }

      // セッション作成
      const generatedBattleId = battleId.trim() || `battle_${Date.now()}`
      setBattleId(generatedBattleId)

      const session = await liveAPI.createSession({
        userId,
        battleId: generatedBattleId,
        theme,
        rapperStyle
      })

      // トークン生成
      await liveAPI.generateToken()

      // WebSocket接続
      liveAPI.connect()

      setIsSetupComplete(true)
      setBattlePhase('waiting')

      toast.success('セットアップ完了！バトルの準備ができました')

    } catch (error) {
      console.error('Setup failed:', error)
      toast.error('セットアップに失敗しました')
    }
  }, [userName, battleId, userId, theme, rapperStyle, liveAPI, audioStream])

  /**
   * バトル参加
   */
  const handleJoinBattle = useCallback(async () => {
    try {
      await liveAPI.joinBattle(battleId, userName)
      setBattlePhase('waiting')
    } catch (error) {
      console.error('Join battle failed:', error)
      toast.error('バトル参加に失敗しました')
    }
  }, [liveAPI, battleId, userName])

  /**
   * バトル開始
   */
  const handleStartBattle = useCallback(async () => {
    try {
      await liveAPI.startBattle()
      setBattlePhase('active')
    } catch (error) {
      console.error('Start battle failed:', error)
      toast.error('バトル開始に失敗しました')
    }
  }, [liveAPI])

  /**
   * 音声録音開始
   */
  const handleStartRecording = useCallback(async () => {
    try {
      await audioStream.startRecording()
      await liveAPI.startAudioStream()
      setIsRecording(true)
    } catch (error) {
      console.error('Recording start failed:', error)
      toast.error('録音開始に失敗しました')
    }
  }, [audioStream, liveAPI])

  /**
   * 音声録音停止
   */
  const handleStopRecording = useCallback(() => {
    audioStream.stopRecording()
    liveAPI.stopAudioStream()
    setIsRecording(false)
  }, [audioStream, liveAPI])

  /**
   * テキスト送信
   */
  const handleSendText = useCallback(async () => {
    if (!textInput.trim()) {
      toast.error('テキストを入力してください')
      return
    }

    try {
      await liveAPI.sendText(textInput)
      setTextInput('')
    } catch (error) {
      console.error('Send text failed:', error)
      toast.error('テキスト送信に失敗しました')
    }
  }, [textInput, liveAPI])

  /**
   * バトル終了
   */
  const handleEndBattle = useCallback(async () => {
    try {
      await liveAPI.endSession()
      setBattlePhase('ended')
      onBack()
    } catch (error) {
      console.error('End battle failed:', error)
      toast.error('バトル終了に失敗しました')
    }
  }, [liveAPI, onBack])

  // 音声チャンク配信設定
  useEffect(() => {
    audioStream.onAudioChunk((chunk) => {
      if (liveAPI.isAudioStreaming) {
        liveAPI.sendAudioChunk(chunk.data)
      }
    })
  }, [audioStream, liveAPI])

  // バトルイベント監視
  useEffect(() => {
    const events = liveAPI.battleEvents
    const latestEvent = events[events.length - 1]
    
    if (latestEvent) {
      switch (latestEvent.type) {
        case 'battle_start':
          setBattlePhase('active')
          break
        case 'battle_end':
          setBattlePhase('ended')
          break
      }
    }
  }, [liveAPI.battleEvents])

  // セットアップ画面
  if (!isSetupComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-black flex items-center justify-center px-4 py-8">
        <div className="container mx-auto max-w-4xl w-full">
          <div className="flex flex-col gap-8 items-center justify-center">
            <div className="w-full flex justify-between items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="text-white/70 hover:text-white hover:bg-white/10 rounded-full w-12 h-12"
              >
                <ArrowLeft className="w-6 h-6" />
              </Button>
              <div className="text-center">
                <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                  <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Live バトルアリーナ</span>
                </h1>
                <span className="inline-block px-4 py-1 text-xs font-bold text-green-400 bg-green-400/10 rounded-full border border-green-400/30 mt-2">
                  β版
                </span>
              </div>
              <div className="w-12 h-12" />
            </div>

            {!isConnected ? (
              <div className="w-full">
                <Card className="bg-black/60 border-purple-500/30 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-400" />
                      バトル設定
                    </CardTitle>
                    <CardDescription className="text-gray-300">
                      ライブバトルに参加するための設定を行います
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label htmlFor="userName" className="text-white font-semibold mb-2 block">
                        ユーザー名
                      </Label>
                      <Input
                        id="userName"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        placeholder="あなたのラッパー名を入力"
                        className="bg-black/40 border-purple-400/50 text-white placeholder-gray-400"
                      />
                    </div>

                    <div>
                      <Label htmlFor="battleId" className="text-white font-semibold mb-2 block">
                        バトルID（オプション）
                      </Label>
                      <Input
                        id="battleId"
                        value={battleId}
                        onChange={(e) => setBattleId(e.target.value)}
                        placeholder="既存のバトルに参加する場合は入力"
                        className="bg-black/40 border-purple-400/50 text-white placeholder-gray-400"
                      />
                    </div>

                    <Button
                      onClick={handleSetup}
                      disabled={!userName.trim() || isLoading}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <Mic className="w-5 h-5 mr-2" />
                      )}
                      ライブバトルに参加
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="w-full space-y-8">
                {/* Connection Status */}
                <Card className="bg-black/60 border-green-500/30 shadow-xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                      <span className="text-green-400 font-semibold">ライブ接続中</span>
                      <span className="text-gray-400">・</span>
                      <span className="text-white font-medium">{userName}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Live Battle Interface */}
                <Card className="bg-black/60 border-purple-500/30 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Mic className="w-5 h-5 text-purple-400" />
                      ライブバトル
                    </CardTitle>
                    <CardDescription className="text-gray-300">
                      リアルタイムで音声・テキスト入力が可能です
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Audio Controls */}
                    <div className="flex items-center justify-center gap-4">
                      <Button
                        onClick={isRecording ? handleStopRecording : handleStartRecording}
                        variant={isRecording ? "destructive" : "default"}
                        size="lg"
                        className="rounded-full"
                      >
                        {isRecording ? (
                          <>
                            <Square className="w-5 h-5 mr-2" />
                            録音停止
                          </>
                        ) : (
                          <>
                            <Mic className="w-5 h-5 mr-2" />
                            録音開始
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Text Input */}
                    <div>
                      <Label htmlFor="textInput" className="text-white font-semibold mb-2 block">
                        テキスト入力
                      </Label>
                      <Textarea
                        id="textInput"
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder="ここにあなたのラップを入力..."
                        rows={4}
                        className="bg-black/40 border-purple-400/50 text-white placeholder-gray-400"
                      />
                    </div>

                    <Button
                      onClick={handleSendText}
                      disabled={!textInput.trim() || isLoading}
                      className="w-full"
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5 mr-2" />
                      )}
                      送信
                    </Button>
                  </CardContent>
                </Card>

                {/* Response Display */}
                {response && (
                  <Card className="bg-black/60 border-blue-500/30 shadow-xl">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-blue-400" />
                        AI応答
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-black/40 rounded-xl p-4 border border-white/10">
                        <p className="text-white leading-relaxed">{response}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // メインバトル画面
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 p-4">
      <div className="container mx-auto max-w-6xl py-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-8"
        >
          {/* ヘッダー */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold text-white">🎤 ライブバトル</h1>
              {betaBadge}
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <div className="flex items-center gap-2 text-green-400">
                    <Wifi className="w-4 h-4" />
                    <span className="text-sm">接続中</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-400">
                    <WifiOff className="w-4 h-4" />
                    <span className="text-sm">切断</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-white text-sm">
                Phase: <span className="font-semibold text-purple-300">{battlePhase}</span>
              </div>
              <Button
                onClick={handleEndBattle}
                variant="outline"
                className="border-red-500 text-red-400 hover:bg-red-500/20"
              >
                終了
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 左側: コントロールパネル */}
            <div className="space-y-6">
              {/* バトル状態 */}
              <Card className="bg-black/40 border-purple-500/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-400" />
                    バトル状態
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="text-sm text-gray-300">
                      バトルID: <span className="text-purple-300 font-mono">{battleId}</span>
                    </div>
                    <div className="text-sm text-gray-300">
                      ユーザー: <span className="text-green-300">{userName}</span>
                    </div>
                    <div className="text-sm text-gray-300">
                      テーマ: <span className="text-blue-300">{theme}</span>
                    </div>
                  </div>

                  {battlePhase === 'waiting' && (
                    <Button
                      onClick={handleStartBattle}
                      className="w-full bg-green-600 hover:bg-green-700"
                      disabled={isLoading}
                    >
                      バトル開始
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* 音声コントロール */}
              <Card className="bg-black/40 border-purple-500/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Mic className="w-5 h-5 text-red-400" />
                    音声コントロール
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Activity className="w-4 h-4 text-green-400" />
                    <span className="text-gray-300">
                      音量: {Math.round(audioStream.state.volume * 100)}%
                    </span>
                    <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-green-400 to-yellow-400"
                        style={{ width: `${audioStream.state.volume * 100}%` }}
                        transition={{ duration: 0.1 }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {!isRecording ? (
                      <Button
                        onClick={handleStartRecording}
                        className="flex-1 bg-red-600 hover:bg-red-700"
                        disabled={battlePhase !== 'active'}
                      >
                        <Mic className="w-4 h-4 mr-2" />
                        録音開始
                      </Button>
                    ) : (
                      <Button
                        onClick={handleStopRecording}
                        className="flex-1 bg-gray-600 hover:bg-gray-700"
                      >
                        <Square className="w-4 h-4 mr-2" />
                        録音停止
                      </Button>
                    )}
                  </div>

                  {audioStream.state.isRecording && (
                    <div className="text-center">
                      <div className="text-red-400 font-mono">
                        🔴 録音中 {Math.floor(audioStream.state.duration / 1000)}s
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* テキスト入力 */}
              <Card className="bg-black/40 border-purple-500/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-blue-400" />
                    テキスト入力
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="テキストでラップを入力..."
                    className="bg-black/20 border-purple-400/50 text-white placeholder-gray-400"
                    rows={3}
                  />
                  <Button
                    onClick={handleSendText}
                    disabled={!textInput.trim() || isLoading || battlePhase !== 'active'}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <MessageCircle className="w-4 h-4 mr-2" />
                    )}
                    送信
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* 中央: バトルフィード */}
            <div className="lg:col-span-2">
              <Card className="bg-black/40 border-purple-500/30 h-[600px]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Volume2 className="w-5 h-5 text-purple-400" />
                    バトルフィード
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[500px] overflow-y-auto space-y-4">
                  <AnimatePresence>
                    {liveAPI.responses.map((response, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`p-4 rounded-lg ${
                          response.type === 'rap_lyrics' 
                            ? 'bg-purple-900/30 border-l-4 border-purple-400' 
                            : 'bg-gray-900/30 border-l-4 border-gray-400'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-gray-400">
                            {new Date(response.timestamp).toLocaleTimeString()}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            response.type === 'rap_lyrics' 
                              ? 'bg-purple-600 text-white' 
                              : 'bg-gray-600 text-white'
                          }`}>
                            {response.type === 'rap_lyrics' ? 'AI ラップ' : response.type}
                          </span>
                        </div>
                        <div className="text-white whitespace-pre-wrap">
                          {response.content}
                        </div>
                        {response.metadata && (
                          <div className="text-xs text-gray-400 mt-2">
                            応答時間: {response.metadata.responseTime}ms
                          </div>
                        )}
                      </motion.div>
                    ))}

                    {liveAPI.battleEvents.map((event, index) => (
                      <motion.div
                        key={`event-${index}`}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-3 rounded-lg bg-yellow-900/20 border border-yellow-500/30"
                      >
                        <div className="flex items-center gap-2 text-yellow-300 text-sm">
                          <AlertCircle className="w-4 h-4" />
                          <span className="font-semibold">{event.type}</span>
                          <span className="text-xs text-gray-400">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {liveAPI.responses.length === 0 && liveAPI.battleEvents.length === 0 && (
                    <div className="text-center text-gray-400 py-12">
                      <Mic className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>バトルを開始してください</p>
                      <p className="text-sm">音声またはテキストで参加できます</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* エラー表示 */}
          {liveAPI.error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-900/20 border border-red-500/50 rounded-lg p-4"
            >
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="w-5 h-5" />
                <span className="font-semibold">エラー</span>
              </div>
              <p className="text-red-300 mt-1">{liveAPI.error}</p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  )
}