import { createLogger } from '@/utils/logger'
import * as fs from 'fs/promises'
import { NgWordDatabase } from './ngWordDatabase'
import { CheckResult, DetailedCheckResult } from '@/types/ngWord'

const logger = createLogger('forbidden-words-manager')

interface ForbiddenWordsData {
  categories: {
    [category: string]: {
      words: string[]
      severity: 'high' | 'medium' | 'low'
      penalty: number
    }
  }
  patterns: {
    regex: string
    description: string
    severity: 'high' | 'medium' | 'low'
    penalty: number
  }[]
}

interface LegacyCheckResult {
  safe: boolean
  penalty: number
  reasons: string[]
}

export class ForbiddenWordsManager {
  private wordsData: ForbiddenWordsData | null = null
  private ngWordDatabase: NgWordDatabase | null = null
  private lastUpdated: Date | null = null
  private stats = {
    totalWords: 0,
    categoriesCount: 0,
    patternsCount: 0,
    checksPerformed: 0,
    violationsFound: 0
  }

  constructor() {
    // NgWordValidator initialization removed - not currently used
    this.loadDefaultWords()
    this.initializeNgWordDatabase()
  }

  private async initializeNgWordDatabase(): Promise<void> {
    try {
      this.ngWordDatabase = new NgWordDatabase()
      await this.ngWordDatabase.loadDatabase()
      logger.info('NgWordDatabase initialized successfully')
    } catch (error) {
      logger.warn('Failed to initialize NgWordDatabase, falling back to legacy system:', error)
    }
  }

  private async loadDefaultWords(): Promise<void> {
    try {
      // デフォルトの放送禁止用語データ
      this.wordsData = {
        categories: {
          profanity: {
            words: ['fuck', 'shit', 'damn', 'hell', 'ass', 'bitch'],
            severity: 'high',
            penalty: 0.3
          },
          japanese_profanity: {
            words: ['くそ', 'バカ', 'アホ', '死ね', 'ブス', 'デブ'],
            severity: 'high',
            penalty: 0.3
          },
          hate_speech: {
            words: ['racist', 'nazi', 'terrorist', 'kill yourself'],
            severity: 'high',
            penalty: 0.5
          },
          violence: {
            words: ['murder', 'kill', 'assault', 'attack', 'violence', 'weapon'],
            severity: 'medium',
            penalty: 0.2
          },
          discrimination: {
            words: ['discriminate', 'sexist', 'homophobic', 'transphobic'],
            severity: 'medium',
            penalty: 0.2
          },
          japanese_discrimination: {
            words: ['差別', '偏見', '部落', '在日'],
            severity: 'medium',
            penalty: 0.2
          }
        },
        patterns: [
          {
            regex: '\\b\\d{3}-\\d{4}-\\d{4}\\b',
            description: '電話番号パターン',
            severity: 'medium',
            penalty: 0.1
          },
          {
            regex: '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}',
            description: 'メールアドレスパターン',
            severity: 'medium',
            penalty: 0.1
          }
        ]
      }

      this.updateStats()
      this.lastUpdated = new Date()
      
      logger.info('Default forbidden words loaded:', {
        categories: Object.keys(this.wordsData.categories).length,
        patterns: this.wordsData.patterns.length,
        totalWords: this.stats.totalWords
      })
    } catch (error) {
      logger.error('Failed to load default words:', error)
    }
  }

  async updateWordsList(wordsData: ForbiddenWordsData): Promise<void> {
    try {
      this.wordsData = wordsData
      this.updateStats()
      this.lastUpdated = new Date()
      
      logger.info('Forbidden words list updated:', {
        categories: Object.keys(this.wordsData.categories).length,
        patterns: this.wordsData.patterns.length,
        totalWords: this.stats.totalWords
      })
    } catch (error) {
      logger.error('Failed to update words list:', error)
      throw new Error('Failed to update forbidden words list')
    }
  }

  async checkForbiddenWords(content: string): Promise<LegacyCheckResult> {
    this.stats.checksPerformed++

    if (!this.wordsData) {
      logger.warn('No words data available for checking')
      return { safe: true, penalty: 0, reasons: [] }
    }

    const reasons: string[] = []
    let totalPenalty = 0
    const lowerContent = content.toLowerCase()

    // カテゴリ別単語チェック
    for (const [categoryName, categoryData] of Object.entries(this.wordsData.categories)) {
      for (const word of categoryData.words) {
        if (lowerContent.includes(word.toLowerCase())) {
          totalPenalty += categoryData.penalty
          reasons.push(`禁止用語検出 (${categoryName}): "${word}"`)
          this.stats.violationsFound++
        }
      }
    }

    // パターンマッチングチェック
    for (const pattern of this.wordsData.patterns) {
      try {
        const regex = new RegExp(pattern.regex, 'gi')
        if (regex.test(content)) {
          totalPenalty += pattern.penalty
          reasons.push(`パターン検出: ${pattern.description}`)
          this.stats.violationsFound++
        }
      } catch (error) {
        logger.error(`Invalid regex pattern: ${pattern.regex}`, error)
      }
    }

    // ペナルティを最大1.0に制限
    totalPenalty = Math.min(totalPenalty, 1.0)
    const safe = totalPenalty === 0

    if (!safe) {
      logger.warn('Forbidden words detected:', {
        content: content.substring(0, 100),
        totalPenalty,
        reasonsCount: reasons.length
      })
    }

    return {
      safe,
      penalty: totalPenalty,
      reasons
    }
  }

  private updateStats(): void {
    if (!this.wordsData) return

    this.stats.totalWords = Object.values(this.wordsData.categories)
      .reduce((sum, category) => sum + category.words.length, 0)
    this.stats.categoriesCount = Object.keys(this.wordsData.categories).length
    this.stats.patternsCount = this.wordsData.patterns.length
  }

  getStats(): any {
    return {
      ...this.stats,
      lastUpdated: this.lastUpdated,
      hasData: !!this.wordsData
    }
  }

  /**
   * JSONファイルから禁止用語リストを読み込み
   */
  async loadFromFile(filePath: string): Promise<void> {
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8')
      const wordsData: ForbiddenWordsData = JSON.parse(fileContent)
      await this.updateWordsList(wordsData)
      
      logger.info(`Forbidden words loaded from file: ${filePath}`)
    } catch (error) {
      logger.error(`Failed to load forbidden words from file: ${filePath}`, error)
      throw new Error(`Failed to load forbidden words from file: ${filePath}`)
    }
  }

  /**
   * 新しいカテゴリを追加
   */
  addCategory(categoryName: string, words: string[], severity: 'high' | 'medium' | 'low', penalty: number): void {
    if (!this.wordsData) return

    this.wordsData.categories[categoryName] = {
      words,
      severity,
      penalty
    }

    this.updateStats()
    logger.info(`Added new category: ${categoryName} with ${words.length} words`)
  }

  /**
   * カテゴリに単語を追加
   */
  addWordsToCategory(categoryName: string, words: string[]): void {
    if (!this.wordsData || !this.wordsData.categories[categoryName]) return

    this.wordsData.categories[categoryName].words.push(...words)
    this.updateStats()
    logger.info(`Added ${words.length} words to category: ${categoryName}`)
  }

  /**
   * 新しいNgWordDatabaseを使用したコンテンツチェック
   */
  async checkWithNewDatabase(content: string): Promise<CheckResult> {
    this.stats.checksPerformed++

    if (!this.ngWordDatabase) {
      logger.warn('NgWordDatabase not available, falling back to legacy check')
      const legacyResult = await this.checkForbiddenWords(content)
      return {
        hasViolations: !legacyResult.safe,
        violations: [],
        totalPenalty: legacyResult.penalty,
        suggestions: legacyResult.reasons
      }
    }

    try {
      const violations: CheckResult['violations'] = []
      let totalPenalty = 0
      const suggestions: string[] = []
      const contentLower = content.toLowerCase()

      // 全エントリをチェック
      const allEntries = this.ngWordDatabase['database']?.entries || []
      
      for (const entry of allEntries) {
        if (!entry.enabled) continue

        // 基本用語マッチング
        if (contentLower.includes(entry.term.toLowerCase())) {
          const startIndex = contentLower.indexOf(entry.term.toLowerCase())
          violations.push({
            term: entry.term,
            entry,
            matchType: 'exact',
            position: {
              start: startIndex,
              end: startIndex + entry.term.length
            }
          })
          totalPenalty += entry.penalty
          this.stats.violationsFound++

          if (entry.recommendation) {
            suggestions.push(`"${entry.term}" → "${entry.recommendation}"`);
          }
        }

        // 表記揺れチェック
        if (entry.variants) {
          for (const variant of entry.variants) {
            if (contentLower.includes(variant.toLowerCase())) {
              const startIndex = contentLower.indexOf(variant.toLowerCase())
              violations.push({
                term: variant,
                entry,
                matchType: 'variant',
                position: {
                  start: startIndex,
                  end: startIndex + variant.length
                }
              })
              totalPenalty += entry.penalty * 0.8 // 表記揺れは少し軽減
              this.stats.violationsFound++
            }
          }
        }

        // 正規表現パターンチェック
        if (entry.regex) {
          try {
            const regex = new RegExp(entry.regex, 'gi')
            const matches = content.match(regex)
            if (matches) {
              for (const match of matches) {
                const startIndex = content.indexOf(match)
                violations.push({
                  term: match,
                  entry,
                  matchType: 'regex',
                  position: {
                    start: startIndex,
                    end: startIndex + match.length
                  }
                })
                totalPenalty += entry.penalty
                this.stats.violationsFound++
              }
            }
          } catch (error) {
            logger.error(`Invalid regex pattern in entry ${entry.id}: ${entry.regex}`, error)
          }
        }
      }

      // ペナルティを最大1.0に制限
      totalPenalty = Math.min(totalPenalty, 1.0)

      if (violations.length > 0) {
        logger.warn('NG words detected with new database:', {
          content: content.substring(0, 100),
          violationsCount: violations.length,
          totalPenalty
        })
      }

      return {
        hasViolations: violations.length > 0,
        violations,
        totalPenalty,
        suggestions
      }

    } catch (error) {
      logger.error('Error in checkWithNewDatabase:', error)
      throw error
    }
  }

  /**
   * 詳細分析結果を取得
   */
  async getDetailedAnalysis(content: string): Promise<DetailedCheckResult> {
    const startTime = Date.now()
    const basicResult = await this.checkWithNewDatabase(content)
    const processingTime = Date.now() - startTime

    // カテゴリ別集計
    const categoryBreakdown: Record<string, number> = {}
    const severityBreakdown: Record<string, number> = {}
    const languageBreakdown: Record<string, number> = {}

    for (const violation of basicResult.violations) {
      const entry = violation.entry
      
      // カテゴリ集計
      categoryBreakdown[entry.category] = (categoryBreakdown[entry.category] || 0) + 1
      
      // 重要度集計
      severityBreakdown[entry.severity] = (severityBreakdown[entry.severity] || 0) + 1
      
      // 言語集計
      languageBreakdown[entry.language] = (languageBreakdown[entry.language] || 0) + 1
    }

    return {
      ...basicResult,
      categoryBreakdown,
      severityBreakdown,
      languageBreakdown,
      processingTime,
      contentLength: content.length
    }
  }

  /**
   * NgWordDatabaseのリアルタイム更新対応
   */
  async reloadDatabase(): Promise<void> {
    if (!this.ngWordDatabase) {
      logger.warn('NgWordDatabase not initialized')
      return
    }

    try {
      await this.ngWordDatabase.loadDatabase()
      this.lastUpdated = new Date()
      logger.info('NgWordDatabase reloaded successfully')
    } catch (error) {
      logger.error('Failed to reload NgWordDatabase:', error)
      throw error
    }
  }

  /**
   * 統合統計情報を取得
   */
  getEnhancedStats(): any {
    const basicStats = this.getStats()
    
    if (!this.ngWordDatabase) {
      return basicStats
    }

    try {
      const ngStats = this.ngWordDatabase.getStatistics()
      return {
        ...basicStats,
        ngWordDatabase: {
          totalEntries: ngStats.totalEntries,
          categoryCounts: ngStats.categoryCounts,
          languageCounts: ngStats.languageCounts,
          severityCounts: ngStats.severityCounts,
          enabledCount: ngStats.enabledCount,
          disabledCount: ngStats.disabledCount
        },
        mode: 'enhanced'
      }
    } catch (error) {
      logger.error('Failed to get enhanced stats:', error)
      return { ...basicStats, mode: 'legacy', error: (error as Error).message }
    }
  }

  /**
   * NgWordDatabaseの利用可能性をチェック
   */
  isNgWordDatabaseAvailable(): boolean {
    return this.ngWordDatabase !== null
  }

  /**
   * NgWordDatabaseインスタンスを取得（外部統合用）
   */
  getNgWordDatabase(): NgWordDatabase | null {
    return this.ngWordDatabase
  }
} 