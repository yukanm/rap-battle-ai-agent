#!/bin/bash

# Local Docker build and deploy script for Rancher Desktop
set -e

# Configuration
PROJECT_ID="boxwood-scope-463317-b6"
REGION="us-central1"
BACKEND_IMAGE="gcr.io/$PROJECT_ID/rap-battle-backend"
FRONTEND_IMAGE="gcr.io/$PROJECT_ID/rap-battle-frontend"
BUILD_TAG="local-$(date +%Y%m%d-%H%M%S)"

# Rancher Desktop nerdctl setup
NERDCTL="nerdctl --address /var/run/docker/containerd/containerd.sock"

echo "🚀 Starting local build and deploy process..."
echo "Project ID: $PROJECT_ID"
echo "Build Tag: $BUILD_TAG"

# Step 1: Build backend image
echo "📦 Building backend Docker image..."
cd backend
$NERDCTL build -t $BACKEND_IMAGE:$BUILD_TAG -t $BACKEND_IMAGE:latest .
echo "✅ Backend image built successfully"

# Step 2: Build frontend image  
echo "📦 Building frontend Docker image..."
cd ../frontend
$NERDCTL build -t $FRONTEND_IMAGE:$BUILD_TAG -t $FRONTEND_IMAGE:latest .
echo "✅ Frontend image built successfully"

# Step 3: Configure Docker for GCR authentication
echo "🔐 Configuring Docker for Google Container Registry..."
gcloud auth configure-docker --quiet

# Step 4: Tag images for GCR push
echo "🏷️  Tagging images for GCR..."
$NERDCTL tag $BACKEND_IMAGE:$BUILD_TAG $BACKEND_IMAGE:$BUILD_TAG
$NERDCTL tag $BACKEND_IMAGE:latest $BACKEND_IMAGE:latest
$NERDCTL tag $FRONTEND_IMAGE:$BUILD_TAG $FRONTEND_IMAGE:$BUILD_TAG  
$NERDCTL tag $FRONTEND_IMAGE:latest $FRONTEND_IMAGE:latest

# Step 5: Push images to GCR
echo "📤 Pushing backend image to Google Container Registry..."
$NERDCTL push $BACKEND_IMAGE:$BUILD_TAG
$NERDCTL push $BACKEND_IMAGE:latest

echo "📤 Pushing frontend image to Google Container Registry..."
$NERDCTL push $FRONTEND_IMAGE:$BUILD_TAG
$NERDCTL push $FRONTEND_IMAGE:latest

echo "✅ Images pushed successfully"

# Step 6: Deploy backend to Cloud Run
echo "🚀 Deploying backend to Cloud Run..."
gcloud run deploy rap-battle-backend \
  --image $BACKEND_IMAGE:$BUILD_TAG \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --port 8456 \
  --memory 2Gi \
  --cpu 2 \
  --min-instances 1 \
  --max-instances 100 \
  --concurrency 1000 \
  --timeout 3600 \
  --set-env-vars \
    NODE_ENV=production,\
    GOOGLE_CLOUD_PROJECT_ID=$PROJECT_ID,\
    VERTEX_AI_LOCATION=us-central1,\
    GEMINI_FLASH_MODEL=gemini-2.5-flash,\
    GEMINI_PRO_MODEL=gemini-2.5-pro,\
    TTS_LANGUAGE_CODE=en-US,\
    TTS_VOICE_NAME=en-US-Studio-M,\
    TTS_SPEAKING_RATE=1.2,\
    TTS_PITCH=0.0,\
    TTS_VOLUME_GAIN_DB=0.0,\
    COMPLIANCE_THRESHOLD=0.8,\
    ENABLE_VOTING=true,\
    ENABLE_ANALYTICS=true,\
    ENABLE_COMPLIANCE_CHECK=false,\
    ENABLE_RATE_LIMITING=true,\
    RATE_LIMIT_REQUESTS_PER_MINUTE=60,\
    RATE_LIMIT_WEBSOCKET_MESSAGES_PER_SECOND=10,\
    LYRIC_GENERATION_TIMEOUT_MS=5000,\
    COMPLIANCE_CHECK_TIMEOUT_MS=1000,\
    TTS_GENERATION_TIMEOUT_MS=2000,\
    WEBSOCKET_PING_INTERVAL_MS=30000,\
    REDIS_URL=redis://localhost:6379 \
  --update-secrets \
    JWT_SECRET=jwt-secret:latest,\
    SESSION_SECRET=session-secret:latest,\
    GEMINI_API_KEY=gemini-api-key:latest

echo "✅ Backend deployed successfully"

# Step 7: Get backend URL
echo "🔗 Getting backend URL..."
BACKEND_URL=$(gcloud run services describe rap-battle-backend --region=$REGION --format='value(status.url)')
echo "Backend URL: $BACKEND_URL"

# Step 8: Deploy frontend to Cloud Run
echo "🚀 Deploying frontend to Cloud Run..."
gcloud run deploy rap-battle-frontend \
  --image $FRONTEND_IMAGE:$BUILD_TAG \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --port 3456 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 1 \
  --max-instances 50 \
  --concurrency 1000 \
  --set-env-vars \
    NODE_ENV=production,\
    NEXT_PUBLIC_API_URL=$BACKEND_URL,\
    NEXT_PUBLIC_WEBSOCKET_URL=$BACKEND_URL

echo "✅ Frontend deployed successfully"

# Step 9: Get frontend URL
FRONTEND_URL=$(gcloud run services describe rap-battle-frontend --region=$REGION --format='value(status.url)')
echo "🎉 Deployment completed successfully!"
echo ""
echo "🌐 Application URLs:"
echo "   Frontend: $FRONTEND_URL"
echo "   Backend:  $BACKEND_URL"
echo ""
echo "🏷️  Build Tag: $BUILD_TAG"

cd ..