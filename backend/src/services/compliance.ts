import { createLogger } from '@/utils/logger'
import type { ComplianceCheckResult } from '@/types'

const logger = createLogger('compliance-service')

export class ComplianceService {
  private readonly forbiddenWords = [
    'hate', 'violence', 'explicit', 'offensive', 'discrimination',
    'harassment', 'threat', 'abuse', 'profanity'
  ]

  async checkContent(content: string): Promise<ComplianceCheckResult> {
    try {
      const lowerContent = content.toLowerCase()
      const reasons: string[] = []
      let score = 1.0

      // Check for forbidden words
      for (const word of this.forbiddenWords) {
        if (lowerContent.includes(word)) {
          score -= 0.2
          reasons.push(`Contains potentially inappropriate word: ${word}`)
        }
      }

      // Check content length (too short might be low quality)
      if (content.length < 50) {
        score -= 0.1
        reasons.push('Content is too short')
      }

      // Ensure score is between 0 and 1
      score = Math.max(0, Math.min(1, score))

      // Content is safe if score is above threshold
      const safe = score >= (parseFloat(process.env.COMPLIANCE_THRESHOLD || '0.8'))

      logger.info('Compliance check completed:', {
        safe,
        score,
        contentLength: content.length,
        reasonCount: reasons.length
      })

      return {
        safe,
        score,
        reasons: safe ? [] : reasons
      }
    } catch (error) {
      logger.error('Error in compliance check:', error)
      // In case of error, be conservative and mark as safe with low score
      return {
        safe: true,
        score: 0.5,
        reasons: ['Compliance check encountered an error']
      }
    }
  }
}