export interface User {
  id: string
  username: string
  createdAt: Date
  stats: {
    battlesWatched: number
    votes: number
  }
}

export interface Battle {
  id: string
  status: 'waiting' | 'in_progress' | 'completed'
  theme: string
  format?: '8bars-3verses' | '16bars-3verses'  // 8小節x3バース または 16小節x3バース
  startedAt: Date
  endedAt?: Date
  rounds: Round[]
  participants: {
    ai1: AIParticipant
    ai2: AIParticipant
  }
  votes: {
    ai1: number
    ai2: number
  }
  viewers: number
}

export interface AIParticipant {
  id: string
  name: string
  model: 'gemini-flash' | 'gemini-pro'
  avatar?: string
  style: string
}

export interface Round {
  number: number
  verses?: Verse[] // 6 verses per round (3 per MC, alternating) - optional for backward compatibility
  lyrics?: {  // 1バース = 1リリックペア のシンプルな構造
    ai1: Lyric
    ai2: Lyric
  }
  votes: {
    ai1: number
    ai2: number
  }
}

export interface Verse {
  number: number // 1-6 within a round
  participantId: 'ai1' | 'ai2'
  lyric: Lyric
}

export interface Lyric {
  id: string
  content: string
  bars?: number  // 小節数（8 または 16）
  rhymes?: string[]  // 韻を踏んでいる箇所
  punchlines?: string[]  // パンチライン
  answerTo?: string  // アンサーしている相手のリリックの一部
  generatedAt: Date
  audioUrl?: string
  complianceScore: number
  generationTime: number // milliseconds
  violations?: ViolationInfo[]  // NG word violations for frontend highlighting
}

export interface ViolationInfo {
  term: string  // The detected NG word
  category: string  // Category of the violation
  severity: 'critical' | 'high' | 'medium' | 'low'
  penalty: number  // Penalty score for this violation
  startIndex: number  // Start position in the content
  endIndex: number  // End position in the content
  recommendation?: string  // Suggested replacement
  note?: string  // Additional context
}

export interface BattleEvent {
  type: 'battle_start' | 'round_start' | 'lyric_generated' | 'audio_ready' | 'round_end' | 'battle_end' | 'vote_update'
  battleId: string
  data: any
  timestamp: Date
}

export interface WebSocketMessage {
  type: string
  data: any
}