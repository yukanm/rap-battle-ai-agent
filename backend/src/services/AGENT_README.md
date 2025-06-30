# Mastra Agent Service for Rap Battle Application

## Overview

The Mastra Agent Service (`agent.service.ts`) provides an AI-powered agent implementation for managing rap battles using the Mastra framework. It integrates with Google's Generative AI (Gemini) models and provides tools for generating lyrics, checking compliance, evaluating battles, and generating themes.

## Features

### 1. **Rap Lyrics Generation**
- Generates creative rap lyrics based on themes and styles
- Supports both Gemini Flash (fast) and Gemini Pro (creative) models
- Considers previous lyrics for contextual responses
- Includes safety settings to prevent harmful content

### 2. **Content Compliance Checking**
- Validates generated content for safety and appropriateness
- Checks for profanity, hate speech, violence, and personal information
- Provides compliance scores and reasons for failures

### 3. **Battle Evaluation**
- Analyzes completed battles to determine winners
- Scores based on multiple factors including:
  - Compliance scores
  - Generation speed
  - Content quality (line count, rhyme patterns)
  - Voting results

### 4. **Theme Generation**
- Creates engaging themes for rap battles
- Supports categories: technology, nature, social, abstract
- Provides theme descriptions for context

## Architecture

The service is built using:
- **Mastra Core**: Agent framework for tool orchestration
- **Google Generative AI**: Gemini models for content generation
- **Custom Tools**: Specialized functions for rap battle tasks

## Usage

### Basic Setup

```typescript
import { AgentService } from '@/services/agent.service'

// Initialize the service
const agentService = new AgentService()

// Test connection
const isConnected = await agentService.testConnection()
```

### Generating Lyrics

```typescript
const lyric = await agentService.generateLyrics({
  theme: 'AI vs Human Creativity',
  style: 'Fast-paced, witty, and energetic',
  model: 'gemini-flash',
  previousLyrics: ['Previous verses...']
})

console.log(lyric.content)
console.log(`Generated in ${lyric.generationTime}ms`)
```

### Checking Compliance

```typescript
const compliance = await agentService.checkCompliance('Your content here')

if (compliance.safe) {
  console.log('Content is safe to use')
} else {
  console.log('Content failed compliance:', compliance.reasons)
}
```

### Evaluating Battles

```typescript
const evaluation = await agentService.evaluateBattle(battleObject)

console.log(`Winner: ${evaluation.winner}`)
console.log(`Analysis: ${evaluation.analysis}`)
console.log(`Scores:`, evaluation.scores)
```

### Generating Themes

```typescript
const theme = await agentService.generateTheme('technology')
console.log(`Theme: ${theme.theme}`)
console.log(`Description: ${theme.description}`)
```

## Integration with Battle Manager

The agent service can be integrated with the WebSocket battle manager:

```typescript
import { BattleManagerWithAgent } from '@/services/websocket/battleManagerWithAgent'

// Create battle manager with agent enabled
const battleManager = new BattleManagerWithAgent(io, true)

// Switch between agent and traditional services
await battleManager.switchToAgent(true)  // Use agent
await battleManager.switchToAgent(false) // Use traditional services
```

## Environment Variables

Required environment variables:

```bash
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_API_KEY=your-api-key

# Optional: Agent-specific settings
MASTRA_LOG_LEVEL=info
ENABLE_AGENT_MODE=true
```

## Performance Considerations

1. **Latency**: The agent adds minimal overhead (~50-100ms) compared to direct API calls
2. **Caching**: Consider implementing response caching for frequently used themes
3. **Parallel Processing**: Tools can be executed in parallel for better performance
4. **Error Handling**: The agent provides automatic retry logic for failed operations

## Testing

Run the example to test the agent:

```bash
npx tsx src/examples/agent-usage.example.ts
```

## Benefits of Using Mastra Agent

1. **Unified Interface**: Single agent handles all AI-related tasks
2. **Tool Orchestration**: Automatically chains tools for complex operations
3. **Enhanced Logging**: Built-in observability for all agent actions
4. **Extensibility**: Easy to add new tools and capabilities
5. **Error Recovery**: Better handling of failures with agent-level retry logic

## Future Enhancements

1. **Custom Models**: Support for fine-tuned models specific to rap battles
2. **Multi-Agent Battles**: Agents that can collaborate or compete
3. **Learning**: Agents that improve based on battle outcomes
4. **Advanced Compliance**: ML-based content moderation
5. **Voice Synthesis**: Direct integration with TTS services

## Troubleshooting

### Connection Issues
- Verify Google API credentials are correctly set
- Check network connectivity to Google Cloud services
- Review agent logs for detailed error messages

### Performance Issues
- Monitor agent execution times in logs
- Consider using Gemini Flash for time-sensitive operations
- Implement request queuing for high load scenarios

### Compliance Failures
- Review compliance thresholds in configuration
- Check agent logs for specific failure reasons
- Consider implementing content pre-filtering