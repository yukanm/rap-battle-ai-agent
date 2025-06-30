import { NgWordValidator } from '@/services/compliance/ngWordValidator';
import { NgWordDatabase } from '@/services/compliance/ngWordDatabase';
import { NgWordEntry } from '@/types/ngWord';

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('NgWordValidator', () => {
  let validator: NgWordValidator;
  
  const validEntry: NgWordEntry = {
    id: 'test_valid',
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
    validator = new NgWordValidator();
  });

  describe('validateEntry', () => {
    test('should validate correct entry successfully', () => {
      const result = validator.validateEntry(validEntry);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.summary.totalErrors).toBe(0);
    });

    test('should detect missing required fields', () => {
      const invalidEntry = {
        ...validEntry,
        id: '',
        term: '',
        category: ''
      };

      const result = validator.validateEntry(invalidEntry);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.field === 'id')).toBe(true);
      expect(result.errors.some(e => e.field === 'term')).toBe(true);
      expect(result.errors.some(e => e.field === 'category')).toBe(true);
    });

    test('should validate severity enum values', () => {
      const invalidEntry = {
        ...validEntry,
        severity: 'invalid' as any
      };

      const result = validator.validateEntry(invalidEntry);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'severity')).toBe(true);
    });

    test('should validate language enum values', () => {
      const invalidEntry = {
        ...validEntry,
        language: 'invalid' as any
      };

      const result = validator.validateEntry(invalidEntry);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'language')).toBe(true);
    });

    test('should validate penalty range', () => {
      const invalidEntry1 = {
        ...validEntry,
        penalty: 0.05 // Too low
      };

      const invalidEntry2 = {
        ...validEntry,
        penalty: 1.5 // Too high
      };

      const result1 = validator.validateEntry(invalidEntry1);
      const result2 = validator.validateEntry(invalidEntry2);

      expect(result1.isValid).toBe(false);
      expect(result2.isValid).toBe(false);
      expect(result1.errors.some(e => e.field === 'penalty')).toBe(true);
      expect(result2.errors.some(e => e.field === 'penalty')).toBe(true);
    });

    test('should validate ISO 8601 date format', () => {
      const invalidEntry = {
        ...validEntry,
        createdAt: 'invalid date',
        updatedAt: 'invalid date'
      };

      const result = validator.validateEntry(invalidEntry);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'createdAt')).toBe(true);
      expect(result.errors.some(e => e.field === 'updatedAt')).toBe(true);
    });

    test('should warn about long terms', () => {
      const longTermEntry = {
        ...validEntry,
        term: 'a'.repeat(150) // Very long term
      };

      const result = validator.validateEntry(longTermEntry);

      expect(result.warnings.some(w => w.field === 'term' && w.message.includes('long'))).toBe(true);
    });

    test('should warn about short terms', () => {
      const shortTermEntry = {
        ...validEntry,
        term: 'a' // Very short term
      };

      const result = validator.validateEntry(shortTermEntry);

      expect(result.warnings.some(w => w.field === 'term' && w.message.includes('short'))).toBe(true);
    });

    test('should warn about language inconsistency', () => {
      const inconsistentEntry = {
        ...validEntry,
        term: 'english term',
        language: 'ja' as const // Japanese language but English term
      };

      const result = validator.validateEntry(inconsistentEntry);

      expect(result.warnings.some(w => w.field === 'language')).toBe(true);
    });

    test('should warn about severity-penalty inconsistency', () => {
      const inconsistentEntry = {
        ...validEntry,
        severity: 'critical' as const,
        penalty: 0.1 // Too low for critical severity
      };

      const result = validator.validateEntry(inconsistentEntry);

      expect(result.warnings.some(w => w.field === 'penalty')).toBe(true);
    });

    test('should detect duplicate variants', () => {
      const entryWithDuplicates = {
        ...validEntry,
        variants: ['variant1', 'variant2', 'variant1'] // Duplicate
      };

      const result = validator.validateEntry(entryWithDuplicates);

      expect(result.warnings.some(w => w.field === 'variants' && w.message.includes('duplicates'))).toBe(true);
    });

    test('should detect when variants include original term', () => {
      const entryWithOriginalInVariants = {
        ...validEntry,
        variants: ['テスト用語', 'other'] // Includes original term
      };

      const result = validator.validateEntry(entryWithOriginalInVariants);

      expect(result.warnings.some(w => w.field === 'variants' && w.message.includes('original term'))).toBe(true);
    });

    test('should warn about too many variants', () => {
      const entryWithManyVariants = {
        ...validEntry,
        variants: Array.from({ length: 15 }, (_, i) => `variant${i}`)
      };

      const result = validator.validateEntry(entryWithManyVariants);

      expect(result.warnings.some(w => w.field === 'variants' && w.message.includes('Too many'))).toBe(true);
    });

    test('should validate regex patterns', () => {
      const validRegexEntry = {
        ...validEntry,
        regex: '\\d{3}-\\d{4}-\\d{4}' // Valid regex
      };

      const invalidRegexEntry = {
        ...validEntry,
        regex: '[invalid regex' // Invalid regex
      };

      const validResult = validator.validateEntry(validRegexEntry);
      const invalidResult = validator.validateEntry(invalidRegexEntry);

      expect(validResult.errors.some(e => e.field === 'regex')).toBe(false);
      expect(invalidResult.errors.some(e => e.field === 'regex')).toBe(true);
    });

    test('should detect slow regex patterns', () => {
      const slowRegexEntry = {
        ...validEntry,
        regex: '(a+)+b' // Potentially slow regex
      };

      // Mock slow regex execution
      const originalTest = RegExp.prototype.test;
      RegExp.prototype.test = jest.fn().mockImplementation(function(str) {
        // Simulate slow execution
        const start = Date.now();
        while (Date.now() - start < 15) {} // Wait 15ms
        return false;
      });

      const result = validator.validateEntry(slowRegexEntry);

      RegExp.prototype.test = originalTest;

      expect(result.errors.some(e => e.field === 'regex' && e.message.includes('slow'))).toBe(true);
    });

    test('should recommend alternatives for high severity entries', () => {
      const highSeverityEntry = {
        ...validEntry,
        severity: 'critical' as const,
        recommendation: undefined
      };

      const result = validator.validateEntry(highSeverityEntry);

      expect(result.warnings.some(w => w.field === 'recommendation')).toBe(true);
    });

    test('should warn when recommendation is same as term', () => {
      const invalidRecommendationEntry = {
        ...validEntry,
        recommendation: 'テスト用語' // Same as term
      };

      const result = validator.validateEntry(invalidRecommendationEntry);

      expect(result.warnings.some(w => w.field === 'recommendation')).toBe(true);
    });

    test('should suggest regex for terms with symbols', () => {
      const symbolEntry = {
        ...validEntry,
        term: 'test@symbol!',
        regex: undefined
      };

      const result = validator.validateEntry(symbolEntry);

      expect(result.warnings.some(w => w.field === 'term' && w.message.includes('regex'))).toBe(true);
    });

    test('should warn about complex regex patterns', () => {
      const complexRegexEntry = {
        ...validEntry,
        regex: 'a'.repeat(150) // Very long regex
      };

      const result = validator.validateEntry(complexRegexEntry);

      expect(result.warnings.some(w => w.field === 'regex' && w.message.includes('Complex'))).toBe(true);
    });
  });

  describe('checkDuplicates', () => {
    test('should detect exact duplicates', () => {
      const entries: NgWordEntry[] = [
        validEntry,
        {
          ...validEntry,
          id: 'duplicate',
          term: 'テスト用語' // Same term (case insensitive)
        }
      ];

      const result = validator.checkDuplicates(entries);

      expect(result.totalDuplicates).toBe(1);
      expect(result.duplicates).toHaveLength(1);
      expect(result.duplicates[0].term).toBe('テスト用語'.toLowerCase());
      expect(result.duplicates[0].entries).toHaveLength(2);
    });

    test('should be case insensitive', () => {
      const entries: NgWordEntry[] = [
        {
          ...validEntry,
          term: 'Test'
        },
        {
          ...validEntry,
          id: 'test2',
          term: 'TEST'
        }
      ];

      const result = validator.checkDuplicates(entries);

      expect(result.totalDuplicates).toBe(1);
    });

    test('should return empty result for unique entries', () => {
      const entries: NgWordEntry[] = [
        validEntry,
        {
          ...validEntry,
          id: 'unique',
          term: '別の用語'
        }
      ];

      const result = validator.checkDuplicates(entries);

      expect(result.totalDuplicates).toBe(0);
      expect(result.duplicates).toHaveLength(0);
    });
  });

  describe('validateCategories', () => {
    test('should validate known categories', () => {
      const entries: NgWordEntry[] = [
        validEntry,
        {
          ...validEntry,
          id: 'test2',
          category: '差別表現'
        }
      ];

      const result = validator.validateCategories(entries);

      expect(result.isValid).toBe(true);
      expect(result.unknownCategories).toHaveLength(0);
    });

    test('should detect unknown categories', () => {
      const entries: NgWordEntry[] = [
        validEntry,
        {
          ...validEntry,
          id: 'test2',
          category: '未知のカテゴリ'
        }
      ];

      const result = validator.validateCategories(entries);

      expect(result.isValid).toBe(false);
      expect(result.unknownCategories).toContain('未知のカテゴリ');
    });

    test('should detect missing required categories', () => {
      const entries: NgWordEntry[] = [
        validEntry // Only has '侮蔑表現'
      ];

      const result = validator.validateCategories(entries);

      expect(result.isValid).toBe(false);
      expect(result.missingRequiredCategories.length).toBeGreaterThan(0);
      expect(result.missingRequiredCategories).toContain('暴力的表現');
      expect(result.missingRequiredCategories).toContain('性的表現');
    });

    test('should provide category distribution', () => {
      const entries: NgWordEntry[] = [
        validEntry,
        {
          ...validEntry,
          id: 'test2',
          category: '侮蔑表現'
        },
        {
          ...validEntry,
          id: 'test3',
          category: '差別表現'
        }
      ];

      const result = validator.validateCategories(entries);

      expect(result.categoryDistribution).toEqual({
        '侮蔑表現': 2,
        '差別表現': 1
      });
    });
  });

  describe('validateRegexPatterns', () => {
    test('should validate correct regex patterns', () => {
      const entries: NgWordEntry[] = [
        {
          ...validEntry,
          regex: '\\d{3}-\\d{4}-\\d{4}'
        },
        {
          ...validEntry,
          id: 'test2',
          regex: '[a-zA-Z]+'
        }
      ];

      const result = validator.validateRegexPatterns(entries);

      expect(result.isValid).toBe(true);
      expect(result.invalidPatterns).toHaveLength(0);
    });

    test('should detect invalid regex patterns', () => {
      const entries: NgWordEntry[] = [
        {
          ...validEntry,
          regex: '[invalid regex'
        },
        {
          ...validEntry,
          id: 'test2',
          regex: '(unclosed group'
        }
      ];

      const result = validator.validateRegexPatterns(entries);

      expect(result.isValid).toBe(false);
      expect(result.invalidPatterns).toHaveLength(2);
      expect(result.invalidPatterns[0].entryId).toBe('test_valid');
      expect(result.invalidPatterns[1].entryId).toBe('test2');
    });

    test('should handle entries without regex', () => {
      const entries: NgWordEntry[] = [
        validEntry, // No regex field
        {
          ...validEntry,
          id: 'test2',
          regex: undefined
        }
      ];

      const result = validator.validateRegexPatterns(entries);

      expect(result.isValid).toBe(true);
      expect(result.invalidPatterns).toHaveLength(0);
    });
  });

  describe('validateDatabase', () => {
    let mockDatabase: NgWordDatabase;
    
    beforeEach(() => {
      mockDatabase = {
        database: {
          version: '1.0.0',
          lastUpdated: '2023-01-01T00:00:00.000Z',
          totalEntries: 2,
          categories: ['侮蔑表現', '差別表現'],
          entries: [
            validEntry,
            {
              ...validEntry,
              id: 'test2',
              category: '差別表現'
            }
          ],
          metadata: {
            description: 'Test database',
            maintainer: 'Test',
            license: 'Test'
          }
        }
      } as any;
    });

    test('should validate database structure', () => {
      const result = validator.validateDatabase(mockDatabase);

      expect(result.isValid).toBe(true);
      expect(result.summary.totalChecked).toBe(2);
    });

    test('should detect missing database', () => {
      const emptyDatabase = {} as NgWordDatabase;
      
      const result = validator.validateDatabase(emptyDatabase);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toBe('Database not properly initialized');
    });

    test('should validate database metadata', () => {
      mockDatabase.database.metadata = undefined as any;
      
      const result = validator.validateDatabase(mockDatabase);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('metadata'))).toBe(true);
    });

    test('should check minimum entry requirements', () => {
      // Small database below minimum
      mockDatabase.database.totalEntries = 50;
      mockDatabase.database.entries = mockDatabase.database.entries.slice(0, 2);
      
      const result = validator.validateDatabase(mockDatabase);

      expect(result.warnings.some(w => w.message.includes('below minimum requirement (300)'))).toBe(true);
    });

    test('should check minimum category requirements', () => {
      // Database with insufficient entries per category
      const result = validator.validateDatabase(mockDatabase);

      // Should warn about categories having too few entries
      expect(result.warnings.some(w => w.message.includes('minimum required'))).toBe(true);
    });

    test('should check language requirements', () => {
      // Database with English-only entries
      mockDatabase.database.entries = [
        {
          ...validEntry,
          language: 'en',
          term: 'english term'
        }
      ];
      
      const result = validator.validateDatabase(mockDatabase);

      expect(result.warnings.some(w => w.message.includes('Japanese entries'))).toBe(true);
    });

    test('should handle validation errors gracefully', () => {
      // Mock an error in validation process
      jest.spyOn(validator, 'validateEntry').mockImplementation(() => {
        throw new Error('Validation error');
      });
      
      const result = validator.validateDatabase(mockDatabase);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('Validation failed');
    });
  });
});