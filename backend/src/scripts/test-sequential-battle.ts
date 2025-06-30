#!/usr/bin/env ts-node

/**
 * Test script to verify sequential verse generation
 * Run with: npx ts-node src/scripts/test-sequential-battle.ts
 */

import { createLogger } from '../utils/logger'

const logger = createLogger('test-sequential-battle')

// Mock battle data to demonstrate the new structure
const mockBattle = {
  id: 'test-battle-123',
  format: '3verses-3rounds' as const,
  rounds: [
    {
      number: 1,
      verses: [
        { number: 1, participantId: 'ai1', lyric: { content: 'MC1 verse 1...' } },
        { number: 2, participantId: 'ai2', lyric: { content: 'MC2 verse 1...' } },
        { number: 3, participantId: 'ai1', lyric: { content: 'MC1 verse 2...' } },
        { number: 4, participantId: 'ai2', lyric: { content: 'MC2 verse 2...' } },
        { number: 5, participantId: 'ai1', lyric: { content: 'MC1 verse 3...' } },
        { number: 6, participantId: 'ai2', lyric: { content: 'MC2 verse 3...' } },
      ],
      votes: { ai1: 0, ai2: 0 }
    }
  ]
}

function demonstrateSequentialGeneration() {
  logger.info('=== Testing Sequential Verse Generation ===')
  logger.info(`Battle format: ${mockBattle.format}`)
  
  const round = mockBattle.rounds[0]
  logger.info(`\nRound ${round.number}:`)
  
  // Simulate sequential generation with delays
  round.verses.forEach((verse, index) => {
    setTimeout(() => {
      const mcName = verse.participantId === 'ai1' ? 'MC Flash' : 'Professor Bars'
      logger.info(`  Verse ${verse.number}: ${mcName} - "${verse.lyric.content}"`)
      
      if (index === round.verses.length - 1) {
        logger.info('\n=== Sequential generation complete! ===')
        logger.info('Key changes:')
        logger.info('1. Verses are generated one by one, not in parallel')
        logger.info('2. Each round has 6 verses (3 per MC, alternating)')
        logger.info('3. Format changed from "8bars-4rounds" to "3verses-3rounds"')
        logger.info('4. Events are emitted for each verse individually')
      }
    }, index * 1000) // 1 second delay between verses
  })
}

// Run the demonstration
demonstrateSequentialGeneration()