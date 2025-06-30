import { test, expect } from '@playwright/test'
import { BattleSelectorPage } from '../fixtures/page-objects/battle-selector.page'
import { BattleArenaPage } from '../fixtures/page-objects/battle-arena.page'
import { TEST_CONFIG, MESSAGES } from '../utils/constants'
import { TestHelpers } from '../utils/helpers'

/**
 * WebSocket Battle Mode E2E Tests
 * WebSocketモードバトルのエンドツーエンドテスト
 */

test.describe('WebSocket Battle Mode', () => {
  let battleSelector: BattleSelectorPage
  let battleArena: BattleArenaPage

  test.beforeEach(async ({ page }) => {
    battleSelector = new BattleSelectorPage(page)
    battleArena = new BattleArenaPage(page)
  })

  test('should complete full battle flow successfully', async () => {
    // Navigate to battle selector
    await battleSelector.navigate()
    await battleSelector.verifyPageLoaded()

    // Select WebSocket mode
    await battleSelector.selectWebSocketMode()
    await battleSelector.startSelectedBattle()

    // Verify battle arena loaded
    await battleArena.verifyPageLoaded()
    await battleArena.verifyWebSocketConnection()

    // Create battle with valid theme
    const theme = TestHelpers.getRandomTheme()
    await battleArena.createBattle(theme)

    // Verify battle progression through 3 rounds
    for (let round = 1; round <= TEST_CONFIG.DEFAULT_BATTLE_ROUNDS; round++) {
      console.log(`Testing round ${round}...`)
      
      await battleArena.waitForRound(round)
      
      // Wait for lyric generation
      const lyric = await battleArena.waitForLyricGeneration()
      expect(lyric.length).toBeGreaterThan(10)
      console.log(`Round ${round} lyric generated: ${lyric.slice(0, 50)}...`)
      
      // Wait for audio generation
      await battleArena.waitForAudioGeneration()
      
      // Cast vote
      const voteFor = round % 2 === 1 ? 1 : 2 // Alternate votes
      await battleArena.castVote(voteFor as 1 | 2)
      
      // Verify vote was recorded
      const votes = await battleArena.getVoteCounts()
      expect(votes.ai1 + votes.ai2).toBeGreaterThan(0)
    }

    // Wait for battle completion
    await battleArena.waitForBattleCompletion()
    
    // Verify results
    const results = await battleArena.getBattleResults()
    expect(results.winner).toMatch(/AI[12]/)
    
    console.log(`Battle completed. Winner: ${results.winner}`)
  })

  test('should meet performance requirements', async () => {
    await battleSelector.navigate()
    await battleSelector.selectWebSocketMode()
    await battleSelector.startSelectedBattle()

    const theme = TestHelpers.getRandomTheme()
    
    // Measure end-to-end latency
    const endToEndLatency = await battleArena.measureEndToEndLatency(theme)
    
    // Critical requirement: under 1.5 seconds end-to-end
    expect(endToEndLatency).toBeLessThan(TEST_CONFIG.MAX_END_TO_END_LATENCY)
    
    console.log(`End-to-end latency: ${endToEndLatency}ms (requirement: <${TEST_CONFIG.MAX_END_TO_END_LATENCY}ms)`)
    
    // Measure individual components
    const lyricTime = await battleArena.measureLyricGenerationTime()
    const audioTime = await battleArena.measureAudioGenerationTime()
    
    console.log(`Lyric generation: ${lyricTime}ms`)
    console.log(`Audio generation: ${audioTime}ms`)
    
    // Component-level performance checks
    expect(lyricTime).toBeLessThan(TEST_CONFIG.LYRIC_GENERATION_TIMEOUT)
    expect(audioTime).toBeLessThan(TEST_CONFIG.AUDIO_GENERATION_TIMEOUT)
  })

  test('should handle theme validation correctly', async () => {
    await battleSelector.navigate()
    await battleSelector.selectWebSocketMode()
    await battleSelector.startSelectedBattle()

    // Test valid themes
    for (const theme of TEST_CONFIG.TEST_THEMES.slice(0, 3)) {
      await battleArena.verifyThemeValidation(theme, true)
      // Reset for next test
      await battleArena.page.reload()
      await battleArena.verifyPageLoaded()
    }

    // Test invalid themes
    for (const invalidTheme of TEST_CONFIG.INVALID_THEMES) {
      await battleArena.verifyThemeValidation(invalidTheme, false)
      // Reset for next test
      await battleArena.page.reload()
      await battleArena.verifyPageLoaded()
    }
  })

  test('should handle WebSocket disconnection and reconnection', async () => {
    await battleSelector.navigate()
    await battleSelector.selectWebSocketMode()
    await battleSelector.startSelectedBattle()

    // Verify initial connection
    await battleArena.verifyWebSocketConnection()

    // Start a battle
    const theme = TestHelpers.getRandomTheme()
    await battleArena.createBattle(theme)

    // Simulate disconnection
    await battleArena.simulateDisconnection()
    
    // Wait a moment
    await battleArena.page.waitForTimeout(2000)

    // Simulate reconnection
    await battleArena.simulateReconnection()

    // Verify battle can continue
    await battleArena.waitForLyricGeneration()
  })

  test('should display real-time updates correctly', async () => {
    await battleSelector.navigate()
    await battleSelector.selectWebSocketMode()
    await battleSelector.startSelectedBattle()

    const theme = TestHelpers.getRandomTheme()
    await battleArena.createBattle(theme)

    // Verify real-time updates
    await battleArena.verifyRealTimeUpdates()
    await battleArena.verifyLoadingStates()
  })

  test('should handle audio playback correctly', async () => {
    await battleSelector.navigate()
    await battleSelector.selectWebSocketMode()
    await battleSelector.startSelectedBattle()

    const theme = TestHelpers.getRandomTheme()
    await battleArena.createBattle(theme)

    // Wait for first round
    await battleArena.waitForRound(1)
    await battleArena.waitForLyricGeneration()

    // Test audio functionality
    await battleArena.verifyAudioPlayback()
    
    const audioDuration = await battleArena.getAudioDuration()
    expect(audioDuration).toBeGreaterThan(0)
    expect(audioDuration).toBeLessThan(30) // Reasonable upper limit
    
    console.log(`Audio duration: ${audioDuration} seconds`)
  })

  test('should handle voting correctly', async () => {
    await battleSelector.navigate()
    await battleSelector.selectWebSocketMode()
    await battleSelector.startSelectedBattle()

    const theme = TestHelpers.getRandomTheme()
    await battleArena.createBattle(theme)

    // Wait for first round to complete
    await battleArena.waitForRound(1)
    await battleArena.waitForLyricGeneration()
    await battleArena.waitForAudioGeneration()

    // Test voting
    const initialVotes = await battleArena.getVoteCounts()
    
    await battleArena.castVote(1)
    
    const afterVoteAI1 = await battleArena.getVoteCounts()
    expect(afterVoteAI1.ai1).toBe(initialVotes.ai1 + 1)
    
    await battleArena.castVote(2)
    
    const afterVoteAI2 = await battleArena.getVoteCounts()
    expect(afterVoteAI2.ai2).toBe(initialVotes.ai2 + 1)
  })

  test('should handle multiple concurrent users', async ({ browser }) => {
    // Create multiple browser contexts to simulate different users
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    
    const page1 = await context1.newPage()
    const page2 = await context2.newPage()
    
    const battleArena1 = new BattleArenaPage(page1)
    const battleArena2 = new BattleArenaPage(page2)
    
    // Both users navigate to battle
    await Promise.all([
      battleArena1.navigate(),
      battleArena2.navigate()
    ])
    
    // User 1 creates battle
    const theme = TestHelpers.getRandomTheme()
    await battleArena1.createBattle(theme)
    
    // User 2 should see the same battle
    await battleArena2.page.waitForTimeout(2000)
    
    // Both users should see lyrics generation
    await Promise.all([
      battleArena1.waitForLyricGeneration(),
      battleArena2.waitForLyricGeneration()
    ])
    
    // Both users vote differently
    await battleArena1.castVote(1)
    await battleArena2.castVote(2)
    
    // Verify vote counts
    const votes1 = await battleArena1.getVoteCounts()
    const votes2 = await battleArena2.getVoteCounts()
    
    expect(votes1.ai1).toBeGreaterThan(0)
    expect(votes1.ai2).toBeGreaterThan(0)
    expect(votes1).toEqual(votes2) // Both users should see same counts
    
    await context1.close()
    await context2.close()
  })

  test('should handle error scenarios gracefully', async () => {
    await battleSelector.navigate()
    await battleSelector.selectWebSocketMode()
    await battleSelector.startSelectedBattle()

    // Test with very long theme
    const longTheme = 'a'.repeat(200)
    await battleArena.verifyThemeValidation(longTheme, false)
    
    // Reset page
    await battleArena.page.reload()
    await battleArena.verifyPageLoaded()
    
    // Test with empty theme
    await battleArena.verifyThemeValidation('', false)
  })

  test('should maintain performance under load', async () => {
    await battleSelector.navigate()
    await battleSelector.selectWebSocketMode()
    await battleSelector.startSelectedBattle()

    const performanceMetrics: number[] = []
    
    // Run multiple battles to test performance consistency
    for (let i = 0; i < 3; i++) {
      const theme = TestHelpers.getRandomTheme()
      const latency = await battleArena.measureEndToEndLatency(theme)
      performanceMetrics.push(latency)
      
      console.log(`Battle ${i + 1} latency: ${latency}ms`)
      
      // Reset for next battle
      await battleArena.page.reload()
      await battleArena.verifyPageLoaded()
    }
    
    // Verify all battles met performance requirements
    performanceMetrics.forEach((latency, index) => {
      expect(latency).toBeLessThan(TEST_CONFIG.MAX_END_TO_END_LATENCY)
    })
    
    // Verify performance consistency (no battle should be more than 2x slower than fastest)
    const minLatency = Math.min(...performanceMetrics)
    const maxLatency = Math.max(...performanceMetrics)
    
    expect(maxLatency).toBeLessThan(minLatency * 2)
    
    console.log(`Performance consistency: ${minLatency}ms - ${maxLatency}ms`)
  })
})