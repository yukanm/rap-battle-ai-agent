import { Page, Locator } from '@playwright/test'
import { SELECTORS, TEST_CONFIG } from '../../utils/constants'
import { TestHelpers } from '../../utils/helpers'

/**
 * Battle Arena Page Object Model (WebSocket Mode)
 * WebSocketモードバトルアリーナのページオブジェクトモデル
 */
export class BattleArenaPage {
  readonly page: Page
  
  // Locators
  readonly themeInput: Locator
  readonly startBattleButton: Locator
  readonly battleStatus: Locator
  readonly roundIndicator: Locator
  readonly lyricDisplay: Locator
  readonly audioPlayer: Locator
  readonly voteAI1Button: Locator
  readonly voteAI2Button: Locator
  readonly voteCounts: Locator
  readonly battleResults: Locator
  readonly connectionStatus: Locator
  readonly loadingSpinner: Locator
  readonly errorMessage: Locator
  readonly backButton: Locator
  
  constructor(page: Page) {
    this.page = page
    
    // Initialize locators
    this.themeInput = page.locator(SELECTORS.THEME_INPUT)
    this.startBattleButton = page.locator(SELECTORS.START_BATTLE_BUTTON)
    this.battleStatus = page.locator(SELECTORS.BATTLE_STATUS)
    this.roundIndicator = page.locator(SELECTORS.ROUND_INDICATOR)
    this.lyricDisplay = page.locator(SELECTORS.LYRIC_DISPLAY)
    this.audioPlayer = page.locator(SELECTORS.AUDIO_PLAYER)
    this.voteAI1Button = page.locator(SELECTORS.VOTE_AI1)
    this.voteAI2Button = page.locator(SELECTORS.VOTE_AI2)
    this.voteCounts = page.locator(SELECTORS.VOTE_COUNTS)
    this.battleResults = page.locator(SELECTORS.BATTLE_RESULTS)
    this.connectionStatus = page.locator(SELECTORS.WS_CONNECTED)
    this.loadingSpinner = page.locator(SELECTORS.LOADING_SPINNER)
    this.errorMessage = page.locator(SELECTORS.ERROR_MESSAGE)
    this.backButton = page.locator(SELECTORS.BACK_BUTTON)
  }
  
  /**
   * Navigation methods
   */
  async navigate(): Promise<void> {
    await this.page.goto(`${TEST_CONFIG.FRONTEND_URL}/demo`, { waitUntil: 'networkidle' })
    
    // Select WebSocket mode and start
    await this.page.click(SELECTORS.WEBSOCKET_MODE)
    await this.page.click(SELECTORS.START_BATTLE_BUTTON)
    
    await this.verifyPageLoaded()
  }
  
  async goBack(): Promise<void> {
    await this.backButton.click()
    await this.page.waitForURL('**/demo', { timeout: TEST_CONFIG.NAVIGATION_TIMEOUT })
  }
  
  /**
   * Battle flow methods
   */
  async createBattle(theme: string): Promise<void> {
    await this.themeInput.fill(theme)
    await this.startBattleButton.click()
    
    // Wait for battle to start
    await this.battleStatus.waitFor({ state: 'visible', timeout: TEST_CONFIG.BATTLE_ROUND_TIMEOUT })
  }
  
  async waitForRound(roundNumber: number): Promise<void> {
    await this.roundIndicator.waitFor({ state: 'visible' })
    
    const currentRound = await this.roundIndicator.textContent()
    if (!currentRound?.includes(roundNumber.toString())) {
      throw new Error(`Expected round ${roundNumber}, but got: ${currentRound}`)
    }
  }
  
  async waitForLyricGeneration(): Promise<string> {
    await this.lyricDisplay.waitFor({ 
      state: 'visible', 
      timeout: TEST_CONFIG.LYRIC_GENERATION_TIMEOUT 
    })
    
    const lyricText = await this.lyricDisplay.textContent()
    if (!lyricText || lyricText.trim().length === 0) {
      throw new Error('Generated lyric is empty')
    }
    
    return lyricText
  }
  
  async waitForAudioGeneration(): Promise<void> {
    await this.audioPlayer.waitFor({ 
      state: 'visible', 
      timeout: TEST_CONFIG.AUDIO_GENERATION_TIMEOUT 
    })
    
    // Verify audio has source
    const audioSrc = await this.audioPlayer.getAttribute('src')
    if (!audioSrc) {
      throw new Error('Audio player has no source')
    }
  }
  
  async castVote(aiNumber: 1 | 2): Promise<void> {
    const voteButton = aiNumber === 1 ? this.voteAI1Button : this.voteAI2Button
    
    await voteButton.click()
    
    // Wait for vote to be processed
    await this.page.waitForTimeout(1000)
  }
  
  async getVoteCounts(): Promise<{ ai1: number; ai2: number }> {
    await this.voteCounts.waitFor({ state: 'visible' })
    
    const voteText = await this.voteCounts.textContent()
    
    // Parse vote counts from text (format may vary)
    const ai1Match = voteText?.match(/AI1.*?(\d+)/) || voteText?.match(/(\d+).*?AI1/)
    const ai2Match = voteText?.match(/AI2.*?(\d+)/) || voteText?.match(/(\d+).*?AI2/)
    
    return {
      ai1: ai1Match ? parseInt(ai1Match[1]) : 0,
      ai2: ai2Match ? parseInt(ai2Match[1]) : 0
    }
  }
  
  async waitForBattleCompletion(): Promise<void> {
    await this.battleResults.waitFor({ 
      state: 'visible', 
      timeout: TEST_CONFIG.BATTLE_ROUND_TIMEOUT * TEST_CONFIG.DEFAULT_BATTLE_ROUNDS 
    })
  }
  
  async getBattleResults(): Promise<{ winner: string; score: string }> {
    await this.waitForBattleCompletion()
    
    const resultsText = await this.battleResults.textContent()
    
    // Parse results (format may vary)
    return {
      winner: resultsText?.includes('AI1') ? 'AI1' : 'AI2',
      score: resultsText || 'Unknown'
    }
  }
  
  /**
   * WebSocket connection methods
   */
  async verifyWebSocketConnection(): Promise<void> {
    await TestHelpers.verifyWebSocketStatus(this.page, 'connected')
  }
  
  async simulateDisconnection(): Promise<void> {
    // Simulate network disconnection
    await this.page.context().setOffline(true)
    
    // Wait for disconnection to be detected
    await TestHelpers.verifyWebSocketStatus(this.page, 'disconnected')
  }
  
  async simulateReconnection(): Promise<void> {
    // Restore network connection
    await this.page.context().setOffline(false)
    
    // Wait for reconnection
    await TestHelpers.verifyWebSocketStatus(this.page, 'connected')
  }
  
  /**
   * Verification methods
   */
  async verifyPageLoaded(): Promise<void> {
    await this.themeInput.waitFor({ state: 'visible' })
    await this.startBattleButton.waitFor({ state: 'visible' })
  }
  
  async verifyThemeValidation(theme: string, shouldBeValid: boolean): Promise<void> {
    await this.themeInput.fill(theme)
    await this.startBattleButton.click()
    
    if (shouldBeValid) {
      // Should proceed to battle
      await this.battleStatus.waitFor({ state: 'visible', timeout: 5000 })
    } else {
      // Should show error or validation message
      await this.errorMessage.waitFor({ state: 'visible', timeout: 5000 })
    }
  }
  
  async verifyRealTimeUpdates(): Promise<void> {
    // Verify that updates happen in real-time
    const initialContent = await this.lyricDisplay.textContent()
    
    // Wait for content to change
    await this.page.waitForFunction(
      (initial) => {
        const current = document.querySelector('[data-testid="lyric-display"]')?.textContent
        return current && current !== initial
      },
      initialContent,
      { timeout: TEST_CONFIG.LYRIC_GENERATION_TIMEOUT }
    )
  }
  
  async verifyLoadingStates(): Promise<void> {
    // Verify loading spinner appears and disappears
    await this.loadingSpinner.waitFor({ state: 'visible', timeout: 1000 })
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: TEST_CONFIG.LYRIC_GENERATION_TIMEOUT })
  }
  
  /**
   * Performance measurement
   */
  async measureBattleCreationTime(theme: string): Promise<number> {
    const startTime = Date.now()
    await this.createBattle(theme)
    const endTime = Date.now()
    return endTime - startTime
  }
  
  async measureLyricGenerationTime(): Promise<number> {
    const startTime = Date.now()
    await this.waitForLyricGeneration()
    const endTime = Date.now()
    return endTime - startTime
  }
  
  async measureAudioGenerationTime(): Promise<number> {
    const startTime = Date.now()
    await this.waitForAudioGeneration()
    const endTime = Date.now()
    return endTime - startTime
  }
  
  async measureEndToEndLatency(theme: string): Promise<number> {
    const startTime = Date.now()
    await this.createBattle(theme)
    await this.waitForLyricGeneration()
    await this.waitForAudioGeneration()
    const endTime = Date.now()
    return endTime - startTime
  }
  
  /**
   * Audio testing methods
   */
  async verifyAudioPlayback(): Promise<void> {
    await this.waitForAudioGeneration()
    
    // Verify audio can be played
    const canPlay = await this.audioPlayer.evaluate((audio: HTMLAudioElement) => {
      return new Promise<boolean>((resolve) => {
        audio.addEventListener('canplay', () => resolve(true), { once: true })
        audio.addEventListener('error', () => resolve(false), { once: true })
        audio.load()
        
        // Timeout after 5 seconds
        setTimeout(() => resolve(false), 5000)
      })
    })
    
    if (!canPlay) {
      throw new Error('Audio cannot be played')
    }
  }
  
  async getAudioDuration(): Promise<number> {
    await this.waitForAudioGeneration()
    
    return await this.audioPlayer.evaluate((audio: HTMLAudioElement) => {
      return audio.duration
    })
  }
}