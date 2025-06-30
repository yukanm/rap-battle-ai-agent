import { test, expect } from '@playwright/test'
import { LandingPage } from '../fixtures/page-objects/landing.page'
import { TEST_CONFIG } from '../utils/constants'

/**
 * Landing Page E2E Tests
 * ランディングページのエンドツーエンドテスト
 */

test.describe('Landing Page', () => {
  let landingPage: LandingPage

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page)
  })

  test('should load successfully with all core elements', async () => {
    await landingPage.navigate()
    await landingPage.verifyPageLoaded()
    await landingPage.verifyHeroContent()
  })

  test('should display hero section with proper animations', async () => {
    await landingPage.navigate()
    await landingPage.verifyAnimations()
  })

  test('should navigate to battle selector when start button is clicked', async () => {
    await landingPage.navigate()
    await landingPage.clickStartBattle()
    
    // Verify battle selector is visible (state-based navigation)
    await landingPage.verifyBattleSelectorVisible()
  })

  test('should display features section', async () => {
    await landingPage.navigate()
    await landingPage.verifyFeaturesSection()
  })

  test('should be responsive across different screen sizes', async () => {
    await landingPage.navigate()
    await landingPage.verifyResponsiveLayout()
  })

  test('should have acceptable page load performance', async () => {
    const loadTime = await landingPage.measurePageLoadTime()
    
    // Performance requirement: page should load within reasonable time
    expect(loadTime).toBeLessThan(5000) // 5 seconds max for initial load
    
    console.log(`Landing page load time: ${loadTime}ms`)
  })

  test('should scroll to features section', async () => {
    await landingPage.navigate()
    await landingPage.scrollToFeatures()
    
    // Verify features section is in viewport
    await expect(landingPage.featuresSection).toBeInViewport()
  })

  test('should not have JavaScript errors', async ({ page }) => {
    const jsErrors: string[] = []
    
    page.on('pageerror', error => {
      jsErrors.push(error.message)
    })
    
    await landingPage.navigate()
    await landingPage.verifyPageLoaded()
    
    // Should have no JavaScript errors
    expect(jsErrors).toHaveLength(0)
  })

  test('should have proper page title and meta tags', async ({ page }) => {
    await landingPage.navigate()
    
    // Verify page title
    await expect(page).toHaveTitle(/AI.*Rap.*Battle|ラップ.*バトル/i)
    
    // Verify meta description exists
    const metaDescription = await page.locator('meta[name="description"]').getAttribute('content')
    expect(metaDescription).toBeTruthy()
    expect(metaDescription!.length).toBeGreaterThan(50)
  })

  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate slow network
    await page.route('**/*', route => {
      setTimeout(() => route.continue(), 1000)
    })
    
    await landingPage.navigate()
    await landingPage.verifyPageLoaded()
  })

  test.describe('Mobile specific tests', () => {
    test.use({ viewport: { width: 375, height: 667 } })

    test('should display properly on mobile devices', async () => {
      await landingPage.navigate()
      await landingPage.verifyPageLoaded()
      await landingPage.verifyHeroContent()
      
      // Mobile-specific checks
      await expect(landingPage.startBattleButton).toBeVisible()
      await expect(landingPage.heroSection).toBeVisible()
    })

    test('should allow touch interactions', async ({ page }) => {
      await landingPage.navigate()
      
      // Test touch interaction on start button
      await landingPage.startBattleButton.tap()
      await landingPage.verifyBattleSelectorVisible()
    })
  })

  test.describe('Performance tests', () => {
    test('should meet Core Web Vitals requirements', async ({ page }) => {
      await landingPage.navigate()
      
      // Measure First Contentful Paint (FCP)
      const fcp = await page.evaluate(() => {
        return new Promise((resolve) => {
          // First, check if FCP has already been recorded
          const existingEntries = performance.getEntriesByName('first-contentful-paint')
          if (existingEntries.length > 0) {
            resolve(existingEntries[0].startTime)
            return
          }
          
          // If not, observe for it
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries()
            const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint')
            if (fcpEntry) {
              observer.disconnect()
              resolve(fcpEntry.startTime)
            }
          })
          
          observer.observe({ entryTypes: ['paint'] })
          
          // Fallback timeout after 5 seconds
          setTimeout(() => {
            observer.disconnect()
            resolve(5000) // Return 5 seconds as fallback
          }, 5000)
        })
      })
      
      // FCP should be under 2.5 seconds
      expect(fcp).toBeLessThan(2500)
      console.log(`First Contentful Paint: ${fcp}ms`)
    })

    test('should load critical resources quickly', async ({ page }) => {
      const resourceTimes: { [key: string]: number } = {}
      
      page.on('response', response => {
        const url = response.url()
        const timing = response.timing()
        
        if (url.includes('.js') || url.includes('.css') || url.includes('api')) {
          resourceTimes[url] = timing.responseEnd - timing.requestStart
        }
      })
      
      await landingPage.navigate()
      
      // Check that critical resources load quickly
      Object.entries(resourceTimes).forEach(([url, time]) => {
        if (url.includes('critical') || url.includes('main')) {
          expect(time).toBeLessThan(3000) // 3 seconds max for critical resources
        }
      })
    })
  })

  test.describe('Accessibility tests', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      await landingPage.navigate()
      
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents()
      
      // Should have at least one h1
      const h1Elements = await page.locator('h1').count()
      expect(h1Elements).toBeGreaterThanOrEqual(1)
      
      // Headings should not be empty
      headings.forEach(heading => {
        expect(heading.trim()).not.toBe('')
      })
    })

    test('should have accessible buttons and links', async ({ page }) => {
      await landingPage.navigate()
      
      // Check start button accessibility
      const startButton = landingPage.startBattleButton
      
      // Verify it's a button or has button role
      const tagName = await startButton.evaluate(el => el.tagName.toLowerCase())
      const explicitRole = await startButton.getAttribute('role')
      
      // Should be either a button element or have role="button"
      expect(tagName === 'button' || explicitRole === 'button').toBeTruthy()
      
      const buttonText = await startButton.textContent()
      expect(buttonText?.trim()).not.toBe('')
    })

    test('should support keyboard navigation', async ({ page }) => {
      await landingPage.navigate()
      
      // Focus on the start button directly
      await landingPage.startBattleButton.focus()
      
      // Verify the button is focused
      const isFocused = await landingPage.startBattleButton.evaluate(el => el === document.activeElement)
      expect(isFocused).toBeTruthy()
      
      // Press Enter to activate
      await page.keyboard.press('Enter')
      await landingPage.verifyBattleSelectorVisible()
    })
  })
})