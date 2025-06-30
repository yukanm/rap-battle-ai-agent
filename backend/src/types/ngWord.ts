export interface NgWordEntry {
  id: string;                    // 一意識別子
  category: string;              // カテゴリ名
  subcategory?: string;          // サブカテゴリ（オプション）
  term: string;                  // 禁止用語
  variants?: string[];           // 表記揺れ・類似語
  severity: 'critical' | 'high' | 'medium' | 'low';  // 重要度
  penalty: number;               // ペナルティスコア（0.1-1.0）
  language: 'ja' | 'en' | 'both'; // 対象言語
  context?: string;              // 使用文脈情報
  recommendation?: string;       // 代替表現推奨
  note?: string;                 // 補足説明
  regex?: string;               // 正規表現パターン（オプション）
  enabled: boolean;              // 有効/無効フラグ
  createdAt: string;            // 作成日時（ISO 8601）
  updatedAt: string;            // 更新日時（ISO 8601）
  source?: string;              // 出典・参考元
}

export interface NgWordDatabase {
  version: string;              // データベースバージョン
  lastUpdated: string;          // 最終更新日時
  totalEntries: number;         // 総エントリ数
  categories: string[];         // カテゴリ一覧
  entries: NgWordEntry[];       // NGワードエントリ
  metadata: {
    description: string;
    maintainer: string;
    license: string;
  };
}

export interface DatabaseStatistics {
  totalEntries: number;
  categoryCounts: Record<string, number>;
  languageCounts: {
    ja: number;
    en: number;
    both: number;
  };
  severityCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  enabledCount: number;
  disabledCount: number;
}

export interface CategoryBreakdown {
  [category: string]: {
    count: number;
    subcategories?: string[];
    averagePenalty: number;
    severityDistribution: Record<string, number>;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  summary: {
    totalChecked: number;
    totalErrors: number;
    totalWarnings: number;
  };
}

export interface ValidationError {
  entryId?: string;
  field?: string;
  message: string;
  type: 'schema' | 'duplicate' | 'category' | 'regex' | 'penalty' | 'data';
}

export interface ValidationWarning {
  entryId?: string;
  field?: string;
  message: string;
  type: 'recommendation' | 'performance' | 'coverage';
}

export interface DuplicateReport {
  duplicates: Array<{
    term: string;
    entries: Array<{
      id: string;
      category: string;
    }>;
  }>;
  totalDuplicates: number;
}

export interface CategoryValidationResult {
  isValid: boolean;
  unknownCategories: string[];
  missingRequiredCategories: string[];
  categoryDistribution: Record<string, number>;
}

export interface RegexValidationResult {
  isValid: boolean;
  invalidPatterns: Array<{
    entryId: string;
    pattern: string;
    error: string;
  }>;
}

export interface UpdateResult {
  success: boolean;
  added: number;
  updated: number;
  deleted: number;
  errors: string[];
  timestamp: string;
  backupPath?: string;
}

export interface DatabaseDiff {
  added: NgWordEntry[];
  updated: Array<{
    id: string;
    changes: Partial<NgWordEntry>;
  }>;
  deleted: string[];
}

export interface CheckResult {
  hasViolations: boolean;
  violations: Array<{
    term: string;
    entry: NgWordEntry;
    matchType: 'exact' | 'variant' | 'regex';
    position: {
      start: number;
      end: number;
    };
  }>;
  totalPenalty: number;
  suggestions: string[];
}

export interface DetailedCheckResult extends CheckResult {
  categoryBreakdown: Record<string, number>;
  severityBreakdown: Record<string, number>;
  languageBreakdown: Record<string, number>;
  processingTime: number;
  contentLength: number;
}