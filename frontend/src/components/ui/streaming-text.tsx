'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

interface StreamingTextProps {
  text: string
  speed?: number // characters per second
  className?: string
  onComplete?: () => void
  autoStart?: boolean
}

export function StreamingText({ 
  text, 
  speed = 20, 
  className = '', 
  onComplete,
  autoStart = true 
}: StreamingTextProps) {
  const [displayedText, setDisplayedText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const currentIndexRef = useRef(0)

  useEffect(() => {
    if (autoStart && text && !isComplete) {
      startStreaming()
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [text, autoStart])

  const startStreaming = () => {
    if (!text || isStreaming) return
    
    setIsStreaming(true)
    setDisplayedText('')
    currentIndexRef.current = 0
    
    const intervalTime = 1000 / speed // milliseconds per character
    
    intervalRef.current = setInterval(() => {
      const currentIndex = currentIndexRef.current
      
      if (currentIndex >= text.length) {
        setIsStreaming(false)
        setIsComplete(true)
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
        onComplete?.()
        return
      }
      
      setDisplayedText(text.slice(0, currentIndex + 1))
      currentIndexRef.current++
    }, intervalTime)
  }

  const skipToEnd = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    setDisplayedText(text)
    setIsStreaming(false)
    setIsComplete(true)
    onComplete?.()
  }

  return (
    <div className={`relative ${className}`}>
      <div className="whitespace-pre-wrap leading-relaxed">
        {displayedText}
        {isStreaming && (
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
            className="inline-block ml-1 w-2 h-5 bg-current"
          />
        )}
      </div>
      
      {/* Skip button for long texts */}
      {isStreaming && text.length > 50 && (
        <button
          onClick={skipToEnd}
          className="absolute top-0 right-0 text-xs bg-black/50 hover:bg-black/70 text-white px-2 py-1 rounded transition-colors"
        >
          スキップ
        </button>
      )}
    </div>
  )
}