# Frontend API Clients

This directory contains API client modules for interacting with backend services.

## Agent API Client

The `agent.api.ts` file provides a comprehensive client for interacting with the AI Agent service.

### Available Functions

#### `generateLyrics(request: GenerateLyricsRequest): Promise<GenerateLyricsResponse>`
Generates rap lyrics based on theme and style.

```typescript
const lyrics = await agentApi.generateLyrics({
  theme: 'Street Life',
  rapperStyle: 'Old School Hip Hop',
  userName: 'Player1' // optional
})
```

#### `checkCompliance(request: CheckComplianceRequest): Promise<CheckComplianceResponse>`
Checks if content meets compliance standards.

```typescript
const compliance = await agentApi.checkCompliance({
  content: 'Your rap lyrics here...'
})
```

#### `evaluateBattle(request: EvaluateBattleRequest): Promise<EvaluateBattleResponse>`
Evaluates a rap battle and determines the winner.

```typescript
const evaluation = await agentApi.evaluateBattle({
  battleId: 'battle-123',
  rapper1Lyrics: ['line1', 'line2'],
  rapper2Lyrics: ['line1', 'line2'],
  audience: ['user1', 'user2'] // optional
})
```

#### `generateTheme(request?: GenerateThemeRequest): Promise<GenerateThemeResponse>`
Generates a theme for a new rap battle.

```typescript
const theme = await agentApi.generateTheme({
  categories: ['Street Life', 'Success'] // optional
})
```

#### `executeTask(request: ExecuteTaskRequest): Promise<ExecuteTaskResponse>`
Executes custom agent tasks for advanced use cases.

```typescript
const result = await agentApi.executeTask({
  task: 'Generate a creative intro',
  parameters: { tone: 'energetic' } // optional
})
```

#### `checkAgentHealth(): Promise<boolean>`
Checks if the agent service is healthy.

```typescript
const isHealthy = await agentApi.checkAgentHealth()
```

### Error Handling

All API functions include built-in error handling with toast notifications. Errors are also thrown so you can handle them in your components:

```typescript
try {
  const lyrics = await agentApi.generateLyrics(request)
  // Handle success
} catch (error) {
  if (error instanceof ApiError) {
    console.error('API Error:', error.message, error.status)
  }
  // Handle error
}
```

### TypeScript Types

The API client exports all necessary TypeScript interfaces:

- `GenerateLyricsRequest` / `GenerateLyricsResponse`
- `CheckComplianceRequest` / `CheckComplianceResponse`
- `EvaluateBattleRequest` / `EvaluateBattleResponse`
- `GenerateThemeRequest` / `GenerateThemeResponse`
- `ExecuteTaskRequest` / `ExecuteTaskResponse`
- `ApiResponse<T>` - Generic API response wrapper
- `ApiError` - Custom error class with status and code

### Usage Examples

See `agent.api.example.tsx` for comprehensive usage examples including:
- React component integration
- Custom hooks
- Error handling patterns
- Loading states
- Auto-retry mechanisms

### Configuration

The API client uses environment variables for configuration:

```env
NEXT_PUBLIC_API_URL=http://localhost:8456  # Backend API URL
```

Make sure this is set in your `.env.local` file for local development.