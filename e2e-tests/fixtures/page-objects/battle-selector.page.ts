import { Page, Locator } from '@playwright/test'
import { SELECTORS, TEST_CONFIG, BATTLE_MODES } from '../../utils/constants'

/**
 * Battle Selector Page Object Model
 * バトルモード選択ページのページオブジェクトモデル
 */
export class BattleSelectorPage {
  readonly page: Page
  
  // Locators
  readonly websocketModeCard: Locator
  readonly agentModeCard: Locator
  readonly liveModeCard: Locator
  readonly selectedModeIndicator: Locator
  readonly startBattleButton: Locator
  readonly backButton: Locator
  readonly modeDescription: Locator
  
  constructor(page: Page) {
    this.page = page
    
    // Initialize locators
    this.websocketModeCard = page.locator(SELECTORS.WEBSOCKET_MODE)
    this.agentModeCard = page.locator(SELECTORS.AGENT_MODE)
    this.liveModeCard = page.locator(SELECTORS.LIVE_MODE)
    this.selectedModeIndicator = page.locator(SELECTORS.SELECTED_MODE_INDICATOR)
    this.startBattleButton = page.locator(SELECTORS.START_BATTLE_BUTTON)
    this.backButton = page.locator(SELECTORS.BACK_BUTTON)
    this.modeDescription = page.locator('[data-testid="mode-description"]')
  }
  
  /**
   * Navigation methods
   */
  async navigate(): Promise<void> {
    await this.page.goto(`${TEST_CONFIG.FRONTEND_URL}/demo`, { waitUntil: 'networkidle' })
  }
  
  async goBack(): Promise<void> {
    await this.backButton.click()
    await this.page.waitForURL('**/', { timeout: TEST_CONFIG.NAVIGATION_TIMEOUT })
  }
  
  /**
   * Mode selection methods
   */
  async selectWebSocketMode(): Promise<void> {
    await this.websocketModeCard.click()
    await this.verifyModeSelected('websocket')
  }
  
  async selectAgentMode(): Promise<void> {
    await this.agentModeCard.click()
    await this.verifyModeSelected('agent')
  }
  
  async selectLiveMode(): Promise<void> {
    await this.liveModeCard.click()
    await this.verifyModeSelected('live')
  }
  
  async startSelectedBattle(): Promise<void> {
    await this.startBattleButton.click()
    // Wait for navigation to battle arena
    await this.page.waitForTimeout(2000)
  }
  
  /**
   * Verification methods
   */
  async verifyPageLoaded(): Promise<void> {
    await this.websocketModeCard.waitFor({ state: 'visible' })
    await this.agentModeCard.waitFor({ state: 'visible' })
    await this.liveModeCard.waitFor({ state: 'visible' })
    await this.startBattleButton.waitFor({ state: 'visible' })
  }
  
  async verifyModeSelected(mode: 'websocket' | 'agent' | 'live'): Promise<void> {
    const selectedCard = mode === 'websocket' ? this.websocketModeCard :
                        mode === 'agent' ? this.agentModeCard :
                        this.liveModeCard
    
    // Verify the card has selected styling
    await selectedCard.waitFor({ state: 'visible' })
    
    // Check for selection indicator or CSS class
    const isSelected = await selectedCard.evaluate(el => {
      return el.classList.contains('border-purple-500') || 
             el.classList.contains('border-pink-500') || 
             el.classList.contains('border-green-500')
    })
    
    if (!isSelected) {
      throw new Error(`Mode ${mode} is not visually selected`)
    }
  }
  
  async verifyAllModesVisible(): Promise<void> {
    await this.websocketModeCard.waitFor({ state: 'visible' })
    await this.agentModeCard.waitFor({ state: 'visible' })
    await this.liveModeCard.waitFor({ state: 'visible' })
  }
  
  async verifyModeDescriptions(): Promise<void> {
    // Verify WebSocket mode description
    await this.websocketModeCard.click()
    const websocketDescription = await this.websocketModeCard.locator('p').textContent()
    if (!websocketDescription?.includes('WebSocket') && !websocketDescription?.includes('リアルタイム')) {
      throw new Error('WebSocket mode description is missing or incorrect')
    }
    
    // Verify Agent mode description
    await this.agentModeCard.click()
    const agentDescription = await this.agentModeCard.locator('p').textContent()
    if (!agentDescription?.includes('Agent') && !agentDescription?.includes('AI')) {
      throw new Error('Agent mode description is missing or incorrect')
    }
    
    // Verify Live mode description
    await this.liveModeCard.click()
    const liveDescription = await this.liveModeCard.locator('p').textContent()
    if (!liveDescription?.includes('Live') && !liveDescription?.includes('リアルタイム音声')) {
      throw new Error('Live mode description is missing or incorrect')
    }
  }
  
  async verifyBetaBadge(): Promise<void> {
    // Verify that Live mode has beta badge
    const betaBadge = this.liveModeCard.locator('[data-testid="beta-badge"], .bg-yellow-500\\/20')
    await betaBadge.waitFor({ state: 'visible' })
    
    const badgeText = await betaBadge.textContent()
    if (!badgeText?.includes('β') && !badgeText?.includes('beta')) {
      throw new Error('Live mode beta badge is missing or incorrect')
    }
  }
  
  async verifyResponsiveLayout(): Promise<void> {
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' }
    ]
    
    for (const viewport of viewports) {
      await this.page.setViewportSize({ width: viewport.width, height: viewport.height })
      await this.page.waitForTimeout(500)
      
      await this.verifyAllModesVisible()
    }
  }
  
  /**
   * Animation verification
   */
  async verifyModeSelectionAnimations(): Promise<void> {
    // Test animation on each mode selection
    const modes = [
      { card: this.websocketModeCard, name: 'WebSocket' },
      { card: this.agentModeCard, name: 'Agent' },
      { card: this.liveModeCard, name: 'Live' }
    ]
    
    for (const mode of modes) {
      await mode.card.click()
      
      // Wait for transition animation
      await this.page.waitForTimeout(300)
      
      // Verify visual feedback (could be border color, shadow, scale, etc.)
      const hasVisualFeedback = await mode.card.evaluate(el => {
        const style = getComputedStyle(el)
        return style.borderColor !== 'rgb(255, 255, 255)' || // Not default white border
               style.boxShadow !== 'none' || // Has shadow
               style.transform !== 'none' // Has transform
      })
      
      if (!hasVisualFeedback) {
        console.warn(`${mode.name} mode may not have proper selection animation`)
      }
    }
  }
  
  /**
   * Performance measurement
   */
  async measureModeSelectionTime(): Promise<number> {
    const startTime = Date.now()
    await this.selectWebSocketMode()
    const endTime = Date.now()
    return endTime - startTime
  }
}