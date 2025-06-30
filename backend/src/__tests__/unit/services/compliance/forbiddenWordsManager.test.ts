import { ForbiddenWordsManager } from '@/services/compliance/forbiddenWordsManager';
import { NgWordDatabase } from '@/services/compliance/ngWordDatabase';
import { NgWordEntry } from '@/types/ngWord';

jest.mock('@/services/compliance/ngWordDatabase');
jest.mock('@/utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

const MockNgWordDatabase = NgWordDatabase as jest.MockedClass<typeof NgWordDatabase>;

describe('ForbiddenWordsManager', () => {
  let manager: ForbiddenWordsManager;
  let mockNgDatabase: jest.Mocked<NgWordDatabase>;

  const testEntry: NgWordEntry = {
    id: 'test_1',
    category: '侮蔑表現',
    term: 'テスト用語',
    severity: 'high',
    penalty: 0.8,
    language: 'ja',
    enabled: true,
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
    source: 'test'
  };

  beforeEach(() => {
    MockNgWordDatabase.mockClear();
    
    mockNgDatabase = {
      loadDatabase: jest.fn().mockResolvedValue(undefined),
      getStatistics: jest.fn().mockReturnValue({
        totalEntries: 100,
        categoryCounts: { '侮蔑表現': 50, '差別表現': 50 },
        languageCounts: { ja: 60, en: 30, both: 10 },
        severityCounts: { critical: 10, high: 30, medium: 40, low: 20 },
        enabledCount: 95,
        disabledCount: 5
      }),
      database: {
        entries: [testEntry]
      }
    } as any;

    MockNgWordDatabase.mockImplementation(() => mockNgDatabase);
    
    manager = new ForbiddenWordsManager();
  });

  describe('constructor', () => {
    test('should initialize with NgWordDatabase', () => {
      expect(MockNgWordDatabase).toHaveBeenCalled();
    });

    test('should handle NgWordDatabase initialization failure', () => {
      MockNgWordDatabase.mockImplementation(() => {
        throw new Error('Database initialization failed');
      });

      // Should not throw and fallback to legacy system
      expect(() => new ForbiddenWordsManager()).not.toThrow();
    });
  });

  describe('checkWithNewDatabase', () => {
    beforeEach(() => {
      // Mock the private database property access
      (manager as any).ngWordDatabase = mockNgDatabase;
    });

    test('should check content with new database successfully', async () => {
      const content = 'この文章にはテスト用語が含まれています';

      const result = await manager.checkWithNewDatabase(content);

      expect(result.hasViolations).toBe(true);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].term).toBe('テスト用語');
      expect(result.violations[0].matchType).toBe('exact');
      expect(result.totalPenalty).toBe(0.8);
    });

    test('should return no violations for clean content', async () => {
      const content = 'この文章はクリーンです';

      const result = await manager.checkWithNewDatabase(content);

      expect(result.hasViolations).toBe(false);
      expect(result.violations).toHaveLength(0);
      expect(result.totalPenalty).toBe(0);
    });

    test('should detect variants', async () => {
      const entryWithVariants = {
        ...testEntry,
        variants: ['テスト語', 'test-term']
      };
      mockNgDatabase.database.entries = [entryWithVariants];

      const content = 'この文章にはテスト語が含まれています';

      const result = await manager.checkWithNewDatabase(content);

      expect(result.hasViolations).toBe(true);
      expect(result.violations[0].matchType).toBe('variant');
      expect(result.totalPenalty).toBe(0.64); // 0.8 * 0.8 for variants
    });

    test('should detect regex patterns', async () => {
      const entryWithRegex = {
        ...testEntry,
        regex: '\\d{3}-\\d{4}-\\d{4}'
      };
      mockNgDatabase.database.entries = [entryWithRegex];

      const content = '私の電話番号は090-1234-5678です';

      const result = await manager.checkWithNewDatabase(content);

      expect(result.hasViolations).toBe(true);
      expect(result.violations[0].matchType).toBe('regex');
      expect(result.violations[0].term).toBe('090-1234-5678');
    });

    test('should handle invalid regex gracefully', async () => {
      const entryWithInvalidRegex = {
        ...testEntry,
        regex: '[invalid regex'
      };
      mockNgDatabase.database.entries = [entryWithInvalidRegex];

      const content = 'テスト内容';

      // Should not throw error
      const result = await manager.checkWithNewDatabase(content);
      expect(result).toBeDefined();
    });

    test('should skip disabled entries', async () => {
      const disabledEntry = {
        ...testEntry,
        enabled: false
      };
      mockNgDatabase.database.entries = [disabledEntry];

      const content = 'この文章にはテスト用語が含まれています';

      const result = await manager.checkWithNewDatabase(content);

      expect(result.hasViolations).toBe(false);
      expect(result.violations).toHaveLength(0);
    });

    test('should provide suggestions when recommendations exist', async () => {
      const entryWithRecommendation = {
        ...testEntry,
        recommendation: '適切な表現'
      };
      mockNgDatabase.database.entries = [entryWithRecommendation];

      const content = 'この文章にはテスト用語が含まれています';

      const result = await manager.checkWithNewDatabase(content);

      expect(result.suggestions).toContain('"テスト用語" → "適切な表現"');
    });

    test('should cap total penalty at 1.0', async () => {
      const highPenaltyEntry1 = { ...testEntry, penalty: 0.8 };
      const highPenaltyEntry2 = { ...testEntry, id: 'test_2', penalty: 0.7 };
      mockNgDatabase.database.entries = [highPenaltyEntry1, highPenaltyEntry2];

      const content = 'この文章にはテスト用語が2回テスト用語含まれています';

      const result = await manager.checkWithNewDatabase(content);

      expect(result.totalPenalty).toBe(1.0);
    });

    test('should fallback to legacy check when NgWordDatabase unavailable', async () => {
      (manager as any).ngWordDatabase = null;

      const legacyCheckSpy = jest.spyOn(manager, 'checkForbiddenWords')
        .mockResolvedValue({
          safe: false,
          penalty: 0.5,
          reasons: ['Legacy violation']
        });

      const result = await manager.checkWithNewDatabase('test content');

      expect(legacyCheckSpy).toHaveBeenCalled();
      expect(result.hasViolations).toBe(true);
      expect(result.totalPenalty).toBe(0.5);
      expect(result.suggestions).toContain('Legacy violation');
    });

    test('should handle errors gracefully', async () => {
      (manager as any).ngWordDatabase = {
        database: null
      };

      await expect(manager.checkWithNewDatabase('test')).rejects.toThrow();
    });
  });

  describe('getDetailedAnalysis', () => {
    beforeEach(() => {
      (manager as any).ngWordDatabase = mockNgDatabase;
    });

    test('should provide detailed analysis', async () => {
      const entries = [
        { ...testEntry, category: '侮蔑表現', severity: 'high', language: 'ja' },
        { ...testEntry, id: 'test_2', category: '差別表現', severity: 'critical', language: 'en', term: 'bad-word' }
      ];
      mockNgDatabase.database.entries = entries;

      const content = 'この文章にはテスト用語とbad-wordが含まれています';

      const result = await manager.getDetailedAnalysis(content);

      expect(result.categoryBreakdown).toEqual({
        '侮蔑表現': 1,
        '差別表現': 1
      });
      expect(result.severityBreakdown).toEqual({
        'high': 1,
        'critical': 1
      });
      expect(result.languageBreakdown).toEqual({
        'ja': 1,
        'en': 1
      });
      expect(result.processingTime).toBeGreaterThan(0);
      expect(result.contentLength).toBe(content.length);
    });

    test('should handle empty violations', async () => {
      mockNgDatabase.database.entries = [];

      const result = await manager.getDetailedAnalysis('clean content');

      expect(result.categoryBreakdown).toEqual({});
      expect(result.severityBreakdown).toEqual({});
      expect(result.languageBreakdown).toEqual({});
    });
  });

  describe('reloadDatabase', () => {
    test('should reload database successfully', async () => {
      (manager as any).ngWordDatabase = mockNgDatabase;

      await manager.reloadDatabase();

      expect(mockNgDatabase.loadDatabase).toHaveBeenCalled();
    });

    test('should handle reload when NgWordDatabase not initialized', async () => {
      (manager as any).ngWordDatabase = null;

      // Should not throw
      await expect(manager.reloadDatabase()).resolves.toBeUndefined();
    });

    test('should handle reload failure', async () => {
      (manager as any).ngWordDatabase = mockNgDatabase;
      mockNgDatabase.loadDatabase.mockRejectedValue(new Error('Reload failed'));

      await expect(manager.reloadDatabase()).rejects.toThrow('Reload failed');
    });
  });

  describe('getEnhancedStats', () => {
    test('should return enhanced stats when NgWordDatabase available', () => {
      (manager as any).ngWordDatabase = mockNgDatabase;

      const stats = manager.getEnhancedStats();

      expect(stats.mode).toBe('enhanced');
      expect(stats.ngWordDatabase).toBeDefined();
      expect(stats.ngWordDatabase.totalEntries).toBe(100);
    });

    test('should return basic stats when NgWordDatabase unavailable', () => {
      (manager as any).ngWordDatabase = null;

      const stats = manager.getEnhancedStats();

      expect(stats.mode).toBeUndefined();
      expect(stats.ngWordDatabase).toBeUndefined();
    });

    test('should handle stats retrieval failure', () => {
      (manager as any).ngWordDatabase = mockNgDatabase;
      mockNgDatabase.getStatistics.mockImplementation(() => {
        throw new Error('Stats failed');
      });

      const stats = manager.getEnhancedStats();

      expect(stats.mode).toBe('legacy');
      expect(stats.error).toBe('Stats failed');
    });
  });

  describe('isNgWordDatabaseAvailable', () => {
    test('should return true when NgWordDatabase is available', () => {
      (manager as any).ngWordDatabase = mockNgDatabase;

      expect(manager.isNgWordDatabaseAvailable()).toBe(true);
    });

    test('should return false when NgWordDatabase is not available', () => {
      (manager as any).ngWordDatabase = null;

      expect(manager.isNgWordDatabaseAvailable()).toBe(false);
    });
  });

  describe('getNgWordDatabase', () => {
    test('should return NgWordDatabase instance when available', () => {
      (manager as any).ngWordDatabase = mockNgDatabase;

      expect(manager.getNgWordDatabase()).toBe(mockNgDatabase);
    });

    test('should return null when NgWordDatabase not available', () => {
      (manager as any).ngWordDatabase = null;

      expect(manager.getNgWordDatabase()).toBeNull();
    });
  });

  describe('legacy functionality', () => {
    test('should maintain backward compatibility with checkForbiddenWords', async () => {
      const result = await manager.checkForbiddenWords('test content with fuck');

      expect(result.safe).toBe(false);
      expect(result.penalty).toBeGreaterThan(0);
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    test('should maintain backward compatibility with getStats', () => {
      const stats = manager.getStats();

      expect(stats).toHaveProperty('totalWords');
      expect(stats).toHaveProperty('categoriesCount');
      expect(stats).toHaveProperty('checksPerformed');
    });

    test('should maintain backward compatibility with addCategory', () => {
      expect(() => {
        manager.addCategory('新規カテゴリ', ['用語1', '用語2'], 'high', 0.8);
      }).not.toThrow();
    });

    test('should maintain backward compatibility with addWordsToCategory', () => {
      manager.addCategory('テストカテゴリ', ['用語1'], 'medium', 0.5);
      
      expect(() => {
        manager.addWordsToCategory('テストカテゴリ', ['用語2', '用語3']);
      }).not.toThrow();
    });
  });

  describe('performance', () => {
    test('should process large content efficiently', async () => {
      (manager as any).ngWordDatabase = mockNgDatabase;
      
      const largeContent = 'テスト用語 '.repeat(1000);
      const startTime = Date.now();
      
      await manager.checkWithNewDatabase(largeContent);
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
    });

    test('should handle many entries efficiently', async () => {
      const manyEntries = Array.from({ length: 1000 }, (_, i) => ({
        ...testEntry,
        id: `test_${i}`,
        term: `用語${i}`
      }));
      
      mockNgDatabase.database.entries = manyEntries;
      (manager as any).ngWordDatabase = mockNgDatabase;

      const startTime = Date.now();
      await manager.checkWithNewDatabase('テスト内容');
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(50); // Should complete within 50ms
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      (manager as any).ngWordDatabase = mockNgDatabase;
    });

    test('should handle empty content', async () => {
      const result = await manager.checkWithNewDatabase('');

      expect(result.hasViolations).toBe(false);
      expect(result.violations).toHaveLength(0);
    });

    test('should handle content with special characters', async () => {
      const content = '特殊文字 !@#$%^&*()_+ を含むテスト用語です';

      const result = await manager.checkWithNewDatabase(content);

      expect(result.hasViolations).toBe(true);
    });

    test('should handle unicode content', async () => {
      const content = '🎵 音楽とテスト用語 🎵';

      const result = await manager.checkWithNewDatabase(content);

      expect(result.hasViolations).toBe(true);
    });

    test('should handle very long single words', async () => {
      const longWord = 'a'.repeat(10000);
      const content = `正常な文章と${longWord}とテスト用語`;

      const result = await manager.checkWithNewDatabase(content);

      expect(result.hasViolations).toBe(true);
      expect(result.violations.some(v => v.term === 'テスト用語')).toBe(true);
    });

    test('should handle content with line breaks', async () => {
      const content = '最初の行\nテスト用語を含む\n最後の行';

      const result = await manager.checkWithNewDatabase(content);

      expect(result.hasViolations).toBe(true);
    });
  });
});