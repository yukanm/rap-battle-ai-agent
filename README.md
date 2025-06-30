# Rap Agent - 音声認識チャットアプリ

**⚠️ このブランチは現在開発中です。Google Agent Hackathon提出用ブランチは以下です：**

- [v1ブランチ](https://github.com/yukanm/rap-battle-ai-agent/tree/v1)
- [v1_humanvsaiブランチ](https://github.com/yukanm/rap-battle-ai-agent/tree/v1_humanvsai)

---

ラップエージェントと音声で対話できるチャットアプリケーションです。Google CloudのDialogflow CX、Speech-to-Text、Text-to-Speechサービスを活用して、自然な音声対話を実現します。

## 🏗️ アーキテクチャ

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Backend   │────▶│ Dialogflow  │
│  (React)    │     │ (FastAPI)   │     │     CX      │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                    ┌───────┼───────┐
                    │       │       │
              ┌─────▼─────┐ │ ┌─────▼─────┐
              │ Speech-to │ │ │ Text-to-  │
              │   Text    │ │ │  Speech   │
              └───────────┘ │ └───────────┘
                           │
                    ┌───────▼───────┐
                    │ Google Cloud  │
                    │   Services    │
                    └───────────────┘
```

## 🚀 機能

- **テキストチャット**: Dialogflow CXを使用した自然な対話
- **音声チャット**: 音声入力と音声応答による対話
- **セッション管理**: 継続的な会話コンテキストの保持
- **リアルタイム処理**: 高速な音声認識と合成
- **レスポンシブUI**: モダンなReactベースのフロントエンド

## 🛠️ 技術スタック

### フロントエンド
- **React 18** - UIフレームワーク
- **TypeScript** - 型安全な開発
- **Tailwind CSS** - スタイリング
- **Lucide React** - アイコン
- **Nginx** - 本番環境での静的ファイル配信

### バックエンド
- **FastAPI** - 高速なPython Webフレームワーク
- **Uvicorn** - ASGIサーバー
- **Google Cloud Dialogflow CX** - 自然言語処理
- **Google Cloud Speech-to-Text** - 音声認識
- **Google Cloud Text-to-Speech** - 音声合成

### インフラ
- **Google Cloud Run** - サーバーレスコンテナ実行環境
- **Docker** - コンテナ化
- **Google Container Registry** - コンテナイメージ管理

## 📁 プロジェクト構造

```
rap-agent/
├── app/                          # バックエンドアプリケーション
│   ├── api_server.py            # FastAPIメインサーバー
│   ├── dialogflow_client.py     # Dialogflow CXクライアント
│   ├── stt.py                   # Speech-to-Text処理
│   ├── tts.py                   # Text-to-Speech処理
│   └── requirements.txt         # Python依存関係
├── frontend/                     # フロントエンドアプリケーション
│   ├── src/                     # Reactソースコード
│   ├── public/                  # 静的ファイル
│   ├── package.json            # Node.js依存関係
│   └── Dockerfile              # フロントエンド用Dockerfile
├── Dockerfile                   # バックエンド用Dockerfile
├── deploy-production.sh         # 本番デプロイスクリプト
├── start_local.sh              # ローカル開発用スクリプト
└── README.md                   # このファイル
```

## 🚀 クイックスタート

### 前提条件

- Google Cloud Platform アカウント
- Google Cloud CLI (`gcloud`)
- Docker
- Node.js 18+
- Python 3.10+

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd rap-agent
```

### 2. Google Cloud設定

```bash
# Google Cloudにログイン
gcloud auth login

# プロジェクトを設定
gcloud config set project YOUR_PROJECT_ID

# 必要なAPIを有効化
gcloud services enable dialogflow.googleapis.com
gcloud services enable speech.googleapis.com
gcloud services enable texttospeech.googleapis.com
gcloud services enable run.googleapis.com
```

### 3. 認証情報の設定

#### サービスアカウントの作成

1. **Google Cloud Console**でIAM & Admin > Service Accountsに移動
2. **Create Service Account**をクリック
3. サービスアカウント名を入力（例：`rap-agent-service`）
4. 以下の権限を付与：
   - Dialogflow API User
   - Cloud Speech-to-Text User
   - Cloud Text-to-Speech User
   - Cloud Run Admin（デプロイ用）

#### 認証キーの作成

1. 作成したサービスアカウントの詳細ページで**Keys**タブを選択
2. **Add Key** > **Create new key**をクリック
3. **JSON**形式を選択してダウンロード
4. ダウンロードしたJSONファイルをプロジェクトルートに配置
5. 環境変数`GOOGLE_APPLICATION_CREDENTIALS`にファイルパスを設定

### 4. ローカル開発

#### バックエンドの起動

```bash
# バックエンドの依存関係をインストール
cd app
pip install -r requirements.txt

# バックエンドを起動
python -m uvicorn api_server:app --host 0.0.0.0 --port 8081 --reload
```

#### フロントエンドの起動

```bash
# フロントエンドの依存関係をインストール
cd frontend
npm install

# フロントエンドを起動
npm start
```

### 5. 本番デプロイ

```bash
# 本番環境にデプロイ
chmod +x deploy-production.sh
./deploy-production.sh
```

## 🔧 環境変数

### バックエンド

| 変数名 | 説明 | 設定方法 |
|--------|------|----------|
| `DIALOGFLOW_PROJECT_ID` | Dialogflow CXプロジェクトID | Google CloudプロジェクトID |
| `DIALOGFLOW_LOCATION_ID` | Dialogflow CXロケーション | `asia-northeast1`等 |
| `DIALOGFLOW_AGENT_ID` | Dialogflow CXエージェントID | Dialogflow CXコンソールで確認 |
| `DIALOGFLOW_LANGUAGE_CODE` | 言語コード | `ja-JP`等 |
| `GOOGLE_APPLICATION_CREDENTIALS` | 認証情報ファイルパス | サービスアカウントキーのJSONファイルパス |

### フロントエンド

| 変数名 | 説明 | デフォルト値 |
|--------|------|-------------|
| `REACT_APP_API_URL` | バックエンドAPIのURL | `http://localhost:8081` |

## 📡 API エンドポイント

### テキストチャット
```
POST /text_chat
Content-Type: application/json

{
  "text": "こんにちは",
  "session_id": "optional-session-id"
}
```

### 音声チャット
```
POST /voice_chat
Content-Type: multipart/form-data

file: [音声ファイル]
```

### ヘルスチェック
```
GET /health
```

## 🎯 主な機能の詳細

### Dialogflow CX統合
- 自然言語理解によるインテント検出
- コンテキストを保持した継続的な会話
- カスタムエージェントによるラップ対話

### 音声処理
- **Speech-to-Text**: 複数の音声形式に対応（MP3, WAV, WebM, M4A等）
- **Text-to-Speech**: 日本語音声合成（MP3形式）
- 自動音声形式検出と適切な処理

### セッション管理
- UUIDベースのセッションID生成
- 会話コンテキストの保持
- 複数ユーザー対応

## 🔍 トラブルシューティング

### よくある問題

1. **404エラー**: バックエンドサービスが正常に起動していない
2. **音声認識エラー**: 音声ファイル形式が対応外
3. **CORSエラー**: フロントエンドとバックエンドのオリジン設定
4. **認証エラー**: サービスアカウントキーが正しく設定されていない

### ログの確認

```bash
# Cloud Runサービスのログを確認
gcloud run services logs read rap-agent-backend --region=asia-northeast1
```

## 📝 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📞 サポート

問題や質問がある場合は、GitHubのIssuesページでお知らせください。 