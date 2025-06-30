# AI Rap Battle System

AIによるリアルタイムラップバトルシステム。Google Cloud Vertex AIとLive APIを活用し、複数のLLMが即興でラップバトルを繰り広げます。

## 🎤 特徴

- **リアルタイムMCバトル**: Gemini FlashとGemini Proによる即興ラップバトル
- **アンサー機能**: 相手のリリックを拾って韻で返すアンサー特化システム
- **リアルタイム音声生成**: Cloud Text-to-Speechによる即時音声化
- **高速レスポンス**: エンドツーエンドのレイテンシ1.5秒以下
- **コンテンツ安全性**: 自動コンプライアンスチェック機能
- **美しいUI**: モダンなアニメーション付きインターフェース

## 🎯 バトル形式

### 8小節 × 3バース
- スピード重視の短期決戦
- 各MCが8小節のバースを3回披露
- 先行→後攻の順で交互に進行

### 16小節 × 3バース
- じっくり展開する本格バトル
- 各MCが16小節のバースを3回披露
- より複雑なライムとアンサーの応酬

## 📊 評価基準

1. **韻（ライム）**: 韻の質と独創性、自然さ
2. **フロウ**: リズム感、言葉の乗せ方
3. **アンサー**: 相手への的確な返し
4. **パンチライン**: インパクトのある決め台詞
5. **アティチュード**: テーマ解釈力、オリジナリティ

## 🏗️ Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│ API Gateway │────▶│   Backend   │
│  (Next.js)  │     │ (WebSocket) │     │ (Cloud Run) │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    │                          │                          │
              ┌─────▼─────┐            ┌───────▼────────┐         ┌───────▼────────┐
              │ Vertex AI │            │   Firestore    │         │ Text-to-Speech │
              │  Agents   │            │   Database     │         │      API       │
              └───────────┘            └────────────────┘         └────────────────┘
```

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Node.js, Express, Socket.io, TypeScript
- **AI/ML**: Google Vertex AI (Gemini Flash & Pro models)
- **Database**: Firestore, Redis
- **Infrastructure**: Google Cloud Run, Firebase Hosting
- **Monitoring**: Cloud Logging, Cloud Trace, Cloud Profiler

## 📋 Prerequisites

- Node.js 20+
- Google Cloud Project with the following APIs enabled:
  - Vertex AI API
  - Cloud Run API
  - Cloud Text-to-Speech API
  - Firestore API
- Google Cloud SDK (`gcloud`) installed and configured

## 🚀 Quick Start

### 前提条件の確認

- Node.js 20+ がインストールされていること
- Google Cloud プロジェクトが作成済みであること

### 詳細なセットアップ手順

1. **リポジトリのクローン**
   ```bash
   git clone https://github.com/yourusername/ai-rap-battle.git
   cd ai-rap-battle
   ```

2. **Google Cloud認証の設定**
   ```bash
   # サービスアカウントキーを配置
   # Google Cloud ConsoleからダウンロードしたJSONファイルをプロジェクトルートに配置
   cp ~/Downloads/your-service-account-key.json ./service-account-key.json
   
   # 環境変数で認証ファイルを指定
   export GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json
   ```

3. **環境変数の設定**
   ```bash
   # 環境変数ファイルをコピー
   cp .env.template .env
   
   # .envファイルを編集して以下の必須項目を設定
   # GOOGLE_CLOUD_PROJECT_ID=your-actual-project-id
   # JWT_SECRET=your-secure-jwt-secret-here
   # SESSION_SECRET=your-secure-session-secret-here
   ```

4. **依存関係のインストール**
   ```bash
   # ルートディレクトリで全ワークスペースの依存関係をインストール
   npm install
   
   # 共有パッケージをビルド
   npm run build:shared
   ```

5. **アプリケーションの起動**

   **開発モード（推奨）**:
   ```bash
   # フロントエンドとバックエンドを同時に起動
   npm run dev
   ```

   **個別に起動する場合**:
   ```bash
   # ターミナル1: バックエンドを起動
   npm run dev:backend
   
   # ターミナル2: フロントエンドを起動
   npm run dev:frontend
   ```

6. **アプリケーションへのアクセス**
   - フロントエンド: http://localhost:3456
   - バックエンド API: http://localhost:8456
   - ヘルスチェック: http://localhost:8456/health

### トラブルシューティング

**ポートが使用中の場合**:
```bash
# 使用中のポートを確認
lsof -i :3456
lsof -i :8456

# プロセスを終了
kill -9 <PID>
```

**Google Cloud認証エラーの場合**:
```bash
# 認証を確認
gcloud auth application-default login

# プロジェクトIDを確認
gcloud config get-value project
```

### 開発用コマンド

```bash
# テストの実行
npm test

# リントの実行
npm run lint

# 型チェック
npm run type-check

# ビルド
npm run build
```

## 🚀 Deployment

### Deploy to Google Cloud

1. **Configure Google Cloud**
   ```bash
   gcloud config set project YOUR_PROJECT_ID
   gcloud auth application-default login
   ```

2. **Deploy Backend**
   ```bash
   npm run deploy:backend
   ```

3. **Deploy Frontend**
   ```bash
   npm run deploy:frontend
   ```

### Using Cloud Build

```bash
gcloud builds submit --config cloudbuild.yaml
```

## 🔧 Configuration

Key environment variables:

- `GOOGLE_CLOUD_PROJECT_ID`: Your GCP project ID
- `VERTEX_AI_LOCATION`: Region for Vertex AI (default: us-central1)
- `GEMINI_FLASH_MODEL`: Model ID for quick responses
- `GEMINI_PRO_MODEL`: Model ID for creative content
- `COMPLIANCE_THRESHOLD`: Safety threshold (0-1)
- `RATE_LIMIT_REQUESTS_PER_MINUTE`: API rate limiting

See `.env.template` for full configuration options.

## 📊 Performance Optimization

- **WebSocket Connection Pooling**: Efficient real-time communication
- **Redis Caching**: Fast session and battle state management
- **CDN Integration**: Static assets served via Firebase CDN
- **Lazy Loading**: Components loaded on-demand
- **Image Optimization**: Next.js automatic image optimization

## 🔒 Security

- **Authentication**: JWT-based authentication
- **Rate Limiting**: Request and WebSocket message limits
- **Input Validation**: Joi schema validation
- **Content Filtering**: Real-time compliance checks
- **CORS Protection**: Configurable origin whitelist

## 📈 Monitoring

- **Health Checks**: `/health` endpoint for uptime monitoring
- **Metrics**: Cloud Monitoring integration
- **Logging**: Structured logging with Winston
- **Tracing**: Distributed tracing with Cloud Trace
- **Profiling**: Performance profiling in production

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Google Cloud team for Vertex AI and infrastructure
- The open-source community for amazing tools and libraries