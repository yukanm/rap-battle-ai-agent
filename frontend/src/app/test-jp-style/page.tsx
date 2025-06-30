'use client'

import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

export default function TestJPStyle() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-black flex items-center justify-center px-4 py-8">
      <div className="container mx-auto max-w-5xl w-full">
        <div className="space-y-12">
          {/* Original graffiti style for English */}
          <div className="text-center">
            <h2 className="text-3xl text-white mb-4">Original Graffiti Style (English)</h2>
            <h1 className="text-6xl md:text-8xl font-black">
              <span className="block graffiti-text mb-4">AI AGENT</span>
              <span className="block graffiti-outline -mt-8">MC BATTLE</span>
            </h1>
          </div>

          {/* New Japanese battle style */}
          <div className="text-center">
            <h2 className="text-3xl text-white mb-4">New Japanese Battle Style</h2>
            <div className="mc-battle-title-jp mx-auto inline-block">
              <span className="main-text" data-text="戦極">
                戦極
              </span>
              <span className="sub-text">MC BATTLE</span>
            </div>
          </div>

          {/* Battle text JP style */}
          <div className="text-center">
            <h2 className="text-3xl text-white mb-4">Battle Text JP Style</h2>
            <p className="battle-text-jp text-5xl md:text-6xl">バトルモード選択</p>
            <p className="battle-text-jp text-5xl md:text-6xl mt-4">準備はいいか？</p>
          </div>

          {/* Hip hop style text */}
          <div className="text-center">
            <h2 className="text-3xl text-white mb-4">Hip Hop Style</h2>
            <p className="text-xl text-gray-100 font-bold">
              <span className="inline-block text-2xl mb-2" style={{ letterSpacing: '0.3em' }}>最先端AIが繰り広げる</span>
              <br />
              <span className="inline-block text-3xl battle-text-jp">韻とフロウの激突</span>
            </p>
          </div>

          {/* Navigation */}
          <div className="flex justify-center gap-4">
            <Button
              onClick={() => window.location.href = '/'}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}