#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Deploying Backend to Google Cloud Run...${NC}"

# Check if required environment variables are set
if [ -z "$GOOGLE_CLOUD_PROJECT_ID" ]; then
    echo -e "${RED}Error: GOOGLE_CLOUD_PROJECT_ID is not set${NC}"
    exit 1
fi

# Build the backend
echo -e "${YELLOW}Building backend...${NC}"
cd backend
npm run build

# Build Docker image
echo -e "${YELLOW}Building Docker image...${NC}"
docker build -t gcr.io/$GOOGLE_CLOUD_PROJECT_ID/rap-battle-backend:latest -f Dockerfile .

# Push to Container Registry
echo -e "${YELLOW}Pushing image to Container Registry...${NC}"
docker push gcr.io/$GOOGLE_CLOUD_PROJECT_ID/rap-battle-backend:latest

# Deploy to Cloud Run
echo -e "${YELLOW}Deploying to Cloud Run...${NC}"
gcloud run deploy rap-battle-backend \
    --image gcr.io/$GOOGLE_CLOUD_PROJECT_ID/rap-battle-backend:latest \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated \
    --port 8456 \
    --memory 2Gi \
    --cpu 2 \
    --max-instances 100 \
    --min-instances 1 \
    --concurrency 1000 \
    --timeout 3600 \
    --session-affinity \
    --no-cpu-throttling \
    --set-env-vars "NODE_ENV=production" \
    --set-env-vars "GOOGLE_CLOUD_PROJECT_ID=$GOOGLE_CLOUD_PROJECT_ID" \
    --set-env-vars "ENABLE_CLOUD_LOGGING=true" \
    --set-env-vars "ENABLE_CLOUD_TRACE=true" \
    --set-env-vars "ENABLE_CLOUD_PROFILER=true"

echo -e "${GREEN}Backend deployed successfully!${NC}"

# Get the service URL
SERVICE_URL=$(gcloud run services describe rap-battle-backend --platform managed --region us-central1 --format 'value(status.url)')
echo -e "${GREEN}Backend URL: $SERVICE_URL${NC}"