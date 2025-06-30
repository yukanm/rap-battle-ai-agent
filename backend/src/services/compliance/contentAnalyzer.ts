interface AnalysisResult {
  safe: boolean
  penalty: number
  reasons: string[]
}

export class ContentAnalyzer {
  constructor() {}

  /**
   * コンテンツ品質分析
   */
  analyzeQuality(content: string): AnalysisResult {
    const reasons: string[] = []
    let penalty = 0

    // 長さチェック
    if (content.length < 10) {
      penalty += 0.3
      reasons.push('コンテンツが短すぎます（10文字未満）')
    } else if (content.length < 30) {
      penalty += 0.1
      reasons.push('コンテンツが比較的短いです（30文字未満）')
    }

    // 長すぎるチェック
    if (content.length > 1000) {
      penalty += 0.1
      reasons.push('コンテンツが長すぎます（1000文字超）')
    }

    // 同じ文字の繰り返しチェック
    const repeatedCharPattern = /(.)\1{10,}/g
    if (repeatedCharPattern.test(content)) {
      penalty += 0.2
      reasons.push('同じ文字の過度な繰り返しが検出されました')
    }

    // 大文字の過度な使用
    const upperCaseRatio = (content.match(/[A-Z]/g) || []).length / content.length
    if (upperCaseRatio > 0.5 && content.length > 20) {
      penalty += 0.1
      reasons.push('大文字の使用が過度です')
    }

    // 特殊文字の過度な使用
    const specialCharRatio = (content.match(/[!@#$%^&*()_+={}\[\]:";'<>?,./]/g) || []).length / content.length
    if (specialCharRatio > 0.3) {
      penalty += 0.1
      reasons.push('特殊文字の使用が過度です')
    }

    return {
      safe: penalty === 0,
      penalty: Math.min(penalty, 1.0),
      reasons
    }
  }

  /**
   * 日本語特有のチェック
   */
  checkJapaneseSpecific(content: string): AnalysisResult {
    const reasons: string[] = []
    let penalty = 0

    // ひらがな・カタカナ・漢字のバランスチェック
    const hiragana = (content.match(/[\u3040-\u309F]/g) || []).length
    const katakana = (content.match(/[\u30A0-\u30FF]/g) || []).length
    const kanji = (content.match(/[\u4E00-\u9FAF]/g) || []).length
    const japanese = hiragana + katakana + kanji

    if (japanese > 0) {
      // 日本語が含まれている場合の特別チェック
      
      // カタカナのみの長い文字列（スパム的）
      const katakanaOnlyPattern = /[\u30A0-\u30FF]{20,}/g
      if (katakanaOnlyPattern.test(content)) {
        penalty += 0.2
        reasons.push('カタカナのみの長い文字列が検出されました')
      }

      // 日本語での不適切な表現
      const inappropriateJapanese = [
        'きもい', 'うざい', 'むかつく', 'しね', 'ばか', 'あほ',
        'ぶす', 'でぶ', 'はげ', 'ちび'
      ]

      const lowerContent = content.toLowerCase()
      for (const word of inappropriateJapanese) {
        if (lowerContent.includes(word)) {
          penalty += 0.2
          reasons.push(`不適切な日本語表現: "${word}"`)
        }
      }

      // 敬語の不適切な使用（極端に丁寧すぎる場合）
      const excessiveKeigo = [
        'させていただきます', 'いたします', 'でございます'
      ]
      let keigoCount = 0
      for (const keigo of excessiveKeigo) {
        keigoCount += (content.match(new RegExp(keigo, 'g')) || []).length
      }
      
      if (keigoCount > 5) {
        penalty += 0.1
        reasons.push('過度に丁寧な敬語の使用')
      }
    }

    return {
      safe: penalty === 0,
      penalty: Math.min(penalty, 1.0),
      reasons
    }
  }

  /**
   * ラップバトル特有のチェック
   */
  checkRapBattleSpecific(content: string): AnalysisResult {
    const reasons: string[] = []
    let penalty = 0

    // ラップバトルで避けるべき要素
    const inappropriateForRapBattle = [
      // 政治的な内容
      '政治', '選挙', '政党', '政治家', '総理', '大統領',
      // 宗教的な内容
      '宗教', '神', '仏', 'キリスト', 'イスラム', '創価',
      // 実在の人物への誹謗中傷
      '芸能人', 'タレント', 'アイドル'
    ]

    const lowerContent = content.toLowerCase()
    for (const topic of inappropriateForRapBattle) {
      if (lowerContent.includes(topic)) {
        penalty += 0.15
        reasons.push(`ラップバトルに不適切なトピック: "${topic}"`)
      }
    }

    // 個人情報の言及
    const personalInfoPatterns = [
      /住所/g,
      /電話番号/g,
      /メールアドレス/g,
      /本名/g,
      /学校名/g,
      /会社名/g
    ]

    for (const pattern of personalInfoPatterns) {
      if (pattern.test(content)) {
        penalty += 0.3
        reasons.push('個人情報に関する言及が検出されました')
      }
    }

    // ラップバトルらしさのチェック（ポジティブ評価）
    const rapBattleElements = [
      'rhyme', 'flow', 'beat', 'mic', 'stage', 'battle',
      '韻', 'フロー', 'ビート', 'マイク', 'ステージ', 'バトル',
      'yo', 'check', 'uh', 'yeah'
    ]

    let rapElements = 0
    for (const element of rapBattleElements) {
      if (lowerContent.includes(element.toLowerCase())) {
        rapElements++
      }
    }

    // ラップ要素が少ない場合は軽微なペナルティ
    if (rapElements === 0 && content.length > 50) {
      penalty += 0.05
      reasons.push('ラップバトル要素が不足しています')
    }

    // 韻律チェック（簡易版）
    const lines = content.split(/\n|。|！|？/)
    if (lines.length >= 2) {
      // 最後の音の類似性をチェック（簡易的）
      const lastSounds = lines
        .filter(line => line.trim().length > 0)
        .map(line => line.trim().slice(-2))
      
      // 韻を踏んでいるかの簡易チェック
      const uniqueSounds = new Set(lastSounds)
      const rhymeRatio = 1 - (uniqueSounds.size / lastSounds.length)
      
      if (rhymeRatio < 0.3 && lines.length >= 4) {
        penalty += 0.1
        reasons.push('韻律が不十分です')
      }
    }

    return {
      safe: penalty === 0,
      penalty: Math.min(penalty, 1.0),
      reasons
    }
  }

  /**
   * 感情分析（簡易版）
   */
  analyzeEmotion(content: string): {
    positive: number
    negative: number
    neutral: number
    dominant: 'positive' | 'negative' | 'neutral'
  } {
    const positiveWords = [
      'good', 'great', 'awesome', 'amazing', 'excellent', 'fantastic',
      'いい', 'すごい', '最高', '素晴らしい', '良い', 'かっこいい'
    ]

    const negativeWords = [
      'bad', 'terrible', 'awful', 'horrible', 'disgusting', 'hate',
      '悪い', 'ひどい', '最悪', 'だめ', 'むかつく', '嫌い'
    ]

    const lowerContent = content.toLowerCase()
    
    let positiveScore = 0
    let negativeScore = 0

    for (const word of positiveWords) {
      positiveScore += (lowerContent.match(new RegExp(word.toLowerCase(), 'g')) || []).length
    }

    for (const word of negativeWords) {
      negativeScore += (lowerContent.match(new RegExp(word.toLowerCase(), 'g')) || []).length
    }

    const total = positiveScore + negativeScore
    const positive = total > 0 ? positiveScore / total : 0
    const negative = total > 0 ? negativeScore / total : 0
    const neutral = 1 - positive - negative

    let dominant: 'positive' | 'negative' | 'neutral' = 'neutral'
    if (positive > negative && positive > neutral) {
      dominant = 'positive'
    } else if (negative > positive && negative > neutral) {
      dominant = 'negative'
    }

    return { positive, negative, neutral, dominant }
  }
} 