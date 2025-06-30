import { createTool } from '@mastra/core';
import { z } from 'zod';
import { NgWordDatabase } from './ngWordDatabase';
import { NgWordValidator } from './ngWordValidator';
import { NgWordUpdater } from './ngWordUpdater';
import { ForbiddenWordsManager } from './forbiddenWordsManager';
import { NgWordEntry } from '@/types/ngWord';
import { logger } from '@/utils/logger';

// Initialize global instances
let ngWordDatabase: NgWordDatabase | null = null;
let ngWordValidator: NgWordValidator | null = null;
let ngWordUpdater: NgWordUpdater | null = null;
let forbiddenWordsManager: ForbiddenWordsManager | null = null;

async function initializeComponents() {
  if (!ngWordDatabase) {
    ngWordDatabase = new NgWordDatabase();
    await ngWordDatabase.loadDatabase();
  }
  
  if (!ngWordValidator) {
    ngWordValidator = new NgWordValidator();
  }
  
  if (!ngWordUpdater && ngWordDatabase) {
    ngWordUpdater = new NgWordUpdater(ngWordDatabase);
  }
  
  if (!forbiddenWordsManager) {
    forbiddenWordsManager = new ForbiddenWordsManager();
  }
}

export const ngWordManagementTool = createTool({
  id: "ng-word-management",
  description: "NGワードデータベースの管理・更新ツール。NGワードの追加、更新、削除、検索、検証機能を提供します。",
  inputSchema: z.object({
    action: z.enum(['add', 'update', 'delete', 'search', 'validate', 'get', 'list', 'statistics']),
    data: z.any().optional(),
    options: z.object({
      category: z.string().optional(),
      severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
      language: z.enum(['ja', 'en', 'both']).optional(),
      enabled: z.boolean().optional(),
      limit: z.number().optional(),
      offset: z.number().optional()
    }).optional()
  }),
  execute: async ({ context }: { context: any }) => {
    try {
      await initializeComponents();
      
      const { action, data, options = {} } = context;
      
      logger.info(`Executing ng-word-management action: ${action}`);

      switch (action) {
        case 'add': {
          if (!data || !data.term || !data.category) {
            throw new Error('Missing required fields: term and category are required for add action');
          }

          const newEntry: NgWordEntry = {
            id: data.id || `entry_${Date.now()}`,
            category: data.category,
            subcategory: data.subcategory,
            term: data.term,
            variants: data.variants || [],
            severity: data.severity || 'medium',
            penalty: data.penalty || 0.5,
            language: data.language || 'ja',
            context: data.context,
            recommendation: data.recommendation,
            note: data.note,
            regex: data.regex,
            enabled: data.enabled !== undefined ? data.enabled : true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            source: data.source || 'mcp_tool'
          };

          // Validate entry
          const validationResult = ngWordValidator!.validateEntry(newEntry);
          if (!validationResult.isValid) {
            return {
              success: false,
              error: 'Validation failed',
              details: validationResult.errors
            };
          }

          await ngWordDatabase!.addEntry(newEntry);
          
          return {
            success: true,
            message: `Added new entry: ${newEntry.term}`,
            data: newEntry
          };
        }

        case 'update': {
          if (!data || !data.id) {
            throw new Error('Entry ID is required for update action');
          }

          const updates = { ...data };
          delete updates.id; // Remove ID from updates
          updates.updatedAt = new Date().toISOString();

          await ngWordDatabase!.updateEntry(data.id, updates);
          const updatedEntry = ngWordDatabase!.getEntryById(data.id);

          return {
            success: true,
            message: `Updated entry: ${data.id}`,
            data: updatedEntry
          };
        }

        case 'delete': {
          if (!data || !data.id) {
            throw new Error('Entry ID is required for delete action');
          }

          await ngWordDatabase!.deleteEntry(data.id);
          
          return {
            success: true,
            message: `Deleted entry: ${data.id}`
          };
        }

        case 'search': {
          if (!data || !data.query) {
            throw new Error('Search query is required for search action');
          }

          const results = ngWordDatabase!.searchEntries(data.query);
          
          // Apply filters
          let filteredResults = results;
          if (options.category) {
            filteredResults = filteredResults.filter(e => e.category === options.category);
          }
          if (options.severity) {
            filteredResults = filteredResults.filter(e => e.severity === options.severity);
          }
          if (options.language) {
            filteredResults = filteredResults.filter(e => e.language === options.language);
          }
          if (options.enabled !== undefined) {
            filteredResults = filteredResults.filter(e => e.enabled === options.enabled);
          }

          // Apply pagination
          const offset = options.offset || 0;
          const limit = options.limit || 50;
          const paginatedResults = filteredResults.slice(offset, offset + limit);

          return {
            success: true,
            data: {
              entries: paginatedResults,
              total: filteredResults.length,
              offset,
              limit
            }
          };
        }

        case 'get': {
          if (!data || !data.id) {
            throw new Error('Entry ID is required for get action');
          }

          const entry = ngWordDatabase!.getEntryById(data.id);
          if (!entry) {
            return {
              success: false,
              error: `Entry not found: ${data.id}`
            };
          }

          return {
            success: true,
            data: entry
          };
        }

        case 'list': {
          let entries: NgWordEntry[] = [];
          
          if (options.category) {
            entries = ngWordDatabase!.getEntriesByCategory(options.category);
          } else {
            // Get all entries
            entries = ngWordDatabase!['database']?.entries || [];
          }

          // Apply filters
          if (options.severity) {
            entries = entries.filter(e => e.severity === options.severity);
          }
          if (options.language) {
            entries = entries.filter(e => e.language === options.language);
          }
          if (options.enabled !== undefined) {
            entries = entries.filter(e => e.enabled === options.enabled);
          }

          // Apply pagination
          const offset = options.offset || 0;
          const limit = options.limit || 50;
          const paginatedEntries = entries.slice(offset, offset + limit);

          return {
            success: true,
            data: {
              entries: paginatedEntries,
              total: entries.length,
              offset,
              limit
            }
          };
        }

        case 'validate': {
          let validationResult;
          
          if (data && data.entry) {
            // Validate single entry
            validationResult = ngWordValidator!.validateEntry(data.entry);
          } else {
            // Validate entire database
            validationResult = await ngWordDatabase!.validateDatabase();
          }

          return {
            success: true,
            data: validationResult
          };
        }

        case 'statistics': {
          const stats = ngWordDatabase!.getStatistics();
          const categoryBreakdown = ngWordDatabase!.getCategoryBreakdown();

          return {
            success: true,
            data: {
              statistics: stats,
              categoryBreakdown
            }
          };
        }

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      logger.error('Error in ng-word-management tool:', error);
      return {
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      };
    }
  }
});

export const contentAnalysisEnhancedTool = createTool({
  id: "content-analysis-enhanced", 
  description: "拡張コンテンツ分析ツール。NGワードチェック、詳細分析、リアルタイム分析、感情分析機能を提供します。",
  inputSchema: z.object({
    content: z.string(),
    analysisType: z.enum(['basic', 'detailed', 'realtime']),
    options: z.object({
      includeRecommendations: z.boolean().optional(),
      contextAnalysis: z.boolean().optional(),
      emotionAnalysis: z.boolean().optional(),
      performanceMode: z.enum(['fast', 'thorough']).optional(),
      categories: z.array(z.string()).optional(),
      severityThreshold: z.enum(['critical', 'high', 'medium', 'low']).optional()
    }).optional()
  }),
  execute: async ({ context }: { context: any }) => {
    try {
      await initializeComponents();
      
      const { content, analysisType, options = {} } = context;
      
      logger.info(`Executing content-analysis-enhanced: ${analysisType}`);

      if (!content || content.trim().length === 0) {
        return {
          success: false,
          error: 'Content is required and cannot be empty'
        };
      }

      const startTime = Date.now();

      switch (analysisType) {
        case 'basic': {
          let result;
          
          if (forbiddenWordsManager!.isNgWordDatabaseAvailable()) {
            result = await forbiddenWordsManager!.checkWithNewDatabase(content);
          } else {
            const legacyResult = await forbiddenWordsManager!.checkForbiddenWords(content);
            result = {
              hasViolations: !legacyResult.safe,
              violations: [],
              totalPenalty: legacyResult.penalty,
              suggestions: legacyResult.reasons
            };
          }

          // Apply severity threshold filter
          if (options.severityThreshold && result.violations) {
            const severityOrder: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };
            const threshold = severityOrder[options.severityThreshold];
            
            result.violations = result.violations.filter(v => 
              severityOrder[v.entry.severity] >= threshold
            );
            result.hasViolations = result.violations.length > 0;
          }

          const analysisResult = {
            success: true,
            content: {
              length: content.length,
              wordCount: content.split(/\s+/).length,
              lineCount: content.split('\n').length
            },
            analysis: result,
            processingTime: Date.now() - startTime,
            timestamp: new Date().toISOString()
          };

          if (options.includeRecommendations && result.suggestions) {
            (analysisResult.analysis as any).recommendations = result.suggestions;
          }

          return analysisResult;
        }

        case 'detailed': {
          if (!forbiddenWordsManager!.isNgWordDatabaseAvailable()) {
            throw new Error('Detailed analysis requires NgWordDatabase');
          }

          const detailedResult = await forbiddenWordsManager!.getDetailedAnalysis(content);

          // Apply category filter
          if (options.categories && options.categories.length > 0) {
            detailedResult.violations = detailedResult.violations.filter(v =>
              options.categories!.includes(v.entry.category)
            );
            detailedResult.hasViolations = detailedResult.violations.length > 0;
          }

          const analysisResult = {
            success: true,
            content: {
              length: content.length,
              wordCount: content.split(/\s+/).length,
              lineCount: content.split('\n').length,
              characterDistribution: analyzeCharacterDistribution(content)
            },
            analysis: detailedResult,
            breakdown: {
              categories: detailedResult.categoryBreakdown,
              severities: detailedResult.severityBreakdown,
              languages: detailedResult.languageBreakdown
            },
            processingTime: Date.now() - startTime,
            timestamp: new Date().toISOString()
          };

          if (options.contextAnalysis) {
            (analysisResult as any).context = analyzeContext(content);
          }

          if (options.emotionAnalysis) {
            (analysisResult as any).emotion = analyzeEmotion(content);
          }

          return analysisResult;
        }

        case 'realtime': {
          // Optimized for real-time analysis
          const fastMode = options.performanceMode === 'fast';
          
          let result;
          if (forbiddenWordsManager!.isNgWordDatabaseAvailable()) {
            result = await forbiddenWordsManager!.checkWithNewDatabase(content);
          } else {
            const legacyResult = await forbiddenWordsManager!.checkForbiddenWords(content);
            result = {
              hasViolations: !legacyResult.safe,
              violations: [],
              totalPenalty: legacyResult.penalty,
              suggestions: legacyResult.reasons
            };
          }

          const analysisResult = {
            success: true,
            realtime: true,
            content: {
              length: content.length,
              riskScore: result.totalPenalty
            },
            analysis: {
              hasViolations: result.hasViolations,
              violationCount: result.violations?.length || 0,
              totalPenalty: result.totalPenalty,
              highestSeverity: getHighestSeverity((result as any).violations || [])
            },
            processingTime: Date.now() - startTime,
            timestamp: new Date().toISOString()
          };

          if (!fastMode && (result as any).violations) {
            (analysisResult.analysis as any).violations = (result as any).violations.slice(0, 10); // Limit for performance
          }

          return analysisResult;
        }

        default:
          throw new Error(`Unknown analysis type: ${analysisType}`);
      }
    } catch (error) {
      logger.error('Error in content-analysis-enhanced tool:', error);
      return {
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      };
    }
  }
});

// Helper functions
function analyzeCharacterDistribution(content: string) {
  const distribution = {
    hiragana: 0,
    katakana: 0,
    kanji: 0,
    english: 0,
    numbers: 0,
    symbols: 0,
    spaces: 0
  };

  for (const char of content) {
    if (/[\u3040-\u309F]/.test(char)) {
      distribution.hiragana++;
    } else if (/[\u30A0-\u30FF]/.test(char)) {
      distribution.katakana++;
    } else if (/[\u4E00-\u9FAF]/.test(char)) {
      distribution.kanji++;
    } else if (/[a-zA-Z]/.test(char)) {
      distribution.english++;
    } else if (/[0-9]/.test(char)) {
      distribution.numbers++;
    } else if (/\s/.test(char)) {
      distribution.spaces++;
    } else {
      distribution.symbols++;
    }
  }

  return distribution;
}

function analyzeContext(content: string) {
  // Simple context analysis
  const sentences = content.split(/[。！？]/).filter(s => s.trim().length > 0);
  const avgSentenceLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;
  
  return {
    sentenceCount: sentences.length,
    averageSentenceLength: Math.round(avgSentenceLength),
    complexity: avgSentenceLength > 30 ? 'high' : avgSentenceLength > 15 ? 'medium' : 'low',
    topics: extractTopics(content)
  };
}

function analyzeEmotion(content: string) {
  // Simple emotion analysis based on keywords
  const emotionKeywords = {
    positive: ['嬉しい', '楽しい', '良い', 'good', 'great', 'awesome', 'happy'],
    negative: ['悲しい', '怒り', '嫌', 'bad', 'terrible', 'angry', 'sad'],
    neutral: ['普通', '同じ', 'normal', 'okay', 'fine']
  };

  const scores = { positive: 0, negative: 0, neutral: 0 };
  const lowerContent = content.toLowerCase();

  for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
    for (const keyword of keywords) {
      const matches = (lowerContent.match(new RegExp(keyword, 'g')) || []).length;
      (scores as any)[emotion] += matches;
    }
  }

  const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
  const dominant = totalScore > 0 ? 
    Object.keys(scores).reduce((a, b) => (scores as any)[a] > (scores as any)[b] ? a : b) : 
    'neutral';

  return {
    scores,
    dominant,
    confidence: totalScore > 0 ? Math.max(...Object.values(scores)) / totalScore : 0
  };
}

function extractTopics(content: string) {
  // Simple topic extraction based on common words
  const topicKeywords = {
    'music': ['音楽', 'ラップ', 'バトル', 'music', 'rap', 'battle', 'song'],
    'technology': ['技術', 'AI', 'コンピュータ', 'technology', 'computer', 'software'],
    'sports': ['スポーツ', '試合', '競技', 'sports', 'game', 'competition'],
    'entertainment': ['エンタメ', '映画', 'アニメ', 'entertainment', 'movie', 'anime']
  };

  const detectedTopics = [];
  const lowerContent = content.toLowerCase();

  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    const score = keywords.reduce((sum, keyword) => {
      return sum + (lowerContent.match(new RegExp(keyword, 'g')) || []).length;
    }, 0);
    
    if (score > 0) {
      detectedTopics.push({ topic, score });
    }
  }

  return detectedTopics.sort((a, b) => b.score - a.score);
}

function getHighestSeverity(violations: any[]) {
  if (violations.length === 0) return null;
  
  const severityOrder: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };
  return violations.reduce((highest, violation) => {
    const currentSeverity = violation.entry.severity;
    return severityOrder[currentSeverity] > severityOrder[highest] ? currentSeverity : highest;
  }, 'low');
}