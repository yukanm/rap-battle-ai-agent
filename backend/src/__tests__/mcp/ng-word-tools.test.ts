import { ngWordManagementTool, contentAnalysisEnhancedTool } from '@/services/compliance/mcpTools';
import { NgWordDatabase } from '@/services/compliance/ngWordDatabase';
import { NgWordEntry } from '@/types/ngWord';

jest.mock('@/services/compliance/ngWordDatabase');
jest.mock('@/services/compliance/ngWordValidator');
jest.mock('@/services/compliance/ngWordUpdater');
jest.mock('@/services/compliance/forbiddenWordsManager');
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const MockNgWordDatabase = NgWordDatabase as jest.MockedClass<typeof NgWordDatabase>;

describe('MCP NG Word Tools', () => {
  let mockDatabase: jest.Mocked<NgWordDatabase>;
  
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
    
    mockDatabase = {
      loadDatabase: jest.fn().mockResolvedValue(undefined),
      addEntry: jest.fn().mockResolvedValue(undefined),
      updateEntry: jest.fn().mockResolvedValue(undefined),
      deleteEntry: jest.fn().mockResolvedValue(undefined),
      getEntryById: jest.fn().mockReturnValue(testEntry),
      getEntriesByCategory: jest.fn().mockReturnValue([testEntry]),
      searchEntries: jest.fn().mockReturnValue([testEntry]),
      validateDatabase: jest.fn().mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        summary: { totalChecked: 1, totalErrors: 0, totalWarnings: 0 }
      }),
      getStatistics: jest.fn().mockReturnValue({
        totalEntries: 100,
        categoryCounts: { '侮蔑表現': 50 },
        languageCounts: { ja: 60, en: 40, both: 0 },
        severityCounts: { critical: 10, high: 30, medium: 40, low: 20 },
        enabledCount: 95,
        disabledCount: 5
      }),
      getCategoryBreakdown: jest.fn().mockReturnValue({
        '侮蔑表現': {
          count: 50,
          averagePenalty: 0.6,
          severityDistribution: { critical: 5, high: 15, medium: 20, low: 10 }
        }
      }),
      database: {
        entries: [testEntry]
      }
    } as any;

    MockNgWordDatabase.mockImplementation(() => mockDatabase);

    // Mock NgWordValidator
    require('@/services/compliance/ngWordValidator').NgWordValidator = jest.fn().mockImplementation(() => ({
      validateEntry: jest.fn().mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
        summary: { totalChecked: 1, totalErrors: 0, totalWarnings: 0 }
      })
    }));

    // Mock NgWordUpdater
    require('@/services/compliance/ngWordUpdater').NgWordUpdater = jest.fn().mockImplementation(() => ({}));

    // Mock ForbiddenWordsManager
    require('@/services/compliance/forbiddenWordsManager').ForbiddenWordsManager = jest.fn().mockImplementation(() => ({
      isNgWordDatabaseAvailable: jest.fn().mockReturnValue(true),
      checkWithNewDatabase: jest.fn().mockResolvedValue({
        hasViolations: true,
        violations: [
          {
            term: 'テスト用語',
            entry: testEntry,
            matchType: 'exact',
            position: { start: 5, end: 9 }
          }
        ],
        totalPenalty: 0.8,
        suggestions: []
      }),
      getDetailedAnalysis: jest.fn().mockResolvedValue({
        hasViolations: true,
        violations: [
          {
            term: 'テスト用語',
            entry: testEntry,
            matchType: 'exact',
            position: { start: 5, end: 9 }
          }
        ],
        totalPenalty: 0.8,
        suggestions: [],
        categoryBreakdown: { '侮蔑表現': 1 },
        severityBreakdown: { 'high': 1 },
        languageBreakdown: { 'ja': 1 },
        processingTime: 10,
        contentLength: 20
      }),
      checkForbiddenWords: jest.fn().mockResolvedValue({
        safe: false,
        penalty: 0.8,
        reasons: ['Test violation']
      })
    }));
  });

  describe('ngWordManagementTool', () => {
    test('should handle add action successfully', async () => {
      const context = {
        action: 'add',
        data: {
          term: '新しい用語',
          category: '侮蔑表現',
          severity: 'medium',
          penalty: 0.6,
          language: 'ja'
        }
      };

      const result = await ngWordManagementTool.execute({ context });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Added new entry');
      expect(result.data).toBeDefined();
      expect(mockDatabase.addEntry).toHaveBeenCalled();
    });

    test('should handle add action with validation failure', async () => {
      // Mock validation failure
      require('@/services/compliance/ngWordValidator').NgWordValidator = jest.fn().mockImplementation(() => ({
        validateEntry: jest.fn().mockReturnValue({
          isValid: false,
          errors: [{ message: 'Invalid entry' }],
          warnings: [],
          summary: { totalChecked: 1, totalErrors: 1, totalWarnings: 0 }
        })
      }));

      const context = {
        action: 'add',
        data: {
          term: '',
          category: '侮蔑表現'
        }
      };

      const result = await ngWordManagementTool.execute({ context });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Validation failed');
      expect(result.details).toBeDefined();
    });

    test('should handle update action successfully', async () => {
      const context = {
        action: 'update',
        data: {
          id: 'test_1',
          severity: 'critical',
          penalty: 1.0,
          note: '更新されました'
        }
      };

      const result = await ngWordManagementTool.execute({ context });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Updated entry');
      expect(mockDatabase.updateEntry).toHaveBeenCalledWith('test_1', {
        severity: 'critical',
        penalty: 1.0,
        note: '更新されました',
        updatedAt: expect.any(String)
      });
    });

    test('should handle delete action successfully', async () => {
      const context = {
        action: 'delete',
        data: {
          id: 'test_1'
        }
      };

      const result = await ngWordManagementTool.execute({ context });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Deleted entry');
      expect(mockDatabase.deleteEntry).toHaveBeenCalledWith('test_1');
    });

    test('should handle search action with filters', async () => {
      const context = {
        action: 'search',
        data: {
          query: 'テスト'
        },
        options: {
          category: '侮蔑表現',
          severity: 'high',
          limit: 10,
          offset: 0
        }
      };

      const result = await ngWordManagementTool.execute({ context });

      expect(result.success).toBe(true);
      expect(result.data.entries).toBeDefined();
      expect(result.data.total).toBeDefined();
      expect(mockDatabase.searchEntries).toHaveBeenCalledWith('テスト');
    });

    test('should handle get action successfully', async () => {
      const context = {
        action: 'get',
        data: {
          id: 'test_1'
        }
      };

      const result = await ngWordManagementTool.execute({ context });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(testEntry);
      expect(mockDatabase.getEntryById).toHaveBeenCalledWith('test_1');
    });

    test('should handle get action with non-existent entry', async () => {
      mockDatabase.getEntryById.mockReturnValue(null);

      const context = {
        action: 'get',
        data: {
          id: 'non_existent'
        }
      };

      const result = await ngWordManagementTool.execute({ context });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Entry not found');
    });

    test('should handle list action with pagination', async () => {
      const context = {
        action: 'list',
        options: {
          category: '侮蔑表現',
          limit: 5,
          offset: 0
        }
      };

      const result = await ngWordManagementTool.execute({ context });

      expect(result.success).toBe(true);
      expect(result.data.entries).toBeDefined();
      expect(result.data.total).toBeDefined();
      expect(result.data.limit).toBe(5);
      expect(result.data.offset).toBe(0);
    });

    test('should handle validate action for single entry', async () => {
      const context = {
        action: 'validate',
        data: {
          entry: testEntry
        }
      };

      const result = await ngWordManagementTool.execute({ context });

      expect(result.success).toBe(true);
      expect(result.data.isValid).toBe(true);
    });

    test('should handle validate action for entire database', async () => {
      const context = {
        action: 'validate'
      };

      const result = await ngWordManagementTool.execute({ context });

      expect(result.success).toBe(true);
      expect(result.data.isValid).toBe(true);
      expect(mockDatabase.validateDatabase).toHaveBeenCalled();
    });

    test('should handle statistics action', async () => {
      const context = {
        action: 'statistics'
      };

      const result = await ngWordManagementTool.execute({ context });

      expect(result.success).toBe(true);
      expect(result.data.statistics).toBeDefined();
      expect(result.data.categoryBreakdown).toBeDefined();
      expect(mockDatabase.getStatistics).toHaveBeenCalled();
      expect(mockDatabase.getCategoryBreakdown).toHaveBeenCalled();
    });

    test('should handle missing required data for add action', async () => {
      const context = {
        action: 'add',
        data: {}
      };

      const result = await ngWordManagementTool.execute({ context });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required fields');
    });

    test('should handle unknown action', async () => {
      const context = {
        action: 'unknown_action'
      };

      const result = await ngWordManagementTool.execute({ context });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });

    test('should handle tool execution errors', async () => {
      mockDatabase.addEntry.mockRejectedValue(new Error('Database error'));

      const context = {
        action: 'add',
        data: {
          term: '新しい用語',
          category: '侮蔑表現'
        }
      };

      const result = await ngWordManagementTool.execute({ context });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');
    });
  });

  describe('contentAnalysisEnhancedTool', () => {
    test('should handle basic analysis successfully', async () => {
      const context = {
        content: 'この文章にはテスト用語が含まれています',
        analysisType: 'basic',
        options: {
          includeRecommendations: true
        }
      };

      const result = await contentAnalysisEnhancedTool.execute({ context });

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.analysis).toBeDefined();
      expect(result.processingTime).toBeGreaterThan(0);
      expect(result.timestamp).toBeDefined();
    });

    test('should handle detailed analysis successfully', async () => {
      const context = {
        content: 'この文章にはテスト用語が含まれています',
        analysisType: 'detailed',
        options: {
          contextAnalysis: true,
          emotionAnalysis: true
        }
      };

      const result = await contentAnalysisEnhancedTool.execute({ context });

      expect(result.success).toBe(true);
      expect(result.analysis).toBeDefined();
      expect(result.breakdown).toBeDefined();
      expect(result.breakdown.categories).toBeDefined();
      expect(result.breakdown.severities).toBeDefined();
      expect(result.breakdown.languages).toBeDefined();
      expect(result.context).toBeDefined();
      expect(result.emotion).toBeDefined();
    });

    test('should handle realtime analysis successfully', async () => {
      const context = {
        content: 'この文章にはテスト用語が含まれています',
        analysisType: 'realtime',
        options: {
          performanceMode: 'fast'
        }
      };

      const result = await contentAnalysisEnhancedTool.execute({ context });

      expect(result.success).toBe(true);
      expect(result.realtime).toBe(true);
      expect(result.analysis.hasViolations).toBeDefined();
      expect(result.analysis.violationCount).toBeDefined();
      expect(result.analysis.totalPenalty).toBeDefined();
      expect(result.processingTime).toBeGreaterThan(0);
    });

    test('should handle detailed analysis without NgWordDatabase', async () => {
      // Mock ForbiddenWordsManager to return false for database availability
      require('@/services/compliance/forbiddenWordsManager').ForbiddenWordsManager = jest.fn().mockImplementation(() => ({
        isNgWordDatabaseAvailable: jest.fn().mockReturnValue(false)
      }));

      const context = {
        content: 'test content',
        analysisType: 'detailed'
      };

      const result = await contentAnalysisEnhancedTool.execute({ context });

      expect(result.success).toBe(false);
      expect(result.error).toContain('requires NgWordDatabase');
    });

    test('should handle empty content', async () => {
      const context = {
        content: '',
        analysisType: 'basic'
      };

      const result = await contentAnalysisEnhancedTool.execute({ context });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Content is required');
    });

    test('should handle category filtering', async () => {
      const context = {
        content: 'この文章にはテスト用語が含まれています',
        analysisType: 'detailed',
        options: {
          categories: ['差別表現']
        }
      };

      const result = await contentAnalysisEnhancedTool.execute({ context });

      expect(result.success).toBe(true);
      // Since our test entry is '侮蔑表現' and we filtered for '差別表現',
      // violations should be filtered out
    });

    test('should handle severity threshold filtering', async () => {
      const context = {
        content: 'この文章にはテスト用語が含まれています',
        analysisType: 'basic',
        options: {
          severityThreshold: 'critical'
        }
      };

      const result = await contentAnalysisEnhancedTool.execute({ context });

      expect(result.success).toBe(true);
      // Since our test entry is 'high' severity and threshold is 'critical',
      // violations should be filtered out
    });

    test('should handle fallback to legacy system', async () => {
      // Mock ForbiddenWordsManager to return false for database availability
      require('@/services/compliance/forbiddenWordsManager').ForbiddenWordsManager = jest.fn().mockImplementation(() => ({
        isNgWordDatabaseAvailable: jest.fn().mockReturnValue(false),
        checkForbiddenWords: jest.fn().mockResolvedValue({
          safe: false,
          penalty: 0.5,
          reasons: ['Legacy violation']
        })
      }));

      const context = {
        content: 'test content',
        analysisType: 'basic'
      };

      const result = await contentAnalysisEnhancedTool.execute({ context });

      expect(result.success).toBe(true);
      expect(result.analysis.hasViolations).toBe(true);
      expect(result.analysis.totalPenalty).toBe(0.5);
      expect(result.analysis.suggestions).toContain('Legacy violation');
    });

    test('should handle unknown analysis type', async () => {
      const context = {
        content: 'test content',
        analysisType: 'unknown_type'
      };

      const result = await contentAnalysisEnhancedTool.execute({ context });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown analysis type');
    });

    test('should handle tool execution errors', async () => {
      // Mock to throw error
      require('@/services/compliance/forbiddenWordsManager').ForbiddenWordsManager = jest.fn().mockImplementation(() => ({
        isNgWordDatabaseAvailable: jest.fn().mockImplementation(() => {
          throw new Error('Manager error');
        })
      }));

      const context = {
        content: 'test content',
        analysisType: 'basic'
      };

      const result = await contentAnalysisEnhancedTool.execute({ context });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Manager error');
    });

    test('should analyze character distribution correctly', () => {
      const tool = contentAnalysisEnhancedTool as any;
      const content = 'こんにちはHello123!';
      
      const distribution = tool.analyzeCharacterDistribution(content);

      expect(distribution.hiragana).toBeGreaterThan(0);
      expect(distribution.english).toBeGreaterThan(0);
      expect(distribution.numbers).toBeGreaterThan(0);
      expect(distribution.symbols).toBeGreaterThan(0);
    });

    test('should analyze context correctly', () => {
      const tool = contentAnalysisEnhancedTool as any;
      const content = 'これは最初の文です。これは二番目の文です！';
      
      const context = tool.analyzeContext(content);

      expect(context.sentenceCount).toBe(2);
      expect(context.averageSentenceLength).toBeGreaterThan(0);
      expect(context.complexity).toBeDefined();
      expect(context.topics).toBeDefined();
    });

    test('should analyze emotion correctly', () => {
      const tool = contentAnalysisEnhancedTool as any;
      const content = '嬉しい気持ちです';
      
      const emotion = tool.analyzeEmotion(content);

      expect(emotion.scores).toBeDefined();
      expect(emotion.dominant).toBeDefined();
      expect(emotion.confidence).toBeGreaterThanOrEqual(0);
    });

    test('should get highest severity correctly', () => {
      const tool = contentAnalysisEnhancedTool as any;
      const violations = [
        { entry: { severity: 'low' } },
        { entry: { severity: 'critical' } },
        { entry: { severity: 'medium' } }
      ];
      
      const highest = tool.getHighestSeverity(violations);

      expect(highest).toBe('critical');
    });

    test('should return null for highest severity with empty violations', () => {
      const tool = contentAnalysisEnhancedTool as any;
      const highest = tool.getHighestSeverity([]);

      expect(highest).toBeNull();
    });
  });

  describe('MCP Tool Integration', () => {
    test('should have correct tool configurations', () => {
      expect(ngWordManagementTool.id).toBe('ng-word-management');
      expect(ngWordManagementTool.description).toContain('NGワードデータベースの管理・更新ツール');
      expect(ngWordManagementTool.inputSchema).toBeDefined();

      expect(contentAnalysisEnhancedTool.id).toBe('content-analysis-enhanced');
      expect(contentAnalysisEnhancedTool.description).toContain('拡張コンテンツ分析ツール');
      expect(contentAnalysisEnhancedTool.inputSchema).toBeDefined();
    });

    test('should validate input schemas', () => {
      // Test ngWordManagementTool schema
      const validNgWordInput = {
        action: 'add',
        data: { term: 'test', category: 'test' },
        options: { severity: 'high' }
      };

      expect(() => ngWordManagementTool.inputSchema.parse(validNgWordInput)).not.toThrow();

      // Test contentAnalysisEnhancedTool schema
      const validAnalysisInput = {
        content: 'test content',
        analysisType: 'basic',
        options: { includeRecommendations: true }
      };

      expect(() => contentAnalysisEnhancedTool.inputSchema.parse(validAnalysisInput)).not.toThrow();
    });
  });
});