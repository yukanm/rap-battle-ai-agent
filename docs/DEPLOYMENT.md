# AI Rap Battle - Production Deployment Guide

## 🚀 クイックデプロイ (推奨)

### 事前準備（GCPコンソールで実施）

**必須:** 以下の手順はGCPコンソールで事前に実施してください：

1. **新しいGCPプロジェクトの作成**
   - [GCP Console](https://console.cloud.google.com)にアクセス
   - プロジェクトセレクターから「新しいプロジェクト」を作成
   - プロジェクト名を設定（例：`ai-rap-battle-prod`）
   - 課金アカウントを設定

2. **Gemini API Keyの取得**
   - [Google AI Studio](https://makersuite.google.com/app/apikey)にアクセス
   - 新しいAPIキーを作成
   - APIキーをメモしておく（後でSecret Managerに登録）

### 自動デプロイスクリプトの使用

```bash
# 環境変数を設定
export GOOGLE_CLOUD_PROJECT_ID=boxwood-scope-463317-b6
export GEMINI_API_KEY=your-gemini-api-key

# デプロイスクリプトを実行
./scripts/deploy.sh
```

このスクリプトは以下を自動的に実行します：
- Google Cloud認証
- 必要なAPIの有効化
- Firestoreデータベースの作成
- サービスアカウントの作成と権限設定
- Secret Managerでのシークレット管理
- Cloud Buildによるイメージビルド
- Cloud Runへのデプロイ
- 環境変数の設定

## 📋 前提条件

1. **Google Cloud SDK** がインストールされていること
   ```bash
   # インストール確認
   gcloud version
   ```

2. **適切な権限** を持つGoogleアカウント
   - Project Editor または Owner
   - Cloud Build Editor
   - Cloud Run Admin
   - Service Account Admin
   - Secret Manager Admin

3. **課金が有効** なGCPプロジェクト

4. **Gemini API Key** の取得完了

## 🔧 手動デプロイ手順

### 1. プロジェクト設定

```bash
# プロジェクトIDを設定
export PROJECT_ID=boxwood-scope-463317-b6
gcloud config set project $PROJECT_ID

# 認証
gcloud auth login
gcloud auth application-default login
```

### 2. APIの有効化

**権限エラーが発生する場合は、段階的に有効化してください：**

```bash
# Step 1: 基本的なAPIを有効化
echo "基本APIの有効化中..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Step 2: Google Cloud サービスAPI
echo "Google Cloud サービスAPIの有効化中..."
gcloud services enable firestore.googleapis.com
gcloud services enable texttospeech.googleapis.com
gcloud services enable aiplatform.googleapis.com
gcloud services enable secretmanager.googleapis.com

# Step 3: 監視・ログAPI（オプション - 権限エラーが出る場合はスキップ）
echo "監視・ログAPIの有効化中..."
gcloud services enable logging.googleapis.com || echo "Logging API: 権限不足でスキップ"
gcloud services enable monitoring.googleapis.com || echo "Monitoring API: 権限不足でスキップ"
gcloud services enable cloudtrace.googleapis.com || echo "Cloud Trace API: 権限不足でスキップ"

# 有効化されたAPIの確認
echo "有効化されたAPIの確認:"
gcloud services list --enabled --filter="name:(cloudbuild|run|firestore|texttospeech|aiplatform|secretmanager)"
```

**権限が不足している場合の代替手順：**
```bash
# プロジェクト所有者に依頼して、以下の権限を付与してもらう
# - Service Usage Admin (roles/serviceusage.serviceUsageAdmin)  
# - Project Editor (roles/editor) または Owner (roles/owner)

# または、GCPコンソールから手動でAPIを有効化：
# 1. https://console.cloud.google.com/apis/library
# 2. プロジェクト: boxwood-scope-463317-b6 を選択
# 3. 必要なAPIを検索して「有効にする」をクリック
```

### 3. Firestoreデータベースの作成

```bash
# Firestoreをネイティブモードで作成（一度だけ実行）
gcloud firestore databases create --location=us-central1

# インデックスの確認（必要に応じて作成）
gcloud firestore indexes field-overrides list
```

### 4. サービスアカウントの作成と権限設定

```bash
# サービスアカウント作成
gcloud iam service-accounts create rap-battle-sa \
    --display-name="AI Rap Battle Service Account"

# サービスアカウントのメールアドレスを変数に設定
SERVICE_ACCOUNT_EMAIL="rap-battle-sa@$PROJECT_ID.iam.gserviceaccount.com"

# 必要な権限を付与

# 🤖 Vertex AI (Gemini API) アクセス権限
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/aiplatform.user"

# 🗄️ Firestore データベースアクセス権限
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/datastore.user"

# 🎤 Speech-to-Text API (Live API音声認識用)
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/speech.client"

# 📊 Cloud Trace (分散トレーシング用)
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/cloudtrace.agent"

# 📝 Cloud Logging (ログ出力用)
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/logging.logWriter"

# 📈 Cloud Monitoring (メトリクス送信用)
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/monitoring.metricWriter"

# 🔐 Secret Manager (シークレット読み取り用)
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/secretmanager.secretAccessor"
```

### 5. Secret Managerでのシークレット設定

```bash
# ===========================================
# JWT Secret - JWTトークンの署名/検証に使用
# ===========================================
# 用途:
# - Live APIのEphemeralトークン生成・検証（一時認証トークン）
# - WebSocket認証（将来実装予定）
# - APIエンドポイントの認証トークン署名
# - ユーザーセッションの安全な識別
echo "JWT Secret作成中..."
openssl rand -base64 32 | gcloud secrets create jwt-secret --data-file=-

# ===========================================
# Session Secret - セッション管理の暗号化に使用
# ===========================================
# 用途:
# - Redisセッションストアの暗号化キー
# - Cookie署名とセッションID生成の暗号化
# - ユーザーセッション状態の安全な保存
# - CSRF攻撃防止のためのトークン生成
echo "Session Secret作成中..."
openssl rand -base64 32 | gcloud secrets create session-secret --data-file=-

# ===========================================
# Gemini API Key - Google AI APIアクセスに使用
# ===========================================
# 用途:
# - AIラップ歌詞生成のためのGemini API呼び出し
# - バトル対戦相手AIの応答生成
# - コンテンツモデレーション（不適切コンテンツのチェック）
# - Text-to-Speech用のコンテンツ生成
echo "Gemini API Key登録中..."
echo -n "$GEMINI_API_KEY" | gcloud secrets create gemini-api-key --data-file=-

# ===========================================
# Cloud Build Service Accountに権限付与
# ===========================================
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
CLOUDBUILD_SA="$PROJECT_NUMBER@cloudbuild.gserviceaccount.com"

echo "Cloud Build Service Accountに権限付与中..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$CLOUDBUILD_SA" \
    --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$CLOUDBUILD_SA" \
    --role="roles/iam.serviceAccountUser"

# ===========================================
# Secret使用方法の確認
# ===========================================
echo "作成されたSecretの確認:"
gcloud secrets list --filter="name:jwt-secret OR name:session-secret OR name:gemini-api-key"

echo ""
echo "🔐 各Secret の用途:"
echo "📝 jwt-secret: JWTトークン署名 → Live API認証、WebSocket認証"
echo "🗝️  session-secret: セッション暗号化 → Redis セッション、Cookie署名"  
echo "🤖 gemini-api-key: AI API呼び出し → 歌詞生成、コンテンツ審査"

echo ""
echo "ℹ️  API権限について:"
echo "🎤 Speech-to-Text: Live API音声認識用 (roles/speech.client)"
echo "🔊 Text-to-Speech: Cloud Run基本権限で利用可能 (専用ロール不要)"
echo "🤖 Gemini API: Vertex AI権限で利用可能 (roles/aiplatform.user)"
```

### 6. cloudbuild.yamlの環境変数設定を更新

実際のデプロイでは、Secret Managerから環境変数を読み込むように設定が必要です：

```bash
# Cloud Buildでデプロイ（Secret Manager使用）
gcloud builds submit \
    --config=cloudbuild.yaml \
    --substitutions=_SERVICE_ACCOUNT_EMAIL=$SERVICE_ACCOUNT_EMAIL
```

**重要:** 本番環境では、cloudbuild.yamlの環境変数設定を以下のように変更することを推奨：

```yaml
# 本番環境用の環境変数設定例
--set-env-vars:
  NODE_ENV=production,
  GOOGLE_CLOUD_PROJECT_ID=$PROJECT_ID,
  VERTEX_AI_LOCATION=us-central1,
  GEMINI_FLASH_MODEL=gemini-2.5-flash,
  GEMINI_PRO_MODEL=gemini-2.5-pro
--update-secrets:
  JWT_SECRET=jwt-secret:latest,
  SESSION_SECRET=session-secret:latest,
  GEMINI_API_KEY=gemini-api-key:latest
--service-account:
  $SERVICE_ACCOUNT_EMAIL
```

### 7. カスタムドメインの設定（オプション）

```bash
# Cloud Runサービスにドメインマッピングを追加
gcloud run domain-mappings create \
    --service=rap-battle-frontend \
    --domain=your-domain.com \
    --region=us-central1
```

## 🔍 デプロイ後の確認

### サービスURLの取得

```bash
# バックエンドURL取得
BACKEND_URL=$(gcloud run services describe rap-battle-backend \
    --region=us-central1 \
    --format='value(status.url)')
echo "Backend URL: $BACKEND_URL"

# フロントエンドURL取得
FRONTEND_URL=$(gcloud run services describe rap-battle-frontend \
    --region=us-central1 \
    --format='value(status.url)')
echo "Frontend URL: $FRONTEND_URL"
```

### ヘルスチェックとAPI確認

```bash
# バックエンドのヘルスチェック
curl $BACKEND_URL/health

# バックエンドのAPIエンドポイント確認
curl $BACKEND_URL/api/health

# バトル作成APIのテスト
curl -X POST $BACKEND_URL/api/battles \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Battle","description":"Test Description"}'

# フロントエンドの確認
curl -I $FRONTEND_URL
```

### WebSocket接続の確認

```bash
# WebSocketエンドポイントの確認
echo "WebSocket URL: ${BACKEND_URL/https:/wss:}/socket.io/"

# 手動テスト用: ブラウザで以下のURLを開いてWebSocket機能をテスト
echo "Test WebSocket: $FRONTEND_URL/test-ws"
```

### ログの確認

```bash
# バックエンドのログ（過去1時間）
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=rap-battle-backend" \
    --limit=50 \
    --since=1h

# フロントエンドのログ
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=rap-battle-frontend" \
    --limit=50 \
    --since=1h

# エラーログのみ表示
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=rap-battle-backend AND severity>=ERROR" \
    --limit=20
```

### Firestoreデータベースの確認

```bash
# Firestoreのコレクション確認
gcloud firestore collections list

# バトルコレクションのデータ確認（最初の5件）
gcloud firestore export gs://$PROJECT_ID-firestore-backup/$(date +%Y-%m-%d) \
    --collection-ids=battles
```

### メトリクスとパフォーマンスの確認

```bash
# CPU使用率
gcloud monitoring time-series list \
    --filter='metric.type="run.googleapis.com/container/cpu/utilizations" AND resource.label.service_name="rap-battle-backend"' \
    --interval.end-time=$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ) \
    --interval.start-time=$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S.%3NZ)

# メモリ使用量
gcloud monitoring time-series list \
    --filter='metric.type="run.googleapis.com/container/memory/utilizations" AND resource.label.service_name="rap-battle-backend"' \
    --interval.end-time=$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ) \
    --interval.start-time=$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S.%3NZ)

# リクエスト数
gcloud monitoring time-series list \
    --filter='metric.type="run.googleapis.com/request_count" AND resource.label.service_name="rap-battle-backend"'
```

## 🚨 トラブルシューティング

### デプロイが失敗する場合

1. **API有効化エラー**
   ```bash
   # 課金アカウントが設定されているか確認
   gcloud billing accounts list
   gcloud billing projects describe $PROJECT_ID
   ```

2. **Secret Manager権限エラー**
   ```bash
   # Secret Managerの権限を再設定
   gcloud secrets add-iam-policy-binding jwt-secret \
       --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
       --role="roles/secretmanager.secretAccessor"
   ```

3. **Firestore初期化エラー**
   ```bash
   # Firestoreが作成されているか確認
   gcloud firestore databases list
   
   # Firestoreがない場合は作成
   gcloud firestore databases create --location=us-central1
   ```

4. **Cloud Build権限エラー**
   ```bash
   # Cloud Build Service Accountに必要な権限を付与
   PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
   gcloud projects add-iam-policy-binding $PROJECT_ID \
       --member="serviceAccount:$PROJECT_NUMBER@cloudbuild.gserviceaccount.com" \
       --role="roles/run.admin"
   
   gcloud projects add-iam-policy-binding $PROJECT_ID \
       --member="serviceAccount:$PROJECT_NUMBER@cloudbuild.gserviceaccount.com" \
       --role="roles/iam.serviceAccountUser"
   ```

5. **ビルドエラー**
   ```bash
   # 最新のビルドログを確認
   BUILD_ID=$(gcloud builds list --limit=1 --format="value(id)")
   gcloud builds log $BUILD_ID
   
   # Docker イメージの確認
   gcloud container images list --repository=gcr.io/$PROJECT_ID
   ```

### アプリケーション起動エラー

1. **バックエンドが起動しない**
   ```bash
   # Cloud Runサービスの詳細確認
   gcloud run services describe rap-battle-backend \
       --region=us-central1 \
       --format="export"
   
   # 環境変数の確認
   gcloud run services describe rap-battle-backend \
       --region=us-central1 \
       --format="value(spec.template.spec.template.spec.containers[0].env[].name,spec.template.spec.template.spec.containers[0].env[].value)"
   ```

2. **環境変数が正しく設定されていない**
   ```bash
   # Secret Managerの値を確認
   gcloud secrets versions access latest --secret="jwt-secret"
   gcloud secrets versions access latest --secret="gemini-api-key"
   
   # Cloud Runサービスの環境変数を更新
   gcloud run services update rap-battle-backend \
       --region=us-central1 \
       --update-secrets="JWT_SECRET=jwt-secret:latest,SESSION_SECRET=session-secret:latest,GEMINI_API_KEY=gemini-api-key:latest"
   ```

3. **Gemini API接続エラー**
   ```bash
   # APIキーの有効性をテスト
   curl -H "Authorization: Bearer $(gcloud auth print-access-token)" \
        -H "Content-Type: application/json" \
        "https://generativelanguage.googleapis.com/v1/models?key=$(gcloud secrets versions access latest --secret=gemini-api-key)"
   ```

### パフォーマンスの問題

1. **レスポンスが遅い（AI生成処理）**
   ```bash
   # タイムアウト設定を確認・調整
   gcloud run services update rap-battle-backend \
       --region=us-central1 \
       --timeout=3600 \
       --cpu=2 \
       --memory=2Gi
   ```

2. **WebSocket接続が頻繁に切れる**
   ```bash
   # Keep-alive設定とタイムアウトを確認
   gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=rap-battle-backend" \
       --filter="textPayload:websocket" \
       --limit=20
   ```

3. **Firestore接続エラー**
   ```bash
   # Firestoreの読み書き権限を確認
   gcloud firestore indexes list
   
   # Firestore使用量の確認
   gcloud logging read "resource.type=cloud_firestore_database" --limit=10
   ```

### フロントエンド関連の問題

1. **バックエンドAPIに接続できない**
   ```bash
   # フロントエンドの環境変数を確認
   gcloud run services describe rap-battle-frontend \
       --region=us-central1 \
       --format="value(spec.template.spec.template.spec.containers[0].env[].name,spec.template.spec.template.spec.containers[0].env[].value)"
   
   # CORS設定を確認（必要に応じてフロントエンドURLを許可）
   FRONTEND_URL=$(gcloud run services describe rap-battle-frontend --region=us-central1 --format='value(status.url)')
   gcloud run services update rap-battle-backend \
       --region=us-central1 \
       --update-env-vars="ALLOWED_ORIGINS=http://localhost:3000,$FRONTEND_URL"
   ```

## 📊 本番環境の推奨設定

### Cloud Run設定

**Backend (rap-battle-backend):**
```bash
# 本番環境用設定更新
gcloud run services update rap-battle-backend \
    --region=us-central1 \
    --cpu=2 \
    --memory=2Gi \
    --min-instances=1 \
    --max-instances=100 \
    --concurrency=1000 \
    --timeout=3600 \
    --port=8456 \
    --service-account=$SERVICE_ACCOUNT_EMAIL
```

**Frontend (rap-battle-frontend):**
```bash
# 本番環境用設定更新
gcloud run services update rap-battle-frontend \
    --region=us-central1 \
    --cpu=1 \
    --memory=1Gi \
    --min-instances=1 \
    --max-instances=50 \
    --concurrency=1000 \
    --port=3456
```

### 重要な環境変数設定

```bash
# バックエンドの本番環境設定
gcloud run services update rap-battle-backend \
    --region=us-central1 \
    --update-env-vars="
NODE_ENV=production,
GOOGLE_CLOUD_PROJECT_ID=$PROJECT_ID,
VERTEX_AI_LOCATION=us-central1,
GEMINI_FLASH_MODEL=gemini-2.5-flash,
GEMINI_PRO_MODEL=gemini-2.5-pro,
TTS_LANGUAGE_CODE=en-US,
TTS_VOICE_NAME=en-US-Studio-M,
TTS_SPEAKING_RATE=1.2,
TTS_PITCH=0.0,
TTS_VOLUME_GAIN_DB=0.0,
COMPLIANCE_THRESHOLD=0.8,
ENABLE_VOTING=true,
ENABLE_ANALYTICS=true,
ENABLE_COMPLIANCE_CHECK=false,
ENABLE_RATE_LIMITING=true,
RATE_LIMIT_REQUESTS_PER_MINUTE=60,
RATE_LIMIT_WEBSOCKET_MESSAGES_PER_SECOND=10,
LYRIC_GENERATION_TIMEOUT_MS=5000,
COMPLIANCE_CHECK_TIMEOUT_MS=1000,
TTS_GENERATION_TIMEOUT_MS=2000,
WEBSOCKET_PING_INTERVAL_MS=30000,
ENABLE_CLOUD_LOGGING=true,
ENABLE_CLOUD_TRACE=true,
ENABLE_CLOUD_PROFILER=true,
LOG_LEVEL=info
" \
    --update-secrets="
JWT_SECRET=jwt-secret:latest,
SESSION_SECRET=session-secret:latest,
GEMINI_API_KEY=gemini-api-key:latest
"
```

### パフォーマンス監視の設定

```bash
# Cloud Monitoringアラートの作成
gcloud alpha monitoring policies create --policy-from-file=- <<EOF
{
  "displayName": "AI Rap Battle - High CPU Usage",
  "conditions": [
    {
      "displayName": "CPU usage is high",
      "conditionThreshold": {
        "filter": "resource.type=\"cloud_run_revision\" resource.label.service_name=\"rap-battle-backend\"",
        "comparison": "COMPARISON_GREATER_THAN",
        "thresholdValue": 0.8,
        "duration": "300s"
      }
    }
  ],
  "alertStrategy": {
    "autoClose": "1800s"
  }
}
EOF
```

## 🔐 セキュリティのベストプラクティス

### 1. Secret Managerの適切な管理

```bash
# シークレットの定期的なローテーション
gcloud secrets versions add jwt-secret --data-file=<(openssl rand -base64 32)
gcloud secrets versions add session-secret --data-file=<(openssl rand -base64 32)

# 古いバージョンの削除
gcloud secrets versions destroy VERSION_ID --secret="jwt-secret"

# シークレットへのアクセス履歴確認
gcloud logging read "protoPayload.serviceName=\"secretmanager.googleapis.com\"" --limit=10
```

### 2. ネットワークセキュリティ

```bash
# Cloud Armorセキュリティポリシーの作成
gcloud compute security-policies create rap-battle-security-policy \
    --description="Security policy for AI Rap Battle"

# 基本的なDDoS保護ルール
gcloud compute security-policies rules create 1000 \
    --security-policy=rap-battle-security-policy \
    --expression="origin.region_code == 'CN'" \
    --action=deny-403

# Load BalancerにCloud Armorを適用（必要に応じて）
```

### 3. CORS設定の確認

```bash
# フロントエンドURLを取得してCORS設定
FRONTEND_URL=$(gcloud run services describe rap-battle-frontend --region=us-central1 --format='value(status.url)')

# バックエンドのCORS設定を更新
gcloud run services update rap-battle-backend \
    --region=us-central1 \
    --update-env-vars="ALLOWED_ORIGINS=https://your-domain.com,$FRONTEND_URL"
```

### 4. IAM監査とアクセス制御

```bash
# サービスアカウントの権限確認
gcloud projects get-iam-policy $PROJECT_ID \
    --flatten="bindings[].members" \
    --filter="bindings.members:$SERVICE_ACCOUNT_EMAIL" \
    --format="table(bindings.role)"

# 未使用のサービスアカウントキーを確認
gcloud iam service-accounts keys list \
    --iam-account=$SERVICE_ACCOUNT_EMAIL
```

### 5. 監査ログの有効化

```bash
# Cloud Audit Logsの設定確認
gcloud logging sinks list

# セキュリティ関連のログフィルター作成
gcloud logging sinks create security-logs \
    bigquery.googleapis.com/projects/$PROJECT_ID/datasets/security_logs \
    --log-filter="protoPayload.serviceName=\"iam.googleapis.com\" OR protoPayload.serviceName=\"cloudresourcemanager.googleapis.com\""
```

## 📈 スケーリング戦略

1. **垂直スケーリング**
   - CPUとメモリの増加
   - 同時実行数の調整

2. **水平スケーリング**
   - 最大インスタンス数の増加
   - リージョン間での分散

3. **キャッシング戦略**
   - Redis/Memorystore の活用
   - CDNの設定

## 💰 コスト最適化

### 1. Cloud Runインスタンス最適化

```bash
# 低トラフィック期間（夜間）の設定
gcloud run services update rap-battle-backend \
    --region=us-central1 \
    --min-instances=0 \
    --max-instances=50

# ピーク時間帯の設定（必要に応じて）
gcloud run services update rap-battle-backend \
    --region=us-central1 \
    --min-instances=1 \
    --max-instances=100
```

### 2. リソース使用量の監視とコスト追跡

```bash
# コスト使用量の確認
gcloud billing budgets list --billing-account=BILLING_ACCOUNT_ID

# Cloud Runのリソース使用量確認
gcloud monitoring time-series list \
    --filter='metric.type="run.googleapis.com/container/billable_instance_time"' \
    --interval.end-time=$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ) \
    --interval.start-time=$(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S.%3NZ)

# Vertex AI使用量の確認
gcloud monitoring time-series list \
    --filter='metric.type="aiplatform.googleapis.com/prediction/online/prediction_count"'
```

### 3. ログ保持期間の最適化

```bash
# ログ保持期間を設定（デフォルト30日）
gcloud logging sinks update _Default \
    --log-filter="resource.type=cloud_run_revision" \
    --retention-days=7

# 重要なエラーログのみ長期保存
gcloud logging sinks create error-logs-long-term \
    bigquery.googleapis.com/projects/$PROJECT_ID/datasets/error_logs \
    --log-filter="resource.type=cloud_run_revision AND severity>=ERROR"
```

### 4. 未使用リソースの削除

```bash
# 古いコンテナイメージの削除
gcloud container images list-tags gcr.io/$PROJECT_ID/rap-battle-backend \
    --filter='-tags:*' --format='get(digest)' | \
    xargs -I {} gcloud container images delete gcr.io/$PROJECT_ID/rap-battle-backend@{} --quiet

# 未使用のCloud Buildログの削除
gcloud builds list --filter="createTime<'2024-01-01'" --format="value(id)" | \
    xargs -I {} gcloud builds cancel {}
```

---

## 📝 重要な注意点とベストプラクティス

### デプロイ前のチェックリスト

- [ ] **課金アカウントが設定済み**
- [ ] **Gemini API Keyが有効**
- [ ] **プロジェクトIDが正しく設定**
- [ ] **必要な権限を持つアカウントでログイン済み**
- [ ] **Cloud SDKが最新バージョン**

### デプロイ後の必須確認項目

- [ ] **両方のサービスが正常に起動**
- [ ] **ヘルスチェックエンドポイントが応答**
- [ ] **WebSocket接続が機能**
- [ ] **Firestoreの読み書きが正常**
- [ ] **Secret Managerからの環境変数読み込みが成功**
- [ ] **AI生成機能（歌詞・音声）が動作**

### 定期メンテナンス

```bash
# 週次: セキュリティアップデートの確認
gcloud container images scan gcr.io/$PROJECT_ID/rap-battle-backend:latest

# 月次: コスト使用量とパフォーマンスレビュー
gcloud billing budgets list --billing-account=BILLING_ACCOUNT_ID
gcloud monitoring dashboards list

# 四半期: シークレットローテーション
# JWT_SECRET, SESSION_SECRETの更新
```

### 緊急時の対応

```bash
# サービス停止（緊急時）
gcloud run services update rap-battle-backend \
    --region=us-central1 \
    --no-traffic

# 前のバージョンへのロールバック
gcloud run services update rap-battle-backend \
    --region=us-central1 \
    --image=gcr.io/$PROJECT_ID/rap-battle-backend:PREVIOUS_TAG

# トラフィックの段階的復旧
gcloud run services update-traffic rap-battle-backend \
    --region=us-central1 \
    --to-latest=50
```

---

## 🎉 デプロイ完了

デプロイが成功すると、以下のURLでアプリケーションにアクセスできます：

- **フロントエンド**: https://rap-battle-frontend-xxxxx-uc.a.run.app
- **バックエンドAPI**: https://rap-battle-backend-xxxxx-uc.a.run.app
- **ヘルスチェック**: https://rap-battle-backend-xxxxx-uc.a.run.app/health

**おめでとうございます！** AI Rap Battleアプリケーションの本番環境デプロイが完了しました。

**次のステップ:**
1. カスタムドメインの設定
2. SSL証明書の設定
3. 継続的デプロイ（CI/CD）の設定
4. モニタリングとアラートの詳細設定