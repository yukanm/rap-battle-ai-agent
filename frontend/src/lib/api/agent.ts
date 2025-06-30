/**
 * Agent API Client
 * Handles all interactions with the Agent API endpoints
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8456';

export interface GenerateLyricsRequest {
  theme: string;
  rapperStyle: string;
  userName?: string;
}

export interface GenerateLyricsResponse {
  success: boolean;
  data?: {
    lyrics: string;
    metadata: {
      generationTime: number;
      model: string;
      style: string;
    };
  };
  error?: string;
}

export interface CheckComplianceRequest {
  content: string;
}

export interface CheckComplianceResponse {
  success: boolean;
  data?: {
    isCompliant: boolean;
    score: number;
    violations?: string[];
    suggestions?: string[];
  };
  error?: string;
}

export interface EvaluateBattleRequest {
  battleId: string;
  rapper1Lyrics: string[];
  rapper2Lyrics: string[];
  audience?: string[];
}

export interface EvaluateBattleResponse {
  success: boolean;
  data?: {
    winner: 'rapper1' | 'rapper2' | 'tie';
    scores: {
      rapper1: number;
      rapper2: number;
    };
    evaluation: {
      rapper1: {
        strengths: string[];
        weaknesses: string[];
        overallPerformance: string;
      };
      rapper2: {
        strengths: string[];
        weaknesses: string[];
        overallPerformance: string;
      };
    };
    summary: string;
  };
  error?: string;
}

export interface GenerateThemeRequest {
  categories?: string[];
}

export interface GenerateThemeResponse {
  success: boolean;
  data?: {
    theme: string;
    description: string;
    keywords: string[];
  };
  error?: string;
}

export interface ExecuteAgentRequest {
  task: string;
  parameters?: Record<string, any>;
}

export interface ExecuteAgentResponse {
  success: boolean;
  data?: {
    result: string;
    metadata?: any;
  };
  error?: string;
}

class AgentAPI {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}/api/agent${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Generate rap lyrics using AI
   */
  async generateLyrics(request: GenerateLyricsRequest): Promise<GenerateLyricsResponse> {
    return this.request<GenerateLyricsResponse>('/generate-lyrics', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Check content compliance
   */
  async checkCompliance(request: CheckComplianceRequest): Promise<CheckComplianceResponse> {
    return this.request<CheckComplianceResponse>('/check-compliance', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Evaluate a rap battle
   */
  async evaluateBattle(request: EvaluateBattleRequest): Promise<EvaluateBattleResponse> {
    return this.request<EvaluateBattleResponse>('/evaluate-battle', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Generate a battle theme
   */
  async generateTheme(request: GenerateThemeRequest = {}): Promise<GenerateThemeResponse> {
    return this.request<GenerateThemeResponse>('/generate-theme', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Execute custom agent task
   */
  async executeTask(request: ExecuteAgentRequest): Promise<ExecuteAgentResponse> {
    return this.request<ExecuteAgentResponse>('/execute', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Check if the agent service is healthy
   */
  async healthCheck(): Promise<{ success: boolean; status: string; message?: string }> {
    return this.request('/health');
  }
}

export const agentAPI = new AgentAPI();