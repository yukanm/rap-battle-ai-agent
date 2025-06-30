import { GoogleGenerativeAI } from '@google/generative-ai'
import { config } from '@/config'
import { createLogger } from '@/utils/logger'
import type { GenerateLyricRequest } from '@/types'

const logger = createLogger('vertex-ai')

export class VertexAIService {
  private ai: GoogleGenerativeAI
  private geminiFlash: any
  private geminiPro: any
  
  constructor() {
    // Initialize Google Generative AI
    this.ai = new GoogleGenerativeAI(config.geminiApiKey)
    
    // Safety settings for content generation
    const safetySettings = [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      }
    ]
    
    // Generation config for Flash model (fast responses)
    this.geminiFlash = {
      model: 'gemini-2.5-flash',
      config: {
        maxOutputTokens: 300,
        temperature: 0.9,
        topP: 0.95,
        topK: 40,
        safetySettings,
      }
    }
    
    // Generation config for Pro model (creative responses)
    this.geminiPro = {
      model: 'gemini-2.5-pro',
      config: {
        maxOutputTokens: 400,
        temperature: 0.85,
        topP: 0.9,
        topK: 40,
        safetySettings,
      }
    }
  }
  
  async generateLyric(request: GenerateLyricRequest): Promise<string> {
    const { theme, previousLyrics = [], style, model } = request
    
    // Build prompt
    const prompt = this.buildPrompt(theme, previousLyrics, style)
    
    // Select model configuration
    const modelConfig = model === 'gemini-flash' ? this.geminiFlash : this.geminiPro
    
    try {
      logger.info(`Generating lyrics with ${modelConfig.model} model`)
      const startTime = Date.now()
      
      // Get model instance
      const model = this.ai.getGenerativeModel({
        model: modelConfig.model,
        generationConfig: modelConfig.config
      })
      
      // Generate content
      const result = await model.generateContent(prompt)
      
      // Extract text from response
      let generatedText = ''
      if (result.response && result.response.text) {
        generatedText = result.response.text()
      } else if (result.response.candidates && result.response.candidates.length > 0) {
        const candidate = result.response.candidates[0]
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
          generatedText = candidate.content.parts[0].text || ''
        }
      }
      
      if (!generatedText || generatedText.trim().length === 0) {
        throw new Error('No text content generated')
      }
      
      const generationTime = Date.now() - startTime
      logger.info(`Lyrics generated in ${generationTime}ms`)
      
      // Clean and format the response
      return this.cleanLyrics(generatedText)
      
    } catch (error) {
      logger.error('Error generating lyrics:', error)
      throw error
    }
  }
  
  private buildPrompt(theme: string, previousLyrics: string[], style: string): string {
    let prompt = `You are a skilled rap artist performing in a high-stakes rap battle. 
Your style: ${style}

The battle theme is: "${theme}"

Generate a rap verse (4-8 bars) that:
1. Stays on theme
2. Uses creative wordplay and metaphors
3. Has strong rhythm and flow
4. Is competitive but respectful
5. Avoids profanity and offensive content

Format: Write only the lyrics, no explanations or stage directions.`

    if (previousLyrics.length > 0) {
      prompt += `\n\nPrevious verses in this battle:\n${previousLyrics.join('\n\n')}\n\nRespond to and build upon what's been said.`
    }
    
    return prompt
  }
  
  private cleanLyrics(text: string): string {
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
  
  async testConnection(): Promise<boolean> {
    try {
      const model = this.ai.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
          maxOutputTokens: 50,
          temperature: 0.1,
        }
      })
      
      await model.generateContent('Say "Connection successful" in exactly 2 words.')
      
      logger.info('Vertex AI connection test successful')
      return true
    } catch (error) {
      logger.error('Vertex AI connection test failed:', error)
      return false
    }
  }
}

export async function initializeVertexAI() {
  try {
    const service = new VertexAIService()
    const isConnected = await service.testConnection()
    
    if (!isConnected) {
      throw new Error('Failed to connect to Vertex AI')
    }
    
    logger.info('Vertex AI service initialized successfully')
    return service
  } catch (error) {
    logger.error('Failed to initialize Vertex AI:', error)
    throw error
  }
}