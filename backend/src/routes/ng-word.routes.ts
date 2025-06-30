import { Router, Request, Response } from 'express';
import { NgWordDatabase } from '@/services/compliance/ngWordDatabase';
import { NgWordValidator } from '@/services/compliance/ngWordValidator';
import { NgWordUpdater } from '@/services/compliance/ngWordUpdater';
import { ForbiddenWordsManager } from '@/services/compliance/forbiddenWordsManager';
import { NgWordEntry } from '@/types/ngWord';
import { logger } from '@/utils/logger';
import 'express-async-errors';

const router = Router();

// Initialize services
let ngWordDatabase: NgWordDatabase;
let ngWordValidator: NgWordValidator;
let ngWordUpdater: NgWordUpdater;
let forbiddenWordsManager: ForbiddenWordsManager;

// Initialize services on first request
const initializeServices = async () => {
  if (!ngWordDatabase) {
    ngWordDatabase = new NgWordDatabase();
    await ngWordDatabase.loadDatabase();
  }
  
  if (!ngWordValidator) {
    ngWordValidator = new NgWordValidator();
  }
  
  if (!ngWordUpdater) {
    ngWordUpdater = new NgWordUpdater(ngWordDatabase);
  }
  
  if (!forbiddenWordsManager) {
    forbiddenWordsManager = new ForbiddenWordsManager();
  }
};

// Middleware to ensure services are initialized
const ensureInitialized = async (_req: Request, res: Response, next: Function) => {
  try {
    await initializeServices();
    next();
  } catch (error) {
    logger.error('Failed to initialize NG word services:', error);
    res.status(500).json({
      success: false,
      error: 'Service initialization failed',
      timestamp: new Date().toISOString()
    });
  }
};

// Helper function for error responses
const errorResponse = (res: Response, error: any, statusCode: number = 500) => {
  logger.error('NG word API error:', error);
  res.status(statusCode).json({
    success: false,
    error: error.message || 'Internal server error',
    timestamp: new Date().toISOString()
  });
};

// Helper function for success responses
const successResponse = (res: Response, data: any, message?: string) => {
  res.json({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  });
};

// Validation middleware for NgWordEntry
const validateNgWordEntry = (req: Request, res: Response, next: Function) => {
  const { term, category } = req.body;
  
  if (!term || typeof term !== 'string' || term.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Term is required and must be a non-empty string',
      timestamp: new Date().toISOString()
    });
  }
  
  if (!category || typeof category !== 'string' || category.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Category is required and must be a non-empty string',
      timestamp: new Date().toISOString()
    });
  }
  
  return next();
};

// GET /api/ng-words - NGワード一覧取得
router.get('/', ensureInitialized, async (req: Request, res: Response) => {
  try {
    const {
      category,
      severity,
      language,
      enabled,
      search,
      page = '1',
      limit = '50',
      sortBy = 'updatedAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    let entries: NgWordEntry[] = [];

    // Get entries based on filters
    if (search) {
      entries = ngWordDatabase.searchEntries(search as string);
    } else if (category) {
      entries = ngWordDatabase.getEntriesByCategory(category as string);
    } else {
      // Get all entries
      entries = ngWordDatabase['database']?.entries || [];
    }

    // Apply additional filters
    if (severity) {
      entries = entries.filter(e => e.severity === severity);
    }
    if (language) {
      entries = entries.filter(e => e.language === language);
    }
    if (enabled !== undefined) {
      const isEnabled = enabled === 'true';
      entries = entries.filter(e => e.enabled === isEnabled);
    }

    // Sort entries
    entries.sort((a, b) => {
      let aValue: any = a[sortBy as keyof NgWordEntry];
      let bValue: any = b[sortBy as keyof NgWordEntry];
      
      // Handle date sorting
      if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }
      
      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });

    // Apply pagination
    const totalEntries = entries.length;
    const paginatedEntries = entries.slice(offset, offset + limitNum);

    successResponse(res, {
      entries: paginatedEntries,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalEntries,
        totalPages: Math.ceil(totalEntries / limitNum),
        hasNext: offset + limitNum < totalEntries,
        hasPrev: pageNum > 1
      }
    });
  } catch (error) {
    errorResponse(res, error);
  }
});

// GET /api/ng-words/:id - 特定のNGワード取得
router.get('/:id', ensureInitialized, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const entry = ngWordDatabase.getEntryById(id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        error: `Entry not found: ${id}`,
        timestamp: new Date().toISOString()
      });
    }

    return successResponse(res, entry);
  } catch (error) {
    return errorResponse(res, error as Error);
  }
});

// POST /api/ng-words - NGワード追加
router.post('/', ensureInitialized, validateNgWordEntry, async (req: Request, res: Response) => {
  try {
    const {
      term,
      category,
      subcategory,
      variants,
      severity = 'medium',
      penalty,
      language = 'ja',
      context,
      recommendation,
      note,
      regex,
      enabled = true,
      source = 'api'
    } = req.body;

    // Calculate penalty if not provided
    const calculatedPenalty = penalty || (() => {
      switch (severity) {
        case 'critical': return 1.0;
        case 'high': return 0.8;
        case 'medium': return 0.6;
        default: return 0.4;
      }
    })();

    const newEntry: NgWordEntry = {
      id: `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      category,
      subcategory,
      term: term.trim(),
      variants,
      severity,
      penalty: calculatedPenalty,
      language,
      context,
      recommendation,
      note,
      regex,
      enabled,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source
    };

    // Validate entry
    const validationResult = ngWordValidator.validateEntry(newEntry);
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: {
          errors: validationResult.errors,
          warnings: validationResult.warnings
        },
        timestamp: new Date().toISOString()
      });
    }

    await ngWordDatabase.addEntry(newEntry);

    return successResponse(res, newEntry, `Successfully added entry: ${term}`);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes('already exists')) {
      return errorResponse(res, err, 409);
    } else {
      return errorResponse(res, err);
    }
  }
});

// PUT /api/ng-words/:id - NGワード更新
router.put('/:id', ensureInitialized, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    
    // Remove read-only fields
    delete updates.id;
    delete updates.createdAt;
    
    // Set updated timestamp
    updates.updatedAt = new Date().toISOString();

    // Validate that entry exists
    const existingEntry = ngWordDatabase.getEntryById(id);
    if (!existingEntry) {
      return res.status(404).json({
        success: false,
        error: `Entry not found: ${id}`,
        timestamp: new Date().toISOString()
      });
    }

    // Validate updated entry
    const updatedEntry = { ...existingEntry, ...updates };
    const validationResult = ngWordValidator.validateEntry(updatedEntry);
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: {
          errors: validationResult.errors,
          warnings: validationResult.warnings
        },
        timestamp: new Date().toISOString()
      });
    }

    await ngWordDatabase.updateEntry(id, updates);
    const finalEntry = ngWordDatabase.getEntryById(id);

    return successResponse(res, finalEntry, `Successfully updated entry: ${id}`);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes('not found')) {
      return errorResponse(res, err, 404);
    } else {
      return errorResponse(res, err);
    }
  }
});

// DELETE /api/ng-words/:id - NGワード削除
router.delete('/:id', ensureInitialized, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate that entry exists
    const existingEntry = ngWordDatabase.getEntryById(id);
    if (!existingEntry) {
      return res.status(404).json({
        success: false,
        error: `Entry not found: ${id}`,
        timestamp: new Date().toISOString()
      });
    }

    await ngWordDatabase.deleteEntry(id);

    return successResponse(res, null, `Successfully deleted entry: ${id}`);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes('not found')) {
      return errorResponse(res, err, 404);
    } else {
      return errorResponse(res, err);
    }
  }
});

// GET /api/ng-words/categories - カテゴリ一覧
router.get('/meta/categories', ensureInitialized, async (_req: Request, res: Response) => {
  try {
    const stats = ngWordDatabase.getStatistics();
    const categoryBreakdown = ngWordDatabase.getCategoryBreakdown();

    const categories = Object.keys(categoryBreakdown).map(category => ({
      name: category,
      count: categoryBreakdown[category].count,
      averagePenalty: categoryBreakdown[category].averagePenalty,
      severityDistribution: categoryBreakdown[category].severityDistribution
    }));

    successResponse(res, {
      categories,
      totalCategories: categories.length,
      totalEntries: stats.totalEntries
    });
  } catch (error) {
    return errorResponse(res, error as Error);
  }
});

// POST /api/ng-words/validate - データベース検証
router.post('/validate', ensureInitialized, async (req: Request, res: Response) => {
  try {
    const { entry, full = false } = req.body;

    let validationResult;

    if (entry) {
      // Validate single entry
      validationResult = ngWordValidator.validateEntry(entry);
    } else if (full) {
      // Validate entire database
      validationResult = await ngWordDatabase.validateDatabase();
    } else {
      return res.status(400).json({
        success: false,
        error: 'Either entry or full validation must be specified',
        timestamp: new Date().toISOString()
      });
    }

    return successResponse(res, validationResult);
  } catch (error) {
    return errorResponse(res, error as Error);
  }
});

// POST /api/ng-words/import - 一括インポート
router.post('/import', ensureInitialized, async (req: Request, res: Response) => {
  try {
    const { entries, source = 'import' } = req.body;

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Entries array is required and must not be empty',
        timestamp: new Date().toISOString()
      });
    }

    // Validate all entries first
    const validationErrors: any[] = [];
    const validEntries: NgWordEntry[] = [];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      
      // Ensure required fields and set defaults
      const processedEntry: NgWordEntry = {
        id: entry.id || `import_${Date.now()}_${i}`,
        category: entry.category,
        subcategory: entry.subcategory,
        term: entry.term,
        variants: entry.variants,
        severity: entry.severity || 'medium',
        penalty: entry.penalty || 0.5,
        language: entry.language || 'ja',
        context: entry.context,
        recommendation: entry.recommendation,
        note: entry.note,
        regex: entry.regex,
        enabled: entry.enabled !== undefined ? entry.enabled : true,
        createdAt: entry.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: entry.source || source
      };

      const validationResult = ngWordValidator.validateEntry(processedEntry);
      if (!validationResult.isValid) {
        validationErrors.push({
          index: i,
          entry: entry,
          errors: validationResult.errors
        });
      } else {
        validEntries.push(processedEntry);
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed for some entries',
        details: {
          validationErrors,
          validCount: validEntries.length,
          totalCount: entries.length
        },
        timestamp: new Date().toISOString()
      });
    }

    // Import all valid entries
    await ngWordDatabase.addMultipleEntries(validEntries);

    successResponse(res, {
      importedCount: validEntries.length,
      totalCount: entries.length
    }, `Successfully imported ${validEntries.length} entries`);
  } catch (error) {
    return errorResponse(res, error as Error);
  }
});

// GET /api/ng-words/export - 一括エクスポート
router.get('/export', ensureInitialized, async (req: Request, res: Response) => {
  try {
    const { format = 'json', category, enabled } = req.query;

    let entries: NgWordEntry[] = ngWordDatabase['database']?.entries || [];

    // Apply filters
    if (category) {
      entries = entries.filter(e => e.category === category);
    }
    if (enabled !== undefined) {
      const isEnabled = enabled === 'true';
      entries = entries.filter(e => e.enabled === isEnabled);
    }

    if (format === 'csv') {
      // Export as CSV
      const csvHeader = 'id,category,subcategory,term,variants,severity,penalty,language,context,recommendation,note,regex,enabled,createdAt,updatedAt,source\n';
      const csvRows = entries.map(entry => {
        const variants = entry.variants ? entry.variants.join(';') : '';
        return [
          entry.id,
          entry.category,
          entry.subcategory || '',
          entry.term,
          variants,
          entry.severity,
          entry.penalty,
          entry.language,
          entry.context || '',
          entry.recommendation || '',
          entry.note || '',
          entry.regex || '',
          entry.enabled,
          entry.createdAt,
          entry.updatedAt,
          entry.source || ''
        ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
      }).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=ng_words.csv');
      res.send(csvHeader + csvRows);
    } else {
      // Export as JSON (default)
      const exportData = {
        exportedAt: new Date().toISOString(),
        totalEntries: entries.length,
        filters: { category, enabled },
        entries
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=ng_words.json');
      res.json(exportData);
    }
  } catch (error) {
    errorResponse(res, error);
  }
});

// GET /api/ng-words/statistics - 統計情報
router.get('/meta/statistics', ensureInitialized, async (_req: Request, res: Response) => {
  try {
    const stats = ngWordDatabase.getStatistics();
    const categoryBreakdown = ngWordDatabase.getCategoryBreakdown();

    // Enhanced statistics
    const enhancedStats = {
      overview: {
        totalEntries: stats.totalEntries,
        enabledEntries: stats.enabledCount,
        disabledEntries: stats.disabledCount,
        totalCategories: Object.keys(stats.categoryCounts).length
      },
      distribution: {
        byCategory: stats.categoryCounts,
        byLanguage: stats.languageCounts,
        bySeverity: stats.severityCounts
      },
      categoryDetails: categoryBreakdown,
      healthCheck: {
        duplicates: await checkForDuplicates(),
        missingRequired: await checkRequiredCategories(),
        validationIssues: await getValidationIssues()
      }
    };

    successResponse(res, enhancedStats);
  } catch (error) {
    errorResponse(res, error);
  }
});

// Helper method for duplicate checking
async function checkForDuplicates() {
  try {
    const duplicateReport = ngWordValidator.checkDuplicates(ngWordDatabase['database']?.entries || []);
    return {
      found: duplicateReport.totalDuplicates > 0,
      count: duplicateReport.totalDuplicates,
      duplicates: duplicateReport.duplicates
    };
  } catch (error) {
    return { found: false, count: 0, error: (error as Error).message };
  }
}

// Helper method for required categories checking
async function checkRequiredCategories() {
  try {
    const categoryValidation = ngWordValidator.validateCategories(ngWordDatabase['database']?.entries || []);
    return {
      missing: categoryValidation.missingRequiredCategories,
      unknown: categoryValidation.unknownCategories,
      isValid: categoryValidation.isValid
    };
  } catch (error) {
    return { missing: [], unknown: [], isValid: false, error: (error as Error).message };
  }
}

// Helper method for validation issues
async function getValidationIssues() {
  try {
    const validationResult = await ngWordDatabase.validateDatabase();
    return {
      hasIssues: !validationResult.isValid || validationResult.warnings.length > 0,
      errorCount: validationResult.errors.length,
      warningCount: validationResult.warnings.length,
      errors: validationResult.errors.slice(0, 10), // Limit for performance
      warnings: validationResult.warnings.slice(0, 10)
    };
  } catch (error) {
    return { hasIssues: true, errorCount: 1, warningCount: 0, error: (error as Error).message };
  }
}

// Content analysis endpoint
router.post('/analyze', ensureInitialized, async (req: Request, res: Response) => {
  try {
    const { content, analysisType = 'basic', options = {} } = req.body;

    if (!content || typeof content !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Content is required and must be a string',
        timestamp: new Date().toISOString()
      });
    }

    let result;
    
    switch (analysisType) {
      case 'basic':
        if (forbiddenWordsManager.isNgWordDatabaseAvailable()) {
          result = await forbiddenWordsManager.checkWithNewDatabase(content);
        } else {
          const legacyResult = await forbiddenWordsManager.checkForbiddenWords(content);
          result = {
            hasViolations: !legacyResult.safe,
            violations: [],
            totalPenalty: legacyResult.penalty,
            suggestions: legacyResult.reasons
          };
        }
        break;
        
      case 'detailed':
        if (forbiddenWordsManager.isNgWordDatabaseAvailable()) {
          result = await forbiddenWordsManager.getDetailedAnalysis(content);
        } else {
          return res.status(400).json({
            success: false,
            error: 'Detailed analysis requires NgWordDatabase',
            timestamp: new Date().toISOString()
          });
        }
        break;
        
      default:
        return res.status(400).json({
          success: false,
          error: `Unknown analysis type: ${analysisType}`,
          timestamp: new Date().toISOString()
        });
    }

    successResponse(res, {
      content: {
        length: content.length,
        wordCount: content.split(/\s+/).length
      },
      analysis: result,
      analysisType,
      options
    });
  } catch (error) {
    return errorResponse(res, error as Error);
  }
});

export default router;