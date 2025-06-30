import { Router, Request, Response } from 'express';
import { AgentService } from '../services/agent.service';
import { validateRequest } from '../middleware/validation';
import { body } from 'express-validator';
import { createLogger } from '../utils/logger';
import { Battle } from '../types';

const logger = createLogger('agent-routes');

const router = Router();
const agentService = new AgentService();

/**
 * Generate rap lyrics using the Mastra Agent
 */
router.post(
  '/generate-lyrics',
  [
    body('theme').isString().notEmpty().withMessage('Theme is required'),
    body('rapperStyle').isString().notEmpty().withMessage('Rapper style is required'),
    body('userName').isString().optional(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { theme, rapperStyle } = req.body;

      const result = await agentService.generateLyrics({
        theme,
        bars: 8,
        style: rapperStyle,
        model: 'gemini-flash', // Default to flash for quick response
        previousLyrics: [],
      });

      res.json({
        success: true,
        data: {
          lyrics: result.content,
          metadata: {
            id: result.id,
            generatedAt: result.generatedAt,
            complianceScore: result.complianceScore,
            generationTime: result.generationTime,
          },
        },
      });
    } catch (error) {
      logger.error('Error generating lyrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate lyrics',
      });
    }
  }
);

/**
 * Check content compliance using the Mastra Agent
 */
router.post(
  '/check-compliance',
  [
    body('content').isString().notEmpty().withMessage('Content is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { content } = req.body;

      const result = await agentService.checkCompliance(content);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error checking compliance:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check compliance',
      });
    }
  }
);

/**
 * Evaluate a rap battle using the Mastra Agent
 */
router.post(
  '/evaluate-battle',
  [
    body('battleId').isString().notEmpty().withMessage('Battle ID is required'),
    body('rapper1Lyrics').isArray().notEmpty().withMessage('Rapper 1 lyrics are required'),
    body('rapper2Lyrics').isArray().notEmpty().withMessage('Rapper 2 lyrics are required'),
    body('audience').isArray().optional(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { battleId, rapper1Lyrics, rapper2Lyrics, audience } = req.body;

      // Create a Battle object from the request data
      const battle: Battle = {
        id: battleId,
        status: 'completed',
        theme: 'Battle Theme', // This should be provided in the request
        format: '8bars-3verses', // デフォルト形式
        startedAt: new Date(),
        endedAt: new Date(),
        rounds: rapper1Lyrics.map((lyric: string, index: number) => ({
          number: index + 1,
          lyrics: {
            ai1: {
              id: `ai1_${index}`,
              content: lyric,
              generatedAt: new Date(),
              complianceScore: 1.0,
              generationTime: 1000
            },
            ai2: {
              id: `ai2_${index}`,
              content: rapper2Lyrics[index] || '',
              generatedAt: new Date(),
              complianceScore: 1.0,
              generationTime: 1000
            }
          },
          votes: { ai1: 0, ai2: 0 }
        })),
        participants: {
          ai1: {
            id: 'ai1',
            name: 'AI Rapper 1',
            model: 'gemini-flash',
            style: 'aggressive'
          },
          ai2: {
            id: 'ai2',
            name: 'AI Rapper 2',
            model: 'gemini-pro',
            style: 'smooth'
          }
        },
        votes: { ai1: 0, ai2: 0 },
        viewers: audience?.length || 0
      };

      const result = await agentService.evaluateBattle(battle);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error evaluating battle:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to evaluate battle',
      });
    }
  }
);

/**
 * Generate a battle theme using the Mastra Agent
 */
router.post(
  '/generate-theme',
  [
    body('categories').isArray().optional(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { categories } = req.body;

      const result = await agentService.generateTheme(
        categories?.[0] || 'abstract'
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error generating theme:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate theme',
      });
    }
  }
);

/**
 * Execute custom agent tasks (for advanced use cases)
 */
router.post(
  '/execute',
  [
    body('task').isString().notEmpty().withMessage('Task is required'),
    body('parameters').isObject().optional(),
  ],
  validateRequest,
  async (_req: Request, res: Response) => {
    try {
      // Task and parameters are validated but not used in this implementation

      // This endpoint allows for more flexible agent usage
      // For now, we'll return a not implemented error
      throw new Error('Execute endpoint is not implemented yet');

      // This code won't be reached due to the error above
      res.json({
        success: true,
        data: {
          result: 'Not implemented',
          metadata: {},
        },
      });
    } catch (error) {
      logger.error('Error executing agent task:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to execute agent task',
      });
    }
  }
);

/**
 * Health check for the agent service
 */
router.get('/health', async (_req: Request, res: Response) => {
  try {
    // Test basic agent functionality
    await agentService.generateTheme('Test');

    res.json({
      success: true,
      status: 'healthy',
      message: 'Agent service is operational',
    });
  } catch (error) {
    logger.error('Agent health check failed:', error);
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: 'Agent service is not operational',
    });
  }
});

export default router;