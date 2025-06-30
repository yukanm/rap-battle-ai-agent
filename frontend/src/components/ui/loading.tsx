import React from 'react'
import { motion } from 'framer-motion'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: string
  text?: string
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  color = 'white',
  text 
}) => {
  const sizes = {
    sm: 16,
    md: 24,
    lg: 32
  }
  
  const spinnerSize = sizes[size]
  
  return (
    <div className="flex flex-col items-center justify-center">
      <motion.svg
        width={spinnerSize}
        height={spinnerSize}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke={color}
          strokeWidth="2"
          fill="none"
          strokeDasharray="40 20"
        />
      </motion.svg>
      {text && <p className="mt-2 text-sm text-gray-400">{text}</p>}
    </div>
  )
}

interface PulsingDotsProps {
  color?: string
}

export const PulsingDots: React.FC<PulsingDotsProps> = ({ color = 'white' }) => {
  return (
    <div className="flex space-x-2">
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className={`w-3 h-3 rounded-full bg-${color}`}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: index * 0.2,
          }}
        />
      ))}
    </div>
  )
}

interface BattleLoadingProps {
  stage: 'connecting' | 'starting' | 'generating' | 'audio'
}

export const BattleLoading: React.FC<BattleLoadingProps> = ({ stage }) => {
  const messages = {
    connecting: 'サーバーに接続中...',
    starting: 'バトルを開始しています...',
    generating: 'リリックを生成中...',
    audio: '音声を準備中...'
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center p-8"
    >
      <div className="relative">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur-xl opacity-50"
          animate={{
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
        />
        <div className="relative bg-gray-900 rounded-full p-6">
          <LoadingSpinner size="lg" />
        </div>
      </div>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-6 text-lg font-medium text-white"
      >
        {messages[stage]}
      </motion.p>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-3"
      >
        <PulsingDots />
      </motion.div>
    </motion.div>
  )
}