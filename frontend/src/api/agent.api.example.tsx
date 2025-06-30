/**
 * Agent API Usage Examples
 * This file demonstrates how to use the agent API client in React components
 */

import { useState, useEffect } from 'react'
import { 
  agentApi,
  GenerateLyricsResponse,
  CheckComplianceResponse,
  EvaluateBattleResponse,
  GenerateThemeResponse 
} from './agent.api'

// Example 1: Generate Lyrics Component
export function GenerateLyricsExample() {
  const [lyrics, setLyrics] = useState<GenerateLyricsResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const handleGenerateLyrics = async () => {
    setLoading(true)
    try {
      const response = await agentApi.generateLyrics({
        theme: 'Street Life',
        rapperStyle: 'Old School Hip Hop',
        userName: 'Player1'
      })
      setLyrics(response)
    } catch (error) {
      console.error('Failed to generate lyrics:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button onClick={handleGenerateLyrics} disabled={loading}>
        {loading ? 'Generating...' : 'Generate Lyrics'}
      </button>
      {lyrics && (
        <div>
          <pre>{lyrics.lyrics}</pre>
          {lyrics.metadata && (
            <p>Generated in {lyrics.metadata.generationTime}ms</p>
          )}
        </div>
      )}
    </div>
  )
}

// Example 2: Compliance Check Hook
export function useComplianceCheck() {
  const [isChecking, setIsChecking] = useState(false)
  
  const checkCompliance = async (content: string): Promise<CheckComplianceResponse | null> => {
    setIsChecking(true)
    try {
      const response = await agentApi.checkCompliance({ content })
      return response
    } catch (error) {
      console.error('Compliance check failed:', error)
      return null
    } finally {
      setIsChecking(false)
    }
  }

  return { checkCompliance, isChecking }
}

// Example 3: Battle Evaluation Component
export function BattleEvaluationExample({ battleId }: { battleId: string }) {
  const [evaluation, setEvaluation] = useState<EvaluateBattleResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const evaluateBattle = async () => {
    setLoading(true)
    try {
      const response = await agentApi.evaluateBattle({
        battleId,
        rapper1Lyrics: [
          "Yo, I'm spitting fire on this mic tonight",
          "My rhymes so tight, they ignite the light"
        ],
        rapper2Lyrics: [
          "Step back, I'm the king of this scene",
          "My flow so clean, you've never seen"
        ],
        audience: ['user1', 'user2', 'user3']
      })
      setEvaluation(response)
    } catch (error) {
      console.error('Failed to evaluate battle:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button onClick={evaluateBattle} disabled={loading}>
        {loading ? 'Evaluating...' : 'Evaluate Battle'}
      </button>
      {evaluation && (
        <div>
          <h3>Winner: {evaluation.winner}</h3>
          <p>Rapper 1 Score: {evaluation.scores.rapper1}</p>
          <p>Rapper 2 Score: {evaluation.scores.rapper2}</p>
          {evaluation.judgeCommentary && (
            <p>Judge: {evaluation.judgeCommentary}</p>
          )}
        </div>
      )}
    </div>
  )
}

// Example 4: Theme Generation with Error Handling
export function ThemeGeneratorExample() {
  const [theme, setTheme] = useState<GenerateThemeResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateNewTheme = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await agentApi.generateTheme({
        categories: ['Street Life', 'Success', 'Competition']
      })
      setTheme(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate theme')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button onClick={generateNewTheme} disabled={loading}>
        {loading ? 'Generating Theme...' : 'Generate New Theme'}
      </button>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {theme && (
        <div>
          <h3>{theme.theme}</h3>
          <p>{theme.description}</p>
          <p>Keywords: {theme.keywords.join(', ')}</p>
        </div>
      )}
    </div>
  )
}

// Example 5: Health Check with Auto-retry
export function AgentHealthMonitor() {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  useEffect(() => {
    const checkHealth = async () => {
      const healthy = await agentApi.checkAgentHealth()
      setIsHealthy(healthy)
      setLastChecked(new Date())
    }

    // Initial check
    checkHealth()

    // Check every 30 seconds
    const interval = setInterval(checkHealth, 30000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div>
      <p>
        Agent Status: {' '}
        <span style={{ color: isHealthy ? 'green' : 'red' }}>
          {isHealthy === null ? 'Checking...' : isHealthy ? 'Healthy' : 'Unhealthy'}
        </span>
      </p>
      {lastChecked && (
        <p>Last checked: {lastChecked.toLocaleTimeString()}</p>
      )}
    </div>
  )
}

// Example 6: Custom Task Execution
export function CustomTaskExample() {
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const executeCustomTask = async () => {
    setLoading(true)
    try {
      const response = await agentApi.executeTask({
        task: 'Generate a creative rap battle introduction',
        parameters: {
          tone: 'energetic',
          length: 'short',
          includeAudience: true
        }
      })
      setResult(response.result)
    } catch (error) {
      console.error('Failed to execute task:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button onClick={executeCustomTask} disabled={loading}>
        {loading ? 'Executing...' : 'Execute Custom Task'}
      </button>
      {result && (
        <div>
          <h4>Result:</h4>
          <p>{result}</p>
        </div>
      )}
    </div>
  )
}