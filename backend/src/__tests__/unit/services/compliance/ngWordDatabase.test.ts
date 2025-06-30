import { NgWordDatabase } from '@/services/compliance/ngWordDatabase';
import { NgWordEntry } from '@/types/ngWord';
import * as fs from 'fs/promises';
import path from 'path';

jest.mock('fs/promises');
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe('NgWordDatabase', () => {
  let database: NgWordDatabase;
  
  const mockValidData = {
    version: '1.0.0',
    lastUpdated: '2023-01-01T00:00:00.000Z',
    totalEntries: 2,
    categories: ['侮蔑表現', '差別表現'],
    entries: [
      {
        id: 'test_1',
        category: '侮蔑表現',
        term: 'テスト用語1',
        severity: 'high' as const,
        penalty: 0.8,
        language: 'ja' as const,
        enabled: true,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
        source: 'test'
      },
      {
        id: 'test_2',
        category: '差別表現',
        term: 'test-term',
        severity: 'critical' as const,
        penalty: 1.0,
        language: 'en' as const,
        enabled: true,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
        source: 'test'
      }
    ],
    metadata: {
      description: 'Test database',
      maintainer: 'Test',
      license: 'Test'
    }
  };

  const mockLegacyData = [
    {
      category: '侮蔑表現',
      term: '古い用語',
      note: 'テスト用'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    database = new NgWordDatabase('/test/path/ng_word.json');
  });

  describe('loadDatabase', () => {
    test('should load database successfully with valid data', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockValidData));
      
      await database.loadDatabase();
      
      expect(mockFs.readFile).toHaveBeenCalledWith('/test/path/ng_word.json', 'utf-8');
    });

    test('should load database from custom path', async () => {
      const customPath = '/custom/path/ng_word.json';
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockValidData));
      
      await database.loadDatabase(customPath);
      
      expect(mockFs.readFile).toHaveBeenCalledWith(customPath, 'utf-8');
    });

    test('should convert legacy format to new format', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockLegacyData));
      
      await database.loadDatabase();
      
      const stats = database.getStatistics();
      expect(stats.totalEntries).toBe(1);
    });

    test('should throw error for invalid JSON', async () => {
      mockFs.readFile.mockResolvedValue('invalid json');
      
      await expect(database.loadDatabase()).rejects.toThrow();
    });

    test('should throw error when file cannot be read', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));
      
      await expect(database.loadDatabase()).rejects.toThrow('File not found');
    });

    test('should throw error for invalid database format', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify({ invalid: 'format' }));
      
      await expect(database.loadDatabase()).rejects.toThrow('Invalid database format');
    });
  });

  describe('getEntryById', () => {
    beforeEach(async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockValidData));
      await database.loadDatabase();
    });

    test('should return entry by ID', () => {
      const entry = database.getEntryById('test_1');
      
      expect(entry).toBeTruthy();
      expect(entry?.term).toBe('テスト用語1');
      expect(entry?.category).toBe('侮蔑表現');
    });

    test('should return null for non-existent ID', () => {
      const entry = database.getEntryById('non_existent');
      
      expect(entry).toBeNull();
    });

    test('should return null when database not loaded', () => {
      const emptyDatabase = new NgWordDatabase();
      const entry = emptyDatabase.getEntryById('test_1');
      
      expect(entry).toBeNull();
    });
  });

  describe('getEntriesByCategory', () => {
    beforeEach(async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockValidData));
      await database.loadDatabase();
    });

    test('should return entries by category', () => {
      const entries = database.getEntriesByCategory('侮蔑表現');
      
      expect(entries).toHaveLength(1);
      expect(entries[0].term).toBe('テスト用語1');
    });

    test('should return empty array for non-existent category', () => {
      const entries = database.getEntriesByCategory('存在しないカテゴリ');
      
      expect(entries).toHaveLength(0);
    });

    test('should only return enabled entries', () => {
      const dataWithDisabled = {
        ...mockValidData,
        entries: [
          ...mockValidData.entries,
          {
            id: 'test_disabled',
            category: '侮蔑表現',
            term: '無効な用語',
            severity: 'low' as const,
            penalty: 0.2,
            language: 'ja' as const,
            enabled: false,
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2023-01-01T00:00:00.000Z',
            source: 'test'
          }
        ]
      };
      
      mockFs.readFile.mockResolvedValue(JSON.stringify(dataWithDisabled));
      
      return database.loadDatabase().then(() => {
        const entries = database.getEntriesByCategory('侮蔑表現');
        expect(entries).toHaveLength(1);
        expect(entries[0].term).toBe('テスト用語1');
      });
    });
  });

  describe('searchEntries', () => {
    beforeEach(async () => {
      const searchTestData = {
        ...mockValidData,
        entries: [
          ...mockValidData.entries,
          {
            id: 'test_3',
            category: '侮蔑表現',
            term: 'バカ',
            variants: ['ばか', 'BAKA'],
            severity: 'medium' as const,
            penalty: 0.5,
            language: 'ja' as const,
            note: '一般的な侮蔑語',
            enabled: true,
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2023-01-01T00:00:00.000Z',
            source: 'test'
          }
        ]
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(searchTestData));
      await database.loadDatabase();
    });

    test('should search by term', () => {
      const results = database.searchEntries('テスト');
      
      expect(results).toHaveLength(1);
      expect(results[0].term).toBe('テスト用語1');
    });

    test('should search by category', () => {
      const results = database.searchEntries('侮蔑');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(e => e.category.includes('侮蔑'))).toBe(true);
    });

    test('should search by variants', () => {
      const results = database.searchEntries('ばか');
      
      expect(results).toHaveLength(1);
      expect(results[0].term).toBe('バカ');
    });

    test('should search by note', () => {
      const results = database.searchEntries('一般的');
      
      expect(results).toHaveLength(1);
      expect(results[0].term).toBe('バカ');
    });

    test('should be case insensitive', () => {
      const results = database.searchEntries('TEST');
      
      expect(results).toHaveLength(1);
      expect(results[0].term).toBe('test-term');
    });

    test('should return empty array when no matches', () => {
      const results = database.searchEntries('存在しない');
      
      expect(results).toHaveLength(0);
    });
  });

  describe('addEntry', () => {
    beforeEach(async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockValidData));
      mockFs.writeFile.mockResolvedValue(undefined);
      await database.loadDatabase();
    });

    test('should add new entry successfully', async () => {
      const newEntry: NgWordEntry = {
        id: 'test_new',
        category: '新規カテゴリ',
        term: '新しい用語',
        severity: 'medium',
        penalty: 0.6,
        language: 'ja',
        enabled: true,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
        source: 'test'
      };

      await database.addEntry(newEntry);

      const stats = database.getStatistics();
      expect(stats.totalEntries).toBe(3);
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    test('should update categories when adding entry with new category', async () => {
      const newEntry: NgWordEntry = {
        id: 'test_new',
        category: '新規カテゴリ',
        term: '新しい用語',
        severity: 'medium',
        penalty: 0.6,
        language: 'ja',
        enabled: true,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
        source: 'test'
      };

      await database.addEntry(newEntry);

      const categoryBreakdown = database.getCategoryBreakdown();
      expect(categoryBreakdown).toHaveProperty('新規カテゴリ');
    });

    test('should throw error for duplicate entry', async () => {
      const duplicateEntry: NgWordEntry = {
        id: 'test_duplicate',
        category: '侮蔑表現',
        term: 'テスト用語1',
        severity: 'medium',
        penalty: 0.6,
        language: 'ja',
        enabled: true,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
        source: 'test'
      };

      await expect(database.addEntry(duplicateEntry)).rejects.toThrow('Entry already exists');
    });

    test('should throw error when database not loaded', async () => {
      const emptyDatabase = new NgWordDatabase();
      const newEntry: NgWordEntry = {
        id: 'test_new',
        category: 'テスト',
        term: '新しい用語',
        severity: 'medium',
        penalty: 0.6,
        language: 'ja',
        enabled: true,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
        source: 'test'
      };

      await expect(emptyDatabase.addEntry(newEntry)).rejects.toThrow('Database not loaded');
    });
  });

  describe('updateEntry', () => {
    beforeEach(async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockValidData));
      mockFs.writeFile.mockResolvedValue(undefined);
      await database.loadDatabase();
    });

    test('should update entry successfully', async () => {
      const updates = {
        severity: 'low' as const,
        penalty: 0.3,
        note: '更新されたノート'
      };

      await database.updateEntry('test_1', updates);

      const entry = database.getEntryById('test_1');
      expect(entry?.severity).toBe('low');
      expect(entry?.penalty).toBe(0.3);
      expect(entry?.note).toBe('更新されたノート');
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    test('should update updatedAt timestamp', async () => {
      const originalDate = '2023-01-01T00:00:00.000Z';
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2023-12-31T23:59:59.999Z');

      await database.updateEntry('test_1', { note: 'Updated' });

      const entry = database.getEntryById('test_1');
      expect(entry?.updatedAt).toBe('2023-12-31T23:59:59.999Z');
    });

    test('should throw error for non-existent entry', async () => {
      await expect(database.updateEntry('non_existent', { note: 'test' }))
        .rejects.toThrow('Entry not found: non_existent');
    });

    test('should throw error when database not loaded', async () => {
      const emptyDatabase = new NgWordDatabase();
      await expect(emptyDatabase.updateEntry('test_1', { note: 'test' }))
        .rejects.toThrow('Database not loaded');
    });
  });

  describe('deleteEntry', () => {
    beforeEach(async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockValidData));
      mockFs.writeFile.mockResolvedValue(undefined);
      await database.loadDatabase();
    });

    test('should delete entry successfully', async () => {
      await database.deleteEntry('test_1');

      const entry = database.getEntryById('test_1');
      expect(entry).toBeNull();
      
      const stats = database.getStatistics();
      expect(stats.totalEntries).toBe(1);
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    test('should throw error for non-existent entry', async () => {
      await expect(database.deleteEntry('non_existent'))
        .rejects.toThrow('Entry not found: non_existent');
    });

    test('should throw error when database not loaded', async () => {
      const emptyDatabase = new NgWordDatabase();
      await expect(emptyDatabase.deleteEntry('test_1'))
        .rejects.toThrow('Database not loaded');
    });
  });

  describe('addMultipleEntries', () => {
    beforeEach(async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockValidData));
      mockFs.writeFile.mockResolvedValue(undefined);
      await database.loadDatabase();
    });

    test('should add multiple entries successfully', async () => {
      const newEntries: NgWordEntry[] = [
        {
          id: 'test_multi_1',
          category: 'テストカテゴリ',
          term: '複数用語1',
          severity: 'medium',
          penalty: 0.6,
          language: 'ja',
          enabled: true,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
          source: 'test'
        },
        {
          id: 'test_multi_2',
          category: 'テストカテゴリ',
          term: '複数用語2',
          severity: 'low',
          penalty: 0.2,
          language: 'ja',
          enabled: true,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
          source: 'test'
        }
      ];

      await database.addMultipleEntries(newEntries);

      const stats = database.getStatistics();
      expect(stats.totalEntries).toBe(4);
    });

    test('should handle partial failures gracefully', async () => {
      const entriesWithDuplicate: NgWordEntry[] = [
        {
          id: 'test_new_unique',
          category: 'テストカテゴリ',
          term: '有効な用語',
          severity: 'medium',
          penalty: 0.6,
          language: 'ja',
          enabled: true,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
          source: 'test'
        },
        {
          id: 'test_duplicate',
          category: '侮蔑表現',
          term: 'テスト用語1', // This already exists
          severity: 'medium',
          penalty: 0.6,
          language: 'ja',
          enabled: true,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
          source: 'test'
        }
      ];

      await database.addMultipleEntries(entriesWithDuplicate);

      // Should add the unique one but skip the duplicate
      const stats = database.getStatistics();
      expect(stats.totalEntries).toBe(3); // Original 2 + 1 new
    });
  });

  describe('validateDatabase', () => {
    test('should validate database successfully with valid data', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockValidData));
      await database.loadDatabase();

      const result = await database.validateDatabase();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.summary.totalChecked).toBe(2);
    });

    test('should return error when database not loaded', async () => {
      const result = await database.validateDatabase();

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Database not loaded');
    });

    test('should detect duplicate entries', async () => {
      const dataWithDuplicates = {
        ...mockValidData,
        entries: [
          ...mockValidData.entries,
          {
            id: 'test_duplicate',
            category: '侮蔑表現',
            term: 'テスト用語1', // Same term and category as test_1
            severity: 'medium' as const,
            penalty: 0.5,
            language: 'ja' as const,
            enabled: true,
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2023-01-01T00:00:00.000Z',
            source: 'test'
          }
        ]
      };
      
      mockFs.readFile.mockResolvedValue(JSON.stringify(dataWithDuplicates));
      await database.loadDatabase();

      const result = await database.validateDatabase();

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'duplicate')).toBe(true);
    });

    test('should warn about minimum entry requirements', async () => {
      const smallData = {
        ...mockValidData,
        totalEntries: 2,
        entries: mockValidData.entries.slice(0, 2)
      };
      
      mockFs.readFile.mockResolvedValue(JSON.stringify(smallData));
      await database.loadDatabase();

      const result = await database.validateDatabase();

      expect(result.warnings.some(w => w.message.includes('below minimum requirement (300)'))).toBe(true);
    });
  });

  describe('getStatistics', () => {
    beforeEach(async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockValidData));
      await database.loadDatabase();
    });

    test('should return correct statistics', () => {
      const stats = database.getStatistics();

      expect(stats.totalEntries).toBe(2);
      expect(stats.categoryCounts).toEqual({
        '侮蔑表現': 1,
        '差別表現': 1
      });
      expect(stats.languageCounts).toEqual({
        ja: 1,
        en: 1,
        both: 0
      });
      expect(stats.severityCounts).toEqual({
        critical: 1,
        high: 1,
        medium: 0,
        low: 0
      });
      expect(stats.enabledCount).toBe(2);
      expect(stats.disabledCount).toBe(0);
    });

    test('should throw error when database not loaded', () => {
      const emptyDatabase = new NgWordDatabase();
      expect(() => emptyDatabase.getStatistics()).toThrow('Database not loaded');
    });
  });

  describe('getCategoryBreakdown', () => {
    beforeEach(async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockValidData));
      await database.loadDatabase();
    });

    test('should return category breakdown', () => {
      const breakdown = database.getCategoryBreakdown();

      expect(breakdown).toHaveProperty('侮蔑表現');
      expect(breakdown).toHaveProperty('差別表現');
      expect(breakdown['侮蔑表現'].count).toBe(1);
      expect(breakdown['差別表現'].count).toBe(1);
      expect(breakdown['侮蔑表現'].averagePenalty).toBe(0.8);
      expect(breakdown['差別表現'].averagePenalty).toBe(1.0);
    });

    test('should include severity distribution', () => {
      const breakdown = database.getCategoryBreakdown();

      expect(breakdown['侮蔑表現'].severityDistribution).toEqual({
        critical: 0,
        high: 1,
        medium: 0,
        low: 0
      });
      expect(breakdown['差別表現'].severityDistribution).toEqual({
        critical: 1,
        high: 0,
        medium: 0,
        low: 0
      });
    });
  });

  describe('exportToJson', () => {
    beforeEach(async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockValidData));
      await database.loadDatabase();
    });

    test('should export database to JSON string', () => {
      const json = database.exportToJson();
      const parsed = JSON.parse(json);

      expect(parsed.version).toBe('1.0.0');
      expect(parsed.totalEntries).toBe(2);
      expect(parsed.entries).toHaveLength(2);
    });

    test('should throw error when database not loaded', () => {
      const emptyDatabase = new NgWordDatabase();
      expect(() => emptyDatabase.exportToJson()).toThrow('Database not loaded');
    });
  });

  describe('importFromJson', () => {
    beforeEach(() => {
      mockFs.writeFile.mockResolvedValue(undefined);
    });

    test('should import database from JSON string', async () => {
      const jsonData = JSON.stringify(mockValidData);

      await database.importFromJson(jsonData);

      const stats = database.getStatistics();
      expect(stats.totalEntries).toBe(2);
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    test('should throw error for invalid JSON', async () => {
      const invalidJson = 'invalid json';

      await expect(database.importFromJson(invalidJson)).rejects.toThrow();
    });

    test('should throw error for invalid database format', async () => {
      const invalidData = JSON.stringify({ invalid: 'format' });

      await expect(database.importFromJson(invalidData)).rejects.toThrow('Invalid database format');
    });
  });
});