#!/bin/bash
# Deploy script for AI Rap Battle application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if required environment variables are set
if [ -z "$GOOGLE_CLOUD_PROJECT_ID" ]; then
    echo -e "${RED}Error: GOOGLE_CLOUD_PROJECT_ID is not set${NC}"
    exit 1
fi

PROJECT_ID=$GOOGLE_CLOUD_PROJECT_ID
REGION=${GOOGLE_CLOUD_REGION:-us-central1}
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
TAG="v${TIMESTAMP}"

echo -e "${GREEN}Starting deployment for project: ${PROJECT_ID}${NC}"
echo -e "${GREEN}Region: ${REGION}${NC}"
echo -e "${GREEN}Tag: ${TAG}${NC}"

# Authenticate with Google Cloud
echo -e "${YELLOW}Authenticating with Google Cloud...${NC}"
gcloud auth application-default login
gcloud config set project ${PROJECT_ID}

# Enable required APIs
echo -e "${YELLOW}Enabling required APIs...${NC}"
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    containerregistry.googleapis.com \
    firestore.googleapis.com \
    texttospeech.googleapis.com \
    aiplatform.googleapis.com

# Create service account if it doesn't exist
SERVICE_ACCOUNT_NAME="rap-battle-sa"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

if ! gcloud iam service-accounts describe ${SERVICE_ACCOUNT_EMAIL} &>/dev/null; then
    echo -e "${YELLOW}Creating service account...${NC}"
    gcloud iam service-accounts create ${SERVICE_ACCOUNT_NAME} \
        --display-name="AI Rap Battle Service Account"
    
    # Grant necessary roles
    gcloud projects add-iam-policy-binding ${PROJECT_ID} \
        --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
        --role="roles/aiplatform.user"
    
    gcloud projects add-iam-policy-binding ${PROJECT_ID} \
        --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
        --role="roles/datastore.user"
    
    gcloud projects add-iam-policy-binding ${PROJECT_ID} \
        --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
        --role="roles/texttospeech.client"
    
    gcloud projects add-iam-policy-binding ${PROJECT_ID} \
        --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
        --role="roles/cloudtrace.agent"
    
    gcloud projects add-iam-policy-binding ${PROJECT_ID} \
        --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
        --role="roles/logging.logWriter"
fi

# Create secrets if they don't exist
echo -e "${YELLOW}Setting up secrets...${NC}"
if ! gcloud secrets describe jwt-secret &>/dev/null; then
    echo "your-jwt-secret-here" | gcloud secrets create jwt-secret --data-file=-
fi

if ! gcloud secrets describe session-secret &>/dev/null; then
    echo "your-session-secret-here" | gcloud secrets create session-secret --data-file=-
fi

# Grant service account access to secrets
gcloud secrets add-iam-policy-binding jwt-secret \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding session-secret \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/secretmanager.secretAccessor"

# Run Cloud Build
echo -e "${YELLOW}Starting Cloud Build...${NC}"
gcloud builds submit \
    --config=cloudbuild.yaml \
    --substitutions=SHORT_SHA=${TAG},_SERVICE_ACCOUNT=${SERVICE_ACCOUNT_EMAIL} \
    .

# Get the backend URL
echo -e "${YELLOW}Getting backend URL...${NC}"
BACKEND_URL=$(gcloud run services describe rap-battle-backend \
    --region=${REGION} \
    --format='value(status.url)')

echo -e "${GREEN}Backend URL: ${BACKEND_URL}${NC}"

# Get the frontend URL
FRONTEND_URL=$(gcloud run services describe rap-battle-frontend \
    --region=${REGION} \
    --format='value(status.url)')

echo -e "${GREEN}Frontend URL: ${FRONTEND_URL}${NC}"

# Update frontend with correct backend URL if needed
echo -e "${YELLOW}Updating frontend environment...${NC}"
gcloud run services update rap-battle-frontend \
    --region=${REGION} \
    --update-env-vars="NEXT_PUBLIC_API_URL=${BACKEND_URL},NEXT_PUBLIC_WEBSOCKET_URL=${BACKEND_URL}"

echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${GREEN}Frontend: ${FRONTEND_URL}${NC}"
echo -e "${GREEN}Backend: ${BACKEND_URL}${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Update your DNS records to point to the frontend URL"
echo "2. Configure Firebase Authentication (if needed)"
echo "3. Set up monitoring and alerts in Cloud Console"
echo "4. Test the application thoroughly"