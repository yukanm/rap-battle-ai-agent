#!/bin/bash

# 本番環境用デプロイスクリプト（修正版で元のサービスを置き換え）
set -e

echo "=== 本番環境デプロイ開始 ==="

# 1. 修正版APIイメージをビルド
echo "1. 修正版APIイメージをビルド..."
docker build -t rap-agent-backend -f Dockerfile.fixed .

# 2. イメージをタグ付け
echo "2. イメージをタグ付け..."
docker tag rap-agent-backend gcr.io/rap-agent-202506/rap-agent-backend

# 3. イメージをプッシュ
echo "3. イメージをプッシュ..."
docker push gcr.io/rap-agent-202506/rap-agent-backend

# 4. 本番サービスを更新（修正版で置き換え）
echo "4. 本番サービスを更新..."
gcloud run deploy rap-agent-backend \
  --image gcr.io/rap-agent-202506/rap-agent-backend \
  --platform managed \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 2Gi \
  --cpu 2 \
  --timeout 600 \
  --max-instances 10 \
  --set-env-vars "GOOGLE_APPLICATION_CREDENTIALS=/app/rap-agent-202506-974cb26c7c90.json,DOCKER_ENV=true,DIALOGFLOW_PROJECT_ID=rap-agent-202506,DIALOGFLOW_LOCATION_ID=asia-northeast1,DIALOGFLOW_AGENT_ID=135b32f7-45b4-4781-8c58-9fe4044dbfa2,DIALOGFLOW_LANGUAGE_CODE=ja-JP"

echo "=== 本番環境デプロイ完了 ==="
echo "本番サービスのURLを確認してください"
echo "gcloud run services describe rap-agent-backend --region=asia-northeast1 --format='value(status.url)'"
echo ""
echo "動作確認:"
echo "curl -X POST https://[URL]/text_chat -H 'Content-Type: application/json' -d '{\"text\":\"こんにちは\"}'" 