# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies with clean setup
RUN npm cache clean --force
RUN npm install --no-optional || npm ci --no-optional

# Copy source code
COPY src ./src

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install dumb-init and Python for proper signal handling and native dependencies
RUN apk add --no-cache dumb-init python3 make g++

# Install production dependencies only
COPY package*.json ./
RUN npm cache clean --force
ENV PYTHON=/usr/bin/python3
RUN npm install --omit=dev --no-optional && npm cache clean --force

# Copy built application
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S backend -u 1001 -G nodejs

# Change ownership
RUN chown -R backend:nodejs /app

USER backend

# Use PORT env variable for Cloud Run
EXPOSE 8456

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 8456) + '/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]