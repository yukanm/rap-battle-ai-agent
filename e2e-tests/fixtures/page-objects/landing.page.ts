import { Page, Locator } from '@playwright/test'
import { SELECTORS, TEST_CONFIG } from '../../utils/constants'

/**
 * Landing Page Object Model
 * ランディングページのページオブジェクトモデル
 */
export class LandingPage {
  readonly page: Page
  
  // Locators
  readonly heroSection: Locator
  readonly startBattleButton: Locator
  readonly featuresSection: Locator
  readonly title: Locator
  readonly subtitle: Locator
  readonly heroVideo: Locator
  
  constructor(page: Page) {
    this.page = page
    
    // Initialize locators
    this.heroSection = page.locator(SELECTORS.HERO_SECTION)
    this.startBattleButton = page.locator(SELECTORS.START_BUTTON)
    this.featuresSection = page.locator(SELECTORS.FEATURES_SECTION)
    this.title = page.locator('h1').first()
    this.subtitle = page.locator('p').first()
    this.heroVideo = page.locator('video').first()
  }
  
  /**
   * Navigation methods
   */
  async navigate(): Promise<void> {
    await this.page.goto(TEST_CONFIG.FRONTEND_URL, { waitUntil: 'networkidle' })
  }
  
  async clickStartBattle(): Promise<void> {
    await this.startBattleButton.click()
    // Wait for battle selector to become visible (state-based navigation)
    await this.page.locator(SELECTORS.BATTLE_SELECTOR).waitFor({ 
      state: 'visible', 
      timeout: TEST_CONFIG.NAVIGATION_TIMEOUT 
    })
  }
  
  async verifyBattleSelectorVisible(): Promise<void> {
    await this.page.locator(SELECTORS.BATTLE_SELECTOR).waitFor({ state: 'visible' })
  }
  
  /**
   * Verification methods
   */
  async verifyPageLoaded(): Promise<void> {
    await this.heroSection.waitFor({ state: 'visible' })
    await this.startBattleButton.waitFor({ state: 'visible' })
  }
  
  async verifyHeroContent(): Promise<void> {
    await this.title.waitFor({ state: 'visible' })
    await this.subtitle.waitFor({ state: 'visible' })
  }
  
  async verifyFeaturesSection(): Promise<void> {
    await this.featuresSection.waitFor({ state: 'visible' })
  }
  
  async verifyAnimations(): Promise<void> {
    // Verify hero section animation
    await this.page.waitForFunction(
      () => {
        const hero = document.querySelector('[data-testid="hero-section"]')
        return hero && getComputedStyle(hero).opacity === '1'
      },
      { timeout: 5000 }
    )
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
      
      // Verify key elements are still visible and properly positioned
      await this.heroSection.waitFor({ state: 'visible' })
      await this.startBattleButton.waitFor({ state: 'visible' })
    }
  }
  
  async scrollToFeatures(): Promise<void> {
    await this.featuresSection.scrollIntoViewIfNeeded()
  }
  
  /**
   * Performance measurement
   */
  async measurePageLoadTime(): Promise<number> {
    const startTime = Date.now()
    await this.navigate()
    await this.verifyPageLoaded()
    const endTime = Date.now()
    return endTime - startTime
  }
}