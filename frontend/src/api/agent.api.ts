/**
 * Agent API Client
 * Provides functions to interact with the AI Agent service endpoints
 */

import toast from 'react-hot-toast'
import { ViolationInfo } from '@/types'

// Base configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8456'
const AGENT_API_PATH = '/api/agent'

// Request/Response Types
export interface GenerateLyricsRequest {
  theme: string
  rapperStyle: string
  userName?: string
}

export interface GenerateLyricsResponse {
  lyrics: string
  metadata: {
    id: string
    generatedAt: string
    complianceScore: number
    generationTime: number
  }
}

export interface CheckComplianceRequest {
  content: string
}

export interface CheckComplianceResponse {
  isCompliant: boolean
  score: number
  violations?: ViolationInfo[]
  suggestions?: string[]
  totalPenalty?: number
}

export interface EvaluateBattleRequest {
  battleId: string
  rapper1Lyrics: string[]
  rapper2Lyrics: string[]
  audience?: string[]
}

export interface EvaluateBattleResponse {
  winner: 'rapper1' | 'rapper2' | 'tie'
  scores: {
    rapper1: number
    rapper2: number
  }
  analysis: {
    rapper1: {
      strengths: string[]
      weaknesses: string[]
      overallScore: number
    }
    rapper2: {
      strengths: string[]
      weaknesses: string[]
      overallScore: number
    }
  }
  judgeCommentary?: string
}

export interface GenerateThemeRequest {
  categories?: string[]
}

export interface GenerateThemeResponse {
  theme: string
  description: string
  keywords: string[]
}

export interface ExecuteTaskRequest {
  task: string
  parameters?: Record<string, any>
}

export interface ExecuteTaskResponse {
  result: string
  metadata?: Record<string, any>
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  errors?: Array<{ msg: string; path: string; type: string; location: string }>
}

// Error handling helper
class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Generic fetch wrapper with error handling
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${AGENT_API_PATH}${endpoint}`
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    const data: ApiResponse<T> = await response.json()

    if (!response.ok || !data.success) {
      // Handle validation errors (errors array) or general errors (error string)
      const errorMessage = data.error || 
        (data.errors && data.errors.length > 0 ? data.errors[0].msg : 'An error occurred')
      
      throw new ApiError(
        errorMessage,
        response.status,
        response.statusText
      )
    }

    return data.data as T
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ApiError('Network error: Unable to connect to server', 0, 'NETWORK_ERROR')
    }
    
    throw new ApiError('An unexpected error occurred', 500, 'UNKNOWN_ERROR')
  }
}

// API Functions

/**
 * Generate rap lyrics using the AI agent
 */
export async function generateLyrics(
  request: GenerateLyricsRequest
): Promise<GenerateLyricsResponse> {
  try {
    const response = await fetchApi<GenerateLyricsResponse>('/generate-lyrics', {
      method: 'POST',
      body: JSON.stringify(request),
    })
    
    return response
  } catch (error) {
    const message = error instanceof ApiError ? error.message : 'Failed to generate lyrics'
    toast.error(message)
    throw error
  }
}

/**
 * Check content compliance for generated lyrics
 */
export async function checkCompliance(
  request: CheckComplianceRequest
): Promise<CheckComplianceResponse> {
  try {
    const response = await fetchApi<CheckComplianceResponse>('/check-compliance', {
      method: 'POST',
      body: JSON.stringify(request),
    })
    
    return response
  } catch (error) {
    const message = error instanceof ApiError ? error.message : 'Failed to check compliance'
    toast.error(message)
    throw error
  }
}

/**
 * Evaluate a rap battle and determine the winner
 */
export async function evaluateBattle(
  request: EvaluateBattleRequest
): Promise<EvaluateBattleResponse> {
  try {
    const response = await fetchApi<EvaluateBattleResponse>('/evaluate-battle', {
      method: 'POST',
      body: JSON.stringify(request),
    })
    
    return response
  } catch (error) {
    const message = error instanceof ApiError ? error.message : 'Failed to evaluate battle'
    toast.error(message)
    throw error
  }
}

/**
 * Generate a theme for a new rap battle
 */
export async function generateTheme(
  request: GenerateThemeRequest = {}
): Promise<GenerateThemeResponse> {
  try {
    const response = await fetchApi<GenerateThemeResponse>('/generate-theme', {
      method: 'POST',
      body: JSON.stringify(request),
    })
    
    return response
  } catch (error) {
    const message = error instanceof ApiError ? error.message : 'Failed to generate theme'
    toast.error(message)
    throw error
  }
}

/**
 * Execute a custom agent task
 * This is for advanced use cases where you need more flexibility
 */
export async function executeTask(
  request: ExecuteTaskRequest
): Promise<ExecuteTaskResponse> {
  try {
    const response = await fetchApi<ExecuteTaskResponse>('/execute', {
      method: 'POST',
      body: JSON.stringify(request),
    })
    
    return response
  } catch (error) {
    const message = error instanceof ApiError ? error.message : 'Failed to execute task'
    toast.error(message)
    throw error
  }
}

/**
 * Check if the agent service is healthy
 */
export async function checkAgentHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}${AGENT_API_PATH}/health`)
    const data = await response.json()
    return response.ok && data.success
  } catch {
    return false
  }
}

// Export all functions and types
export const agentApi = {
  generateLyrics,
  checkCompliance,
  evaluateBattle,
  generateTheme,
  executeTask,
  checkAgentHealth,
}

export default agentApi