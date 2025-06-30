import { createTool } from '@mastra/core'
import { z } from 'zod'
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from '@google/generative-ai'
import { createLogger } from '@/utils/logger'
import type { 
  GenerateLyricRequest, 
  Battle,
  Lyric
} from '@/types'
import { performanceConfig, withTimeout } from '@/config/performance'

const logger = createLogger('mc-battle-agent')

// リリック生成ツール（日本のMCバトルに特化）
export const generateMCBattleLyricsTool = createTool({
  id: 'generateMCBattleLyrics',
  description: '日本のMCバトル形式に合わせたリリックを生成する。8小節または16小節で、韻とアンサーを重視。',
  inputSchema: z.object({
    theme: z.string().describe('バトルのテーマ'),
    bars: z.number().describe('小節数（8または16）'),
    style: z.string().describe('ラッパーのスタイル'),
    opponentLatestLyric: z.string().optional().describe('相手の最新リリック（アンサー用）'),
    previousLyrics: z.array(z.string()).optional().describe('これまでのリリック'),
    roundNumber: z.number().optional().describe('現在のバース番号'),
    totalRounds: z.number().optional().describe('総バース数'),
    model: z.enum(['gemini-flash', 'gemini-pro']).describe('使用するモデル')
  }),
  outputSchema: z.object({
    content: z.string().describe('生成されたリリック'),
    bars: z.number().describe('実際の小節数'),
    rhymes: z.array(z.string()).describe('使用した韻のリスト'),
    punchlines: z.array(z.string()).describe('パンチライン'),
    answerTo: z.string().optional().describe('アンサーしている相手のフレーズ'),
    generationTime: z.number().describe('生成時間（ミリ秒）')
  }),
  execute: async ({ context }) => {
    const { theme, bars, style, opponentLatestLyric, model } = context
    const startTime = Date.now()
    
    // Retry configuration
    const MAX_RETRIES = 3
    const INITIAL_DELAY = 1000 // 1 second
    
    const retryWithBackoff = async (fn: () => Promise<any>, retries = 0): Promise<any> => {
      try {
        return await fn()
      } catch (error: any) {
        if (retries >= MAX_RETRIES) {
          throw error
        }
        
        const delay = INITIAL_DELAY * Math.pow(2, retries)
        logger.warn(`Retrying after ${delay}ms... (attempt ${retries + 1}/${MAX_RETRIES})`)
        await new Promise(resolve => setTimeout(resolve, delay))
        
        return retryWithBackoff(fn, retries + 1)
      }
    }
    
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || ''
      
      if (!apiKey) {
        throw new Error('APIキーが設定されていません')
      }
      
      const genAI = new GoogleGenerativeAI(apiKey)
      
      // セーフティ設定
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
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        }
      ]
      
      // モデル設定（パフォーマンス最適化）
      const modelName = model === 'gemini-flash' ? 'gemini-1.5-flash' : 'gemini-1.5-pro'
      const generationConfig = performanceConfig.modelOptimizations[model] || {
        maxOutputTokens: 400,
        temperature: 0.8,
        topP: 0.85,
        topK: 30,
      }
      
      const geminiModel = genAI.getGenerativeModel({ 
        model: modelName,
        safetySettings,
        generationConfig
      })
      
      // 最適化された短いプロンプト
      const prompt = `MCバトル: ${style}
テーマ: ${theme}
${bars}小節の日本語ラップを生成。

${opponentLatestLyric ? `相手の返し:
${opponentLatestLyric.substring(0, 100)}...
必ずアンサーを含める。` : ''}

要件:
- 韻を踏む
- パンチラインを入れる
- リリックのみ出力（解説なし）
- ${bars * 2}行程度（各小節2行）
- 簡潔に、短く、パンチ効いた内容`
      
      // リリック生成
      logger.info(`MCバトルリリック生成中... (${modelName}, ${bars}小節)`)
      
      const generateWithRetry = async () => {
        const result = await geminiModel.generateContent(prompt)
        
        if (!result || !result.response) {
          throw new Error('レスポンスが取得できませんでした')
        }
        
        const response = await result.response
        const text = response.text()
        
        if (!text) {
          throw new Error('リリックが生成されませんでした')
        }
        
        return text
      }
      
      try {
        const text = await withTimeout(
          retryWithBackoff(generateWithRetry),
          performanceConfig.timeouts.lyricGeneration,
          'Lyric generation'
        )
        
        logger.info(`リリック生成完了: ${text.length}文字`)
        
        // リリックの解析
        const cleanedLyrics = cleanLyrics(text)
        const rhymes = extractRhymes(cleanedLyrics)
        const punchlines = extractPunchlines(cleanedLyrics)
        const answerTo = opponentLatestLyric ? extractAnswer(cleanedLyrics, opponentLatestLyric) : undefined
        
        const generationTime = Date.now() - startTime
        
        return {
          content: cleanedLyrics,
          bars,
          rhymes,
          punchlines,
          answerTo,
          generationTime
        }
      } catch (apiError: any) {
        logger.error('Gemini API エラー:', {
          error: apiError.message,
          status: apiError.status,
          statusText: apiError.statusText,
          details: apiError.errorDetails
        })
        throw new Error(`Gemini API エラー: ${apiError.message || 'Unknown error'}`)
      }
    } catch (error) {
      logger.error('リリック生成エラー:', error)
      throw error
    }
  }
})

// コンプライアンスチェックツール（日本語対応）
export const checkJapaneseMCComplianceTool = createTool({
  id: 'checkJapaneseMCCompliance',
  description: '日本のMCバトルのリリックが適切かチェックする',
  inputSchema: z.object({
    content: z.string().describe('チェックするリリック'),
    strict: z.boolean().optional().describe('厳格モード')
  }),
  outputSchema: z.object({
    safe: z.boolean(),
    score: z.number(),
    reasons: z.array(z.string()).optional()
  }),
  execute: async ({ context }) => {
    const { content, strict = false } = context
    
    // 日本語の不適切な表現をチェック
    const bannedPatterns = [
      /死ね|殺す|ころす/gi,
      /薬物|ドラッグ|大麻/gi,
      /差別|ヘイト/gi,
    ]
    
    const warnings: string[] = []
    let score = 1.0
    
    for (const pattern of bannedPatterns) {
      if (pattern.test(content)) {
        warnings.push('不適切な表現が含まれています')
        score -= 0.3
      }
    }
    
    // MCバトルでは多少の挑発は許容
    if (!strict && score >= 0.5) {
      score = Math.min(score + 0.2, 1.0)
    }
    
    return {
      safe: score >= 0.6,
      score,
      reasons: warnings.length > 0 ? warnings : undefined
    }
  }
})

// バトル評価ツール（日本のMCバトル基準）
export const evaluateMCBattleTool = createTool({
  id: 'evaluateMCBattle',
  description: '日本のMCバトルの勝敗をLLMが専門的に評価する',
  inputSchema: z.object({
    battle: z.any().describe('バトル情報')
  }),
  outputSchema: z.object({
    winner: z.string(),
    scores: z.object({
      ai1: z.number(),
      ai2: z.number()
    }),
    breakdown: z.object({
      ai1: z.object({
        rhyme: z.number().describe('韻の評価'),
        flow: z.number().describe('フロウの評価'),
        answer: z.number().describe('アンサーの評価'),
        punchline: z.number().describe('パンチラインの評価'),
        attitude: z.number().describe('アティチュードの評価')
      }),
      ai2: z.object({
        rhyme: z.number(),
        flow: z.number(),
        answer: z.number(),
        punchline: z.number(),
        attitude: z.number()
      })
    }),
    analysis: z.string()
  }),
  execute: async ({ context }) => {
    const { battle } = context as { battle: Battle }
    
    // バトル内容を整理
    const battleContent = battle.rounds.map((round, index) => {
      if (!round.lyrics) return ''
      const ai1Lyric = round.lyrics.ai1
      const ai2Lyric = round.lyrics.ai2
      return `
=== バース ${index + 1} ===
【${battle.participants.ai1.name}】
${ai1Lyric.content}

【${battle.participants.ai2.name}】
${ai2Lyric.content}
`
    }).join('\n')

    // LLMによる専門的な評価
    const judgePrompt = `あなたは日本のMCバトルの専門審査員です。以下のバトルを評価してください。

【バトル情報】
テーマ: ${battle.theme}
形式: ${battle.format === '8bars-3verses' ? '8小節3バース' : '16小節3バース'}

【参加者】
- ${battle.participants.ai1.name}: ${battle.participants.ai1.style}
- ${battle.participants.ai2.name}: ${battle.participants.ai2.style}

【バトル内容】
${battleContent}

【評価基準】
1. 韻（ライム）: 韻の質と独創性、自然さ (0-100点)
2. フロウ: リズム感、言葉の乗せ方、聞きやすさ (0-100点)
3. アンサー: 相手への的確な返し、会話性 (0-100点)
4. パンチライン: インパクト、言葉遊び、ウィット (0-100点)
5. アティチュード: テーマ解釈力、オリジナリティ (0-100点)

以下のJSONフォーマットで回答してください：
{
  "winner": "ai1またはai2",
  "scores": {
    "ai1": 総合点数(0-500),
    "ai2": 総合点数(0-500)
  },
  "breakdown": {
    "ai1": {
      "rhyme": 0-100,
      "flow": 0-100,
      "answer": 0-100,
      "punchline": 0-100,
      "attitude": 0-100
    },
    "ai2": {
      "rhyme": 0-100,
      "flow": 0-100,
      "answer": 0-100,
      "punchline": 0-100,
      "attitude": 0-100
    }
  },
  "analysis": "詳細な評価分析（各MCの強み・弱み、印象的なバース、勝敗の決め手など）"
}`

    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
      if (!apiKey) {
        throw new Error('Gemini API key not found')
      }
      
      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })
      const result = await model.generateContent(judgePrompt)
      const response = result.response.text()
      
      // JSONレスポンスをパース
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('評価結果のJSON形式が無効です')
      }
      
      const evaluation = JSON.parse(jsonMatch[0])
      
      return {
        winner: evaluation.winner,
        scores: evaluation.scores,
        breakdown: evaluation.breakdown,
        analysis: evaluation.analysis
      }
      
    } catch (error) {
      logger.error('LLM評価エラー:', error)
      
      // フォールバック: 基本的な評価
      const breakdown = {
        ai1: { rhyme: 70, flow: 75, answer: 80, punchline: 70, attitude: 75 },
        ai2: { rhyme: 75, flow: 70, answer: 75, punchline: 80, attitude: 70 }
      }
      
      const scores = {
        ai1: Object.values(breakdown.ai1).reduce((sum, score) => sum + score, 0),
        ai2: Object.values(breakdown.ai2).reduce((sum, score) => sum + score, 0)
      }
      
      const winner = scores.ai1 > scores.ai2 ? 'ai1' : 'ai2'
      const winnerName = battle.participants[winner].name
      
      return {
        winner,
        scores,
        breakdown,
        analysis: `${winnerName}が接戦を制しました！テーマ「${battle.theme}」への解釈と表現力が光る熱いバトルでした。（※LLM評価でエラーが発生したため、基本評価を適用）`
      }
    }
  }
})

// ヘルパー関数群

function cleanLyrics(text: string): string {
  // 解説や注釈を削除
  text = text.replace(/```[\s\S]*?```/g, '')
  text = text.replace(/^\s*#.*$/gm, '')
  text = text.replace(/\([^)]*\)/g, '')
  text = text.replace(/（[^）]*）/g, '')
  text = text.replace(/\[[^\]]*\]/g, '')
  text = text.replace(/【[^】]*】/g, '')
  
  // 空行を削除して整形
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
  
  return lines.join('\n')
}

function extractRhymes(lyrics: string): string[] {
  const rhymes: string[] = []
  const lines = lyrics.split('\n')
  
  // 各行の最後の単語から韻を抽出
  lines.forEach((line, i) => {
    if (i === 0) return
    
    const words1 = lines[i - 1].split(/[、。！？\s]+/).filter(w => w)
    const words2 = line.split(/[、。！？\s]+/).filter(w => w)
    
    if (words1.length > 0 && words2.length > 0) {
      const lastWord1 = words1[words1.length - 1]
      const lastWord2 = words2[words2.length - 1]
      
      // 母音が似ている場合は韻として記録
      if (hasRhyme(lastWord1, lastWord2)) {
        rhymes.push(`${lastWord1} - ${lastWord2}`)
      }
    }
  })
  
  return rhymes
}

function hasRhyme(word1: string, word2: string): boolean {
  // 簡易的な韻判定（母音の一致をチェック）
  const vowels1 = word1.replace(/[^あいうえおアイウエオ]/g, '')
  const vowels2 = word2.replace(/[^あいうえおアイウエオ]/g, '')
  
  return vowels1.length >= 2 && vowels2.length >= 2 && 
         vowels1.slice(-2) === vowels2.slice(-2)
}

function extractPunchlines(lyrics: string): string[] {
  const punchlines: string[] = []
  const lines = lyrics.split('\n')
  
  lines.forEach(line => {
    // 感嘆符や強調表現がある行をパンチラインとして抽出
    if (line.includes('！') || line.includes('!') || 
        line.includes('だぜ') || line.includes('だろ') ||
        line.includes('マジ') || line.includes('ヤバ')) {
      punchlines.push(line)
    }
  })
  
  return punchlines.slice(0, 3) // 上位3つまで
}

function extractAnswer(lyrics: string, opponentLyric: string): string | undefined {
  // 相手のリリックから重要な単語を抽出
  const keywords = opponentLyric
    .split(/[、。！？\s]+/)
    .filter(word => word.length > 2)
    .slice(0, 5)
  
  // 自分のリリックに相手の単語が含まれているか確認
  for (const keyword of keywords) {
    if (lyrics.includes(keyword)) {
      // その行を返す
      const lines = lyrics.split('\n')
      const answerLine = lines.find(line => line.includes(keyword))
      if (answerLine) {
        return answerLine
      }
    }
  }
  
  return undefined
}

// MCバトルエージェントサービス
export class MCBattleAgentService {
  constructor() {
    logger.info('MCバトルエージェントサービス初期化完了')
  }
  
  async generateLyrics(request: GenerateLyricRequest): Promise<Lyric> {
    try {
      logger.info('MCバトルリリック生成開始:', {
        theme: request.theme,
        bars: request.bars,
        style: request.style,
        model: request.model,
        hasOpponentLyric: !!request.opponentLatestLyric
      })
      
      // リリック生成
      const result = await generateMCBattleLyricsTool.execute({
        context: {
          theme: request.theme,
          bars: request.bars,
          style: request.style,
          opponentLatestLyric: request.opponentLatestLyric,
          previousLyrics: request.previousLyrics,
          roundNumber: request.roundNumber,
          totalRounds: request.totalRounds,
          model: request.model
        },
        runtimeContext: {}
      } as any)
      
      if (!result) {
        throw new Error('リリック生成に失敗しました')
      }
      
      // コンプライアンスチェック
      const complianceResult = await checkJapaneseMCComplianceTool.execute({
        context: { content: result.content },
        runtimeContext: {}
      } as any)
      
      const lyric: Lyric = {
        id: `lyric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: result.content,
        bars: result.bars,
        rhymes: result.rhymes,
        punchlines: result.punchlines,
        ...(result.answerTo && { answerTo: result.answerTo }), // Only include if not undefined
        generatedAt: new Date(),
        complianceScore: complianceResult?.score || 1.0,
        generationTime: result.generationTime
      }
      
      logger.info('MCバトルリリック生成完了:', {
        id: lyric.id,
        contentLength: lyric.content.length,
        rhymeCount: lyric.rhymes.length,
        punchlineCount: lyric.punchlines.length,
        hasAnswer: !!lyric.answerTo,
        complianceScore: lyric.complianceScore,
        generationTime: lyric.generationTime
      })
      
      return lyric
    } catch (error) {
      logger.error('MCバトルリリック生成エラー:', error)
      throw error
    }
  }
  
  async evaluateBattle(battle: Battle): Promise<{
    winner: string
    analysis: string
    scores: { ai1: number; ai2: number }
    breakdown: any
  }> {
    try {
      const result = await evaluateMCBattleTool.execute({
        context: { battle },
        runtimeContext: {}
      } as any)
      
      if (!result) {
        throw new Error('バトル評価に失敗しました')
      }
      
      return result as any
    } catch (error) {
      logger.error('バトル評価エラー:', error)
      throw error
    }
  }
  
  async testConnection(): Promise<boolean> {
    try {
      // 接続テスト用の簡単なリリック生成
      const result = await generateMCBattleLyricsTool.execute({
        context: {
          theme: 'テスト',
          bars: 8,
          style: 'テスト用スタイル',
          model: 'gemini-flash'
        },
        runtimeContext: {}
      } as any)
      
      return !!result
    } catch (error) {
      logger.error('MCバトルエージェント接続テスト失敗:', error)
      return false
    }
  }
}

// エクスポート
export const mcBattleAgentService = new MCBattleAgentService()