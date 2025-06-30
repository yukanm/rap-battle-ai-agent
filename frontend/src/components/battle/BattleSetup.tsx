'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Mic, Zap, Music, Users } from 'lucide-react'

interface BattleSetupProps {
  onStartBattle: (theme: string, format: '3verses-3rounds' | '3verses-1round') => void
  isLoading?: boolean
}

export function BattleSetup({ onStartBattle, isLoading }: BattleSetupProps) {
  const [theme, setTheme] = useState('')
  const [format, setFormat] = useState<'3verses-3rounds' | '3verses-1round'>('3verses-1round')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const themeSuggestions = [
    'AI vs 人間の創造性',
    'SNSの影響力',
    '働き方の未来',
    '壁を越えて',
    '東京の夜',
    '言葉の力',
    'フリースタイル',
    'テスト勉強 一夜漬け',
    'コンビニの深夜',
    '満員電車の朝'
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (theme.trim()) {
      onStartBattle(theme.trim(), format)
    }
  }

  const selectTheme = (suggestion: string) => {
    setTheme(suggestion)
    setShowSuggestions(false)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-8 shadow-2xl border border-purple-500/20">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            MCバトルセットアップ
          </h2>
          <p className="text-gray-400">
            テーマとバトル形式を選んで、AIエージェントの激闘を開始しよう
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* バトル形式選択 */}
          <div className="space-y-3">
            <Label className="text-white text-lg font-semibold flex items-center gap-2">
              <Music className="w-5 h-5 text-purple-400" />
              バトル形式
            </Label>
            <RadioGroup value={format} onValueChange={(value) => setFormat(value as any)}>
              <div className="space-y-3">
                <label className="flex items-center space-x-3 bg-gray-800/50 p-4 rounded-lg border border-gray-700 hover:border-purple-500/50 transition-colors cursor-pointer">
                  <RadioGroupItem value="3verses-1round" id="3verses-1round" />
                  <div className="flex-1">
                    <div className="font-semibold text-white">8小節 × 3バース</div>
                    <div className="text-sm text-gray-400">スピード重視の短期決戦（8小節 x 3本）</div>
                  </div>
                  <Zap className="w-5 h-5 text-yellow-400" />
                </label>
                <label className="flex items-center space-x-3 bg-gray-800/50 p-4 rounded-lg border border-gray-700 hover:border-purple-500/50 transition-colors cursor-pointer">
                  <RadioGroupItem value="3verses-3rounds" id="3verses-3rounds" />
                  <div className="flex-1">
                    <div className="font-semibold text-white">16小節 × 3バース</div>
                    <div className="text-sm text-gray-400">じっくり展開する本格バトル（16小節 x 2本）</div>
                  </div>
                  <Users className="w-5 h-5 text-blue-400" />
                </label>
              </div>
            </RadioGroup>
          </div>

          {/* テーマ入力 */}
          <div className="space-y-3">
            <Label htmlFor="theme" className="text-white text-lg font-semibold flex items-center gap-2">
              <Mic className="w-5 h-5 text-purple-400" />
              バトルテーマ
            </Label>
            <div className="relative">
              <Input
                id="theme"
                type="text"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                placeholder="例: AI vs 人間の創造性"
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-purple-500 focus:ring-purple-500"
                required
              />
              
              {/* テーマ候補 */}
              {showSuggestions && (
                <div className="absolute top-full mt-2 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10 max-h-60 overflow-y-auto">
                  <div className="p-2">
                    <div className="text-xs text-gray-500 px-2 py-1">人気のテーマ</div>
                    {themeSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => selectTheme(suggestion)}
                        className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-purple-600/20 hover:text-white rounded transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500">
              AIエージェントがこのテーマでラップバトルを繰り広げます
            </p>
          </div>

          {/* 開始ボタン */}
          <Button
            type="submit"
            size="lg"
            disabled={!theme.trim() || isLoading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-4 text-lg shadow-lg transform hover:scale-[1.02] transition-all duration-200"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3" />
                準備中...
              </>
            ) : (
              <>
                <Mic className="mr-2 h-5 w-5" />
                バトル開始！
              </>
            )}
          </Button>
        </form>

        {/* 形式の説明 */}
        <div className="mt-8 p-4 bg-purple-900/20 rounded-lg border border-purple-500/30">
          <h3 className="text-sm font-semibold text-purple-400 mb-2">MCバトルのルール</h3>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• 各MCが3バースずつ、1バース交代で披露（先行→後攻の順）</li>
            <li>• 韻（ライム）、フロウ、アンサー、パンチラインが評価基準</li>
            <li>• 相手のリリックに対するアンサー（返し）が重要</li>
            <li>• 観客投票と審査員評価で勝敗を決定</li>
          </ul>
        </div>
      </div>
    </div>
  )
}