import { chromium, FullConfig } from '@playwright/test'

/**
 * Global E2E Test Setup
 * 包括的テスト環境のセットアップ
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E Test Global Setup...')
  
  const browser = await chromium.launch()
  const page = await browser.newPage()
  
  try {
    // Wait for frontend to be ready
    console.log('⏳ Waiting for frontend server...')
    await page.goto('http://localhost:3456', { waitUntil: 'networkidle' })
    console.log('✅ Frontend server ready')
    
    // Wait for backend to be ready
    console.log('⏳ Waiting for backend server...')
    await page.goto('http://localhost:8456/health', { waitUntil: 'networkidle' })
    console.log('✅ Backend server ready')
    
    // Test WebSocket connection
    console.log('⏳ Testing WebSocket connection...')
    await page.goto('http://localhost:3456')
    
    // Verify basic connectivity
    const response = await page.evaluate(async () => {
      try {
        const testResponse = await fetch('http://localhost:8456/health')
        return testResponse.status === 200
      } catch (error) {
        return false
      }
    })
    
    if (!response) {
      throw new Error('Backend health check failed')
    }
    
    console.log('✅ WebSocket and API connectivity verified')
    console.log('🎉 Global setup completed successfully')
    
  } catch (error) {
    console.error('❌ Global setup failed:', error)
    throw error
  } finally {
    await browser.close()
  }
}

export default globalSetup