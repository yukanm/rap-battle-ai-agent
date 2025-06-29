export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  messages: Message[];
  createdAt: Date;
}

export interface ApiResponse {
  response: string;
  session_id?: string;
}

export interface VoiceResponse {
  transcript?: string;
  response?: string;
  session_id?: string;
  error?: string;
} 