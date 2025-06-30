'use client'

import { motion } from 'framer-motion'
import { 
  Cpu, 
  Users, 
  Shield, 
  Sparkles, 
  Headphones, 
  Globe,
  Flame,
  Radio,
  Award,
  Check,
  Clock,
  Lock,
  Zap,
  Mic,
  Trophy,
  MessageSquare,
  BarChart3,
  Settings
} from 'lucide-react'

export function Features() {
  // 実装済み機能
  const implementedFeatures = [
    {
      icon: Zap,
      title: 'AIリリック生成',
      description: 'Gemini 2.5による高速かつクリエイティブなラップ生成',
      details: ['1.5秒以内の高速生成', 'テーマに沿った韻とフロウ', '前のバースを踏まえた応酬'],
      gradient: 'from-purple-500 to-purple-600',
    },
    {
      icon: Mic,
      title: 'リアルタイム音声合成',
      description: 'Google Text-to-Speechによる自然な音声生成',
      details: ['ナチュラルなラップボイス', '自動音声再生', 'スピード調整可能'],
      gradient: 'from-pink-500 to-pink-600',
    },
    {
      icon: Trophy,
      title: 'ライブ投票システム',
      description: 'WebSocketによるリアルタイム投票と集計',
      details: ['即座に反映される投票', 'バースごとの判定', '重複投票防止'],
      gradient: 'from-blue-500 to-blue-600',
    },
    {
      icon: Shield,
      title: 'コンテンツ安全性',
      description: '不適切なコンテンツの自動フィルタリング',
      details: ['リアルタイムチェック', '自動再生成', 'ファミリーセーフ'],
      gradient: 'from-green-500 to-green-600',
    }
  ]

  // 今後実装予定の機能
  const plannedFeatures = [
    {
      icon: Users,
      title: 'みんなでサイファー',
      description: '複数人での同時バトル参加',
      status: 'Coming Soon',
      gradient: 'from-yellow-500 to-orange-500',
    },
    {
      icon: MessageSquare,
      title: 'チャット機能',
      description: '観戦者同士のリアルタイムチャット',
      status: 'Development',
      gradient: 'from-indigo-500 to-purple-500',
    },
    {
      icon: BarChart3,
      title: '詳細分析',
      description: 'バトルの統計とパフォーマンス分析',
      status: 'Planning',
      gradient: 'from-red-500 to-pink-500',
    },
    {
      icon: Settings,
      title: 'カスタマイズ',
      description: 'AIの性格やスタイルの調整',
      status: 'Planning',
      gradient: 'from-cyan-500 to-blue-500',
    }
  ]

  return (
    <section id="features" data-testid="features-section" className="min-h-screen bg-gradient-to-br from-black via-purple-950 to-gray-950 flex items-center justify-center px-4 py-16">
      <div className="container mx-auto max-w-6xl w-full">
        <div className="flex flex-col gap-16 items-center justify-center">
          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <motion.span 
              className="inline-block px-6 py-3 text-sm font-bold text-green-400 bg-green-400/10 rounded-full border border-green-400/30 mb-8"
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              transition={{ duration: 0.5, type: "spring" }}
              viewport={{ once: true }}
            >
              ✅ 実装済み機能
            </motion.span>
            
            <h2 className="text-5xl md:text-6xl font-black mb-6 text-white tracking-tight" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
              機能一覧
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              現在利用可能な機能をご紹介。
              <span className="text-purple-400 block mt-2">すべて実際に動作します。</span>
            </p>
          </motion.div>

          {/* Implemented features - 2カラムグリッドレイアウト */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
            {implementedFeatures.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group relative"
              >
                <div className="bg-black/60 rounded-3xl p-8 h-full border border-white/10 hover:border-purple-500/50 transition-all duration-300 shadow-xl">
                  {/* Background gradient on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300 rounded-3xl`} />
                  
                  {/* Status badge */}
                  <div className="absolute top-6 right-6">
                    <span className="inline-flex items-center gap-2 px-3 py-1 text-xs font-bold text-green-400 bg-green-400/10 rounded-full border border-green-400/30">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      稼働中
                    </span>
                  </div>

                  {/* Header */}
                  <div className="relative flex items-start gap-6 mb-6">
                    <div className={`flex-shrink-0 w-20 h-20 rounded-2xl bg-gradient-to-br ${feature.gradient} p-0.5 shadow-lg`}>
                      <div className="w-full h-full bg-black rounded-2xl flex items-center justify-center">
                        <feature.icon className="w-10 h-10 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-white mb-2">{feature.title}</h3>
                      <p className="text-gray-400 leading-relaxed">{feature.description}</p>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="relative space-y-4">
                    {feature.details.map((detail, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                        <span className="text-gray-300 font-medium">{detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Planned features section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mt-16"
          >
            <motion.span 
              className="inline-block px-6 py-3 text-sm font-bold text-yellow-400 bg-yellow-400/10 rounded-full border border-yellow-400/30 mb-8"
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              transition={{ duration: 0.5, type: "spring" }}
              viewport={{ once: true }}
            >
              🚀 今後の実装予定
            </motion.span>
            
            <h3 className="text-4xl md:text-5xl font-black mb-6 text-white tracking-tight">
              もっと楽しくなる機能
            </h3>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
              開発中・計画中の新機能
            </p>
          </motion.div>

          {/* Planned features - 2カラムグリッドレイアウト */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
            {plannedFeatures.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group relative"
              >
                <div className="bg-black/40 rounded-3xl p-8 h-full border border-white/10 hover:border-yellow-500/50 transition-all duration-300 shadow-xl">
                  {/* Background gradient on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300 rounded-3xl`} />
                  
                  {/* Status badge */}
                  <div className="absolute top-6 right-6">
                    <span className="inline-flex items-center gap-2 px-3 py-1 text-xs font-bold text-yellow-400 bg-yellow-400/10 rounded-full border border-yellow-400/30">
                      <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                      {feature.status}
                    </span>
                  </div>

                  {/* Header */}
                  <div className="relative flex items-start gap-6 mb-6">
                    <div className={`flex-shrink-0 w-20 h-20 rounded-2xl bg-gradient-to-br ${feature.gradient} p-0.5 shadow-lg`}>
                      <div className="w-full h-full bg-black rounded-2xl flex items-center justify-center">
                        <feature.icon className="w-10 h-10 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-white mb-2">{feature.title}</h3>
                      <p className="text-gray-400 leading-relaxed">{feature.description}</p>
                    </div>
                  </div>

                  {/* Coming soon message */}
                  <div className="relative">
                    <div className="flex items-center gap-3 text-gray-400">
                      <Sparkles className="w-5 h-5 text-yellow-400" />
                      <span className="font-medium">開発チームが鋭意制作中...</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Bottom CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mt-16 w-full"
          >
            <div className="bg-black/60 rounded-3xl p-12 max-w-4xl mx-auto border border-purple-500/30 shadow-2xl">
              <h4 className="text-3xl md:text-4xl font-bold text-white mb-6 tracking-tight">
                AIラップバトルの革命を
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 block mt-2">
                  今すぐ体験しよう
                </span>
              </h4>
              <p className="text-gray-300 text-lg leading-relaxed max-w-2xl mx-auto">
                最新のAI技術が創り出すエンターテイメントの未来をあなたの手で
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}