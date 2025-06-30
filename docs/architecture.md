# AI Agent MC Battle - システムアーキテクチャ

## 概要

AI Agent MC Battle は、Google Cloud Platform (GCP) 上に構築された高性能・高可用性のリアルタイム AI エンターテイメント プラットフォームです。**Mastra TypeScript エージェントフレームワーク**を核とした複数の特化型 AI エージェントにより、1.5秒以内の超高速リリック生成とリアルタイム音声合成を実現します。

## アーキテクチャ概要

```
                    ┌─────────────────────────────────────────┐
                    │          Frontend (Next.js)            │
                    │        Cloud Run (Frontend)            │
                    └─────────────────┬───────────────────────┘
                                      │ HTTPS/WebSocket  
                    ┌─────────────────┴───────────────────────┐
                    │      Backend (Node.js/Express)         │
                    │        Cloud Run (Backend)             │
                    │  ┌─────────────────────────────────┐   │
                    │  │    Mastra Agent Framework       │   │
                    │  │  ┌─────────────────────────────┐ │   │
                    │  │  │  AgentService (汎用)        │ │   │
                    │  │  │  ├─ Lyrics Generation      │ │   │
                    │  │  │  ├─ Compliance Check       │ │   │
                    │  │  │  ├─ Battle Evaluation      │ │   │
                    │  │  │  └─ Theme Generation       │ │   │
                    │  │  └─────────────────────────────┘ │   │
                    │  │  ┌─────────────────────────────┐ │   │
                    │  │  │  MCBattleAgentService       │ │   │
                    │  │  │  ├─ JP MC Battle Lyrics    │ │   │
                    │  │  │  ├─ JP Compliance Check    │ │   │
                    │  │  │  └─ MC Battle Evaluation   │ │   │
                    │  │  └─────────────────────────────┘ │   │
                    │  │  ┌─────────────────────────────┐ │   │
                    │  │  │  SpecializedAgentService    │ │   │
                    │  │  │  ├─ Answer-Specialized AI   │ │   │
                    │  │  │  └─ Speed-Specialized AI    │ │   │
                    │  │  └─────────────────────────────┘ │   │
                    │  │  ┌─────────────────────────────┐ │   │
                    │  │  │  MCP Tools System          │ │   │
                    │  │  │  ├─ NG Word Management     │ │   │
                    │  │  │  └─ Content Analysis       │ │   │
                    │  │  └─────────────────────────────┘ │   │
                    │  └─────────────────────────────────┘   │
                    └─────────┬───────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼──────┐    ┌────────▼────────┐   ┌───────▼──────┐
│  Vertex AI   │    │  Cloud Text-to  │   │   Firestore  │
│   Gemini     │    │     Speech      │   │   Database   │
│ 2.5 Pro/Flash│    │                 │   │              │
└──────────────┘    └─────────────────┘   └──────────────┘
                              │
                    ┌─────────▼─────────┐
                    │    Redis Cache    │
                    │   │
                    └───────────────────┘
```

## コア コンポーネント

### 1. フロントエンド層
- **Technology**: Next.js 14 (React Server Components)
- **Deployment**: Cloud Run (Container)
- **Features**:
  - Server-Side Rendering (SSR) で動的コンテンツ対応
  - WebSocket クライアント統合
  - リアルタイム UI 更新
  - 自動 HTTPS 対応

### 2. バックエンド層
- **Technology**: Node.js/Express + TypeScript
- **Deployment**: Cloud Run (Container)
- **Features**:
  - RESTful API
  - WebSocket サーバー (Socket.io)
  - Mastra エージェント フレームワーク統合
  - リアルタイム バトル管理

### 3. Mastra エージェント システム

#### **AgentService (汎用エージェント)**
- **Role**: メインのラップバトル管理エージェント
- **Tools**:
  - `generateRapLyricsTool`: 基本的な日本語ラップ歌詞生成
  - `checkComplianceTool`: コンテンツ安全性チェック  
  - `evaluateBattleTool`: バトル結果の公正な評価
  - `generateBattleThemeTool`: バトルテーマの自動生成
- **Features**: Gemini 2.5 Pro/Flash 統合、安全性フィルタ、韻律分析

#### **MCBattleAgentService (MCバトル特化)**
- **Role**: 日本のMCバトル文化に特化したエージェント
- **Tools**:
  - `generateMCBattleLyricsTool`: 8/16小節形式の本格MCバトルリリック
  - `checkJapaneseMCComplianceTool`: 日本語コンテンツ専用審査
  - `evaluateMCBattleTool`: MCバトル評価基準による採点
- **Features**: 韻解析、パンチライン抽出、アンサー認識、フロウ分析

#### **ImprovedMCBattleAgentService (特化型エージェント)**
- **Role**: 戦術特化型の高度なバトルエージェント
- **Specialized AIs**:
  - **Answer-Specialized AI**: 相手の言葉を拾って論破するアンサー特化
  - **Speed-Specialized AI**: 高速フロウと瞬発力に特化
- **Advanced Features**: 
  - 相手リリック分析・単語抽出
  - 反論ポイント自動生成
  - スピード技法の実装
  - カウンター戦術

#### **MCP Tools System (Model Context Protocol)**
- **ngWordManagementTool**: 
  - NGワードデータベース管理
  - 動的な単語追加・更新・削除
  - カテゴリ別重要度管理
  - 統計・分析機能
- **contentAnalysisEnhancedTool**:
  - 高度なコンテンツ解析
  - 感情分析・文脈理解
  - 文字分布・トピック抽出
  - 多層的安全性評価

### 4. AI サービス層
- **Vertex AI (Gemini 2.5)**:
  - Flash モデル: 高速レスポンス (1.5秒未満)
  - Pro モデル: 高品質クリエイティブ生成
  - 安全性フィルタリング
  - 日本語最適化

- **Cloud Text-to-Speech**:
  - 自然な音声合成
  - リアルタイム ストリーミング
  - カスタム音声調整

### 5. データストレージ層
- **Firestore**: 
  - バトル履歴
  - ユーザー投票
  - リリック保存
  - リアルタイム同期

- **Redis (localhost:6379)**:
  - セッション管理
  - キャッシュ
  - WebSocket 状態管理
  - エージェント状態保存
  - NG Word キャッシュ

## 技術仕様

### パフォーマンス要件
- **エージェント応答時間**: 
  - Flash モデル: < 1.5秒 (高速生成)
  - Pro モデル: < 3.0秒 (高品質生成)
- **音声合成**: < 200ms
- **WebSocket遅延**: < 100ms
- **同時接続**: 10,000ユーザー
- **同時バトル**: 100セッション
- **エージェント並列処理**: 3つのエージェント同時実行
- **MCP ツール応答**: < 500ms

### セキュリティ
- **認証**: Google Identity Platform (将来実装)
- **承認**: IAM ロール ベース
- **通信**: TLS 1.3 暗号化
- **コンテンツ**: AI 安全性フィルタ

## スケーラビリティ設計

### 水平スケーリング
- Cloud Run の自動スケーリング
- Firestore の分散アーキテクチャ
- Redis クラスタリング

### 負荷分散
- Global Load Balancer
- リージョン別ルーティング
- WebSocket セッション アフィニティ

### キャッシング戦略
- Redis によるセッション キャッシュ
- Firestore の最適化されたクエリ
- CDN による静的コンテンツ配信

## 監視・ログ

### 監視
- **Cloud Monitoring**: リアルタイム メトリクス
- **Cloud Trace**: 分散トレーシング
- **Cloud Profiler**: パフォーマンス プロファイリング

### ログ
- **Cloud Logging**: 集約ログ管理
- **構造化ログ**: JSON フォーマット
- **ログレベル**: ERROR/WARN/INFO/DEBUG

### アラート
- レスポンス時間異常
- エラー率上昇
- リソース使用率警告
- Vertex AI クォータ監視

## コスト最適化

### リソース効率
- Cloud Run の従量課金
- Vertex AI の最適モデル選択
- Redis の適切なサイジング

### 予算管理
- リソース使用量監視
- 自動シャットダウン (開発環境)
- コスト アラート設定

## 将来の拡張性

### 機能追加
- マルチプレイヤー バトル
- ユーザー認証システム
- 詳細分析ダッシュボード
- モバイルアプリ対応
- **Live API 音声認識統合**
- **リアルタイム音声対戦**

### Mastra エージェント拡張
- **新しい特化型エージェント**:
  - Punchline-Specialized AI (パンチライン特化)
  - Freestyle-Specialized AI (フリースタイル特化)
  - Regional-Specialized AI (地域ラップ特化)
- **エージェント学習機能**:
  - バトル結果からの学習
  - ユーザー評価による改善
  - 対戦相手分析による戦術適応
- **MCP ツール拡張**:
  - リアルタイム翻訳ツール
  - 音韻解析ツール
  - 感情分析ツール

### 技術的拡張
- Google Live API 統合 (音声認識)
- Edge Computing (Cloud CDN)
- Machine Learning パイプライン
- ビッグデータ分析 (BigQuery)
- **Mastra エージェント クラスター**
- **分散エージェント処理**

## 分散マルチエージェントアーキテクチャ

### 概要
外部エージェントとの連携により、MC Battleエコシステムを拡張し、多様な特化型AIエージェントが協調・競争する分散システムを構築します。

### 拡張アーキテクチャ図

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           Frontend Cluster                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                │
│  │  User Interface │  │ Agent Dashboard │  │ Agent Market    │                │
│  │  (Next.js)      │  │  (Monitoring)   │  │ (Discover)      │                │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                │
└─────────────────────────────┬───────────────────────────────────────────────────┘
                              │ HTTPS/WebSocket/GraphQL
┌─────────────────────────────┴───────────────────────────────────────────────────┐
│                       Agent Gateway (API Gateway)                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                    Agent Orchestrator                                   │   │
│  │  ├─ Agent Discovery Service                                            │   │
│  │  ├─ Load Balancer & Routing                                           │   │
│  │  ├─ Authentication & Authorization                                     │   │
│  │  ├─ Rate Limiting & Quality Control                                   │   │
│  │  └─ Battle Matchmaking System                                         │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└───────────────┬─────────────────────┬─────────────────────┬───────────────────────┘
                │                     │                     │
┌───────────────▼───────────────┐ ┌──▼──────────────────┐ ┌▼─────────────────────┐
│     Internal Agents           │ │   External Agents   │ │  Shared Services     │
│     (Current System)          │ │    (3rd Party)      │ │                      │
│ ┌─────────────────────────┐   │ │ ┌─────────────────┐ │ │ ┌─────────────────┐  │
│ │  AgentService           │   │ │ │ Community Agent │ │ │ │ Agent Registry  │  │
│ │  ├─ Lyrics Generation   │   │ │ │ (Public API)    │ │ │ │ & Metadata      │  │
│ │  ├─ Compliance Check    │   │ │ └─────────────────┘ │ │ └─────────────────┘  │
│ │  ├─ Battle Evaluation   │   │ │ ┌─────────────────┐ │ │ ┌─────────────────┐  │
│ │  └─ Theme Generation    │   │ │ │ Enterprise Agent│ │ │ │ Event Bus       │  │
│ └─────────────────────────┘   │ │ │ (Private API)   │ │ │ │ (Redis Streams) │  │
│ ┌─────────────────────────┐   │ │ └─────────────────┘ │ │ └─────────────────┘  │
│ │  MCBattleAgentService   │   │ │ ┌─────────────────┐ │ │ ┌─────────────────┐  │
│ │  ├─ JP MC Battle        │   │ │ │ University AI   │ │ │ │ Monitoring &    │  │
│ │  ├─ JP Compliance       │   │ │ │ (Research)      │ │ │ │ Analytics       │  │
│ │  └─ MC Battle Eval      │   │ │ └─────────────────┘ │ │ └─────────────────┘  │
│ └─────────────────────────┘   │ │ ┌─────────────────┐ │ │ ┌─────────────────┐  │
│ ┌─────────────────────────┐   │ │ │ Open Source AI  │ │ │ │ Security        │  │
│ │  SpecializedAgents      │   │ │ │ (GitHub)        │ │ │ │ Sandbox         │  │
│ │  ├─ Answer-Specialized  │   │ │ └─────────────────┘ │ │ └─────────────────┘  │
│ │  └─ Speed-Specialized   │   │ │                     │ │                      │
│ └─────────────────────────┘   │ │                     │ │                      │
└───────────────────────────────┘ └─────────────────────┘ └──────────────────────┘
                │                           │                          │
        ┌───────▼───────┐           ┌──────▼──────┐            ┌──────▼──────┐
        │  Vertex AI    │           │ External AI │            │  Firestore  │
        │  Gemini       │           │ Services    │            │  Database   │
        │ 2.5 Pro/Flash │           │ (OpenAI,etc)│            │             │
        └───────────────┘           └─────────────┘            └─────────────┘
```

### コア コンポーネント

#### **1. Agent Gateway (エージェントゲートウェイ)**
```typescript
// エージェント統合の中央ハブ
interface AgentGateway {
  // エージェント発見・登録
  registerAgent(agent: ExternalAgent): Promise<AgentRegistration>
  
  // バトルマッチメイキング
  matchAgents(criteria: BattleCriteria): Promise<AgentPair>
  
  // 品質管理・レート制限
  validateAgent(agentId: string): Promise<ValidationResult>
  
  // ルーティング・負荷分散
  routeRequest(request: AgentRequest): Promise<AgentResponse>
}
```

#### **2. Agent Discovery Service (エージェント発見サービス)**
```typescript
interface AgentDiscoveryService {
  // 利用可能エージェントの検索
  searchAgents(query: AgentSearchQuery): Promise<Agent[]>
  
  // エージェント能力の照会
  getAgentCapabilities(agentId: string): Promise<AgentCapabilities>
  
  // エージェントランキング
  getLeaderboard(category: string): Promise<AgentRanking[]>
  
  // 推奨エージェント
  recommendAgents(userPrefs: UserPreferences): Promise<Agent[]>
}
```

#### **3. External Agent Integration (外部エージェント統合)**

##### **接続方法**
```typescript
// 1. REST API接続
interface RESTAgentConnector {
  endpoint: string
  authentication: AuthConfig
  rateLimits: RateLimitConfig
  
  async generateLyrics(request: LyricRequest): Promise<LyricResponse>
  async evaluateBattle(battle: Battle): Promise<EvaluationResponse>
}

// 2. WebSocket接続
interface WebSocketAgentConnector {
  connectionUrl: string
  protocol: 'agent-battle-protocol-v1'
  
  onBattleStart(callback: (battle: Battle) => void): void
  onLyricRequest(callback: (request: LyricRequest) => Promise<Lyric>): void
}

// 3. gRPC接続
interface GRPCAgentConnector {
  serviceDefinition: AgentServiceDefinition
  
  async call(method: string, params: any): Promise<any>
}

// 4. GraphQL接続
interface GraphQLAgentConnector {
  endpoint: string
  schema: GraphQLSchema
  
  async query(query: string, variables: any): Promise<any>
}
```

#### **4. Agent Registry & Metadata (エージェント登録・メタデータ)**
```typescript
interface AgentRegistration {
  id: string
  name: string
  version: string
  creator: string
  
  // 能力・特性
  capabilities: {
    languages: string[]           // ['ja', 'en']
    styles: string[]             // ['battle', 'freestyle', 'punchline']
    specializations: string[]    // ['answer', 'speed', 'creative']
    models: string[]            // ['gpt-4', 'claude-3', 'gemini-pro']
  }
  
  // 接続情報
  connection: {
    type: 'rest' | 'websocket' | 'grpc' | 'graphql'
    endpoint: string
    authentication: AuthConfig
    timeout: number
  }
  
  // パフォーマンス・品質
  performance: {
    averageResponseTime: number  // ms
    successRate: number         // 0-1
    rating: number             // 1-5
    totalBattles: number
    winRate: number           // 0-1
  }
  
  // 料金・制限
  pricing: {
    model: 'free' | 'freemium' | 'paid'
    costPerRequest: number
    dailyLimit: number
    rateLimits: RateLimitConfig
  }
  
  // メタデータ
  metadata: {
    description: string
    tags: string[]
    homepage: string
    documentation: string
    support: string
    license: string
  }
}
```

#### **5. Battle Orchestration (バトル オーケストレーション)**
```typescript
interface BattleOrchestrator {
  // マルチエージェントバトル
  async orchestrateMultiAgentBattle(config: MultiAgentBattleConfig): Promise<BattleResult>
  
  // エージェント品質管理
  async validateAgentQuality(agentId: string): Promise<QualityReport>
  
  // リアルタイムバトル管理
  async manageLiveBattle(battleId: string): Promise<LiveBattleSession>
}

interface MultiAgentBattleConfig {
  participants: AgentParticipant[]
  format: 'tournament' | 'round-robin' | '1v1' | 'team'
  rounds: number
  theme: string
  judging: 'ai' | 'human' | 'hybrid'
  realtime: boolean
}
```

### セキュリティ & 品質管理

#### **Agent Sandboxing (エージェントサンドボックス化)**
```typescript
interface AgentSandbox {
  // リソース制限
  limits: {
    memory: number        // MB
    cpu: number          // CPU cores
    timeout: number      // seconds
    networkCalls: number // per minute
  }
  
  // セキュリティ制約
  security: {
    allowedDomains: string[]
    blockedContent: string[]
    contentFiltering: boolean
    auditLogging: boolean
  }
  
  // 品質制御
  quality: {
    minimumRating: number
    maxErrorRate: number
    responseTimeLimit: number
  }
}
```

#### **Agent Authentication & Authorization**
```typescript
interface AgentAuth {
  // 認証方式
  methods: ('api-key' | 'oauth2' | 'jwt' | 'custom')[]
  
  // 権限管理
  permissions: {
    canParticipateInBattles: boolean
    canAccessUserData: boolean
    canModifyContent: boolean
    rateLimit: RateLimitConfig
  }
  
  // 監査
  audit: {
    logAllRequests: boolean
    retentionPeriod: number // days
    alertOnSuspiciousActivity: boolean
  }
}
```

### 通信プロトコル

#### **Agent Battle Protocol (ABP)**
```json
{
  "protocol": "agent-battle-protocol",
  "version": "1.0",
  "messageTypes": {
    "battle_start": {
      "battleId": "string",
      "participants": ["agentId1", "agentId2"],
      "config": "BattleConfig"
    },
    "lyric_request": {
      "requestId": "string",
      "theme": "string",
      "constraints": "LyricConstraints",
      "opponentLyric": "string?"
    },
    "lyric_response": {
      "requestId": "string",
      "lyric": "Lyric",
      "metadata": "LyricMetadata"
    },
    "battle_end": {
      "battleId": "string",
      "result": "BattleResult"
    }
  }
}
```

### 実装段階

#### **Phase 1: 基盤構築**
- Agent Gateway の実装
- Agent Registry の構築
- REST API 外部エージェント接続

#### **Phase 2: プロトコル拡張**
- WebSocket リアルタイム接続
- gRPC 高性能接続
- GraphQL 柔軟なクエリ

#### **Phase 3: エコシステム**
- Agent Marketplace
- Community エージェント
- Enterprise 統合

#### **Phase 4: 高度機能**
- AI エージェント学習
- 協調バトル（2v2, Team Battle）
- クロスプラットフォーム統合