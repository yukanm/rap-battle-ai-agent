/**
 * E2E Test Constants
 * テスト定数定義
 */

export const TEST_CONFIG = {
  // URLs
  FRONTEND_URL: 'http://localhost:3456',
  BACKEND_URL: 'http://localhost:8456',
  
  // Timeouts (milliseconds)
  NAVIGATION_TIMEOUT: 30000,
  WEBSOCKET_CONNECTION_TIMEOUT: 5000,
  LYRIC_GENERATION_TIMEOUT: 8000, // Slightly longer than the 5s backend timeout
  AUDIO_GENERATION_TIMEOUT: 3000,
  BATTLE_ROUND_TIMEOUT: 15000,
  
  // Performance Requirements (from final-status.md)
  MAX_END_TO_END_LATENCY: 1500, // 1.5 seconds
  MAX_RESPONSE_TIME: 1500,
  MAX_WEBSOCKET_CONNECTION_TIME: 1000,
  
  // Battle Configuration
  DEFAULT_BATTLE_ROUNDS: 3,
  MIN_THEME_LENGTH: 1,
  MAX_THEME_LENGTH: 100,
  
  // Test Data
  TEST_THEMES: [
    '未来への希望',
    '友情の力',
    '夢を追いかけて',
    '挑戦する勇気',
    '愛と平和',
    'テクノロジーの進歩',
    '環境保護',
    '教育の重要性'
  ],
  
  INVALID_THEMES: [
    '', // Empty
    'a'.repeat(101), // Too long
    '   ', // Whitespace only
  ],
  
  // Audio Test Data
  TEST_AUDIO_DURATION: 3000, // 3 seconds
  
  // Multi-user Test Data
  TEST_USERS: [
    { id: 'user1', name: 'TestRapper1' },
    { id: 'user2', name: 'TestRapper2' },
    { id: 'user3', name: 'Viewer1' }
  ]
} as const

export const SELECTORS = {
  // Landing Page
  HERO_SECTION: '[data-testid="hero-section"]',
  START_BUTTON: '[data-testid="start-battle-button"]',
  CTA_BUTTON: '[data-testid="cta-battle-button"]',
  FEATURES_SECTION: '[data-testid="features-section"]',
  
  // Battle Selector
  BATTLE_SELECTOR: '[data-testid="battle-selector"]',
  MODE_CARDS: '[data-testid="battle-mode-card"]',
  WEBSOCKET_MODE: '[data-testid="websocket-mode"]',
  AGENT_MODE: '[data-testid="agent-mode"]',
  LIVE_MODE: '[data-testid="live-mode"]',
  SELECTED_MODE_INDICATOR: '[data-testid="selected-mode"]',
  
  // Battle Arena (WebSocket)
  THEME_INPUT: '[data-testid="theme-input"]',
  START_BATTLE_BUTTON: '[data-testid="start-battle-btn"]',
  BATTLE_STATUS: '[data-testid="battle-status"]',
  ROUND_INDICATOR: '[data-testid="round-indicator"]',
  LYRIC_DISPLAY: '[data-testid="lyric-display"]',
  AUDIO_PLAYER: '[data-testid="audio-player"]',
  VOTE_BUTTONS: '[data-testid="vote-button"]',
  VOTE_AI1: '[data-testid="vote-ai1"]',
  VOTE_AI2: '[data-testid="vote-ai2"]',
  VOTE_COUNTS: '[data-testid="vote-counts"]',
  BATTLE_RESULTS: '[data-testid="battle-results"]',
  
  // Live Battle Arena
  LIVE_SETUP_FORM: '[data-testid="live-setup-form"]',
  USER_NAME_INPUT: '[data-testid="user-name-input"]',
  BATTLE_ID_INPUT: '[data-testid="battle-id-input"]',
  LIVE_SETUP_BUTTON: '[data-testid="live-setup-button"]',
  MIC_BUTTON: '[data-testid="mic-button"]',
  TEXT_INPUT: '[data-testid="text-input"]',
  SEND_TEXT_BUTTON: '[data-testid="send-text-button"]',
  LIVE_FEED: '[data-testid="live-feed"]',
  CONNECTION_STATUS: '[data-testid="connection-status"]',
  
  // Common Elements
  LOADING_SPINNER: '[data-testid="loading"]',
  ERROR_MESSAGE: '[data-testid="error-message"]',
  TOAST_NOTIFICATION: '.Toaster',
  BACK_BUTTON: '[data-testid="back-button"]',
  
  // WebSocket Status
  WS_CONNECTED: '[data-testid="ws-connected"]',
  WS_DISCONNECTED: '[data-testid="ws-disconnected"]',
  WS_RECONNECTING: '[data-testid="ws-reconnecting"]',
} as const

export const MESSAGES = {
  SUCCESS: {
    BATTLE_STARTED: 'バトルが開始されました',
    CONNECTION_ESTABLISHED: 'WebSocket接続が確立されました',
    VOTE_RECORDED: '投票が記録されました',
    LIVE_SESSION_CREATED: 'ライブセッションが作成されました'
  },
  ERROR: {
    CONNECTION_FAILED: '接続に失敗しました',
    INVALID_THEME: 'テーマが無効です',
    BATTLE_CREATION_FAILED: 'バトルの作成に失敗しました',
    WEBSOCKET_ERROR: 'WebSocket接続エラー'
  }
} as const

export const BATTLE_MODES = {
  WEBSOCKET: 'websocket',
  AGENT: 'agent', 
  LIVE: 'live'
} as const