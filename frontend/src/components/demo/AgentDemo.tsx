'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAgentAPI } from '@/hooks/useAgentAPI'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Mic, 
  Shield, 
  Trophy, 
  Wand2, 
  Brain,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Sparkles
} from 'lucide-react'
import toast from 'react-hot-toast'

export function AgentDemo() {
  const { 
    generateLyrics, 
    checkCompliance, 
    evaluateBattle, 
    generateTheme,
    checkHealth,
    isLoading 
  } = useAgentAPI()

  // Generate Lyrics State
  const [lyricsTheme, setLyricsTheme] = useState('')
  const [rapperStyle, setRapperStyle] = useState('')
  const [generatedLyrics, setGeneratedLyrics] = useState<any>(null)

  // Check Compliance State
  const [contentToCheck, setContentToCheck] = useState('')
  const [complianceResult, setComplianceResult] = useState<any>(null)

  // Evaluate Battle State
  const [rapper1Lyrics, setRapper1Lyrics] = useState('')
  const [rapper2Lyrics, setRapper2Lyrics] = useState('')
  const [battleResult, setBattleResult] = useState<any>(null)

  // Generate Theme State
  const [themeCategories, setThemeCategories] = useState('')
  const [generatedTheme, setGeneratedTheme] = useState<any>(null)

  // Health Check State
  const [healthStatus, setHealthStatus] = useState<boolean | null>(null)

  const handleGenerateLyrics = async () => {
    if (!lyricsTheme || !rapperStyle) {
      toast.error('テーマとスタイルを入力してください')
      return
    }

    try {
      const result = await generateLyrics({
        theme: lyricsTheme,
        rapperStyle,
        userName: 'Demo User'
      })
      setGeneratedLyrics(result)
      toast.success('リリックが生成されました！')
    } catch (error) {
      console.error('Error generating lyrics:', error)
    }
  }

  const handleCheckCompliance = async () => {
    if (!contentToCheck) {
      toast.error('チェックするコンテンツを入力してください')
      return
    }

    try {
      const result = await checkCompliance({ content: contentToCheck })
      setComplianceResult(result)
      toast.success('コンプライアンスチェック完了！')
    } catch (error) {
      console.error('Error checking compliance:', error)
    }
  }

  const handleEvaluateBattle = async () => {
    if (!rapper1Lyrics || !rapper2Lyrics) {
      toast.error('両方のラッパーのリリックを入力してください')
      return
    }

    try {
      const result = await evaluateBattle({
        battleId: 'demo-battle',
        rapper1Lyrics: rapper1Lyrics.split('\n').filter(l => l.trim()),
        rapper2Lyrics: rapper2Lyrics.split('\n').filter(l => l.trim())
      })
      setBattleResult(result)
      toast.success('バトル評価完了！')
    } catch (error) {
      console.error('Error evaluating battle:', error)
    }
  }

  const handleGenerateTheme = async () => {
    try {
      const categories = themeCategories 
        ? themeCategories.split(',').map(c => c.trim()).filter(c => c)
        : undefined
      
      const result = await generateTheme(categories ? { categories } : undefined)
      setGeneratedTheme(result)
      toast.success('テーマが生成されました！')
    } catch (error) {
      console.error('Error generating theme:', error)
    }
  }

  const handleHealthCheck = async () => {
    const isHealthy = await checkHealth()
    setHealthStatus(isHealthy)
    toast[isHealthy ? 'success' : 'error'](
      isHealthy ? 'エージェントは正常に動作しています' : 'エージェントに問題があります'
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-black flex items-center justify-center px-4 py-8">
      <div className="container mx-auto max-w-6xl w-full">
        <div className="flex flex-col gap-12 items-center justify-center">
          <div className="text-center">
            <motion.h1 
              className="text-5xl md:text-6xl font-black mb-6 text-white tracking-tight flex items-center justify-center gap-4"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 120 }}
              style={{ textShadow: '0 4px 20px rgba(147, 51, 234, 0.3)' }}
            >
              <Brain className="w-14 h-14 text-purple-400 drop-shadow-2xl" />
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">日本語ラップ AI</span>
            </motion.h1>
            <motion.p 
              className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              AI エージェントが日本語でラップリリックを生成、バトルを評価、コンプライアンスをチェックします
            </motion.p>
          </div>

          {/* Health Check */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="w-full max-w-4xl"
          >
            <Card className="bg-black/60 border-purple-500/30 hover:border-purple-400/50 transition-all duration-300 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-white">
                  <Shield className="w-6 h-6 text-green-400" />
                  <span className="text-2xl font-bold">ヘルスチェック</span>
                </CardTitle>
                <CardDescription className="text-gray-300 text-base">
                  エージェントサービスの接続状態を確認
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
                  <Button 
                    onClick={handleHealthCheck} 
                    disabled={isLoading}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <Shield className="w-5 h-5 mr-2" />
                    )}
                    ステータス確認
                  </Button>
                  {healthStatus !== null && (
                    <motion.div 
                      className="flex items-center gap-4 px-6 py-3 rounded-xl bg-black/40 border border-white/10"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 150 }}
                    >
                      {healthStatus ? (
                        <>
                          <CheckCircle className="w-6 h-6 text-green-400" />
                          <span className="text-green-400 font-semibold text-lg">正常動作中</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-6 h-6 text-red-400" />
                          <span className="text-red-400 font-semibold text-lg">接続エラー</span>
                        </>
                      )}
                    </motion.div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Main Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="w-full max-w-6xl"
          >
            <Tabs defaultValue="lyrics" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-black/60 p-3 rounded-xl border border-purple-500/30 gap-3 shadow-xl">
                <TabsTrigger value="lyrics" className="flex items-center gap-2">
                  <Mic className="w-4 h-4" />
                  リリック生成
                </TabsTrigger>
                <TabsTrigger value="compliance" className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  コンプライアンス
                </TabsTrigger>
                <TabsTrigger value="battle" className="flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  バトル評価
                </TabsTrigger>
                <TabsTrigger value="theme" className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  テーマ生成
                </TabsTrigger>
              </TabsList>

              {/* Generate Lyrics Tab */}
              <TabsContent value="lyrics">
                <Card className="battle-card bg-black/40 border-purple-500/30 hover:border-purple-400/50 transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-white">
                      <Mic className="w-6 h-6 text-purple-400" />
                      <span className="text-2xl font-bold">日本語ラップ生成</span>
                    </CardTitle>
                    <CardDescription className="text-gray-300 text-base">
                      AI がテーマとスタイルに基づいて日本語のラップリリックを生成します
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8 pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <Label htmlFor="lyrics-theme" className="text-white font-semibold mb-3 block">
                          バトルテーマ
                        </Label>
                        <Input
                          id="lyrics-theme"
                          value={lyricsTheme}
                          onChange={(e) => setLyricsTheme(e.target.value)}
                          placeholder="例: 夢への挑戦、東京の夜、友情の絆"
                          className="bg-black/20 border-purple-400/50 text-white placeholder-gray-400 focus:border-purple-300 focus:ring-purple-300/50"
                        />
                      </div>
                      <div>
                        <Label htmlFor="rapper-style" className="text-white font-semibold mb-3 block">
                          ラップスタイル
                        </Label>
                        <Input
                          id="rapper-style"
                          value={rapperStyle}
                          onChange={(e) => setRapperStyle(e.target.value)}
                          placeholder="例: 感情的で力強いスタイル、クールで技巧的"
                          className="bg-black/20 border-purple-400/50 text-white placeholder-gray-400 focus:border-purple-300 focus:ring-purple-300/50"
                        />
                      </div>
                    </div>
                    
                    <Button 
                      onClick={handleGenerateLyrics} 
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-5 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] mt-4"
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                      ) : (
                        <Mic className="w-5 h-5 mr-3" />
                      )}
                      <span className="text-lg">日本語ラップを生成</span>
                    </Button>
                    
                    {generatedLyrics && (
                      <motion.div 
                        className="mt-6 p-6 bg-gradient-to-br from-black/60 to-purple-900/30 rounded-xl border border-purple-400/30"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <h4 className="text-xl font-bold mb-4 text-purple-300 flex items-center gap-2">
                          <Mic className="w-5 h-5" />
                          生成されたリリック
                        </h4>
                        <div className="bg-black/40 p-4 rounded-lg border-l-4 border-purple-400">
                          <pre className="whitespace-pre-line text-white text-lg font-medium leading-relaxed">
                            {generatedLyrics.lyrics}
                          </pre>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-4 text-sm">
                          <div className="bg-purple-600/20 px-3 py-1 rounded-full">
                            <span className="text-purple-300">生成時間: {generatedLyrics.metadata.generationTime}ms</span>
                          </div>
                          <div className="bg-purple-600/20 px-3 py-1 rounded-full">
                            <span className="text-purple-300">モデル: {generatedLyrics.metadata.model}</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Check Compliance Tab */}
              <TabsContent value="compliance">
                <Card className="battle-card bg-black/40 border-green-500/30 hover:border-green-400/50 transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-white">
                      <Shield className="w-6 h-6 text-green-400" />
                      <span className="text-2xl font-bold">コンプライアンスチェック</span>
                    </CardTitle>
                    <CardDescription className="text-gray-300 text-base">
                      コンテンツの安全性と適切性を AI が自動的にチェックします
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8 pt-6">
                    <div>
                      <Label htmlFor="content-check" className="text-white font-semibold mb-2 block">
                        チェック対象のコンテンツ
                      </Label>
                      <Textarea
                        id="content-check"
                        value={contentToCheck}
                        onChange={(e) => setContentToCheck(e.target.value)}
                        placeholder="チェックしたい日本語テキストを入力してください..."
                        rows={6}
                        className="bg-black/20 border-green-400/50 text-white placeholder-gray-400 focus:border-green-300 focus:ring-green-300/50 resize-none"
                      />
                    </div>
                    
                    <Button 
                      onClick={handleCheckCompliance} 
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                      ) : (
                        <Shield className="w-5 h-5 mr-3" />
                      )}
                      <span className="text-lg">コンプライアンスチェック実行</span>
                    </Button>
                    
                    {complianceResult && (
                      <motion.div 
                        className="mt-6 p-6 bg-gradient-to-br from-black/60 to-green-900/30 rounded-xl border border-green-400/30"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <div className="flex items-center gap-3 mb-4">
                          {complianceResult.isCompliant ? (
                            <>
                              <CheckCircle className="w-7 h-7 text-green-400" />
                              <span className="text-2xl font-bold text-green-400">適切なコンテンツ</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-7 h-7 text-orange-400" />
                              <span className="text-2xl font-bold text-orange-400">要注意コンテンツ</span>
                            </>
                          )}
                        </div>
                        
                        <div className="bg-black/40 p-4 rounded-lg mb-4">
                          <div className="text-white text-lg">
                            <span className="font-semibold">安全性スコア: </span>
                            <span className={`text-2xl font-bold ${complianceResult.score >= 80 ? 'text-green-400' : complianceResult.score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                              {complianceResult.score}/100
                            </span>
                          </div>
                        </div>
                        
                        {complianceResult.violations && complianceResult.violations.length > 0 && (
                          <div className="bg-orange-900/20 p-4 rounded-lg border border-orange-400/30">
                            <p className="font-semibold text-orange-300 mb-2 flex items-center gap-2">
                              <AlertCircle className="w-5 h-5" />
                              検出された問題:
                            </p>
                            <ul className="list-disc list-inside text-orange-200 space-y-1">
                              {complianceResult.violations.map((v: string, i: number) => (
                                <li key={i}>{v}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Evaluate Battle Tab */}
              <TabsContent value="battle">
                <Card className="battle-card bg-black/40 border-yellow-500/30 hover:border-yellow-400/50 transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-white">
                      <Trophy className="w-6 h-6 text-yellow-400" />
                      <span className="text-2xl font-bold">ラップバトル評価</span>
                    </CardTitle>
                    <CardDescription className="text-gray-300 text-base">
                      2人のラッパーの日本語パフォーマンスを AI が公正に評価します
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8 pt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="rapper1" className="text-white font-semibold mb-2 block flex items-center gap-2">
                          <span className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">1</span>
                          ラッパー1のリリック
                        </Label>
                        <Textarea
                          id="rapper1"
                          value={rapper1Lyrics}
                          onChange={(e) => setRapper1Lyrics(e.target.value)}
                          placeholder="1人目のラッパーの日本語リリックを入力..."
                          rows={8}
                          className="bg-black/20 border-blue-400/50 text-white placeholder-gray-400 focus:border-blue-300 focus:ring-blue-300/50 resize-none"
                        />
                      </div>
                      <div>
                        <Label htmlFor="rapper2" className="text-white font-semibold mb-2 block flex items-center gap-2">
                          <span className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-bold">2</span>
                          ラッパー2のリリック
                        </Label>
                        <Textarea
                          id="rapper2"
                          value={rapper2Lyrics}
                          onChange={(e) => setRapper2Lyrics(e.target.value)}
                          placeholder="2人目のラッパーの日本語リリックを入力..."
                          rows={8}
                          className="bg-black/20 border-red-400/50 text-white placeholder-gray-400 focus:border-red-300 focus:ring-red-300/50 resize-none"
                        />
                      </div>
                    </div>
                    
                    <Button 
                      onClick={handleEvaluateBattle} 
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-bold py-4 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                      ) : (
                        <Trophy className="w-5 h-5 mr-3" />
                      )}
                      <span className="text-lg">バトル評価を開始</span>
                    </Button>
                    
                    {battleResult && (
                      <motion.div 
                        className="mt-6 p-6 bg-gradient-to-br from-black/60 to-yellow-900/30 rounded-xl border border-yellow-400/30"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <h4 className="text-xl font-bold mb-4 text-yellow-300 flex items-center gap-2">
                          <Trophy className="w-6 h-6" />
                          バトル評価結果
                        </h4>
                        
                        <div className="bg-black/40 p-6 rounded-lg mb-4">
                          <div className="flex items-center justify-center gap-4 mb-4">
                            <Trophy className="w-8 h-8 text-yellow-400" />
                            <span className="text-3xl font-bold text-yellow-400">
                              勝者: {battleResult.winner === 'rapper1' ? 'ラッパー1' : 
                                    battleResult.winner === 'rapper2' ? 'ラッパー2' : '引き分け'}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center text-white text-xl">
                            <div className="text-center">
                              <div className="font-bold text-blue-400">ラッパー1</div>
                              <div className="text-2xl">{battleResult.scores.rapper1}点</div>
                            </div>
                            <div className="text-4xl text-gray-400">VS</div>
                            <div className="text-center">
                              <div className="font-bold text-red-400">ラッパー2</div>
                              <div className="text-2xl">{battleResult.scores.rapper2}点</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-yellow-900/20 p-4 rounded-lg border border-yellow-400/30">
                          <p className="text-yellow-100 text-lg leading-relaxed">{battleResult.summary}</p>
                        </div>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Generate Theme Tab */}
              <TabsContent value="theme">
                <Card className="battle-card bg-black/40 border-blue-500/30 hover:border-blue-400/50 transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-white">
                      <Wand2 className="w-6 h-6 text-blue-400" />
                      <span className="text-2xl font-bold">日本語バトルテーマ生成</span>
                    </CardTitle>
                    <CardDescription className="text-gray-300 text-base">
                      AI が日本の文化に根ざした創造的なバトルテーマを生成します
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8 pt-6">
                    <div>
                      <Label htmlFor="categories" className="text-white font-semibold mb-2 block">
                        カテゴリー（カンマ区切り、オプション）
                      </Label>
                      <Input
                        id="categories"
                        value={themeCategories}
                        onChange={(e) => setThemeCategories(e.target.value)}
                        placeholder="例: 日本の四季, 東京文化, 夢と現実, サムライ精神"
                        className="bg-black/20 border-blue-400/50 text-white placeholder-gray-400 focus:border-blue-300 focus:ring-blue-300/50"
                      />
                    </div>
                    
                    <Button 
                      onClick={handleGenerateTheme} 
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold py-4 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                      ) : (
                        <Wand2 className="w-5 h-5 mr-3" />
                      )}
                      <span className="text-lg">日本語テーマを生成</span>
                    </Button>
                    
                    {generatedTheme && (
                      <motion.div 
                        className="mt-6 p-6 bg-gradient-to-br from-black/60 to-blue-900/30 rounded-xl border border-blue-400/30"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <h4 className="text-xl font-bold mb-4 text-blue-300 flex items-center gap-2">
                          <Wand2 className="w-6 h-6" />
                          生成されたバトルテーマ
                        </h4>
                        
                        <div className="bg-black/40 p-6 rounded-lg mb-4">
                          <h5 className="text-3xl font-bold text-blue-400 mb-3 text-center">
                            {generatedTheme.theme}
                          </h5>
                          <p className="text-white text-lg leading-relaxed text-center">
                            {generatedTheme.description}
                          </p>
                        </div>
                        
                        <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-400/30">
                          <span className="font-semibold text-blue-300 block mb-2">関連キーワード:</span>
                          <div className="flex flex-wrap gap-2">
                            {generatedTheme.keywords.map((keyword: string, index: number) => (
                              <span 
                                key={index}
                                className="bg-blue-600/30 text-blue-200 px-3 py-1 rounded-full text-sm font-medium"
                              >
                                {keyword}
                              </span>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </div>
    </div>
  )
}