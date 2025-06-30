import { NgWordDatabase } from '@/services/compliance/ngWordDatabase';
import { NgWordValidator } from '@/services/compliance/ngWordValidator';
import { NgWordUpdater } from '@/services/compliance/ngWordUpdater';
import { ForbiddenWordsManager } from '@/services/compliance/forbiddenWordsManager';
import { NgWordEntry } from '@/types/ngWord';
import * as fs from 'fs/promises';
import * as path from 'path';

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

describe('Compliance System Integration', () => {
  let database: NgWordDatabase;
  let validator: NgWordValidator;
  let updater: NgWordUpdater;
  let manager: ForbiddenWordsManager;
  
  const testDatabasePath = path.join(__dirname, 'test_ng_word.json');
  
  const mockDatabase = {
    version: '1.0.0',
    lastUpdated: '2023-01-01T00:00:00.000Z',
    totalEntries: 4,
    categories: ['侮蔑表現', '差別表現', '暴力的表現', '性的表現'],
    entries: [
      {
        id: 'test_1',
        category: '侮蔑表現',
        term: 'バカ',
        variants: ['ばか', 'BAKA'],
        severity: 'medium',
        penalty: 0.6,
        language: 'ja',
        enabled: true,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
        source: 'test'
      },
      {
        id: 'test_2',
        category: '差別表現',
        term: 'stupid',
        severity: 'high',
        penalty: 0.8,
        language: 'en',
        enabled: true,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
        source: 'test'
      },
      {
        id: 'test_3',
        category: '暴力的表現',
        term: '殺す',
        severity: 'critical',
        penalty: 1.0,
        language: 'ja',
        enabled: true,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
        source: 'test'
      },
      {
        id: 'test_4',
        category: '性的表現',
        term: '変態',
        severity: 'critical',
        penalty: 1.0,
        language: 'ja',
        enabled: false, // Disabled for testing
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
        source: 'test'
      }
    ],
    metadata: {
      description: 'Test NG word database',
      maintainer: 'Test Team',
      license: 'Test'
    }
  };

  beforeAll(async () => {
    // Create test database file
    await fs.writeFile(testDatabasePath, JSON.stringify(mockDatabase, null, 2));
  });

  afterAll(async () => {
    // Clean up test database file
    try {
      await fs.unlink(testDatabasePath);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  });

  beforeEach(async () => {
    database = new NgWordDatabase(testDatabasePath);
    validator = new NgWordValidator();
    updater = new NgWordUpdater(database);
    
    await database.loadDatabase();
  });

  describe('Database and Validator Integration', () => {
    test('should load and validate test database successfully', async () => {
      const validationResult = await database.validateDatabase();

      expect(validationResult.isValid).toBe(true);
      expect(validationResult.summary.totalChecked).toBe(4);
      expect(validationResult.errors).toHaveLength(0);
    });

    test('should detect database structure issues', async () => {
      // Create invalid database
      const invalidDb = { invalid: 'structure' };
      const invalidPath = path.join(__dirname, 'invalid_ng_word.json');
      
      await fs.writeFile(invalidPath, JSON.stringify(invalidDb));
      
      const invalidDatabase = new NgWordDatabase(invalidPath);
      
      await expect(invalidDatabase.loadDatabase()).rejects.toThrow();
      
      // Clean up
      await fs.unlink(invalidPath);
    });

    test('should validate individual entries from database', () => {
      const entries = database['database']?.entries || [];
      
      for (const entry of entries) {
        const result = validator.validateEntry(entry);
        expect(result.isValid).toBe(true);
      }
    });

    test('should provide comprehensive statistics', () => {
      const stats = database.getStatistics();

      expect(stats.totalEntries).toBe(4);
      expect(stats.categoryCounts['侮蔑表現']).toBe(1);
      expect(stats.categoryCounts['差別表現']).toBe(1);
      expect(stats.categoryCounts['暴力的表現']).toBe(1);
      expect(stats.categoryCounts['性的表現']).toBe(1);
      expect(stats.languageCounts.ja).toBe(3);
      expect(stats.languageCounts.en).toBe(1);
      expect(stats.enabledCount).toBe(3);
      expect(stats.disabledCount).toBe(1);
    });
  });

  describe('Database CRUD Operations', () => {
    test('should perform complete CRUD operations', async () => {
      const newEntry: NgWordEntry = {
        id: 'crud_test',
        category: 'テストカテゴリ',
        term: 'テスト語',
        severity: 'low',
        penalty: 0.3,
        language: 'ja',
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'integration_test'
      };

      // Create
      await database.addEntry(newEntry);
      let entry = database.getEntryById('crud_test');
      expect(entry).toBeTruthy();
      expect(entry?.term).toBe('テスト語');

      // Read
      const searchResults = database.searchEntries('テスト語');
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].id).toBe('crud_test');

      // Update
      await database.updateEntry('crud_test', { 
        severity: 'high',
        penalty: 0.9,
        note: '更新されました'
      });
      entry = database.getEntryById('crud_test');
      expect(entry?.severity).toBe('high');
      expect(entry?.penalty).toBe(0.9);
      expect(entry?.note).toBe('更新されました');

      // Delete
      await database.deleteEntry('crud_test');
      entry = database.getEntryById('crud_test');
      expect(entry).toBeNull();
    });

    test('should handle batch operations', async () => {
      const batchEntries: NgWordEntry[] = [
        {
          id: 'batch_1',
          category: 'バッチテスト',
          term: 'バッチ語1',
          severity: 'medium',
          penalty: 0.5,
          language: 'ja',
          enabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          source: 'batch_test'
        },
        {
          id: 'batch_2',
          category: 'バッチテスト',
          term: 'バッチ語2',
          severity: 'low',
          penalty: 0.2,
          language: 'ja',
          enabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          source: 'batch_test'
        }
      ];

      await database.addMultipleEntries(batchEntries);

      const categoryEntries = database.getEntriesByCategory('バッチテスト');
      expect(categoryEntries).toHaveLength(2);

      // Clean up
      await database.deleteEntry('batch_1');
      await database.deleteEntry('batch_2');
    });
  });

  describe('Update and Version Management', () => {
    test('should create and restore backups', async () => {
      // Create backup
      const backupPath = await updater.createBackup();
      expect(backupPath).toContain('ng_word_backup_');

      // Modify database
      const newEntry: NgWordEntry = {
        id: 'backup_test',
        category: 'バックアップテスト',
        term: 'バックアップ語',
        severity: 'medium',
        penalty: 0.5,
        language: 'ja',
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'backup_test'
      };
      await database.addEntry(newEntry);

      // Verify modification
      let entry = database.getEntryById('backup_test');
      expect(entry).toBeTruthy();

      // Restore backup
      const version = path.basename(backupPath).replace('ng_word_backup_', '').replace('.json', '');
      await updater.rollback(version);

      // Verify restoration
      entry = database.getEntryById('backup_test');
      expect(entry).toBeNull();

      // Clean up backup
      await fs.unlink(backupPath);
    });

    test('should manage backup cleanup', async () => {
      // Create multiple backups
      const backupPaths = [];
      for (let i = 0; i < 5; i++) {
        const backupPath = await updater.createBackup();
        backupPaths.push(backupPath);
        await new Promise(resolve => setTimeout(resolve, 10)); // Small delay for different timestamps
      }

      // Get initial backup count
      const initialBackups = await updater.getAvailableBackups();
      expect(initialBackups.length).toBeGreaterThanOrEqual(5);

      // Cleanup keeping only 2
      await updater.cleanupOldBackups(2);

      // Verify cleanup
      const remainingBackups = await updater.getAvailableBackups();
      expect(remainingBackups).toHaveLength(2);

      // Clean up remaining backups
      for (const backup of remainingBackups) {
        const backupDir = path.dirname(backupPaths[0]);
        await fs.unlink(path.join(backupDir, backup));
      }
    });

    test('should apply database diffs', async () => {
      const diff = {
        added: [
          {
            id: 'diff_add',
            category: 'Diffテスト',
            term: 'Diff追加語',
            severity: 'medium',
            penalty: 0.5,
            language: 'ja',
            enabled: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            source: 'diff_test'
          }
        ],
        updated: [
          {
            id: 'test_1',
            changes: { note: 'Diffで更新' }
          }
        ],
        deleted: [] // Not deleting anything in this test
      };

      const result = await updater.applyDiff(diff);

      expect(result.success).toBe(true);
      expect(result.added).toBe(1);
      expect(result.updated).toBe(1);

      // Verify changes
      const addedEntry = database.getEntryById('diff_add');
      expect(addedEntry).toBeTruthy();
      expect(addedEntry?.term).toBe('Diff追加語');

      const updatedEntry = database.getEntryById('test_1');
      expect(updatedEntry?.note).toBe('Diffで更新');

      // Clean up
      await database.deleteEntry('diff_add');
    });
  });

  describe('Content Checking Integration', () => {
    test('should integrate with existing ComplianceService', async () => {
      manager = new ForbiddenWordsManager();
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 100));

      const testContent = 'この文章にはバカという侮蔑語が含まれています';
      
      if (manager.isNgWordDatabaseAvailable()) {
        const result = await manager.checkWithNewDatabase(testContent);
        
        expect(result.hasViolations).toBe(true);
        expect(result.violations.some(v => v.term === 'バカ')).toBe(true);
        expect(result.totalPenalty).toBeGreaterThan(0);
      } else {
        // Fallback to legacy system
        const result = await manager.checkForbiddenWords(testContent);
        expect(result).toBeDefined();
      }
    });

    test('should handle real-world content examples', async () => {
      manager = new ForbiddenWordsManager();
      await new Promise(resolve => setTimeout(resolve, 100));

      const testCases = [
        {
          content: 'MCバトルで相手をstupidと呼ぶのは良くない',
          shouldViolate: true,
          expectedTerms: ['stupid']
        },
        {
          content: '今日は良い天気ですね',
          shouldViolate: false,
          expectedTerms: []
        },
        {
          content: 'あいつを殺すなんて言葉は使っちゃダメ',
          shouldViolate: true,
          expectedTerms: ['殺す']
        },
        {
          content: 'ばかなミスをしました', // Variant test
          shouldViolate: true,
          expectedTerms: ['ばか']
        }
      ];

      for (const testCase of testCases) {
        if (manager.isNgWordDatabaseAvailable()) {
          const result = await manager.checkWithNewDatabase(testCase.content);
          
          expect(result.hasViolations).toBe(testCase.shouldViolate);
          
          if (testCase.shouldViolate) {
            for (const expectedTerm of testCase.expectedTerms) {
              expect(result.violations.some(v => 
                v.term === expectedTerm || 
                (v.entry.variants && v.entry.variants.includes(expectedTerm))
              )).toBe(true);
            }
          }
        }
      }
    });

    test('should maintain performance under load', async () => {
      manager = new ForbiddenWordsManager();
      await new Promise(resolve => setTimeout(resolve, 100));

      const testContent = 'テスト用のバカで stupid な文章です';
      const iterations = 100;

      const startTime = Date.now();
      
      const promises = Array.from({ length: iterations }, () => {
        if (manager.isNgWordDatabaseAvailable()) {
          return manager.checkWithNewDatabase(testContent);
        } else {
          return manager.checkForbiddenWords(testContent);
        }
      });

      await Promise.all(promises);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / iterations;

      expect(averageTime).toBeLessThan(10); // Average should be under 10ms
      expect(totalTime).toBeLessThan(500); // Total should be under 500ms
    });

    test('should provide detailed analysis for complex content', async () => {
      manager = new ForbiddenWordsManager();
      await new Promise(resolve => setTimeout(resolve, 100));

      const complexContent = `
        MCバトルでの表現について話そう。
        相手をバカと呼ぶのは侮蔑表現だし、
        stupidなんて英語も同様だ。
        でも暴力的な殺すなんて言葉は絶対にダメ。
        音楽として楽しむべきだよね。
      `;

      if (manager.isNgWordDatabaseAvailable()) {
        const result = await manager.getDetailedAnalysis(complexContent);

        expect(result.hasViolations).toBe(true);
        expect(result.processingTime).toBeGreaterThan(0);
        expect(result.contentLength).toBe(complexContent.length);
        expect(Object.keys(result.categoryBreakdown).length).toBeGreaterThan(0);
        expect(Object.keys(result.severityBreakdown).length).toBeGreaterThan(0);
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle corrupted database gracefully', async () => {
      const corruptedPath = path.join(__dirname, 'corrupted_ng_word.json');
      await fs.writeFile(corruptedPath, 'invalid json{');

      const corruptedDatabase = new NgWordDatabase(corruptedPath);
      
      await expect(corruptedDatabase.loadDatabase()).rejects.toThrow();
      
      await fs.unlink(corruptedPath);
    });

    test('should handle missing database file', async () => {
      const missingPath = path.join(__dirname, 'missing_ng_word.json');
      const missingDatabase = new NgWordDatabase(missingPath);
      
      await expect(missingDatabase.loadDatabase()).rejects.toThrow();
    });

    test('should handle concurrent access safely', async () => {
      const concurrentOperations = [
        database.searchEntries('バカ'),
        database.getStatistics(),
        database.getCategoryBreakdown(),
        database.getEntryById('test_1'),
        database.getEntriesByCategory('侮蔑表現')
      ];

      const results = await Promise.all(concurrentOperations);
      
      // All operations should complete successfully
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });

    test('should validate data integrity after operations', async () => {
      const initialStats = database.getStatistics();
      
      // Perform various operations
      const testEntry: NgWordEntry = {
        id: 'integrity_test',
        category: '整合性テスト',
        term: '整合性語',
        severity: 'low',
        penalty: 0.2,
        language: 'ja',
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'integrity_test'
      };

      await database.addEntry(testEntry);
      await database.updateEntry('integrity_test', { note: 'テスト更新' });
      
      const midStats = database.getStatistics();
      expect(midStats.totalEntries).toBe(initialStats.totalEntries + 1);

      await database.deleteEntry('integrity_test');
      
      const finalStats = database.getStatistics();
      expect(finalStats.totalEntries).toBe(initialStats.totalEntries);

      // Validate database structure
      const validationResult = await database.validateDatabase();
      expect(validationResult.isValid).toBe(true);
    });
  });

  describe('System Integration', () => {
    test('should integrate all components in complete workflow', async () => {
      // 1. Create and validate new database
      const testDatabase = new NgWordDatabase(testDatabasePath);
      await testDatabase.loadDatabase();
      
      const testValidator = new NgWordValidator();
      const validationResult = await testDatabase.validateDatabase();
      expect(validationResult.isValid).toBe(true);

      // 2. Create updater and perform update
      const testUpdater = new NgWordUpdater(testDatabase);
      const updateResult = await testUpdater.updateFromSource('bpo_guidelines');
      expect(updateResult.success).toBe(true);
      expect(updateResult.added).toBeGreaterThan(0);

      // 3. Create manager and check content
      const testManager = new ForbiddenWordsManager();
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for initialization

      if (testManager.isNgWordDatabaseAvailable()) {
        const contentResult = await testManager.checkWithNewDatabase('テスト用のバカな内容');
        expect(contentResult.hasViolations).toBe(true);

        // 4. Get enhanced statistics
        const enhancedStats = testManager.getEnhancedStats();
        expect(enhancedStats.mode).toBe('enhanced');
        expect(enhancedStats.ngWordDatabase).toBeDefined();
      }
    });

    test('should handle system failure gracefully', async () => {
      // Simulate database failure
      const failingDatabase = new NgWordDatabase('/non/existent/path');
      
      // System should still function with fallback
      const testManager = new ForbiddenWordsManager();
      const result = await testManager.checkForbiddenWords('test content');
      
      expect(result).toBeDefined();
      expect(typeof result.safe).toBe('boolean');
    });

    test('should maintain consistency across components', async () => {
      // Add entry through database
      const consistencyEntry: NgWordEntry = {
        id: 'consistency_test',
        category: '一貫性テスト',
        term: '一貫性語',
        severity: 'medium',
        penalty: 0.6,
        language: 'ja',
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'consistency_test'
      };

      await database.addEntry(consistencyEntry);

      // Verify through manager
      const testManager = new ForbiddenWordsManager();
      await new Promise(resolve => setTimeout(resolve, 100));

      if (testManager.isNgWordDatabaseAvailable()) {
        // Reload to get updated data
        await testManager.reloadDatabase();
        
        const checkResult = await testManager.checkWithNewDatabase('この文章には一貫性語が含まれています');
        expect(checkResult.hasViolations).toBe(true);
        expect(checkResult.violations.some(v => v.term === '一貫性語')).toBe(true);
      }

      // Clean up
      await database.deleteEntry('consistency_test');
    });
  });
});