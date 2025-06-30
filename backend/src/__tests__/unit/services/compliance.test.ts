import { ComplianceService } from '@/services/compliance'

describe('ComplianceService', () => {
  let complianceService: ComplianceService

  beforeEach(() => {
    complianceService = new ComplianceService()
  })

  describe('checkContent', () => {
    it('should approve clean content', async () => {
      const cleanContent = 'This is a great rap battle about technology and innovation'
      const result = await complianceService.checkContent(cleanContent)
      
      expect(result.safe).toBe(true)
      expect(result.score).toBeGreaterThan(0.8)
      expect(result.reasons).toBeUndefined()
    })

    it('should reject content with profanity', async () => {
      const profaneContent = 'This shit is fucking amazing'
      const result = await complianceService.checkContent(profaneContent)
      
      expect(result.safe).toBe(false)
      expect(result.score).toBeLessThan(0.8)
      expect(result.reasons).toContain('Contains prohibited language')
    })

    it('should flag content with violence keywords', async () => {
      const violentContent = 'I will kill and murder everyone with my knife'
      const result = await complianceService.checkContent(violentContent)
      
      expect(result.safe).toBe(false)
      expect(result.reasons).toContain('Contains excessive violence-related content')
    })

    it('should detect personal information', async () => {
      const personalInfo = 'Call me at 555-123-4567 or email john@example.com'
      const result = await complianceService.checkContent(personalInfo)
      
      expect(result.safe).toBe(false)
      expect(result.reasons).toContain('Contains potential personal information')
    })

    it('should handle sensitive topics appropriately', async () => {
      const sensitiveContent = 'This rap is about politics and religion'
      const result = await complianceService.checkContent(sensitiveContent)
      
      expect(result.safe).toBe(true)
      expect(result.score).toBeGreaterThanOrEqual(0.8)
      expect(result.reasons).toBeDefined()
    })
  })

  describe('sanitizeContent', () => {
    it('should replace profanity with asterisks', () => {
      const content = 'This shit is damn good'
      const sanitized = complianceService.sanitizeContent(content)
      
      expect(sanitized).toBe('This s*** is d*** good')
    })

    it('should preserve clean content', () => {
      const content = 'This is awesome content'
      const sanitized = complianceService.sanitizeContent(content)
      
      expect(sanitized).toBe(content)
    })
  })
})