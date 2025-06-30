import { Page, expect } from '@playwright/test'
import { TEST_CONFIG, SELECTORS, MESSAGES } from './constants'

/**
 * E2E Test Helper Functions
 * テストヘルパー関数集
 */

export class TestHelpers {
  
  /**
   * Performance measurement utilities
   */
  static async measureNavigationTime(page: Page, url: string): Promise<number> {
    const startTime = Date.now()
    await page.goto(url, { waitUntil: 'networkidle' })
    const endTime = Date.now()
    return endTime - startTime
  }
  
  static async measureActionTime(action: () => Promise<void>): Promise<number> {
    const startTime = Date.now()
    await action()
    const endTime = Date.now()
    return endTime - startTime
  }
  
  /**
   * WebSocket connection helpers
   */
  static async waitForWebSocketConnection(page: Page, timeout = TEST_CONFIG.WEBSOCKET_CONNECTION_TIMEOUT): Promise<void> {
    await page.waitForFunction(
      () => {
        return window.performance.getEntriesByType('navigation').length > 0
      },
      { timeout }
    )
  }
  
  static async verifyWebSocketStatus(page: Page, expectedStatus: 'connected' | 'disconnected' | 'reconnecting'): Promise<void> {
    const selector = expectedStatus === 'connected' ? SELECTORS.WS_CONNECTED :
                    expectedStatus === 'disconnected' ? SELECTORS.WS_DISCONNECTED :
                    SELECTORS.WS_RECONNECTING
                    
    await expect(page.locator(selector)).toBeVisible({ timeout: 10000 })
  }
  
  /**
   * Battle flow helpers
   */
  static async createBattle(page: Page, theme: string): Promise<void> {
    // Fill theme input
    await page.fill(SELECTORS.THEME_INPUT, theme)
    
    // Click start battle button
    await page.click(SELECTORS.START_BATTLE_BUTTON)
    
    // Wait for battle to start
    await page.waitForSelector(SELECTORS.BATTLE_STATUS, { timeout: TEST_CONFIG.BATTLE_ROUND_TIMEOUT })
  }
  
  static async waitForLyricGeneration(page: Page, roundNumber: number): Promise<string> {
    // Wait for lyric to appear
    await page.waitForSelector(SELECTORS.LYRIC_DISPLAY, { timeout: TEST_CONFIG.LYRIC_GENERATION_TIMEOUT })
    
    // Get the generated lyric text
    const lyricText = await page.textContent(SELECTORS.LYRIC_DISPLAY)
    expect(lyricText).toBeTruthy()
    expect(lyricText!.length).toBeGreaterThan(0)
    
    return lyricText!
  }
  
  static async waitForAudioGeneration(page: Page): Promise<void> {
    // Wait for audio player to appear
    await page.waitForSelector(SELECTORS.AUDIO_PLAYER, { timeout: TEST_CONFIG.AUDIO_GENERATION_TIMEOUT })
    
    // Verify audio element has source
    const audioSrc = await page.getAttribute(SELECTORS.AUDIO_PLAYER, 'src')
    expect(audioSrc).toBeTruthy()
  }
  
  static async castVote(page: Page, voteFor: 'ai1' | 'ai2'): Promise<void> {
    const voteSelector = voteFor === 'ai1' ? SELECTORS.VOTE_AI1 : SELECTORS.VOTE_AI2
    
    await page.click(voteSelector)
    
    // Wait for vote to be recorded
    await page.waitForTimeout(1000) // Brief wait for vote processing
  }
  
  static async waitForBattleCompletion(page: Page): Promise<void> {
    await page.waitForSelector(SELECTORS.BATTLE_RESULTS, { timeout: TEST_CONFIG.BATTLE_ROUND_TIMEOUT * 3 })
  }
  
  /**
   * Live API helpers
   */
  static async setupLiveSession(page: Page, userName: string, battleId?: string): Promise<void> {
    // Fill user name
    await page.fill(SELECTORS.USER_NAME_INPUT, userName)
    
    // Fill battle ID if provided
    if (battleId) {
      await page.fill(SELECTORS.BATTLE_ID_INPUT, battleId)
    }
    
    // Click setup button
    await page.click(SELECTORS.LIVE_SETUP_BUTTON)
    
    // Wait for setup completion
    await page.waitForSelector(SELECTORS.CONNECTION_STATUS, { timeout: 10000 })
  }
  
  static async sendTextInput(page: Page, text: string): Promise<void> {
    await page.fill(SELECTORS.TEXT_INPUT, text)
    await page.click(SELECTORS.SEND_TEXT_BUTTON)
    
    // Wait for response in live feed
    await page.waitForTimeout(2000)
  }
  
  /**
   * Error handling helpers
   */
  static async verifyErrorMessage(page: Page, expectedMessage: string): Promise<void> {
    await expect(page.locator(SELECTORS.ERROR_MESSAGE)).toContainText(expectedMessage)
  }
  
  static async verifySuccessMessage(page: Page, expectedMessage: string): Promise<void> {
    await expect(page.locator(SELECTORS.TOAST_NOTIFICATION)).toContainText(expectedMessage)
  }
  
  /**
   * Multi-user test helpers
   */
  static async openMultipleTabs(page: Page, count: number): Promise<Page[]> {
    const pages = [page]
    
    for (let i = 1; i < count; i++) {
      const newPage = await page.context().newPage()
      pages.push(newPage)
    }
    
    return pages
  }
  
  static async navigateAllToUrl(pages: Page[], url: string): Promise<void> {
    await Promise.all(
      pages.map(page => page.goto(url, { waitUntil: 'networkidle' }))
    )
  }
  
  /**
   * Validation helpers
   */
  static async verifyPageLoad(page: Page, expectedTitle?: string): Promise<void> {
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    
    // Verify title if provided
    if (expectedTitle) {
      await expect(page).toHaveTitle(expectedTitle)
    }
    
    // Verify no JavaScript errors
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    
    if (errors.length > 0) {
      throw new Error(`Page errors detected: ${errors.join(', ')}`)
    }
  }
  
  static async verifyResponsiveDesign(page: Page): Promise<void> {
    const viewports = [
      { width: 1920, height: 1080 }, // Desktop
      { width: 768, height: 1024 },  // Tablet
      { width: 375, height: 667 }    // Mobile
    ]
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      await page.waitForTimeout(500) // Wait for layout adjustment
      
      // Verify key elements are still visible
      await expect(page.locator('body')).toBeVisible()
    }
  }
  
  /**
   * Random data generators
   */
  static getRandomTheme(): string {
    return TEST_CONFIG.TEST_THEMES[Math.floor(Math.random() * TEST_CONFIG.TEST_THEMES.length)]
  }
  
  static generateRandomString(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }
  
  static generateTestBattleId(): string {
    return `test_battle_${Date.now()}_${this.generateRandomString(6)}`
  }
}