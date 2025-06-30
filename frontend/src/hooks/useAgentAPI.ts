'use client'

import { useState, useCallback } from 'react'
import { 
  generateLyrics,
  checkCompliance,
  evaluateBattle,
  generateTheme,
  checkAgentHealth
} from '@/api/agent.api'
import type {
  GenerateLyricsRequest,
  GenerateLyricsResponse,
  CheckComplianceRequest,
  CheckComplianceResponse,
  EvaluateBattleRequest,
  EvaluateBattleResponse,
  GenerateThemeRequest,
  GenerateThemeResponse,
} from '@/api/agent.api'
import toast from 'react-hot-toast'

export function useAgentAPI() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateLyricsHook = useCallback(async (request: GenerateLyricsRequest) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await generateLyrics(request)
      return response
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const checkComplianceHook = useCallback(async (request: CheckComplianceRequest) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await checkCompliance(request)
      return response
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const evaluateBattleHook = useCallback(async (request: EvaluateBattleRequest) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await evaluateBattle(request)
      return response
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const generateThemeHook = useCallback(async (request?: GenerateThemeRequest) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await generateTheme(request || {})
      return response
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const checkHealth = useCallback(async () => {
    try {
      const response = await checkAgentHealth()
      return response
    } catch (err) {
      console.error('Agent health check failed:', err)
      return false
    }
  }, [])

  return {
    generateLyrics: generateLyricsHook,
    checkCompliance: checkComplianceHook,
    evaluateBattle: evaluateBattleHook,
    generateTheme: generateThemeHook,
    checkHealth,
    isLoading,
    error,
  }
}