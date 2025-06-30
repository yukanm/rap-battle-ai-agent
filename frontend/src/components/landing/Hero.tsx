'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Mic, Zap, Trophy, Play, Volume2, Sparkles, ChevronDown, ArrowRight } from 'lucide-react'
import { useEffect, useState } from 'react'

interface HeroProps {
  onStartBattle: () => void
}

export function Hero({ onStartBattle }: HeroProps) {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  const scrollToFeatures = () => {
    if (typeof window !== 'undefined') {
      document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section 
      className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-black flex items-center justify-center px-4 py-8"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #030712 0%, #581c87 50%, #000000 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem'
      }}
    >
      <div 
        className="container mx-auto max-w-3xl w-full flex flex-col items-center gap-12"
        style={{
          maxWidth: '48rem',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3rem',
          margin: '0 auto'
        }}
      >
        <div className="bg-black/90 rounded-3xl p-10 shadow-2xl border-4 border-purple-500 w-full flex flex-col items-center relative overflow-hidden">
          {/* Graffiti-style background decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-600/20 rounded-full blur-3xl"></div>
          <span className="inline-block px-6 py-2 text-sm font-bold text-yellow-400 bg-black/50 rounded-full border-2 border-yellow-400 mb-6 shadow-lg transform -rotate-1">
            🔥 POWERED BY Gemini 🔥
          </span>
          <h1 className="mb-6 text-center">
            <div className="mc-battle-title-jp">
              <span className="main-text" data-text="双韻">
                双韻
              </span>
              <span className="sub-text">MC BATTLE</span>
            </div>
            <div className="text-2xl md:text-3xl font-black text-white mt-4 tracking-wider">
              <span className="text-purple-400">AI</span> × <span className="text-pink-400">AGENT</span>
            </div>
          </h1>
          <p className="text-xl text-gray-100 mb-8 text-center font-bold leading-relaxed">
            <span className="inline-block text-2xl mb-2" style={{ letterSpacing: '0.3em' }}>最先端AIが繰り広げる</span>
            <br />
            <span className="inline-block text-3xl battle-text-jp">韻とフロウの激突</span>
          </p>
          <Button
            size="lg"
            onClick={onStartBattle}
            className="relative group bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-6 px-12 rounded-2xl shadow-xl transform hover:scale-105 transition-all duration-300 text-lg mb-8"
          >
            <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300" />
            <span className="relative z-10 flex items-center gap-3">
              バトルモードへ
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </span>
          </Button>
          <div className="w-full flex flex-col gap-4 mt-4">
            <div className="flex items-center gap-3">
              <span className="text-purple-400 text-xl">⚡</span>
              <span className="text-white font-semibold">1.5秒以内に韻を生成</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-pink-400 text-xl">🎤</span>
              <span className="text-white font-semibold">自然な音声フロウで再生</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-blue-400 text-xl">🗳️</span>
              <span className="text-white font-semibold">観客投票・リアルタイム判定</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-green-400 text-xl">🤖</span>
              <span className="text-white font-semibold">AIエージェント自動生成・評価</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}