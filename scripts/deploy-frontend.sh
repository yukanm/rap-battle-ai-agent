#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Deploying Frontend to Firebase Hosting...${NC}"

# Check if required environment variables are set
if [ -z "$GOOGLE_CLOUD_PROJECT_ID" ]; then
    echo -e "${RED}Error: GOOGLE_CLOUD_PROJECT_ID is not set${NC}"
    exit 1
fi

# Get backend URL
BACKEND_URL=$(gcloud run services describe rap-battle-backend --platform managed --region us-central1 --format 'value(status.url)')
if [ -z "$BACKEND_URL" ]; then
    echo -e "${RED}Error: Could not retrieve backend URL${NC}"
    exit 1
fi

# Build the frontend with production environment variables
echo -e "${YELLOW}Building frontend...${NC}"
cd frontend
export NEXT_PUBLIC_API_URL=$BACKEND_URL
export NEXT_PUBLIC_WEBSOCKET_URL=${BACKEND_URL/https/wss}
npm run build

# Deploy to Firebase Hosting
echo -e "${YELLOW}Deploying to Firebase Hosting...${NC}"
firebase deploy --only hosting --project $GOOGLE_CLOUD_PROJECT_ID

echo -e "${GREEN}Frontend deployed successfully!${NC}"

# Alternative: Deploy to Cloud Run
# echo -e "${YELLOW}Building Docker image...${NC}"
# docker build -t gcr.io/$GOOGLE_CLOUD_PROJECT_ID/rap-battle-frontend:latest -f Dockerfile ..
# 
# echo -e "${YELLOW}Pushing image to Container Registry...${NC}"
# docker push gcr.io/$GOOGLE_CLOUD_PROJECT_ID/rap-battle-frontend:latest
# 
# echo -e "${YELLOW}Deploying to Cloud Run...${NC}"
# gcloud run deploy rap-battle-frontend \
#     --image gcr.io/$GOOGLE_CLOUD_PROJECT_ID/rap-battle-frontend:latest \
#     --platform managed \
#     --region us-central1 \
#     --allow-unauthenticated \
#     --port 3000 \
#     --memory 1Gi \
#     --cpu 1 \
#     --max-instances 100 \
#     --min-instances 1 \
#     --set-env-vars "NODE_ENV=production" \
#     --set-env-vars "NEXT_PUBLIC_API_URL=$BACKEND_URL" \
#     --set-env-vars "NEXT_PUBLIC_WEBSOCKET_URL=${BACKEND_URL/https/wss}"