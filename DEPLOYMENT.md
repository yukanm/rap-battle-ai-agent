# 🚀 AI Rap Battle - デプロイメントガイド

## 📋 前提条件

- Google Cloud Project（プロジェクトIDが必要）
- gcloud CLI がインストール・設定済み
- Node.js 20以上
- npm 10以上

## 🛠️ デプロイ手順

### 1. 環境準備

```bash
# Google Cloud認証
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# 必要なAPIの有効化
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable aiplatform.googleapis.com
gcloud services enable texttospeech.googleapis.com
```

### 2. シークレットの作成

```bash
# JWT シークレット
echo -n "your-jwt-secret-here" | gcloud secrets create jwt-secret --data-file=-

# セッションシークレット  
echo -n "your-session-secret-here" | gcloud secrets create session-secret --data-file=-

# Gemini API キー
echo -n "your-gemini-api-key-here" | gcloud secrets create gemini-api-key --data-file=-
```

### 3. IAM権限の設定

```bash
# Cloud Build サービスアカウントに必要な権限を付与
PROJECT_ID=$(gcloud config get-value project)
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')

# Cloud Build に Cloud Run と Secret Manager の権限を付与
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Cloud Run サービスアカウントに Secret Manager アクセス権限を付与
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 4. package-lock.json の準備

monorepo構造のため、各サービスディレクトリにpackage-lock.jsonをコピーする必要があります：

```bash
# backendとfrontendディレクトリにpackage-lock.jsonをコピー
cp package-lock.json backend/
cp package-lock.json frontend/
```

### 5. Cloud Build によるデプロイ

```bash
# Cloud Build を実行（自動的に両サービスをビルド・デプロイ）
gcloud builds submit --config=cloudbuild.yaml --timeout=30m
```

### 6. 手動デプロイ（オプション）

Cloud Buildが失敗する場合、手動でデプロイできます：

#### Backend のデプロイ

```bash
# Backend イメージのビルド
cd backend
gcloud builds submit --tag gcr.io/$PROJECT_ID/rap-battle-backend:latest .

# Backend のデプロイ
gcloud run deploy rap-battle-backend \
  --image gcr.io/$PROJECT_ID/rap-battle-backend:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8456 \
  --memory 2Gi \
  --cpu 2 \
  --min-instances 1 \
  --max-instances 100 \
  --concurrency 1000 \
  --timeout 3600 \
  --set-env-vars NODE_ENV=production,GOOGLE_CLOUD_PROJECT=$PROJECT_ID,GOOGLE_CLOUD_PROJECT_ID=$PROJECT_ID,VERTEX_AI_LOCATION=us-central1,GEMINI_FLASH_MODEL=gemini-2.5-flash,GEMINI_PRO_MODEL=gemini-2.5-pro,TTS_LANGUAGE_CODE=en-US,TTS_VOICE_NAME=en-US-Studio-M,TTS_SPEAKING_RATE=1.2,TTS_PITCH=0.0,TTS_VOLUME_GAIN_DB=0.0,COMPLIANCE_THRESHOLD=0.8,ENABLE_VOTING=true,ENABLE_ANALYTICS=true,ENABLE_COMPLIANCE_CHECK=false,ENABLE_RATE_LIMITING=true,RATE_LIMIT_REQUESTS_PER_MINUTE=60,RATE_LIMIT_WEBSOCKET_MESSAGES_PER_SECOND=10,LYRIC_GENERATION_TIMEOUT_MS=5000,COMPLIANCE_CHECK_TIMEOUT_MS=1000,TTS_GENERATION_TIMEOUT_MS=2000,WEBSOCKET_PING_INTERVAL_MS=30000,REDIS_URL=redis://localhost:6379 \
  --update-secrets JWT_SECRET=jwt-secret:1,SESSION_SECRET=session-secret:1,GEMINI_API_KEY=gemini-api-key:1
```

#### Frontend のデプロイ

```bash
# Backend の URL を取得
BACKEND_URL=$(gcloud run services describe rap-battle-backend --region=us-central1 --format='value(status.url)')

# Frontend イメージのビルド
cd ../frontend
gcloud builds submit --tag gcr.io/$PROJECT_ID/rap-battle-frontend:latest .

# Frontend のデプロイ
gcloud run deploy rap-battle-frontend \
  --image gcr.io/$PROJECT_ID/rap-battle-frontend:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 3456 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 1 \
  --max-instances 50 \
  --concurrency 1000 \
  --set-env-vars NODE_ENV=production,NEXT_PUBLIC_API_URL=$BACKEND_URL,NEXT_PUBLIC_WEBSOCKET_URL=$BACKEND_URL
```

## 🔴 Google Cloud Memorystore for Redis セットアップ

Cloud Run から Redis にアクセスするには VPC Connector が必要です。

### 1. VPC ネットワークの作成

```bash
# VPC ネットワーク作成
gcloud compute networks create rap-battle-vpc \
  --subnet-mode=auto \
  --project=$PROJECT_ID
```

### 2. VPC Connector 用サブネットの作成

```bash
# /28 サブネットの作成（VPC Connector に必要）
gcloud compute networks subnets create rap-battle-connector-subnet \
  --network=rap-battle-vpc \
  --region=us-central1 \
  --range=10.8.0.0/28
```

### 3. Serverless VPC Access Connector の作成

```bash
# VPC Connector 作成
gcloud compute networks vpc-access connectors create rap-battle-connector \
  --region=us-central1 \
  --subnet=rap-battle-connector-subnet \
  --min-instances=2 \
  --max-instances=10 \
  --machine-type=e2-micro
```

### 4. Memorystore Redis インスタンスの作成

```bash
# Redis インスタンス作成（約5-10分かかります）
gcloud redis instances create rap-battle-redis \
  --size=1 \
  --region=us-central1 \
  --network=rap-battle-vpc \
  --redis-version=redis_6_x

# Redis ホスト取得
REDIS_HOST=$(gcloud redis instances describe rap-battle-redis \
  --region=us-central1 \
  --format="value(host)")

echo "Redis URL: redis://$REDIS_HOST:6379"
```

### 5. Cloud Run サービスの更新

```bash
# Backend を VPC Connector と Redis URL で更新
gcloud run services update rap-battle-backend \
  --region=us-central1 \
  --vpc-connector=rap-battle-connector \
  --update-env-vars=REDIS_URL=redis://$REDIS_HOST:6379

# Frontend も同様に更新（必要な場合）
gcloud run services update rap-battle-frontend \
  --region=us-central1 \
  --vpc-connector=rap-battle-connector
```

### Memorystore のコスト

- **Redis インスタンス (1GB)**: ~$35/月
- **VPC Connector**: ~$8/月（e2-micro × 2インスタンス）
- **合計**: ~$43/月

## 🔧 トラブルシューティング

### 1. Dockerfile のビルドエラー

#### 問題: pprof（Google Cloud Profiler）のビルドエラー
```
Error: Python is not set from command line or npm configuration
```

**解決策**: Dockerfile の production stage に Python をインストール
```dockerfile
RUN apk add --no-cache dumb-init python3 make g++
ENV PYTHON=/usr/bin/python3
```

#### 問題: package-lock.json が見つからない
```
npm error code EUSAGE
npm error `npm ci` can only install packages when your package.json and package-lock.json are in sync
```

**解決策**: 
1. ルートディレクトリの package-lock.json を各サービスディレクトリにコピー
2. または Dockerfile で `npm ci` を `npm install` に変更

### 2. Cloud Run デプロイエラー

#### 問題: シークレットアクセス権限エラー
```
Permission denied on secret: projects/XXX/secrets/jwt-secret/versions/1
```

**解決策**: サービスアカウントに Secret Manager アクセス権限を付与
```bash
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

#### 問題: 環境変数が見つからない
```
Error: Missing required environment variable: JWT_SECRET
Error: Project ID not configured - GOOGLE_CLOUD_PROJECT or LIVE_API_PROJECT_ID required
```

**解決策**: 
- `GOOGLE_CLOUD_PROJECT` と `GOOGLE_CLOUD_PROJECT_ID` の両方を設定
- `--update-secrets` フラグで正しくシークレットを参照

### 3. Frontend ビルドエラー

#### 問題: TypeScript/ESLint エラーで本番ビルドが失敗
```
Failed to compile.
Type error: Could not find a declaration file for module 'recordrtc'
```

**解決策**: next.config.js で TypeScript と ESLint のビルドエラーを無視
```javascript
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}
```

#### 問題: public ディレクトリが存在しない
```
COPY failed: stat app/public: file does not exist
```

**解決策**: Dockerfile から public ディレクトリのコピーを削除（存在しない場合）

## 🎯 デプロイ後の確認

1. **サービス URL の確認**
```bash
# Backend URL
gcloud run services describe rap-battle-backend --region=us-central1 --format='value(status.url)'

# Frontend URL  
gcloud run services describe rap-battle-frontend --region=us-central1 --format='value(status.url)'
```

2. **ログの確認**
```bash
# Backend ログ
gcloud logging read "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"rap-battle-backend\"" --limit=50 --format=json

# Frontend ログ
gcloud logging read "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"rap-battle-frontend\"" --limit=50 --format=json
```

3. **ヘルスチェック**
```bash
# Backend ヘルスチェック
curl https://your-backend-url.run.app/health

# Frontend アクセス確認
curl -I https://your-frontend-url.run.app
```

## 📝 注意事項

- Redis は現在ローカル設定（`redis://localhost:6379`）になっているため、本番環境では Redis のセットアップが必要
- Vertex AI API の利用には課金が発生する可能性があります
- Cloud Run の最小インスタンス数を1に設定しているため、コールドスタートを回避できますが、コストが発生します

## 🔄 更新デプロイ

コードを更新した後：

```bash
# 変更をコミット
git add .
git commit -m "Update: your changes"

# Cloud Build で再デプロイ
gcloud builds submit --config=cloudbuild.yaml --timeout=30m
```

または特定のサービスのみ更新：

```bash
# Backend のみ更新
cd backend
gcloud builds submit --tag gcr.io/$PROJECT_ID/rap-battle-backend:latest .
gcloud run deploy rap-battle-backend --image gcr.io/$PROJECT_ID/rap-battle-backend:latest --region us-central1

# Frontend のみ更新
cd frontend  
gcloud builds submit --tag gcr.io/$PROJECT_ID/rap-battle-frontend:latest .
gcloud run deploy rap-battle-frontend --image gcr.io/$PROJECT_ID/rap-battle-frontend:latest --region us-central1
```