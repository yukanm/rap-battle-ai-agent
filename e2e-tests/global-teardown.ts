import { FullConfig } from '@playwright/test'

/**
 * Global E2E Test Teardown
 * テスト環境のクリーンアップ
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting E2E Test Global Teardown...')
  
  try {
    // Cleanup any test data if needed
    console.log('🗑️ Cleaning up test data...')
    
    // Add any cleanup logic here
    // - Clear test battles from Firestore
    // - Reset Redis cache if used
    // - Clean up any test files
    
    console.log('✅ Global teardown completed')
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error)
    // Don't throw - teardown failures shouldn't fail the tests
  }
}

export default globalTeardown