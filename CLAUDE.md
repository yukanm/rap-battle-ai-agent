# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Google Cloud-based AI rap battle application that uses Vertex AI and Live API to generate real-time rap lyrics with multiple LLMs (Gemini Flash and Gemini 1.5 Pro), automatic compliance evaluation, and real-time text-to-speech streaming.

## Architecture

The application follows a microservices architecture:
- **Frontend**: React/Next.js application with WebSocket connectivity
- **API Gateway**: Handles WebSocket connections and streaming
- **Backend (Rap-Orchestrator)**: Cloud Run service managing AI agents and orchestration
- **AI Services**: 
  - Vertex AI Lyricist Agents (Gemini Flash for quick responses, Gemini 1.5 Pro for creative content)
  - Vertex AI Compliance Agent for content safety
  - Cloud Text-to-Speech for audio streaming

## Development Commands

### Initial Setup
```bash
npm install                # Install all workspace dependencies
npm run build:shared       # Build shared package (required first)
docker-compose up redis -d # Start Redis container
cp .env.example .env       # Create .env file and configure
```

### Development
```bash
npm run dev                # Run frontend and backend concurrently
npm run dev:frontend       # Frontend only (http://localhost:3456)
npm run dev:backend        # Backend only (http://localhost:8456)
```

### Testing
```bash
npm run test               # Run all tests in watch mode
npm run test:ci            # Run tests with coverage (CI mode)
npm run test -- --testPathPattern=websocket  # Run specific test file
```

### Building & Deployment
```bash
npm run build              # Build all workspaces
npm run lint               # Lint all workspaces
npm run deploy             # Deploy both services to Google Cloud
```

## Key Technical Requirements

- **Performance**: End-to-end latency must be under 1.5 seconds
- **Scalability**: Support up to 10,000 concurrent users and 100 simultaneous battles
- **Security**: Implement Google IAM-based access control
- **Compliance**: SOC2 and ISO27001 compliance required

## Development Notes

When implementing features:
- The system uses WebSocket for real-time communication between frontend and backend
- Live API sessions should be warmed up in advance to handle peak loads
- All generated content must pass through compliance evaluation before being sent to users
- Audio streaming uses gRPC protocol with Cloud Text-to-Speech

## Testing Patterns & Conventions

### Test Structure
- **Unit Tests**: Located in `__tests__/unit/` - Test individual components/services in isolation
- **Integration Tests**: Located in `__tests__/integration/` - Test service interactions
- **E2E Tests**: Located in `__tests__/e2e/` - Test full user workflows

### Testing Stack
- **Jest**: Primary testing framework for both frontend and backend
- **React Testing Library**: For React component testing
- **Supertest**: For API endpoint testing
- **Socket.io Client**: For WebSocket testing

### Test Configuration
- Backend coverage threshold: 80% (branches, functions, lines, statements)
- Frontend coverage threshold: 75% (branches, functions, lines, statements)
- Test timeout: 10 seconds (can be extended for E2E tests)
- Setup files: `jest.setup.js` (frontend), `setup.ts` (backend)

### Testing Best Practices
1. **Mock External Dependencies**: Always mock services like Vertex AI, TTS, Redis in tests
2. **Test File Naming**: Use `.test.ts` or `.test.tsx` suffix
3. **Describe Blocks**: Group related tests with descriptive names
4. **Async Testing**: Use async/await or done callbacks for asynchronous tests
5. **Mock Logger**: Logger is automatically mocked to reduce test output noise

### Common Test Patterns
```typescript
// Unit test example
describe('ServiceName', () => {
  let service: ServiceName
  
  beforeEach(() => {
    service = new ServiceName()
  })
  
  describe('methodName', () => {
    it('should do something specific', async () => {
      // Arrange
      const input = 'test'
      
      // Act
      const result = await service.methodName(input)
      
      // Assert
      expect(result).toBe(expected)
    })
  })
})

// WebSocket test example
beforeEach((done) => {
  clientSocket = ioc(`http://localhost:${PORT}`, {
    transports: ['websocket'],
    reconnection: false,
  })
  clientSocket.on('connect', done)
})
```

## Code Conventions

### TypeScript Configuration
- **Target**: ES2022 for modern JavaScript features
- **Strict Mode**: Enabled for type safety
- **Path Aliases**: Use `@/` for src imports (e.g., `@/services/vertexai`)
- **No Unused Code**: `noUnusedLocals` and `noUnusedParameters` are enabled

### Import Organization
1. External dependencies (npm packages)
2. Internal dependencies using path aliases
3. Relative imports (if necessary)

### Error Handling
- Use `express-async-errors` for automatic async error handling
- Implement structured error responses with proper HTTP status codes
- Log errors with appropriate context using Winston logger

### WebSocket Events
- Event names use snake_case (e.g., `join_battle`, `battle_event`)
- Always validate incoming data before processing
- Emit structured error objects on failures

## Linting & Formatting

### ESLint Configuration
- Uses `@typescript-eslint` parser and plugin
- Configured for TypeScript strict type checking
- Run `npm run lint` to check all workspaces
- Run `npm run lint:fix` to auto-fix issues

### Code Style Guidelines
1. Use async/await over promises where possible
2. Prefer const over let when variables won't be reassigned
3. Use optional chaining (`?.`) and nullish coalescing (`??`)
4. Keep functions focused and under 50 lines when possible
5. Add JSDoc comments for public APIs and complex logic

## Build & Deployment Process

### Local Build Process
1. Shared package builds first (TypeScript compilation)
2. Backend builds with `tsc` and `tsc-alias` for path resolution
3. Frontend builds with Next.js optimizations

### Container Build
- Multi-stage Docker builds for optimized images
- Backend runs on port 8456, Frontend on port 3456
- Health check endpoints at `/health` and `/api/health`

### Cloud Build Pipeline
- Automated builds on push using `cloudbuild.yaml`
- Parallel backend and frontend builds
- Images tagged with commit SHA and 'latest'
- Automatic deployment to Cloud Run after successful build

### Environment Variables
- Development: Use `.env` files (not committed)
- Production: Set via Cloud Run deployment or Secret Manager
- Required variables documented in deployment scripts

### Deployment Configuration
- **Backend**: 2GB RAM, 2 CPU, 1-100 instances, 1000 concurrent requests
- **Frontend**: 1GB RAM, 1 CPU, 1-50 instances, 1000 concurrent requests
- **Timeouts**: 3600s for long-running WebSocket connections
- **Regions**: Default to us-central1 for Vertex AI proximity

## Common Development Workflows

### Adding a New Feature
1. Create feature branch from main
2. Update types in `types/index.ts`
3. Implement backend logic with tests
4. Add frontend components with tests
5. Update WebSocket handlers if needed
6. Test E2E flow locally
7. Update documentation

### Debugging WebSocket Issues
1. Check browser DevTools WS tab for connection status
2. Use `test-ws` page at `/test-ws` for isolated testing
3. Check backend logs for connection/disconnection events
4. Verify Redis is running for session management

### Performance Optimization
1. Monitor end-to-end latency in logs
2. Use Redis caching for frequently accessed data
3. Implement request batching where possible
4. Profile with Chrome DevTools for frontend
5. Use Google Cloud Profiler for backend

### Handling Vertex AI Rate Limits
1. Implement exponential backoff for retries
2. Use request queuing with Bull
3. Monitor quota usage in GCP Console
4. Consider caching AI responses when appropriate

## Troubleshooting

### Common Issues
1. **Module not found**: Run `npm run build:shared` first
2. **Redis connection failed**: Ensure Docker container is running
3. **TypeScript path errors**: Check tsconfig paths match imports
4. **WebSocket timeouts**: Verify CORS and transport settings
5. **Test failures**: Clear jest cache with `jest --clearCache`

### Monitoring & Logging
- Structured logging with Winston (JSON format in production)
- Log levels: error, warn, info, debug
- Request IDs for tracing across services
- Performance metrics logged for key operations