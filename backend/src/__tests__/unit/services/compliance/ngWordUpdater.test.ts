import { NgWordUpdater } from '@/services/compliance/ngWordUpdater';
import { NgWordDatabase } from '@/services/compliance/ngWordDatabase';
import { NgWordEntry, DatabaseDiff } from '@/types/ngWord';
import * as fs from 'fs/promises';

jest.mock('fs/promises');
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe('NgWordUpdater', () => {
  let updater: NgWordUpdater;
  let mockDatabase: NgWordDatabase;
  
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
    mockDatabase = {
      getEntryById: jest.fn(),
      addEntry: jest.fn(),
      updateEntry: jest.fn(),
      deleteEntry: jest.fn(),
      exportToJson: jest.fn(),
      importFromJson: jest.fn()
    } as any;
    
    updater = new NgWordUpdater(mockDatabase);
    
    // Mock filesystem operations
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue('{}');
    mockFs.access.mockResolvedValue(undefined);
    mockFs.readdir.mockResolvedValue([]);
    mockFs.unlink.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateFromSource', () => {
    test('should update from BPO guidelines successfully', async () => {
      mockDatabase.getEntryById = jest.fn().mockReturnValue(null);
      mockDatabase.addEntry = jest.fn().mockResolvedValue(undefined);
      mockDatabase.exportToJson = jest.fn().mockReturnValue('{}');

      const result = await updater.updateFromSource('bpo_guidelines');

      expect(result.success).toBe(true);
      expect(result.added).toBeGreaterThan(0);
      expect(result.updated).toBe(0);
      expect(result.deleted).toBe(0);
      expect(result.backupPath).toBeDefined();
      expect(mockDatabase.addEntry).toHaveBeenCalled();
    });

    test('should update from民放連 standards successfully', async () => {
      mockDatabase.getEntryById = jest.fn().mockReturnValue(null);
      mockDatabase.addEntry = jest.fn().mockResolvedValue(undefined);
      mockDatabase.exportToJson = jest.fn().mockReturnValue('{}');

      const result = await updater.updateFromSource('minpaku_standards');

      expect(result.success).toBe(true);
      expect(result.added).toBeGreaterThan(0);
      expect(mockDatabase.addEntry).toHaveBeenCalled();
    });

    test('should update from YouTube guidelines successfully', async () => {
      mockDatabase.getEntryById = jest.fn().mockReturnValue(null);
      mockDatabase.addEntry = jest.fn().mockResolvedValue(undefined);
      mockDatabase.exportToJson = jest.fn().mockReturnValue('{}');

      const result = await updater.updateFromSource('youtube_guidelines');

      expect(result.success).toBe(true);
      expect(result.added).toBeGreaterThan(0);
      expect(mockDatabase.addEntry).toHaveBeenCalled();
    });

    test('should update from Twitter rules successfully', async () => {
      mockDatabase.getEntryById = jest.fn().mockReturnValue(null);
      mockDatabase.addEntry = jest.fn().mockResolvedValue(undefined);
      mockDatabase.exportToJson = jest.fn().mockReturnValue('{}');

      const result = await updater.updateFromSource('twitter_rules');

      expect(result.success).toBe(true);
      expect(result.added).toBeGreaterThan(0);
      expect(mockDatabase.addEntry).toHaveBeenCalled();
    });

    test('should update from internet monitoring successfully', async () => {
      mockDatabase.getEntryById = jest.fn().mockReturnValue(null);
      mockDatabase.addEntry = jest.fn().mockResolvedValue(undefined);
      mockDatabase.exportToJson = jest.fn().mockReturnValue('{}');

      const result = await updater.updateFromSource('internet_monitoring');

      expect(result.success).toBe(true);
      expect(result.added).toBeGreaterThan(0);
      expect(mockDatabase.addEntry).toHaveBeenCalled();
    });

    test('should handle unknown source', async () => {
      const result = await updater.updateFromSource('unknown_source');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Unknown source: unknown_source');
    });

    test('should update existing entries when needed', async () => {
      const existingEntry = { ...testEntry, note: 'old note' };
      mockDatabase.getEntryById = jest.fn().mockReturnValue(existingEntry);
      mockDatabase.updateEntry = jest.fn().mockResolvedValue(undefined);
      mockDatabase.exportToJson = jest.fn().mockReturnValue('{}');

      const result = await updater.updateFromSource('bpo_guidelines');

      expect(result.success).toBe(true);
      expect(result.updated).toBeGreaterThan(0);
    });

    test('should handle validation failures gracefully', async () => {
      // Mock validator to fail for all entries
      const originalValidateEntry = require('@/services/compliance/ngWordValidator').NgWordValidator.prototype.validateEntry;
      require('@/services/compliance/ngWordValidator').NgWordValidator.prototype.validateEntry = jest.fn().mockReturnValue({
        isValid: false,
        errors: [{ message: 'Validation failed' }]
      });

      mockDatabase.exportToJson = jest.fn().mockReturnValue('{}');

      const result = await updater.updateFromSource('bpo_guidelines');

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      // Restore original method
      require('@/services/compliance/ngWordValidator').NgWordValidator.prototype.validateEntry = originalValidateEntry;
    });

    test('should handle add entry failures', async () => {
      mockDatabase.getEntryById = jest.fn().mockReturnValue(null);
      mockDatabase.addEntry = jest.fn().mockRejectedValue(new Error('Add failed'));
      mockDatabase.exportToJson = jest.fn().mockReturnValue('{}');

      const result = await updater.updateFromSource('bpo_guidelines');

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('Add failed'))).toBe(true);
    });
  });

  describe('manualUpdate', () => {
    test('should perform manual update successfully', async () => {
      const updates = [testEntry];
      mockDatabase.getEntryById = jest.fn().mockReturnValue(null);
      mockDatabase.addEntry = jest.fn().mockResolvedValue(undefined);
      mockDatabase.exportToJson = jest.fn().mockReturnValue('{}');

      const result = await updater.manualUpdate(updates);

      expect(result.success).toBe(true);
      expect(result.added).toBe(1);
      expect(result.updated).toBe(0);
      expect(mockDatabase.addEntry).toHaveBeenCalledWith(testEntry);
    });

    test('should update existing entries in manual update', async () => {
      const updates = [testEntry];
      const existingEntry = { ...testEntry, note: 'old note' };
      mockDatabase.getEntryById = jest.fn().mockReturnValue(existingEntry);
      mockDatabase.updateEntry = jest.fn().mockResolvedValue(undefined);
      mockDatabase.exportToJson = jest.fn().mockReturnValue('{}');

      const result = await updater.manualUpdate(updates);

      expect(result.success).toBe(true);
      expect(result.added).toBe(0);
      expect(result.updated).toBe(1);
      expect(mockDatabase.updateEntry).toHaveBeenCalledWith(testEntry.id, testEntry);
    });

    test('should handle validation failures in manual update', async () => {
      const invalidEntry = { ...testEntry, penalty: 2.0 }; // Invalid penalty
      const updates = [invalidEntry];
      mockDatabase.exportToJson = jest.fn().mockReturnValue('{}');

      const result = await updater.manualUpdate(updates);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should handle partial failures in manual update', async () => {
      const validEntry = testEntry;
      const invalidEntry = { ...testEntry, id: 'invalid', penalty: 2.0 };
      const updates = [validEntry, invalidEntry];
      
      mockDatabase.getEntryById = jest.fn().mockReturnValue(null);
      mockDatabase.addEntry = jest.fn().mockResolvedValue(undefined);
      mockDatabase.exportToJson = jest.fn().mockReturnValue('{}');

      const result = await updater.manualUpdate(updates);

      expect(result.added).toBe(1); // Only valid entry added
      expect(result.errors.length).toBe(1); // One error for invalid entry
    });
  });

  describe('createBackup', () => {
    test('should create backup successfully', async () => {
      mockDatabase.exportToJson = jest.fn().mockReturnValue('{"test": "data"}');

      const backupPath = await updater.createBackup();

      expect(backupPath).toContain('ng_word_backup_');
      expect(backupPath).toContain('.json');
      expect(mockFs.mkdir).toHaveBeenCalled();
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    test('should handle backup creation failure', async () => {
      mockFs.mkdir.mockRejectedValue(new Error('Mkdir failed'));

      await expect(updater.createBackup()).rejects.toThrow('Mkdir failed');
    });

    test('should handle export failure during backup', async () => {
      mockDatabase.exportToJson = jest.fn().mockImplementation(() => {
        throw new Error('Export failed');
      });

      await expect(updater.createBackup()).rejects.toThrow('Export failed');
    });
  });

  describe('rollback', () => {
    test('should rollback to previous version successfully', async () => {
      const version = '2023-01-01T00-00-00-000Z';
      const backupData = '{"version": "1.0.0", "entries": []}';
      
      mockFs.readFile.mockResolvedValue(backupData);
      mockDatabase.importFromJson = jest.fn().mockResolvedValue(undefined);

      await updater.rollback(version);

      expect(mockFs.access).toHaveBeenCalled();
      expect(mockFs.readFile).toHaveBeenCalled();
      expect(mockDatabase.importFromJson).toHaveBeenCalledWith(backupData);
    });

    test('should handle missing backup file', async () => {
      const version = 'non-existent';
      mockFs.access.mockRejectedValue(new Error('File not found'));

      await expect(updater.rollback(version)).rejects.toThrow('File not found');
    });

    test('should handle import failure during rollback', async () => {
      const version = '2023-01-01T00-00-00-000Z';
      mockFs.readFile.mockResolvedValue('{}');
      mockDatabase.importFromJson = jest.fn().mockRejectedValue(new Error('Import failed'));

      await expect(updater.rollback(version)).rejects.toThrow('Import failed');
    });
  });

  describe('applyDiff', () => {
    test('should apply diff successfully', async () => {
      const diff: DatabaseDiff = {
        added: [testEntry],
        updated: [
          {
            id: 'existing_id',
            changes: { note: 'Updated note' }
          }
        ],
        deleted: ['delete_id']
      };

      mockDatabase.getEntryById = jest.fn().mockReturnValue(null);
      mockDatabase.addEntry = jest.fn().mockResolvedValue(undefined);
      mockDatabase.updateEntry = jest.fn().mockResolvedValue(undefined);
      mockDatabase.deleteEntry = jest.fn().mockResolvedValue(undefined);
      mockDatabase.exportToJson = jest.fn().mockReturnValue('{}');

      const result = await updater.applyDiff(diff);

      expect(result.success).toBe(true);
      expect(result.added).toBe(1);
      expect(result.updated).toBe(1);
      expect(result.deleted).toBe(1);
      expect(mockDatabase.addEntry).toHaveBeenCalledWith(testEntry);
      expect(mockDatabase.updateEntry).toHaveBeenCalledWith('existing_id', { note: 'Updated note' });
      expect(mockDatabase.deleteEntry).toHaveBeenCalledWith('delete_id');
    });

    test('should handle validation failures in diff application', async () => {
      const invalidEntry = { ...testEntry, penalty: 2.0 };
      const diff: DatabaseDiff = {
        added: [invalidEntry],
        updated: [],
        deleted: []
      };

      mockDatabase.exportToJson = jest.fn().mockReturnValue('{}');

      const result = await updater.applyDiff(diff);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should handle partial failures in diff application', async () => {
      const diff: DatabaseDiff = {
        added: [testEntry],
        updated: [{ id: 'non_existent', changes: { note: 'test' } }],
        deleted: ['non_existent_delete']
      };

      mockDatabase.getEntryById = jest.fn().mockReturnValue(null);
      mockDatabase.addEntry = jest.fn().mockResolvedValue(undefined);
      mockDatabase.updateEntry = jest.fn().mockRejectedValue(new Error('Update failed'));
      mockDatabase.deleteEntry = jest.fn().mockRejectedValue(new Error('Delete failed'));
      mockDatabase.exportToJson = jest.fn().mockReturnValue('{}');

      const result = await updater.applyDiff(diff);

      expect(result.added).toBe(1);
      expect(result.updated).toBe(0);
      expect(result.deleted).toBe(0);
      expect(result.errors.length).toBe(2);
    });
  });

  describe('getAvailableBackups', () => {
    test('should list available backups', async () => {
      const mockFiles = [
        'ng_word_backup_2023-01-01T00-00-00-000Z.json',
        'ng_word_backup_2023-01-02T00-00-00-000Z.json',
        'other_file.txt'
      ];
      
      mockFs.readdir.mockResolvedValue(mockFiles as any);

      const backups = await updater.getAvailableBackups();

      expect(backups).toHaveLength(2);
      expect(backups[0]).toBe('ng_word_backup_2023-01-02T00-00-00-000Z.json');
      expect(backups[1]).toBe('ng_word_backup_2023-01-01T00-00-00-000Z.json');
    });

    test('should handle directory read failure', async () => {
      mockFs.readdir.mockRejectedValue(new Error('Directory not found'));

      const backups = await updater.getAvailableBackups();

      expect(backups).toEqual([]);
    });

    test('should filter and sort backup files correctly', async () => {
      const mockFiles = [
        'ng_word_backup_2023-01-03T00-00-00-000Z.json',
        'ng_word_backup_2023-01-01T00-00-00-000Z.json',
        'ng_word_backup_2023-01-02T00-00-00-000Z.json',
        'not_a_backup.json',
        'ng_word_backup_incomplete'
      ];
      
      mockFs.readdir.mockResolvedValue(mockFiles as any);

      const backups = await updater.getAvailableBackups();

      expect(backups).toHaveLength(3);
      expect(backups[0]).toBe('ng_word_backup_2023-01-03T00-00-00-000Z.json');
      expect(backups[1]).toBe('ng_word_backup_2023-01-02T00-00-00-000Z.json');
      expect(backups[2]).toBe('ng_word_backup_2023-01-01T00-00-00-000Z.json');
    });
  });

  describe('cleanupOldBackups', () => {
    test('should cleanup old backups keeping specified count', async () => {
      const mockFiles = [
        'ng_word_backup_2023-01-05T00-00-00-000Z.json',
        'ng_word_backup_2023-01-04T00-00-00-000Z.json',
        'ng_word_backup_2023-01-03T00-00-00-000Z.json',
        'ng_word_backup_2023-01-02T00-00-00-000Z.json',
        'ng_word_backup_2023-01-01T00-00-00-000Z.json'
      ];
      
      mockFs.readdir.mockResolvedValue(mockFiles as any);

      await updater.cleanupOldBackups(3);

      expect(mockFs.unlink).toHaveBeenCalledTimes(2);
      expect(mockFs.unlink).toHaveBeenCalledWith(expect.stringContaining('2023-01-02T00-00-00-000Z.json'));
      expect(mockFs.unlink).toHaveBeenCalledWith(expect.stringContaining('2023-01-01T00-00-00-000Z.json'));
    });

    test('should not delete files when count is sufficient', async () => {
      const mockFiles = [
        'ng_word_backup_2023-01-01T00-00-00-000Z.json',
        'ng_word_backup_2023-01-02T00-00-00-000Z.json'
      ];
      
      mockFs.readdir.mockResolvedValue(mockFiles as any);

      await updater.cleanupOldBackups(5);

      expect(mockFs.unlink).not.toHaveBeenCalled();
    });

    test('should handle cleanup failure gracefully', async () => {
      const mockFiles = ['ng_word_backup_2023-01-01T00-00-00-000Z.json'];
      mockFs.readdir.mockResolvedValue(mockFiles as any);
      mockFs.unlink.mockRejectedValue(new Error('Delete failed'));

      await expect(updater.cleanupOldBackups(0)).rejects.toThrow('Delete failed');
    });
  });

  describe('needsUpdate (private method)', () => {
    test('should detect when update is needed', () => {
      const existing = testEntry;
      const newEntry = { ...testEntry, penalty: 0.9, note: 'Updated note' };

      // Access private method through prototype
      const needsUpdate = (updater as any).needsUpdate(existing, newEntry);

      expect(needsUpdate).toBe(true);
    });

    test('should detect when no update is needed', () => {
      const existing = testEntry;
      const newEntry = { ...testEntry };

      const needsUpdate = (updater as any).needsUpdate(existing, newEntry);

      expect(needsUpdate).toBe(false);
    });

    test('should detect changes in variants', () => {
      const existing = { ...testEntry, variants: ['variant1'] };
      const newEntry = { ...testEntry, variants: ['variant1', 'variant2'] };

      const needsUpdate = (updater as any).needsUpdate(existing, newEntry);

      expect(needsUpdate).toBe(true);
    });

    test('should detect enabled/disabled changes', () => {
      const existing = { ...testEntry, enabled: true };
      const newEntry = { ...testEntry, enabled: false };

      const needsUpdate = (updater as any).needsUpdate(existing, newEntry);

      expect(needsUpdate).toBe(true);
    });
  });
});