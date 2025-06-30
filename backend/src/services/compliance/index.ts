import { createLogger } from '@/utils/logger'
import type { ComplianceCheckResult } from '@/types'
import { ForbiddenWordsManager } from './forbiddenWordsManager'
import { ContentAnalyzer } from './contentAnalyzer'

const logger = createLogger('compliance-service')

export class ComplianceService {
  private forbiddenWordsManager: ForbiddenWordsManager
  private contentAnalyzer: ContentAnalyzer

  constructor() {
    this.forbiddenWordsManager = new ForbiddenWordsManager()
    this.contentAnalyzer = new ContentAnalyzer()
  }

  async checkContent(content: string): Promise<ComplianceCheckResult> {
    try {
      const startTime = Date.now()
      const reasons: string[] = []
      let score = 1.0

      // 1. 放送禁止用語チェック
      const forbiddenWordsResult = await this.forbiddenWordsManager.checkForbiddenWords(content)
      if (!forbiddenWordsResult.safe) {
        score -= forbiddenWordsResult.penalty
        reasons.push(...forbiddenWordsResult.reasons)
      }

      // 2. コンテンツ品質分析
      const qualityResult = this.contentAnalyzer.analyzeQuality(content)
      if (!qualityResult.safe) {
        score -= qualityResult.penalty
        reasons.push(...qualityResult.reasons)
      }

      // 3. 日本語特有のチェック
      const japaneseResult = this.contentAnalyzer.checkJapaneseSpecific(content)
      if (!japaneseResult.safe) {
        score -= japaneseResult.penalty
        reasons.push(...japaneseResult.reasons)
      }

      // 4. ラップバトル特有のチェック
      const rapBattleResult = this.contentAnalyzer.checkRapBattleSpecific(content)
      if (!rapBattleResult.safe) {
        score -= rapBattleResult.penalty
        reasons.push(...rapBattleResult.reasons)
      }

      // スコアを0-1の範囲に正規化
      score = Math.max(0, Math.min(1, score))

      const threshold = parseFloat(process.env.COMPLIANCE_THRESHOLD || '0.8')
      const safe = score >= threshold

      const processingTime = Date.now() - startTime

      logger.info('Enhanced compliance check completed:', {
        safe,
        score,
        contentLength: content.length,
        reasonCount: reasons.length,
        processingTime,
        threshold
      })

      return {
        safe,
        score,
        reasons: safe ? [] : reasons
      }
    } catch (error) {
      logger.error('Error in enhanced compliance check:', error)
      return {
        safe: true,
        score: 0.5,
        reasons: ['Compliance check encountered an error']
      }
    }
  }

  /**
   * 放送禁止用語リストを更新
   */
  async updateForbiddenWords(wordsData: any): Promise<void> {
    await this.forbiddenWordsManager.updateWordsList(wordsData)
  }

  /**
   * 現在の禁止用語統計を取得
   */
  getForbiddenWordsStats(): any {
    return this.forbiddenWordsManager.getStats()
  }
}