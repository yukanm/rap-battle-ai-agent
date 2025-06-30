#!/bin/bash

# AI Agent MC Battle - 最小コストデプロイスクリプト

set -e

echo "🚀 AI Agent MC Battle - Minimal Cost Deployment"
echo "=============================================="

# 環境変数チェック
if [ -z "$GOOGLE_CLOUD_PROJECT_ID" ]; then
  echo "❌ Error: GOOGLE_CLOUD_PROJECT_ID is not set"
  exit 1
fi

PROJECT_ID=$GOOGLE_CLOUD_PROJECT_ID
REGION=${GOOGLE_CLOUD_REGION:-asia-northeast1}
SERVICE_NAME="ai-agent-mc-battle"

echo "📋 Configuration:"
echo "  Project ID: $PROJECT_ID"
echo "  Region: $REGION"
echo "  Service: $SERVICE_NAME"
echo ""

# GCloud 設定
echo "🔧 Setting up gcloud..."
gcloud config set project $PROJECT_ID
gcloud config set compute/region $REGION

# API 有効化（最小限）
echo "🔌 Enabling required APIs..."
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  firestore.googleapis.com \
  texttospeech.googleapis.com \
  aiplatform.googleapis.com

# Artifact Registry 確認/作成
echo "📦 Setting up Artifact Registry..."
if ! gcloud artifacts repositories describe $SERVICE_NAME --location=$REGION &>/dev/null; then
  gcloud artifacts repositories create $SERVICE_NAME \
    --repository-format=docker \
    --location=$REGION \
    --description="AI Agent MC Battle Docker images"
fi

# Docker 認証
echo "🔐 Configuring Docker authentication..."
gcloud auth configure-docker ${REGION}-docker.pkg.dev

# バックエンドイメージのビルド
echo "🏗️  Building backend Docker image..."
IMAGE_URL="${REGION}-docker.pkg.dev/${PROJECT_ID}/${SERVICE_NAME}/backend:latest"
docker build -f backend/Dockerfile.minimal -t $IMAGE_URL .

# イメージのプッシュ
echo "📤 Pushing Docker image..."
docker push $IMAGE_URL

# Cloud Run デプロイ（最小構成）
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME}-backend \
  --image $IMAGE_URL \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 3 \
  --cpu 1 \
  --memory 1Gi \
  --timeout 60 \
  --concurrency 80 \
  --cpu-throttling \
  --port 8080 \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "GOOGLE_CLOUD_PROJECT_ID=$PROJECT_ID" \
  --set-env-vars "PORT=8080" \
  --set-env-vars "CLOUD_RUN_PORT=8080"

# バックエンドURLを取得
BACKEND_URL=$(gcloud run services describe ${SERVICE_NAME}-backend \
  --platform managed \
  --region $REGION \
  --format 'value(status.url)')

echo "✅ Backend deployed at: $BACKEND_URL"

# フロントエンドのビルド設定
echo "🎨 Building frontend..."
cd frontend

# 環境変数を設定してビルド
cat > .env.production.local << EOF
NEXT_PUBLIC_API_URL=$BACKEND_URL
NEXT_PUBLIC_WEBSOCKET_URL=${BACKEND_URL/https/wss}
EOF

# Next.js 設定を更新（静的エクスポート用）
cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true
  },
  trailingSlash: true,
}

module.exports = nextConfig
EOF

# ビルド実行
npm run build

# Firebase 設定
echo "🔥 Setting up Firebase Hosting..."
if [ ! -f "firebase.json" ]; then
  cat > firebase.json << 'EOF'
{
  "hosting": {
    "public": "out",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(jpg|jpeg|gif|png|svg|webp|js|css|eot|otf|ttf|ttc|woff|woff2|font.css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  }
}
EOF
fi

# Firebase デプロイ
echo "🚀 Deploying frontend to Firebase..."
firebase use $PROJECT_ID
firebase deploy --only hosting

# 完了メッセージ
echo ""
echo "✅ Deployment Complete!"
echo "=============================================="
echo "📍 Backend URL: $BACKEND_URL"
echo "📍 Frontend URL: https://${PROJECT_ID}.web.app"
echo ""
echo "💰 Cost Optimization Applied:"
echo "  - No Kubernetes (Cloud Run only)"
echo "  - No Load Balancer"
echo "  - Min instances: 0"
echo "  - Firebase Hosting (free tier)"
echo "  - Memory cache instead of Redis"
echo ""
echo "📊 Estimated Monthly Cost: $0-50"
echo ""

# コスト監視の設定
read -p "Do you want to set up budget alerts? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "💸 Setting up budget alert ($50/month)..."
  # 予算アラートの作成コマンド（課金アカウントIDが必要）
  echo "Please run:"
  echo "gcloud billing budgets create --billing-account=YOUR_BILLING_ACCOUNT_ID --display-name='AI Agent MC Battle' --budget-amount=50"
fi

echo "🎉 All done! Your AI Agent MC Battle is live!"