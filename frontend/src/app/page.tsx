'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { BattleSelector } from '@/components/battle/BattleSelector'
import { Hero } from '@/components/landing/Hero'
import { Features } from '@/components/landing/Features'
import { Button } from '@/components/ui/button'
import { ArrowRight, Mic, Sparkles } from 'lucide-react'

export default function HomePage() {
  const [showBattle, setShowBattle] = useState(false)

  if (showBattle) {
    return <BattleSelector onExit={() => setShowBattle(false)} />
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-black">
      <div className="relative overflow-hidden">
        {/* Hero Section */}
        <Hero onStartBattle={() => setShowBattle(true)} />
        
        {/* Features Section */}
        <Features />
        
        {/* CTA Section */}
        <section className="min-h-screen bg-gradient-to-br from-black via-purple-950 to-gray-950 flex items-center justify-center px-4 py-16">
          <div className="container mx-auto max-w-5xl w-full">
            <div className="flex flex-col gap-16 items-center justify-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <h2 className="text-5xl md:text-6xl font-black text-white mb-6 tracking-tight">
                  <span className="battle-text-jp text-5xl md:text-6xl">準備はいいか？</span>
                </h2>
                <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed mb-8">
                  AIラッパーに挑戦し、エンターテイメントの未来を体験せよ
                  <span className="block mt-3 text-purple-400">
                    アンダーグラウンドからの招待状
                  </span>
                </p>
                <Button
                  size="lg"
                  onClick={() => setShowBattle(true)}
                  className="relative group bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-6 px-12 rounded-2xl shadow-xl transform hover:scale-105 transition-all duration-300 text-lg"
                >
                  <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300" />
                  <span className="relative z-10 flex items-center gap-3">
                    <Mic className="w-5 h-5" />
                    アリーナに入る
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Button>
              </motion.div>

              {/* 装飾的なカード */}
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                viewport={{ once: true }}
                className="w-full max-w-md"
              >
                <div className="bg-black/60 rounded-3xl p-8 border border-purple-500/30 hover:border-purple-400/50 transition-all duration-300 shadow-xl">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 mb-6 shadow-lg">
                      <span className="text-3xl">🎤</span>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-4">
                      今すぐ参戦
                    </h3>
                    <p className="text-gray-400 mb-6 leading-relaxed">
                      リアルタイムAIバトルが<br />あなたを待っている
                    </p>
                    <div className="flex justify-center space-x-4">
                      <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                      <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                      <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* 統計情報 */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                viewport={{ once: true }}
                className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl"
              >
                <div className="text-center bg-black/40 rounded-2xl p-6 border border-white/10">
                  <div className="text-4xl font-black text-purple-400 mb-2">1.5秒</div>
                  <div className="text-gray-300 font-medium">応答速度</div>
                </div>
                <div className="text-center bg-black/40 rounded-2xl p-6 border border-white/10">
                  <div className="text-4xl font-black text-pink-400 mb-2">24/7</div>
                  <div className="text-gray-300 font-medium">稼働時間</div>
                </div>
                <div className="text-center bg-black/40 rounded-2xl p-6 border border-white/10">
                  <div className="text-4xl font-black text-blue-400 mb-2">∞</div>
                  <div className="text-gray-300 font-medium">可能性</div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}