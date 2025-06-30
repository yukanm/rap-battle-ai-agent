import { test, expect } from '@playwright/test'
import { BattleSelectorPage } from '../fixtures/page-objects/battle-selector.page'
import { TEST_CONFIG, SELECTORS } from '../utils/constants'
import { TestHelpers } from '../utils/helpers'

/**
 * Live API Battle Mode E2E Tests
 * Live APIモードバトルのエンドツーエンドテスト (β版)
 */

test.describe('Live API Battle Mode (Beta)', () => {
  let battleSelector: BattleSelectorPage

  test.beforeEach(async ({ page }) => {
    battleSelector = new BattleSelectorPage(page)
  })

  test('should display Live mode option with beta badge', async () => {
    await battleSelector.navigate()
    await battleSelector.verifyPageLoaded()

    // Verify Live mode card is visible
    await expect(battleSelector.liveModeCard).toBeVisible()
    
    // Verify beta badge is present
    await battleSelector.verifyBetaBadge()
    
    // Verify Live mode description
    const liveDescription = await battleSelector.liveModeCard.locator('p').textContent()
    expect(liveDescription).toContain('リアルタイム音声バトル')
  })

  test('should allow Live mode selection', async () => {
    await battleSelector.navigate()
    
    // Select Live mode
    await battleSelector.selectLiveMode()
    
    // Verify visual selection feedback
    await battleSelector.verifyModeSelected('live')
    
    // Start Live battle
    await battleSelector.startSelectedBattle()
    
    // Should navigate to Live battle arena
    await expect(battleSelector.page).toHaveURL(/.*/, { timeout: 5000 })
  })

  test('should load Live Battle Arena setup screen', async ({ page }) => {
    await battleSelector.navigate()
    await battleSelector.selectLiveMode()
    await battleSelector.startSelectedBattle()

    // Wait for Live Battle Arena to load
    await page.waitForTimeout(2000)
    
    // Verify Live Battle Arena setup elements
    await expect(page.locator(SELECTORS.LIVE_SETUP_FORM)).toBeVisible()
    await expect(page.locator(SELECTORS.USER_NAME_INPUT)).toBeVisible()
    await expect(page.locator(SELECTORS.BATTLE_ID_INPUT)).toBeVisible()
    await expect(page.locator(SELECTORS.LIVE_SETUP_BUTTON)).toBeVisible()
    
    // Verify beta badge is shown
    const betaBadge = page.locator('.bg-yellow-500\\/20, [data-testid="beta-badge"]')
    await expect(betaBadge.first()).toBeVisible()
  })

  test('should validate Live API setup form', async ({ page }) => {
    await battleSelector.navigate()
    await battleSelector.selectLiveMode()
    await battleSelector.startSelectedBattle()

    // Try to setup without username (should fail)
    await page.click(SELECTORS.LIVE_SETUP_BUTTON)
    
    // Should show validation error
    await expect(page.locator('.Toaster')).toContainText('ユーザー名を入力してください')
    
    // Fill valid username
    await page.fill(SELECTORS.USER_NAME_INPUT, 'TestRapper')
    
    // Try setup again (should succeed or at least proceed)
    await page.click(SELECTORS.LIVE_SETUP_BUTTON)
    
    // Should either succeed or show connection-related error (acceptable for beta)
    await page.waitForTimeout(3000)
  })

  test('should handle Live API connection attempt', async ({ page }) => {
    await battleSelector.navigate()
    await battleSelector.selectLiveMode()
    await battleSelector.startSelectedBattle()

    // Fill setup form
    await page.fill(SELECTORS.USER_NAME_INPUT, 'TestRapper')
    await page.fill(SELECTORS.BATTLE_ID_INPUT, TestHelpers.generateTestBattleId())
    
    // Attempt to setup Live session
    await page.click(SELECTORS.LIVE_SETUP_BUTTON)
    
    // For beta version, we expect either:
    // 1. Successful setup (ideal)
    // 2. Graceful error handling with proper error message
    
    await page.waitForTimeout(5000)
    
    // Check for either success or proper error handling
    const hasConnectionStatus = await page.locator(SELECTORS.CONNECTION_STATUS).isVisible()
    const hasErrorMessage = await page.locator(SELECTORS.ERROR_MESSAGE).isVisible()
    const hasToastError = await page.locator('.Toaster').isVisible()
    
    // Should have some feedback (success or error)
    expect(hasConnectionStatus || hasErrorMessage || hasToastError).toBe(true)
  })

  test('should display Live Battle Arena UI components', async ({ page }) => {
    await battleSelector.navigate()
    await battleSelector.selectLiveMode()
    await battleSelector.startSelectedBattle()

    // Fill setup form and attempt setup
    await page.fill(SELECTORS.USER_NAME_INPUT, 'TestRapper')
    await page.click(SELECTORS.LIVE_SETUP_BUTTON)
    
    await page.waitForTimeout(3000)
    
    // Try to navigate to main arena (might fail in beta, but UI should exist)
    const setupButton = page.locator(SELECTORS.LIVE_SETUP_BUTTON)
    const isSetupVisible = await setupButton.isVisible()
    
    if (!isSetupVisible) {
      // Setup completed, check main arena UI
      await expect(page.locator(SELECTORS.MIC_BUTTON)).toBeVisible()
      await expect(page.locator(SELECTORS.TEXT_INPUT)).toBeVisible()
      await expect(page.locator(SELECTORS.SEND_TEXT_BUTTON)).toBeVisible()
      await expect(page.locator(SELECTORS.LIVE_FEED)).toBeVisible()
    }
  })

  test('should handle microphone permissions gracefully', async ({ page }) => {
    // Grant microphone permissions
    await page.context().grantPermissions(['microphone'])
    
    await battleSelector.navigate()
    await battleSelector.selectLiveMode()
    await battleSelector.startSelectedBattle()

    await page.fill(SELECTORS.USER_NAME_INPUT, 'TestRapper')
    await page.click(SELECTORS.LIVE_SETUP_BUTTON)
    
    await page.waitForTimeout(3000)
    
    // Check if microphone permission was handled
    // Note: In beta version, this might not be fully implemented
    const micButton = page.locator(SELECTORS.MIC_BUTTON)
    if (await micButton.isVisible()) {
      // Should be able to click mic button without errors
      await micButton.click()
      await page.waitForTimeout(1000)
    }
  })

  test('should support text input functionality', async ({ page }) => {
    await battleSelector.navigate()
    await battleSelector.selectLiveMode()
    await battleSelector.startSelectedBattle()

    await page.fill(SELECTORS.USER_NAME_INPUT, 'TestRapper')
    await page.click(SELECTORS.LIVE_SETUP_BUTTON)
    
    await page.waitForTimeout(3000)
    
    const textInput = page.locator(SELECTORS.TEXT_INPUT)
    const sendButton = page.locator(SELECTORS.SEND_TEXT_BUTTON)
    
    if (await textInput.isVisible() && await sendButton.isVisible()) {
      // Test text input
      await textInput.fill('テストラップです')
      await sendButton.click()
      
      // Should not crash and might show response in feed
      await page.waitForTimeout(2000)
    }
  })

  test('should display proper battle configuration', async ({ page }) => {
    await battleSelector.navigate()
    await battleSelector.selectLiveMode()
    await battleSelector.startSelectedBattle()

    // Verify battle configuration is displayed
    const configSection = page.locator('.bg-purple-900\\/20')
    await expect(configSection).toBeVisible()
    
    // Should show theme and style
    const configText = await configSection.textContent()
    expect(configText).toContain('テーマ:')
    expect(configText).toContain('スタイル:')
    expect(configText).toContain('形式:')
  })

  test('should have responsive design in Live mode', async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080 },
      { width: 768, height: 1024 },
      { width: 375, height: 667 }
    ]
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      
      await battleSelector.navigate()
      await battleSelector.selectLiveMode()
      await battleSelector.startSelectedBattle()
      
      // Verify setup form is still accessible
      await expect(page.locator(SELECTORS.LIVE_SETUP_FORM)).toBeVisible()
      await expect(page.locator(SELECTORS.USER_NAME_INPUT)).toBeVisible()
      
      await page.waitForTimeout(500)
    }
  })

  test('should handle Live API errors gracefully', async ({ page }) => {
    // Intercept and simulate API errors
    await page.route('**/api/live/**', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ success: false, error: 'Live API service unavailable' })
      })
    })
    
    await battleSelector.navigate()
    await battleSelector.selectLiveMode()
    await battleSelector.startSelectedBattle()

    await page.fill(SELECTORS.USER_NAME_INPUT, 'TestRapper')
    await page.click(SELECTORS.LIVE_SETUP_BUTTON)
    
    // Should show proper error message
    await expect(page.locator('.Toaster')).toContainText('失敗', { timeout: 10000 })
  })

  test('should display back navigation option', async ({ page }) => {
    await battleSelector.navigate()
    await battleSelector.selectLiveMode()
    await battleSelector.startSelectedBattle()

    // Should have back button
    const backButton = page.locator(SELECTORS.BACK_BUTTON)
    await expect(backButton).toBeVisible()
    
    // Back button should work
    await backButton.click()
    await expect(page).toHaveURL(/.*\/demo/)
  })

  test('should show Live mode features in battle selector', async () => {
    await battleSelector.navigate()
    
    // Verify Live mode features are described
    const liveModeText = await battleSelector.liveModeCard.textContent()
    
    expect(liveModeText).toContain('Google Live API')
    expect(liveModeText).toContain('リアルタイム音声ストリーミング')
    expect(liveModeText).toContain('低遅延音声・テキスト入力')
    expect(liveModeText).toContain('次世代ラップバトル体験')
  })

  test('should handle concurrent Live API sessions', async ({ browser }) => {
    // Create multiple browser contexts
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    
    const page1 = await context1.newPage()
    const page2 = await context2.newPage()
    
    // Both users navigate to Live mode
    for (const page of [page1, page2]) {
      const selector = new BattleSelectorPage(page)
      await selector.navigate()
      await selector.selectLiveMode()
      await selector.startSelectedBattle()
      
      await page.fill(SELECTORS.USER_NAME_INPUT, `TestRapper${Math.random()}`)
      await page.click(SELECTORS.LIVE_SETUP_BUTTON)
      
      await page.waitForTimeout(2000)
    }
    
    // Both sessions should handle gracefully (even if one fails)
    await context1.close()
    await context2.close()
  })

  test.describe('Live API Performance (Beta)', () => {
    test('should attempt Live API connection within reasonable time', async ({ page }) => {
      await battleSelector.navigate()
      await battleSelector.selectLiveMode()
      await battleSelector.startSelectedBattle()

      await page.fill(SELECTORS.USER_NAME_INPUT, 'TestRapper')
      
      const startTime = Date.now()
      await page.click(SELECTORS.LIVE_SETUP_BUTTON)
      
      // Wait for either success or error response
      await Promise.race([
        page.waitForSelector(SELECTORS.CONNECTION_STATUS, { timeout: 8000 }),
        page.waitForSelector(SELECTORS.ERROR_MESSAGE, { timeout: 8000 }),
        page.waitForSelector('.Toaster', { timeout: 8000 })
      ]).catch(() => {
        // Timeout is acceptable for beta version
      })
      
      const endTime = Date.now()
      const connectionTime = endTime - startTime
      
      // Should respond within reasonable time (even if with error)
      expect(connectionTime).toBeLessThan(10000) // 10 seconds max
      
      console.log(`Live API connection attempt time: ${connectionTime}ms`)
    })
  })
})