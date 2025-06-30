# Agent API Integration Guide

## Overview

This document describes the Agent API integration in the frontend battle components. The Agent API provides AI-powered features for generating rap lyrics, evaluating battles, checking compliance, and generating themes.

## Components

### 1. BattleSelector
- **Path**: `/components/battle/BattleSelector.tsx`
- **Purpose**: Allows users to choose between WebSocket and Agent API modes
- **Features**:
  - Visual comparison of both modes
  - Toggle switch for mode selection
  - Smooth transition to selected battle arena

### 2. BattleArenaWithAgent
- **Path**: `/components/battle/BattleArenaWithAgent.tsx`
- **Purpose**: Agent API-powered battle arena
- **Features**:
  - Automatic lyric generation for both AI participants
  - Automatic compliance checking
  - Theme generation with AI
  - Battle evaluation and winner determination
  - Progress tracking

### 3. BattleControlsEnhanced
- **Path**: `/components/battle/BattleControlsEnhanced.tsx`
- **Purpose**: Enhanced controls for Agent API mode
- **Features**:
  - Mode indicator (Agent API vs WebSocket)
  - Real-time feature status display
  - Battle progress tracking
  - AI evaluation results display

### 4. AgentDemo
- **Path**: `/components/demo/AgentDemo.tsx`
- **Purpose**: Comprehensive demo of all Agent API features
- **Features**:
  - Lyric generation testing
  - Compliance checking
  - Battle evaluation
  - Theme generation
  - Health check

## API Integration

### Agent API Client
- **Path**: `/lib/api/agent.ts`
- **Endpoints**:
  - `/api/agent/generate-lyrics` - Generate rap lyrics
  - `/api/agent/check-compliance` - Check content compliance
  - `/api/agent/evaluate-battle` - Evaluate battle performance
  - `/api/agent/generate-theme` - Generate battle themes
  - `/api/agent/health` - Check service health

### Custom Hook
- **Path**: `/hooks/useAgentAPI.ts`
- **Usage**:
```typescript
const { 
  generateLyrics, 
  checkCompliance, 
  evaluateBattle, 
  generateTheme,
  isLoading,
  error 
} = useAgentAPI()
```

## Store Updates

The `battleStore` has been enhanced with:
- `useAgentAPI`: Toggle between modes
- `battleEvaluation`: Store AI evaluation results
- `addLyric`: Add individual lyrics to rounds

## Usage

### 1. Access the Demo
Navigate to `/demo` to test all Agent API features individually.

### 2. Start a Battle with Agent API
1. Navigate to the battle page
2. Select "Agent API Mode" in the selector
3. Enter or generate a theme
4. Start the battle - AI will handle everything automatically

### 3. Integration in Existing Components
To use Agent API in your components:

```typescript
import { useAgentAPI } from '@/hooks/useAgentAPI'

const MyComponent = () => {
  const { generateLyrics } = useAgentAPI()
  
  const handleGenerate = async () => {
    const result = await generateLyrics({
      theme: 'Space Exploration',
      rapperStyle: 'Fast and witty',
      userName: 'User'
    })
    console.log(result.lyrics)
  }
}
```

## Features

### Automatic Lyric Generation
- Generates lyrics based on theme and rapper style
- Different styles for Gemini Flash (fast/witty) and Gemini Pro (deep/philosophical)
- Automatic compliance checking after generation

### Battle Evaluation
- Analyzes all rounds of lyrics
- Determines winner based on AI evaluation
- Provides detailed scoring and feedback

### Theme Generation
- AI-powered theme suggestions
- Customizable categories
- Creative and engaging battle topics

### Compliance Checking
- Ensures generated content is safe and appropriate
- Provides compliance scores and violation details
- Automatic filtering of inappropriate content

## Environment Variables

Add to your `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8456
```

## Testing

1. Start the backend with Agent API enabled
2. Run the frontend: `npm run dev`
3. Navigate to `/demo` for component testing
4. Use the battle selector to test full integration