import { promises as fs } from 'fs';
import path from 'path';
import { 
  NgWordEntry, 
  NgWordDatabase as NgWordDatabaseInterface, 
  DatabaseStatistics, 
  CategoryBreakdown, 
  ValidationResult,
  ValidationError,
  ValidationWarning
} from '@/types/ngWord';
import { logger } from '@/utils/logger';

export class NgWordDatabase {
  private database: NgWordDatabaseInterface | null = null;
  private filePath: string;
  private readonly REQUIRED_CATEGORIES = [
    '差別表現',
    '暴力的表現', 
    '性的表現',
    '侮蔑表現',
    '政治・宗教的表現',
    'ラップバトル不適切表現'
  ];

  constructor(filePath?: string) {
    this.filePath = filePath || path.join(process.cwd(), 'ng_word.json');
  }

  async loadDatabase(filePath?: string): Promise<void> {
    try {
      const targetPath = filePath || this.filePath;
      const data = await fs.readFile(targetPath, 'utf-8');
      
      // 既存の簡単な構造をチェック
      const rawData = JSON.parse(data);
      
      if (Array.isArray(rawData)) {
        // 既存の簡単な構造から新しい構造に変換
        this.database = await this.convertLegacyFormat(rawData);
        logger.info(`Converted legacy format to new NgWordDatabase structure with ${this.database.totalEntries} entries`);
      } else if (this.isValidDatabaseFormat(rawData)) {
        this.database = rawData;
        logger.info(`Loaded NgWordDatabase with ${this.database.totalEntries} entries`);
      } else {
        throw new Error('Invalid database format');
      }
    } catch (error) {
      logger.error('Failed to load NG word database:', error);
      throw error;
    }
  }

  private async convertLegacyFormat(legacyData: any[]): Promise<NgWordDatabaseInterface> {
    const now = new Date().toISOString();
    const entries: NgWordEntry[] = [];
    
    for (let i = 0; i < legacyData.length; i++) {
      const item = legacyData[i];
      if (!item.term || !item.category) continue;

      const entry: NgWordEntry = {
        id: `entry_${i + 1}`,
        category: item.category,
        term: item.term,
        severity: this.determineSeverity(item.category, item.term),
        penalty: this.calculatePenalty(item.category),
        language: this.detectLanguage(item.term),
        recommendation: item.recommendation,
        note: item.note,
        enabled: true,
        createdAt: now,
        updatedAt: now,
        source: 'legacy_conversion'
      };

      // 表記揺れを生成
      entry.variants = this.generateVariants(item.term);
      
      entries.push(entry);
    }

    const categories = Array.from(new Set(entries.map(e => e.category)));
    
    return {
      version: '1.0.0',
      lastUpdated: now,
      totalEntries: entries.length,
      categories,
      entries,
      metadata: {
        description: 'Comprehensive NG word database for HipHop MC Battle application',
        maintainer: 'Google Agent Team',
        license: 'Proprietary'
      }
    };
  }

  private isValidDatabaseFormat(data: any): data is NgWordDatabaseInterface {
    return data && 
           typeof data.version === 'string' &&
           typeof data.lastUpdated === 'string' &&
           typeof data.totalEntries === 'number' &&
           Array.isArray(data.categories) &&
           Array.isArray(data.entries) &&
           data.metadata;
  }

  private determineSeverity(category: string, _term: string): 'critical' | 'high' | 'medium' | 'low' {
    // 暴力的表現や性的表現は重要度が高い
    if (category === '暴力的表現' || category === '性的表現') {
      return 'critical';
    }
    
    if (category === '差別表現') {
      return 'high';
    }
    
    if (category === '侮蔑表現') {
      return 'medium';
    }
    
    return 'low';
  }

  private calculatePenalty(category: string): number {
    switch (category) {
      case '暴力的表現':
      case '性的表現':
        return 1.0;
      case '差別表現':
        return 0.9;
      case '侮蔑表現':
        return 0.7;
      case '政治・宗教的表現':
        return 0.6;
      case 'ラップバトル不適切表現':
        return 0.5;
      default:
        return 0.4;
    }
  }

  private detectLanguage(term: string): 'ja' | 'en' | 'both' {
    const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(term);
    const hasEnglish = /[a-zA-Z]/.test(term);
    
    if (hasJapanese && hasEnglish) return 'both';
    if (hasJapanese) return 'ja';
    return 'en';
  }

  private generateVariants(term: string): string[] {
    const variants: string[] = [];
    
    // ひらがな・カタカナの変換
    if (/[\u3040-\u309F]/.test(term)) {
      // ひらがなをカタカナに
      variants.push(term.replace(/[\u3040-\u309F]/g, (match) => 
        String.fromCharCode(match.charCodeAt(0) + 0x60)
      ));
    }
    
    if (/[\u30A0-\u30FF]/.test(term)) {
      // カタカナをひらがなに
      variants.push(term.replace(/[\u30A0-\u30FF]/g, (match) => 
        String.fromCharCode(match.charCodeAt(0) - 0x60)
      ));
    }
    
    // 英語の大文字小文字
    if (/[a-zA-Z]/.test(term)) {
      variants.push(term.toLowerCase());
      variants.push(term.toUpperCase());
    }
    
    // 重複を除去
    return Array.from(new Set(variants)).filter(v => v !== term);
  }

  getEntryById(id: string): NgWordEntry | null {
    if (!this.database) return null;
    return this.database.entries.find(entry => entry.id === id) || null;
  }

  getEntriesByCategory(category: string): NgWordEntry[] {
    if (!this.database) return [];
    return this.database.entries.filter(entry => 
      entry.category === category && entry.enabled
    );
  }

  searchEntries(query: string): NgWordEntry[] {
    if (!this.database) return [];
    
    const searchTerm = query.toLowerCase();
    return this.database.entries.filter(entry => 
      entry.enabled && (
        entry.term.toLowerCase().includes(searchTerm) ||
        entry.category.toLowerCase().includes(searchTerm) ||
        (entry.variants && entry.variants.some(v => v.toLowerCase().includes(searchTerm))) ||
        (entry.note && entry.note.toLowerCase().includes(searchTerm))
      )
    );
  }

  async addEntry(entry: NgWordEntry): Promise<void> {
    if (!this.database) {
      throw new Error('Database not loaded');
    }

    // 重複チェック
    const existing = this.database.entries.find(e => 
      e.term === entry.term && e.category === entry.category
    );
    
    if (existing) {
      throw new Error(`Entry already exists: ${entry.term} in ${entry.category}`);
    }

    this.database.entries.push(entry);
    this.database.totalEntries = this.database.entries.length;
    this.database.lastUpdated = new Date().toISOString();
    
    // カテゴリを更新
    if (!this.database.categories.includes(entry.category)) {
      this.database.categories.push(entry.category);
    }

    await this.saveDatabase();
    logger.info(`Added new entry: ${entry.term} (${entry.category})`);
  }

  async updateEntry(id: string, updates: Partial<NgWordEntry>): Promise<void> {
    if (!this.database) {
      throw new Error('Database not loaded');
    }

    const entryIndex = this.database.entries.findIndex(e => e.id === id);
    if (entryIndex === -1) {
      throw new Error(`Entry not found: ${id}`);
    }

    const entry = this.database.entries[entryIndex];
    this.database.entries[entryIndex] = {
      ...entry,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.database.lastUpdated = new Date().toISOString();
    await this.saveDatabase();
    logger.info(`Updated entry: ${id}`);
  }

  async deleteEntry(id: string): Promise<void> {
    if (!this.database) {
      throw new Error('Database not loaded');
    }

    const entryIndex = this.database.entries.findIndex(e => e.id === id);
    if (entryIndex === -1) {
      throw new Error(`Entry not found: ${id}`);
    }

    const entry = this.database.entries[entryIndex];
    this.database.entries.splice(entryIndex, 1);
    this.database.totalEntries = this.database.entries.length;
    this.database.lastUpdated = new Date().toISOString();

    await this.saveDatabase();
    logger.info(`Deleted entry: ${entry.term} (${entry.category})`);
  }

  async addMultipleEntries(entries: NgWordEntry[]): Promise<void> {
    if (!this.database) {
      throw new Error('Database not loaded');
    }

    let addedCount = 0;
    const errors: string[] = [];

    for (const entry of entries) {
      try {
        await this.addEntry(entry);
        addedCount++;
      } catch (error) {
        errors.push(`Failed to add ${entry.term}: ${(error as Error).message}`);
      }
    }

    if (errors.length > 0) {
      logger.warn(`Added ${addedCount}/${entries.length} entries. Errors:`, errors);
    } else {
      logger.info(`Successfully added ${addedCount} entries`);
    }
  }

  async validateDatabase(): Promise<ValidationResult> {
    if (!this.database) {
      return {
        isValid: false,
        errors: [{ message: 'Database not loaded', type: 'data' }],
        warnings: [],
        summary: { totalChecked: 0, totalErrors: 1, totalWarnings: 0 }
      };
    }

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // スキーマ検証
    for (const entry of this.database.entries) {
      this.validateEntrySchema(entry, errors, warnings);
    }

    // 重複チェック
    this.checkDuplicateEntries(errors);

    // カテゴリ検証
    this.validateCategories(warnings);

    // 最小語数チェック
    if (this.database.totalEntries < 300) {
      warnings.push({
        message: `Total entries (${this.database.totalEntries}) is below minimum requirement (300)`,
        type: 'coverage'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      summary: {
        totalChecked: this.database.entries.length,
        totalErrors: errors.length,
        totalWarnings: warnings.length
      }
    };
  }

  private validateEntrySchema(entry: NgWordEntry, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // 必須フィールドチェック
    if (!entry.id) {
      errors.push({ entryId: entry.id, field: 'id', message: 'ID is required', type: 'schema' });
    }
    if (!entry.term) {
      errors.push({ entryId: entry.id, field: 'term', message: 'Term is required', type: 'schema' });
    }
    if (!entry.category) {
      errors.push({ entryId: entry.id, field: 'category', message: 'Category is required', type: 'schema' });
    }

    // ペナルティ範囲チェック
    if (entry.penalty < 0.1 || entry.penalty > 1.0) {
      errors.push({ 
        entryId: entry.id, 
        field: 'penalty', 
        message: 'Penalty must be between 0.1 and 1.0', 
        type: 'penalty' 
      });
    }

    // 正規表現パターンチェック
    if (entry.regex) {
      try {
        new RegExp(entry.regex);
      } catch (e) {
        errors.push({ 
          entryId: entry.id, 
          field: 'regex', 
          message: `Invalid regex pattern: ${(e as Error).message}`, 
          type: 'regex' 
        });
      }
    }

    // 推奨事項
    if (!entry.variants || entry.variants.length === 0) {
      warnings.push({
        entryId: entry.id,
        field: 'variants',
        message: 'Consider adding variants for better coverage',
        type: 'coverage'
      });
    }
  }

  private checkDuplicateEntries(errors: ValidationError[]): void {
    const seen = new Map<string, NgWordEntry>();
    
    for (const entry of this.database!.entries) {
      const key = `${entry.term}_${entry.category}`;
      if (seen.has(key)) {
        errors.push({
          entryId: entry.id,
          message: `Duplicate entry: ${entry.term} in ${entry.category}`,
          type: 'duplicate'
        });
      } else {
        seen.set(key, entry);
      }
    }
  }

  private validateCategories(warnings: ValidationWarning[]): void {
    const existingCategories = new Set(this.database!.categories);
    
    for (const requiredCategory of this.REQUIRED_CATEGORIES) {
      if (!existingCategories.has(requiredCategory)) {
        warnings.push({
          message: `Missing required category: ${requiredCategory}`,
          type: 'coverage'
        });
      }
    }
  }

  getStatistics(): DatabaseStatistics {
    if (!this.database) {
      throw new Error('Database not loaded');
    }

    const categoryCounts: Record<string, number> = {};
    const languageCounts = { ja: 0, en: 0, both: 0 };
    const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
    let enabledCount = 0;

    for (const entry of this.database.entries) {
      // カテゴリカウント
      categoryCounts[entry.category] = (categoryCounts[entry.category] || 0) + 1;
      
      // 言語カウント
      languageCounts[entry.language]++;
      
      // 重要度カウント
      severityCounts[entry.severity]++;
      
      // 有効/無効カウント
      if (entry.enabled) enabledCount++;
    }

    return {
      totalEntries: this.database.totalEntries,
      categoryCounts,
      languageCounts,
      severityCounts,
      enabledCount,
      disabledCount: this.database.totalEntries - enabledCount
    };
  }

  getCategoryBreakdown(): CategoryBreakdown {
    if (!this.database) {
      throw new Error('Database not loaded');
    }

    const breakdown: CategoryBreakdown = {};

    for (const category of this.database.categories) {
      const categoryEntries = this.database.entries.filter(e => e.category === category);
      const subcategories = Array.from(new Set(
        categoryEntries.map(e => e.subcategory).filter(Boolean)
      )) as string[];
      
      const severityDistribution: Record<string, number> = {
        critical: 0, high: 0, medium: 0, low: 0
      };
      
      let totalPenalty = 0;
      
      for (const entry of categoryEntries) {
        severityDistribution[entry.severity]++;
        totalPenalty += entry.penalty;
      }

      breakdown[category] = {
        count: categoryEntries.length,
        subcategories: subcategories.length > 0 ? subcategories : undefined,
        averagePenalty: totalPenalty / categoryEntries.length,
        severityDistribution
      };
    }

    return breakdown;
  }

  exportToJson(): string {
    if (!this.database) {
      throw new Error('Database not loaded');
    }
    return JSON.stringify(this.database, null, 2);
  }

  async importFromJson(jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData) as NgWordDatabaseInterface;
      
      if (!this.isValidDatabaseFormat(data)) {
        throw new Error('Invalid database format');
      }

      this.database = data;
      await this.saveDatabase();
      logger.info(`Imported database with ${data.totalEntries} entries`);
    } catch (error) {
      logger.error('Failed to import database:', error);
      throw error;
    }
  }

  private async saveDatabase(): Promise<void> {
    if (!this.database) {
      throw new Error('Database not loaded');
    }

    try {
      const data = JSON.stringify(this.database, null, 2);
      await fs.writeFile(this.filePath, data, 'utf-8');
      logger.info(`Saved database to ${this.filePath}`);
    } catch (error) {
      logger.error('Failed to save database:', error);
      throw error;
    }
  }
}