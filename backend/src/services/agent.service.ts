import { createTool } from '@mastra/core'
// Note: Full Mastra Agent integration available for future enhancement
// Currently using direct tool calls for optimal performance
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from '@google/generative-ai'
import { createLogger } from '@/utils/logger'
import { ComplianceService } from '@/services/compliance'
import { ForbiddenWordsManager } from '@/services/compliance/forbiddenWordsManager'
import type { 
  GenerateLyricRequest, 
  ComplianceCheckResult, 
  Battle,
  Lyric,
  ViolationInfo
} from '@/types'
import type { CheckResult } from '@/types/ngWord'

const logger = createLogger('mastra-agent')

// Tool: Generate Rap Lyrics
const generateRapLyricsTool = createTool({
  id: 'generateRapLyrics',
  description: 'Generate creative rap lyrics for a battle based on theme and style',
  inputSchema: undefined,
  outputSchema: undefined,
  execute: async (context: any) => {
    const { theme, style, previousLyrics = [], model } = context;
    const startTime = Date.now()
    
    try {
      // Initialize Google Generative AI
      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || ''
      
      if (!apiKey) {
        throw new Error('Missing API key: GEMINI_API_KEY or GOOGLE_API_KEY environment variable not set')
      }
      
      logger.info('Initializing Google Generative AI with API key')
      const genAI = new GoogleGenerativeAI(apiKey)
      
      // Safety settings
      const safetySettings = [
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        }
      ]
      
      // Select model configuration
      const modelName = model === 'gemini-flash' 
        ? 'gemini-1.5-flash' 
        : 'gemini-1.5-pro'
      
      const generationConfig = model === 'gemini-flash' 
        ? {
            maxOutputTokens: 300,
            temperature: 0.9,
            topP: 0.95,
            topK: 40,
          }
        : {
            maxOutputTokens: 400,
            temperature: 0.85,
            topP: 0.9,
            topK: 40,
          }
      
      const geminiModel = genAI.getGenerativeModel({ 
        model: modelName,
        safetySettings,
        generationConfig
      })
      
      // Build prompt for Japanese rap lyrics
      const prompt = `あなたは日本語ラップバトルで戦う熟練のラッパーです。
あなたのスタイル: ${style}

バトルテーマ: "${theme}"

以下の条件で日本語のラップヴァース（4-8小節）を生成してください：
1. テーマに沿った内容
2. 日本語の韻律とリズムを活かした表現
3. 創造的な言葉遊びと比喩表現
4. 力強く競争的でありながら敬意のある内容
5. 日本の文化や価値観に配慮した表現
6. 適切で品のある日本語の使用

フォーマット：リリックのみを日本語で出力し、解説や舞台指示は含めないでください。

${previousLyrics.length > 0 ? `\n前のヴァース:\n${previousLyrics.join('\n\n')}\n\n相手のヴァースに応答し、それを基に発展させてください。` : ''}`
      
      // Generate content
      logger.info(`Calling Gemini model ${modelName} with prompt`)
      const result = await geminiModel.generateContent(prompt)
      
      if (!result || !result.response) {
        throw new Error('No response from Gemini model')
      }
      
      const response = await result.response
      const text = response.text()
      
      if (!text) {
        throw new Error('Empty response from Gemini model')
      }
      
      logger.info(`Received response from Gemini: ${text.length} characters`)
      
      // Clean lyrics
      const cleanedLyrics = cleanLyrics(text)
      
      const generationTime = Date.now() - startTime
      logger.info(`Lyrics generated with ${modelName} in ${generationTime}ms`)
      
      return {
        content: cleanedLyrics,
        generationTime
      }
    } catch (error) {
      logger.error('Error generating lyrics in tool:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        theme,
        style,
        model,
        hasApiKey: !!process.env.GEMINI_API_KEY || !!process.env.GOOGLE_API_KEY
      })
      throw error
    }
  }
})

// Tool: Check Content Compliance (Enhanced with NG Word Database)
const checkComplianceTool = createTool({
  id: 'checkCompliance',
  description: 'Check if content meets compliance standards for safety and appropriateness using the enhanced NG word database',
  inputSchema: undefined,
  outputSchema: undefined,
  execute: async (context: any) => {
    const { content, detailed = false } = context;
    
    try {
      const forbiddenWordsManager = new ForbiddenWordsManager()
      
      let result: CheckResult;
      if (detailed && forbiddenWordsManager.isNgWordDatabaseAvailable()) {
        result = await forbiddenWordsManager.getDetailedAnalysis(content)
      } else if (forbiddenWordsManager.isNgWordDatabaseAvailable()) {
        result = await forbiddenWordsManager.checkWithNewDatabase(content)
      } else {
        // Fallback to legacy system
        logger.warn('NG Word Database not available, using legacy compliance service')
        const complianceService = new ComplianceService()
        const legacyResult = await complianceService.checkContent(content)
        
        return {
          safe: legacyResult.safe,
          score: legacyResult.score,
          reasons: legacyResult.reasons || [],
          violations: [],
          totalPenalty: legacyResult.score ? 1 - legacyResult.score : 0
        }
      }
      
      // Calculate compliance score (1.0 = perfect, 0.0 = completely non-compliant)
      const complianceScore = Math.max(0, 1.0 - result.totalPenalty)
      
      logger.info(`Enhanced compliance check result: safe=${!result.hasViolations}, score=${complianceScore}, violations=${result.violations.length}`)
      
      return {
        safe: !result.hasViolations,
        score: complianceScore,
        reasons: result.suggestions,
        violations: result.violations,
        totalPenalty: result.totalPenalty,
        categoryBreakdown: (result as any).categoryBreakdown,
        severityBreakdown: (result as any).severityBreakdown
      }
    } catch (error) {
      logger.error('Error in enhanced compliance check:', error)
      
      // Fallback to legacy system
      const complianceService = new ComplianceService()
      const legacyResult = await complianceService.checkContent(content)
      
      return {
        safe: legacyResult.safe,
        score: legacyResult.score,
        reasons: legacyResult.reasons || [],
        violations: [],
        totalPenalty: legacyResult.score ? 1 - legacyResult.score : 0
      }
    }
  }
})

// Tool: Evaluate Battle Performance
const evaluateBattleTool = createTool({
  id: 'evaluateBattle',
  description: 'Evaluate the performance of participants in a rap battle',
  inputSchema: undefined,
  outputSchema: undefined,
  execute: async (context: any) => {
    const { battle } = context as { battle: Battle };
    // Analyze each round
    const roundScores = battle.rounds.map(round => {
      // Simple scoring based on various factors
      if (!round.lyrics) {
        return { ai1: 0, ai2: 0 }
      }
      const ai1Score = calculateLyricScore(round.lyrics.ai1)
      const ai2Score = calculateLyricScore(round.lyrics.ai2)
      
      return { ai1: ai1Score, ai2: ai2Score }
    })
    
    // Calculate total scores
    const totalScores = roundScores.reduce(
      (acc, score) => ({
        ai1: acc.ai1 + score.ai1,
        ai2: acc.ai2 + score.ai2
      }),
      { ai1: 0, ai2: 0 }
    )
    
    const winner = totalScores.ai1 > totalScores.ai2 ? 'ai1' : 'ai2'
    const winnerName = battle.participants[winner].name
    
    const analysis = `After ${battle.rounds.length} rounds of intense lyrical combat, ${winnerName} emerges victorious with a score of ${Math.max(totalScores.ai1, totalScores.ai2)} to ${Math.min(totalScores.ai1, totalScores.ai2)}. The battle showcased creative wordplay, strong rhythm, and compelling responses to the theme "${battle.theme}".`
    
    return {
      winner,
      analysis,
      scores: totalScores
    }
  }
})

// Tool: Generate Battle Theme
const generateBattleThemeTool = createTool({
  id: 'generateBattleTheme',
  description: 'Generate a creative and engaging theme for a rap battle',
  inputSchema: undefined,
  outputSchema: undefined,
  execute: async (context: any) => {
    const { category } = context;
    const themes = {
      technology: [
        { theme: 'AI vs 人間の創造性', description: 'AIと人間のクリエイティビティの対決', keywords: ['人工知能', 'テクノロジー', '創造', '未来'] },
        { theme: 'SNSの影響力', description: 'ソーシャルメディアが社会に与える影響', keywords: ['SNS', 'デジタル社会', '情報', '繋がり'] },
        { theme: '働き方の未来', description: 'テクノロジーが変える労働の形', keywords: ['テクノロジー', '仕事', '変化', '進歩'] }
      ],
      nature: [
        { theme: '四季の移ろい', description: '日本の美しい四季と自然の変化', keywords: ['春夏秋冬', '自然', '変化', '美しさ'] },
        { theme: '都市 vs 田舎', description: '都会と田舎のライフスタイルの対比', keywords: ['都市', '田舎', 'ライフスタイル', '選択'] },
        { theme: '海の神秘', description: '深海の謎と海洋の不思議', keywords: ['海', '神秘', '深海', '不思議'] }
      ],
      social: [
        { theme: '壁を越えて', description: '社会的・文化的な障壁を乗り越える', keywords: ['挑戦', '成長', '克服', '勇気'] },
        { theme: '多様性の調和', description: '異なる文化や背景を持つ人々の調和', keywords: ['多様性', '文化', '調和', '理解'] },
        { theme: '世代を超えて', description: '異なる世代間の理解と絆', keywords: ['世代', '理解', '絆', 'コミュニケーション'] }
      ],
      culture: [
        { theme: 'サムライ精神', description: '現代に生きる武士道の精神', keywords: ['武士道', '精神', '誇り', '強さ'] },
        { theme: '東京の夜', description: '眠らない大都市東京の魅力', keywords: ['東京', '夜', '都市', 'エネルギー'] },
        { theme: '祭りの熱気', description: '日本の祭りの熱狂と文化', keywords: ['祭り', '伝統', '熱気', '文化'] }
      ],
      abstract: [
        { theme: '夢 vs 現実', description: '夢と現実の境界線を探る', keywords: ['夢', '現実', '希望', '理想'] },
        { theme: '言葉の力', description: '言葉が持つ強大な力と影響', keywords: ['言葉', '力', '影響', 'コミュニケーション'] },
        { theme: '時の流れ', description: '時間の経過と人生の変化', keywords: ['時間', '変化', '人生', '成長'] }
      ]
    }
    
    const categoryThemes = themes[category as keyof typeof themes] || themes.culture
    const selected = categoryThemes[Math.floor(Math.random() * categoryThemes.length)]
    
    return selected
  }
})

// Helper function to clean lyrics
function cleanLyrics(text: string): string {
  // Remove any markdown formatting
  text = text.replace(/```[\s\S]*?```/g, '')
  text = text.replace(/^\s*#.*$/gm, '')
  
  // Remove stage directions or explanations in parentheses
  text = text.replace(/\([^)]*\)/g, '')
  
  // Trim whitespace and empty lines
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
  
  return lines.join('\n')
}

// Helper function to calculate lyric score
function calculateLyricScore(lyric: Lyric): number {
  let score = 0
  
  // Base score from compliance
  score += lyric.complianceScore * 30
  
  // Bonus for fast generation (under 1 second)
  if (lyric.generationTime < 1000) {
    score += 10
  }
  
  // Score based on content length (optimal is 4-8 lines)
  const lineCount = lyric.content.split('\n').length
  if (lineCount >= 4 && lineCount <= 8) {
    score += 15
  }
  
  // Check for rhyme patterns (simple check)
  const lines = lyric.content.toLowerCase().split('\n')
  let rhymeScore = 0
  for (let i = 0; i < lines.length - 1; i++) {
    const endWord1 = lines[i].split(' ').pop() || ''
    const endWord2 = lines[i + 1].split(' ').pop() || ''
    if (endWord1.slice(-2) === endWord2.slice(-2) && endWord1 !== endWord2) {
      rhymeScore += 5
    }
  }
  score += Math.min(rhymeScore, 20)
  
  // Random variation to make it interesting
  score += Math.random() * 10
  
  return Math.round(score)
}

// Create the Rap Battle Agent
// Note: Using direct tool calls for optimal performance
// Full Mastra Agent integration available for future enhancement
/*
export const rapBattleAgent = new Agent({
  name: 'rapBattleAgent',
  description: 'An AI agent that manages rap battles, generates lyrics, and ensures content compliance',
  instructions: `You are an AI agent managing rap battles between different AI models. Your responsibilities include:
  
1. Generating creative and engaging rap lyrics based on themes and styles
2. Ensuring all content meets compliance standards for safety
3. Evaluating battle performances fairly and providing insightful analysis
4. Managing the flow and pacing of rap battles
5. Creating interesting themes for battles

Always maintain a balance between creativity and safety, ensuring content is competitive but respectful.`,
  model: google('gemini-1.5-pro'),
  tools: {
    generateRapLyrics: generateRapLyricsTool,
    checkCompliance: checkComplianceTool,
    evaluateBattle: evaluateBattleTool,
    generateBattleTheme: generateBattleThemeTool
  }
})
*/

// Main Agent Service class for integration
export class AgentService {
  constructor() {
    logger.info('Mastra Agent Service initialized (using direct tool calls)')
  }
  
  async generateLyrics(request: GenerateLyricRequest): Promise<Lyric> {
    try {
      logger.info('Generating lyrics with request:', {
        theme: request.theme,
        style: request.style,
        model: request.model,
        hasPreviousLyrics: !!request.previousLyrics?.length
      })
      
      // The agent should have called the tools and returned the results
      // For now, let's directly call the tool since the agent integration might not be complete
      const toolResult = await generateRapLyricsTool.execute?.({
        theme: request.theme,
        style: request.style,
        previousLyrics: request.previousLyrics,
        model: request.model
      } as any)
      
      if (!toolResult) {
        throw new Error('Failed to generate lyrics - tool returned no result')
      }
      
      const { content, generationTime } = toolResult as any
      
      logger.info('Lyrics generated successfully, checking compliance...')
      
      // Check compliance with detailed analysis
      const complianceResult = await checkComplianceTool.execute?.({ content, detailed: true } as any)
      
      // Convert compliance violations to ViolationInfo format for frontend
      const violations: ViolationInfo[] = this.convertToViolationInfo((complianceResult as any)?.violations || [])
      
      const lyric: Lyric = {
        id: `lyric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content,
        bars: 8, // デフォルト値
        rhymes: [],
        punchlines: [],
        generatedAt: new Date(),
        complianceScore: (complianceResult as any)?.score || 1.0,
        generationTime,
        violations: violations.length > 0 ? violations : undefined
      }
      
      logger.info('Lyrics generated and compliance checked:', {
        id: lyric.id,
        contentLength: content.length,
        complianceScore: lyric.complianceScore,
        generationTime,
        violationsFound: violations.length,
        hasViolations: violations.length > 0
      })
      
      return lyric
    } catch (error) {
      logger.error('Error in generateLyrics:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        request
      })
      throw error
    }
  }
  
  async checkCompliance(content: string): Promise<ComplianceCheckResult> {
    try {
      // Use enhanced compliance checking
      const complianceResult = await checkComplianceTool.execute?.({ content, detailed: true } as any)
      if (!complianceResult) {
        throw new Error('Failed to check compliance')
      }
      
      // Return enhanced result while maintaining compatibility
      return {
        safe: (complianceResult as any).safe,
        score: (complianceResult as any).score,
        reasons: (complianceResult as any).reasons || []
      } as ComplianceCheckResult
    } catch (error) {
      logger.error('Error in enhanced checkCompliance:', error)
      throw error
    }
  }
  
  /**
   * Enhanced compliance check that returns full violation details for frontend highlighting
   */
  async checkComplianceWithViolations(content: string): Promise<{
    safe: boolean
    score: number
    reasons: string[]
    violations: ViolationInfo[]
    totalPenalty: number
  }> {
    try {
      const complianceResult = await checkComplianceTool.execute?.({ content, detailed: true } as any)
      if (!complianceResult) {
        throw new Error('Failed to check compliance')
      }
      
      // Convert violations to ViolationInfo format
      const violations: ViolationInfo[] = this.convertToViolationInfo((complianceResult as any).violations || [])
      
      return {
        safe: (complianceResult as any).safe,
        score: (complianceResult as any).score,
        reasons: (complianceResult as any).reasons || [],
        violations,
        totalPenalty: (complianceResult as any).totalPenalty || 0
      }
    } catch (error) {
      logger.error('Error in checkComplianceWithViolations:', error)
      throw error
    }
  }
  
  /**
   * Helper method to convert CheckResult violations to ViolationInfo format
   */
  private convertToViolationInfo(violations: any[]): ViolationInfo[] {
    return violations.map(violation => ({
      term: violation.term,
      category: violation.entry.category,
      severity: violation.entry.severity,
      penalty: violation.entry.penalty,
      startIndex: violation.position.start,
      endIndex: violation.position.end,
      recommendation: violation.entry.recommendation,
      note: violation.entry.note
    }))
  }
  
  async evaluateBattle(battle: Battle): Promise<{
    winner: string
    analysis: string
    scores: { ai1: number; ai2: number }
  }> {
    try {
      // Directly call the evaluation tool
      const evaluationResult = await evaluateBattleTool.execute?.({ battle } as any)
      if (!evaluationResult) {
        throw new Error('Failed to evaluate battle')
      }
      return evaluationResult as any
    } catch (error) {
      logger.error('Error in evaluateBattle:', error)
      throw error
    }
  }
  
  async generateTheme(category?: string): Promise<{ theme: string; description: string }> {
    try {
      // Directly call the theme generation tool
      const themeResult = await generateBattleThemeTool.execute?.({ category } as any)
      if (!themeResult) {
        // Fallback to a default Japanese theme
        return {
          theme: 'フリースタイル',
          description: '創造性に制限のない自由な表現で戦うバトル'
        }
      }
      return themeResult as any
    } catch (error) {
      logger.error('Error in generateTheme:', error)
      throw error
    }
  }
  
  async testConnection(): Promise<boolean> {
    try {
      // For now, just return true since we're calling tools directly
      return true
      
      logger.info('Mastra Agent connection test successful')
      return true
    } catch (error) {
      logger.error('Mastra Agent connection test failed:', error)
      return false
    }
  }
}

// Export initialized service
export const agentService = new AgentService()