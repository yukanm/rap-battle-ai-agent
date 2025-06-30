import { 
  NgWordEntry, 
  NgWordDatabase as NgWordDatabaseInterface,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  DuplicateReport,
  CategoryValidationResult,
  RegexValidationResult
} from '@/types/ngWord';
import { NgWordDatabase } from './ngWordDatabase';
import { logger } from '@/utils/logger';

export class NgWordValidator {
  private readonly REQUIRED_CATEGORIES = [
    '差別表現',
    '暴力的表現', 
    '性的表現',
    '侮蔑表現',
    '政治・宗教的表現',
    'ラップバトル不適切表現'
  ];

  private readonly CATEGORY_MIN_COUNTS = {
    '差別表現': 50,
    '暴力的表現': 80,
    '性的表現': 60,
    '侮蔑表現': 70,
    '政治・宗教的表現': 40,
    'ラップバトル不適切表現': 100
  };

  private readonly SEVERITY_LEVELS = ['critical', 'high', 'medium', 'low'] as const;
  private readonly LANGUAGE_CODES = ['ja', 'en', 'both'] as const;

  validateEntry(entry: NgWordEntry): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // 基本スキーマ検証
    this.validateBasicSchema(entry, errors);

    // 詳細検証
    this.validateEntryDetails(entry, errors, warnings);

    // パフォーマンス検証
    this.validatePerformance(entry, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      summary: {
        totalChecked: 1,
        totalErrors: errors.length,
        totalWarnings: warnings.length
      }
    };
  }

  private validateBasicSchema(entry: NgWordEntry, errors: ValidationError[]): void {
    // 必須フィールドの存在確認
    if (!entry.id || typeof entry.id !== 'string') {
      errors.push({
        entryId: entry.id,
        field: 'id',
        message: 'ID must be a non-empty string',
        type: 'schema'
      });
    }

    if (!entry.term || typeof entry.term !== 'string') {
      errors.push({
        entryId: entry.id,
        field: 'term',
        message: 'Term must be a non-empty string',
        type: 'schema'
      });
    }

    if (!entry.category || typeof entry.category !== 'string') {
      errors.push({
        entryId: entry.id,
        field: 'category',
        message: 'Category must be a non-empty string',
        type: 'schema'
      });
    }

    // Enum値の検証
    if (!this.SEVERITY_LEVELS.includes(entry.severity)) {
      errors.push({
        entryId: entry.id,
        field: 'severity',
        message: `Severity must be one of: ${this.SEVERITY_LEVELS.join(', ')}`,
        type: 'schema'
      });
    }

    if (!this.LANGUAGE_CODES.includes(entry.language)) {
      errors.push({
        entryId: entry.id,
        field: 'language',
        message: `Language must be one of: ${this.LANGUAGE_CODES.join(', ')}`,
        type: 'schema'
      });
    }

    // 数値フィールドの検証
    if (typeof entry.penalty !== 'number' || entry.penalty < 0.1 || entry.penalty > 1.0) {
      errors.push({
        entryId: entry.id,
        field: 'penalty',
        message: 'Penalty must be a number between 0.1 and 1.0',
        type: 'penalty'
      });
    }

    // 日時フィールドの検証
    if (!this.isValidISO8601(entry.createdAt)) {
      errors.push({
        entryId: entry.id,
        field: 'createdAt',
        message: 'CreatedAt must be a valid ISO 8601 date string',
        type: 'schema'
      });
    }

    if (!this.isValidISO8601(entry.updatedAt)) {
      errors.push({
        entryId: entry.id,
        field: 'updatedAt',
        message: 'UpdatedAt must be a valid ISO 8601 date string',
        type: 'schema'
      });
    }
  }

  private validateEntryDetails(entry: NgWordEntry, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // 用語の長さ検証
    if (entry.term.length > 100) {
      warnings.push({
        entryId: entry.id,
        field: 'term',
        message: 'Term is unusually long (>100 characters), consider splitting',
        type: 'performance'
      });
    }

    if (entry.term.length < 2) {
      warnings.push({
        entryId: entry.id,
        field: 'term',
        message: 'Term is very short (<2 characters), verify accuracy',
        type: 'recommendation'
      });
    }

    // 言語と用語の整合性チェック
    this.validateLanguageConsistency(entry, warnings);

    // 重要度とペナルティの整合性チェック
    this.validateSeverityPenaltyConsistency(entry, warnings);

    // 表記揺れの妥当性チェック
    if (entry.variants) {
      this.validateVariants(entry, warnings);
    }

    // 正規表現パターンの検証
    if (entry.regex) {
      this.validateRegexPattern(entry, errors);
    }

    // 推奨事項の検証
    this.validateRecommendations(entry, warnings);
  }

  private validateLanguageConsistency(entry: NgWordEntry, warnings: ValidationWarning[]): void {
    const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(entry.term);
    const hasEnglish = /[a-zA-Z]/.test(entry.term);
    // const _hasNumbers = /[0-9]/.test(entry.term); // Currently unused
    const hasSymbols = /[!@#$%^&*(),.?":{}|<>]/.test(entry.term);

    let detectedLanguage: 'ja' | 'en' | 'both';
    if (hasJapanese && hasEnglish) {
      detectedLanguage = 'both';
    } else if (hasJapanese) {
      detectedLanguage = 'ja';
    } else {
      detectedLanguage = 'en';
    }

    if (detectedLanguage !== entry.language) {
      warnings.push({
        entryId: entry.id,
        field: 'language',
        message: `Language setting (${entry.language}) doesn't match detected language (${detectedLanguage})`,
        type: 'recommendation'
      });
    }

    // 特殊文字の警告
    if (hasSymbols && !entry.regex) {
      warnings.push({
        entryId: entry.id,
        field: 'term',
        message: 'Term contains symbols, consider using regex pattern for better matching',
        type: 'recommendation'
      });
    }
  }

  private validateSeverityPenaltyConsistency(entry: NgWordEntry, warnings: ValidationWarning[]): void {
    const expectedPenaltyRanges = {
      critical: { min: 0.8, max: 1.0 },
      high: { min: 0.6, max: 0.9 },
      medium: { min: 0.4, max: 0.7 },
      low: { min: 0.1, max: 0.5 }
    };

    const range = expectedPenaltyRanges[entry.severity];
    if (entry.penalty < range.min || entry.penalty > range.max) {
      warnings.push({
        entryId: entry.id,
        field: 'penalty',
        message: `Penalty ${entry.penalty} is outside recommended range for ${entry.severity} severity (${range.min}-${range.max})`,
        type: 'recommendation'
      });
    }
  }

  private validateVariants(entry: NgWordEntry, warnings: ValidationWarning[]): void {
    if (!entry.variants || entry.variants.length === 0) return;

    // 重複チェック
    const uniqueVariants = new Set(entry.variants);
    if (uniqueVariants.size !== entry.variants.length) {
      warnings.push({
        entryId: entry.id,
        field: 'variants',
        message: 'Variants contain duplicates',
        type: 'recommendation'
      });
    }

    // 元の用語との重複チェック
    if (entry.variants.includes(entry.term)) {
      warnings.push({
        entryId: entry.id,
        field: 'variants',
        message: 'Variants should not include the original term',
        type: 'recommendation'
      });
    }

    // 表記揺れの数量チェック
    if (entry.variants.length > 10) {
      warnings.push({
        entryId: entry.id,
        field: 'variants',
        message: 'Too many variants (>10), consider consolidating',
        type: 'performance'
      });
    }
  }

  private validateRegexPattern(entry: NgWordEntry, errors: ValidationError[]): void {
    try {
      const regex = new RegExp(entry.regex!, 'gi');
      
      // パフォーマンステスト
      const testString = 'a'.repeat(1000);
      const startTime = Date.now();
      regex.test(testString);
      const endTime = Date.now();
      
      if (endTime - startTime > 10) {
        errors.push({
          entryId: entry.id,
          field: 'regex',
          message: 'Regex pattern is too slow (>10ms), consider optimizing',
          type: 'data'
        });
      }
    } catch (error) {
      errors.push({
        entryId: entry.id,
        field: 'regex',
        message: `Invalid regex pattern: ${(error as Error).message}`,
        type: 'regex'
      });
    }
  }

  private validateRecommendations(entry: NgWordEntry, warnings: ValidationWarning[]): void {
    // 推奨表現の適切性チェック
    if (entry.recommendation && entry.recommendation === entry.term) {
      warnings.push({
        entryId: entry.id,
        field: 'recommendation',
        message: 'Recommendation should be different from the original term',
        type: 'recommendation'
      });
    }

    // 重要度が高い場合は推奨表現の存在を推奨
    if ((entry.severity === 'critical' || entry.severity === 'high') && !entry.recommendation) {
      warnings.push({
        entryId: entry.id,
        field: 'recommendation',
        message: 'High severity entries should have alternative recommendations',
        type: 'recommendation'
      });
    }
  }

  private validatePerformance(entry: NgWordEntry, warnings: ValidationWarning[]): void {
    // 検索パフォーマンスの警告
    if (entry.term.length > 50) {
      warnings.push({
        entryId: entry.id,
        field: 'term',
        message: 'Long terms may impact search performance',
        type: 'performance'
      });
    }

    // 複雑な正規表現の警告
    if (entry.regex && entry.regex.length > 100) {
      warnings.push({
        entryId: entry.id,
        field: 'regex',
        message: 'Complex regex patterns may impact performance',
        type: 'performance'
      });
    }
  }

  private isValidISO8601(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime()) && dateString === date.toISOString();
  }

  validateDatabase(database: NgWordDatabase): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // データベースの基本構造検証
      this.validateDatabaseStructure(database, errors);

      // 全エントリの検証
      let totalEntries = 0;
      if (database['database']) {
        const dbData = database['database'] as NgWordDatabaseInterface;
        for (const entry of dbData.entries) {
          const entryResult = this.validateEntry(entry);
          errors.push(...entryResult.errors);
          warnings.push(...entryResult.warnings);
          totalEntries++;
        }

        // 重複チェック
        const duplicateResult = this.checkDuplicates(dbData.entries);
        if (duplicateResult.totalDuplicates > 0) {
          errors.push({
            message: `Found ${duplicateResult.totalDuplicates} duplicate entries`,
            type: 'duplicate'
          });
        }

        // カテゴリ検証
        const categoryResult = this.validateCategories(dbData.entries);
        if (!categoryResult.isValid) {
          errors.push(...categoryResult.unknownCategories.map(cat => ({
            message: `Unknown category: ${cat}`,
            type: 'category' as const
          })));
          warnings.push(...categoryResult.missingRequiredCategories.map(cat => ({
            message: `Missing required category: ${cat}`,
            type: 'coverage' as const
          })));
        }

        // 最小要件チェック
        this.validateMinimumRequirements(dbData, warnings);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        summary: {
          totalChecked: totalEntries,
          totalErrors: errors.length,
          totalWarnings: warnings.length
        }
      };
    } catch (error) {
      logger.error('Database validation failed:', error);
      return {
        isValid: false,
        errors: [{ message: `Validation failed: ${(error as Error).message}`, type: 'data' }],
        warnings: [],
        summary: { totalChecked: 0, totalErrors: 1, totalWarnings: 0 }
      };
    }
  }

  private validateDatabaseStructure(database: NgWordDatabase, errors: ValidationError[]): void {
    // NgWordDatabaseクラスの内部構造にアクセス
    if (!database['database']) {
      errors.push({
        message: 'Database not properly initialized',
        type: 'data'
      });
      return;
    }

    const dbData = database['database'] as NgWordDatabaseInterface;
    
    if (!dbData.version) {
      errors.push({ message: 'Database version is required', type: 'schema' });
    }

    if (!dbData.lastUpdated || !this.isValidISO8601(dbData.lastUpdated)) {
      errors.push({ message: 'Database lastUpdated must be valid ISO 8601 date', type: 'schema' });
    }

    if (typeof dbData.totalEntries !== 'number' || dbData.totalEntries < 0) {
      errors.push({ message: 'Database totalEntries must be a non-negative number', type: 'schema' });
    }

    if (!Array.isArray(dbData.categories)) {
      errors.push({ message: 'Database categories must be an array', type: 'schema' });
    }

    if (!Array.isArray(dbData.entries)) {
      errors.push({ message: 'Database entries must be an array', type: 'schema' });
    }

    if (!dbData.metadata || !dbData.metadata.description) {
      errors.push({ message: 'Database metadata is required', type: 'schema' });
    }
  }

  private validateMinimumRequirements(dbData: NgWordDatabaseInterface, warnings: ValidationWarning[]): void {
    // 最小総数チェック
    if (dbData.totalEntries < 300) {
      warnings.push({
        message: `Total entries (${dbData.totalEntries}) is below minimum requirement (300)`,
        type: 'coverage'
      });
    }

    // カテゴリ別最小数チェック
    const categoryCounts: Record<string, number> = {};
    for (const entry of dbData.entries) {
      categoryCounts[entry.category] = (categoryCounts[entry.category] || 0) + 1;
    }

    for (const [category, minCount] of Object.entries(this.CATEGORY_MIN_COUNTS)) {
      const actualCount = categoryCounts[category] || 0;
      if (actualCount < minCount) {
        warnings.push({
          message: `Category "${category}" has ${actualCount} entries, minimum required: ${minCount}`,
          type: 'coverage'
        });
      }
    }

    // 言語別最小数チェック
    const languageCounts = { ja: 0, en: 0, both: 0 };
    for (const entry of dbData.entries) {
      languageCounts[entry.language]++;
    }

    if (languageCounts.ja + languageCounts.both < 200) {
      warnings.push({
        message: `Japanese entries (${languageCounts.ja + languageCounts.both}) is below minimum requirement (200)`,
        type: 'coverage'
      });
    }

    if (languageCounts.en + languageCounts.both < 150) {
      warnings.push({
        message: `English entries (${languageCounts.en + languageCounts.both}) is below minimum requirement (150)`,
        type: 'coverage'
      });
    }
  }

  checkDuplicates(entries: NgWordEntry[]): DuplicateReport {
    const termMap = new Map<string, NgWordEntry[]>();

    // 用語ごとにグループ化
    for (const entry of entries) {
      const normalizedTerm = entry.term.toLowerCase();
      if (!termMap.has(normalizedTerm)) {
        termMap.set(normalizedTerm, []);
      }
      termMap.get(normalizedTerm)!.push(entry);
    }

    const duplicates: DuplicateReport['duplicates'] = [];
    let totalDuplicates = 0;

    for (const [term, entryList] of termMap) {
      if (entryList.length > 1) {
        duplicates.push({
          term,
          entries: entryList.map(e => ({
            id: e.id,
            category: e.category
          }))
        });
        totalDuplicates += entryList.length - 1; // 重複数（最初の1つを除く）
      }
    }

    return {
      duplicates,
      totalDuplicates
    };
  }

  validateCategories(entries: NgWordEntry[]): CategoryValidationResult {
    const existingCategories = new Set(entries.map(e => e.category));
    const unknownCategories: string[] = [];
    const missingRequiredCategories: string[] = [];

    // 不明なカテゴリのチェック
    for (const category of existingCategories) {
      if (!this.REQUIRED_CATEGORIES.includes(category)) {
        unknownCategories.push(category);
      }
    }

    // 必須カテゴリの不足チェック
    for (const requiredCategory of this.REQUIRED_CATEGORIES) {
      if (!existingCategories.has(requiredCategory)) {
        missingRequiredCategories.push(requiredCategory);
      }
    }

    // カテゴリ分布の計算
    const categoryDistribution: Record<string, number> = {};
    for (const entry of entries) {
      categoryDistribution[entry.category] = (categoryDistribution[entry.category] || 0) + 1;
    }

    return {
      isValid: unknownCategories.length === 0 && missingRequiredCategories.length === 0,
      unknownCategories,
      missingRequiredCategories,
      categoryDistribution
    };
  }

  validateRegexPatterns(entries: NgWordEntry[]): RegexValidationResult {
    const invalidPatterns: RegexValidationResult['invalidPatterns'] = [];

    for (const entry of entries) {
      if (entry.regex) {
        try {
          new RegExp(entry.regex, 'gi');
        } catch (error) {
          invalidPatterns.push({
            entryId: entry.id,
            pattern: entry.regex,
            error: (error as Error).message
          });
        }
      }
    }

    return {
      isValid: invalidPatterns.length === 0,
      invalidPatterns
    };
  }
}