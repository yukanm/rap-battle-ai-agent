import { createTool } from '@mastra/core'
import { z } from 'zod'
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from '@google/generative-ai'
import { createLogger } from '@/utils/logger'
import type { 
  GenerateLyricRequest, 
  Lyric
} from '@/types'

const logger = createLogger('answer-specialized-agent')

/**
 * アンサー特化型AIエージェント
 * 相手のリリックを分析し、完璧なアンサーを生成する
 */
export const generateAnswerSpecializedLyricsTool = createTool({
  id: 'generateAnswerSpecializedLyrics',
  description: 'アンサー特化型のリリック生成。相手の言葉を拾って韻で返し、論破する。',
  inputSchema: z.object({
    theme: z.string().describe('バトルのテーマ'),
    bars: z.number().describe('小節数（8または16）'),
    style: z.string().describe('ラッパーのスタイル'),
    opponentLyric: z.string().describe('相手のリリック（必須）'),
    previousLyrics: z.array(z.string()).optional().describe('これまでのリリック'),
    roundNumber: z.number().optional().describe('現在のラウンド番号'),
    totalRounds: z.number().optional().describe('総ラウンド数'),
    position: z.enum(['first', 'second']).describe('先行か後攻か')
  }),
  outputSchema: z.object({
    content: z.string().describe('生成されたリリック'),
    bars: z.number().describe('実際の小節数'),
    rhymes: z.array(z.string()).describe('使用した韻のリスト'),
    punchlines: z.array(z.string()).describe('パンチライン'),
    answerTo: z.string().optional().describe('アンサーしている相手のフレーズ'),
    pickedWords: z.array(z.string()).describe('相手のリリックから拾った単語'),
    counterArguments: z.array(z.string()).describe('相手への反論ポイント'),
    generationTime: z.number().describe('生成時間（ミリ秒）')
  }),
  execute: async ({ context }) => {
    const { 
      theme, 
      bars, 
      style, 
      opponentLyric, 
      previousLyrics = [], 
      roundNumber, 
      totalRounds, 
      position 
    } = context
    const startTime = Date.now()
    
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || ''
      
      if (!apiKey) {
        throw new Error('APIキーが設定されていません')
      }
      
      const genAI = new GoogleGenerativeAI(apiKey)
      
      // セーフティ設定（ラップバトル用に調整）
      const safetySettings = [
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
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
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        }
      ]
      
      // Gemini Pro を使用（より複雑な分析が必要）
      const generationConfig = {
        maxOutputTokens: 1500,
        temperature: 0.9,
        topP: 0.95,
        topK: 40,
      }
      
      const geminiModel = genAI.getGenerativeModel({ 
        model: 'gemini-1.5-pro',
        safetySettings,
        generationConfig
      })
      
      // アンサー特化型プロンプト
      const prompt = `あなたは「MC Gemin aka アンサーマシン」、日本最強のアンサー特化型ラッパーです。

【あなたの特徴】
${style}

【現在の状況】
- テーマ: "${theme}"
- 形式: ${bars}小節
- ポジション: ${position === 'first' ? '先行' : '後攻アンサー'}
- ラウンド: ${roundNumber}/${totalRounds}

【相手のリリック】
${opponentLyric}

【あなたのミッション - アンサー特化型として】
1. **相手の言葉を分析**: 相手が使った重要な単語・フレーズを特定
2. **言葉を拾って韻で返す**: 相手の言葉を引用しながら韻を踏んで反撃
3. **論理的な反論**: 相手の主張を論破し、優位性を示す
4. **話し口調でまくし立てる**: 聴衆に語りかけるような勢いのある表現
5. **完璧なカウンター**: 相手の攻撃を無効化し、逆転する

【重要な制約】
- 必ず相手のリリックから少なくとも3つの単語/フレーズを拾って使用
- その単語を使って韻を踏みながら反論
- 話し口調でリズミカルに、まくし立てるような勢い
- ${bars}小節できっちりまとめる
- 日本語の韻律を重視
- 品位を保ちつつ論理的に優位に立つ

【出力形式】
アンサーリリックのみを出力してください。解説や注釈は一切不要です。

${previousLyrics.length > 0 ? `
【これまでの流れ】
${previousLyrics.map((lyric, i) => `${i + 1}. ${lyric}`).join('\n')}
` : ''}`
      
      // リリック生成
      logger.info(`アンサー特化型リリック生成中... (${bars}小節)`)
      const result = await geminiModel.generateContent(prompt)
      
      if (!result || !result.response) {
        throw new Error('レスポンスが取得できませんでした')
      }
      
      const response = await result.response
      const text = response.text()
      
      if (!text) {
        throw new Error('リリックが生成されませんでした')
      }
      
      logger.info(`アンサー特化型リリック生成完了: ${text.length}文字`)
      
      // リリックの解析
      const cleanedLyrics = cleanLyrics(text)
      const rhymes = extractRhymes(cleanedLyrics)
      const punchlines = extractPunchlines(cleanedLyrics)
      const answerTo = extractAnswerPhrase(cleanedLyrics, opponentLyric)
      const pickedWords = extractPickedWords(cleanedLyrics, opponentLyric)
      const counterArguments = extractCounterArguments(cleanedLyrics, opponentLyric)
      
      const generationTime = Date.now() - startTime
      
      return {
        content: cleanedLyrics,
        bars,
        rhymes,
        punchlines,
        answerTo,
        pickedWords,
        counterArguments,
        generationTime
      }
    } catch (error) {
      logger.error('アンサー特化型リリック生成エラー:', error)
      throw error
    }
  }
})

/**
 * スピード特化型AIエージェント
 * 高速なフロウと瞬発力のあるリリックを生成
 */
export const generateSpeedSpecializedLyricsTool = createTool({
  id: 'generateSpeedSpecializedLyrics',
  description: 'スピード特化型のリリック生成。高速フロウと瞬発力重視。',
  inputSchema: z.object({
    theme: z.string().describe('バトルのテーマ'),
    bars: z.number().describe('小節数（8または16）'),
    style: z.string().describe('ラッパーのスタイル'),
    opponentLyric: z.string().optional().describe('相手のリリック'),
    previousLyrics: z.array(z.string()).optional().describe('これまでのリリック'),
    roundNumber: z.number().optional().describe('現在のラウンド番号'),
    totalRounds: z.number().optional().describe('総ラウンド数'),
    position: z.enum(['first', 'second']).describe('先行か後攻か')
  }),
  outputSchema: z.object({
    content: z.string().describe('生成されたリリック'),
    bars: z.number().describe('実際の小節数'),
    rhymes: z.array(z.string()).describe('使用した韻のリスト'),
    punchlines: z.array(z.string()).describe('パンチライン'),
    answerTo: z.string().optional().describe('アンサーしている相手のフレーズ'),
    speedTechniques: z.array(z.string()).describe('使用したスピード技法'),
    quickCounters: z.array(z.string()).describe('瞬発的なカウンター'),
    generationTime: z.number().describe('生成時間（ミリ秒）')
  }),
  execute: async ({ context }) => {
    const { 
      theme, 
      bars, 
      style, 
      opponentLyric, 
      previousLyrics = [], 
      roundNumber, 
      totalRounds, 
      position 
    } = context
    const startTime = Date.now()
    
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || ''
      
      if (!apiKey) {
        throw new Error('APIキーが設定されていません')
      }
      
      const genAI = new GoogleGenerativeAI(apiKey)
      
      // Gemini Flash を使用（スピード重視）
      const generationConfig = {
        maxOutputTokens: 800,
        temperature: 0.95,
        topP: 0.95,
        topK: 50,
      }
      
      const geminiModel = genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        generationConfig
      })
      
      // スピード特化型プロンプト
      const prompt = `あなたは「MC Flash」、日本最速のラッパーです。

【あなたの特徴】
${style}

【現在の状況】
- テーマ: "${theme}"
- 形式: ${bars}小節
- ポジション: ${position === 'first' ? '先行攻撃' : '高速カウンター'}
- ラウンド: ${roundNumber}/${totalRounds}

${opponentLyric ? `
【相手のリリック】
${opponentLyric}
` : ''}

【あなたのミッション - スピード特化型として】
1. **超高速フロウ**: 畳み掛けるような勢いとスピード感
2. **瞬発的な韻**: クイックで鋭い韻を連発
3. **テンポ重視**: リズムとビートを最優先
4. **カウンター攻撃**: 相手の隙を突く瞬発力
5. **まくし立てる勢い**: 息継ぎを感じさせない圧倒的な勢い

【重要な制約】
- 短いフレーズで畳み掛ける
- 韻の密度を高く保つ
- テンポ感を重視した改行と区切り
- ${bars}小節でスピード感を演出
- 相手に息つく暇を与えない

【出力形式】
スピードリリックのみを出力してください。解説や注釈は一切不要です。

${previousLyrics.length > 0 ? `
【これまでの流れ】
${previousLyrics.map((lyric, i) => `${i + 1}. ${lyric}`).join('\n')}
` : ''}`
      
      // リリック生成
      logger.info(`スピード特化型リリック生成中... (${bars}小節)`)
      const result = await geminiModel.generateContent(prompt)
      
      if (!result || !result.response) {
        throw new Error('レスポンスが取得できませんでした')
      }
      
      const response = await result.response
      const text = response.text()
      
      if (!text) {
        throw new Error('リリックが生成されませんでした')
      }
      
      logger.info(`スピード特化型リリック生成完了: ${text.length}文字`)
      
      // リリックの解析
      const cleanedLyrics = cleanLyrics(text)
      const rhymes = extractRhymes(cleanedLyrics)
      const punchlines = extractPunchlines(cleanedLyrics)
      const answerTo = opponentLyric ? extractAnswerPhrase(cleanedLyrics, opponentLyric) : undefined
      const speedTechniques = extractSpeedTechniques(cleanedLyrics)
      const quickCounters = extractQuickCounters(cleanedLyrics, opponentLyric)
      
      const generationTime = Date.now() - startTime
      
      return {
        content: cleanedLyrics,
        bars,
        rhymes,
        punchlines,
        answerTo,
        speedTechniques,
        quickCounters,
        generationTime
      }
    } catch (error) {
      logger.error('スピード特化型リリック生成エラー:', error)
      throw error
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
        line.includes('マジ') || line.includes('ヤバ') ||
        line.includes('おい') || line.includes('見ろ')) {
      punchlines.push(line)
    }
  })
  
  return punchlines.slice(0, 3) // 上位3つまで
}

function extractAnswerPhrase(lyrics: string, opponentLyric: string): string | undefined {
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

function extractPickedWords(lyrics: string, opponentLyric: string): string[] {
  const pickedWords: string[] = []
  const opponentWords = opponentLyric
    .split(/[、。！？\s]+/)
    .filter(word => word.length > 2)
  
  opponentWords.forEach(word => {
    if (lyrics.includes(word)) {
      pickedWords.push(word)
    }
  })
  
  return pickedWords
}

function extractCounterArguments(lyrics: string, _opponentLyric: string): string[] {
  const counterArguments: string[] = []
  const lines = lyrics.split('\n')
  
  // 反論を示すパターンを含む行を抽出
  lines.forEach(line => {
    if (line.includes('違う') || line.includes('そんなの') || 
        line.includes('でも') || line.includes('しかし') ||
        line.includes('逆に') || line.includes('むしろ') ||
        line.includes('それより') || line.includes('お前')) {
      counterArguments.push(line)
    }
  })
  
  return counterArguments.slice(0, 2)
}

function extractSpeedTechniques(lyrics: string): string[] {
  const techniques: string[] = []
  const lines = lyrics.split('\n')
  
  lines.forEach(line => {
    // スピード技法を示すパターンを抽出
    if (line.length > 30) { // 長い行はスピード技法
      techniques.push('長文畳み掛け')
    }
    if ((line.match(/、/g) || []).length > 2) { // 多くの区切り
      techniques.push('連続韻踏み')
    }
    if (line.includes('っ') && line.includes('ッ')) { // 促音多用
      techniques.push('促音アクセント')
    }
  })
  
  return [...new Set(techniques)] // 重複除去
}

function extractQuickCounters(lyrics: string, opponentLyric?: string): string[] {
  if (!opponentLyric) return []
  
  const quickCounters: string[] = []
  const lines = lyrics.split('\n')
  
  lines.forEach(line => {
    // 瞬発的なカウンターのパターン
    if (line.includes('即') || line.includes('瞬') || 
        line.includes('速') || line.includes('クイック')) {
      quickCounters.push(line)
    }
  })
  
  return quickCounters.slice(0, 2)
}

/**
 * 改善されたMCバトルエージェントサービス
 */
export class ImprovedMCBattleAgentService {
  constructor() {
    logger.info('改善されたMCバトルエージェントサービス初期化完了')
  }
  
  async generateLyrics(request: GenerateLyricRequest & { 
    position?: 'first' | 'second',
    participantId?: 'ai1' | 'ai2' 
  }): Promise<Lyric> {
    try {
      const { participantId = 'ai1', position = 'first' } = request
      
      logger.info('改善されたMCバトルリリック生成開始:', {
        theme: request.theme,
        bars: request.bars,
        style: request.style,
        model: request.model,
        participantId,
        position,
        hasOpponentLyric: !!request.opponentLatestLyric
      })
      
      let result: any
      
      // 参加者とポジションに応じて適切なエージェントを選択
      if (participantId === 'ai2' && position === 'second' && request.opponentLatestLyric) {
        // AI2 が後攻の場合はアンサー特化型を使用
        result = await generateAnswerSpecializedLyricsTool.execute({
          context: {
            theme: request.theme,
            bars: request.bars,
            style: request.style,
            opponentLyric: request.opponentLatestLyric,
            previousLyrics: request.previousLyrics,
            roundNumber: request.roundNumber,
            totalRounds: request.totalRounds,
            position
          },
          runtimeContext: {}
        } as any)
      } else {
        // AI1 またはAI2の先攻時はスピード特化型を使用
        result = await generateSpeedSpecializedLyricsTool.execute({
          context: {
            theme: request.theme,
            bars: request.bars,
            style: request.style,
            opponentLyric: request.opponentLatestLyric,
            previousLyrics: request.previousLyrics,
            roundNumber: request.roundNumber,
            totalRounds: request.totalRounds,
            position
          },
          runtimeContext: {}
        } as any)
      }
      
      if (!result) {
        throw new Error('リリック生成に失敗しました')
      }
      
      const lyric: Lyric = {
        id: `lyric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: result.content,
        bars: result.bars,
        rhymes: result.rhymes,
        punchlines: result.punchlines,
        answerTo: result.answerTo,
        generatedAt: new Date(),
        complianceScore: 1.0, // TODO: コンプライアンスチェック
        generationTime: result.generationTime
      }
      
      logger.info('改善されたMCバトルリリック生成完了:', {
        id: lyric.id,
        contentLength: lyric.content.length,
        rhymeCount: lyric.rhymes.length,
        punchlineCount: lyric.punchlines.length,
        hasAnswer: !!lyric.answerTo,
        generationTime: lyric.generationTime,
        participantId,
        position
      })
      
      return lyric
    } catch (error) {
      logger.error('改善されたMCバトルリリック生成エラー:', error)
      throw error
    }
  }
  
  async testConnection(): Promise<boolean> {
    try {
      // 接続テスト用の簡単なリリック生成
      const result = await generateSpeedSpecializedLyricsTool.execute({
        context: {
          theme: 'テスト',
          bars: 8,
          style: 'テスト用スタイル',
          position: 'first'
        },
        runtimeContext: {}
      } as any)
      
      return !!result
    } catch (error) {
      logger.error('改善されたMCバトルエージェント接続テスト失敗:', error)
      return false
    }
  }
}

// エクスポート
export const improvedMCBattleAgentService = new ImprovedMCBattleAgentService()