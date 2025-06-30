import { VertexAIService } from '@/services/vertexai'
import { VertexAI } from '@google-cloud/vertexai'

// Mock the VertexAI module
jest.mock('@google-cloud/vertexai', () => ({
  VertexAI: jest.fn().mockImplementation(() => ({
    preview: {
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: jest.fn().mockResolvedValue({
          response: {
            candidates: [{
              content: {
                parts: [{
                  text: `Yo, I'm spitting fire on this mic tonight
About technology, yeah that's right
AI and code, that's my domain
Dropping bars like I'm insane`
                }]
              }
            }]
          }
        })
      })
    }
  })),
  HarmCategory: {
    HARM_CATEGORY_HATE_SPEECH: 'HARM_CATEGORY_HATE_SPEECH',
    HARM_CATEGORY_DANGEROUS_CONTENT: 'HARM_CATEGORY_DANGEROUS_CONTENT',
    HARM_CATEGORY_HARASSMENT: 'HARM_CATEGORY_HARASSMENT',
    HARM_CATEGORY_SEXUALLY_EXPLICIT: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
  },
  HarmBlockThreshold: {
    BLOCK_MEDIUM_AND_ABOVE: 'BLOCK_MEDIUM_AND_ABOVE',
  }
}))

describe('VertexAIService', () => {
  let vertexAIService: VertexAIService

  beforeEach(() => {
    vertexAIService = new VertexAIService()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('generateLyric', () => {
    it('should generate lyrics with Gemini Flash model', async () => {
      const request = {
        theme: 'technology',
        previousLyrics: [],
        style: 'Fast and witty',
        model: 'gemini-flash' as const,
      }

      const result = await vertexAIService.generateLyric(request)

      expect(result).toContain('technology')
      expect(result).not.toContain('```') // Should be cleaned
      expect(result.split('\n').length).toBeGreaterThan(0)
    })

    it('should generate lyrics with Gemini Pro model', async () => {
      const request = {
        theme: 'space exploration',
        previousLyrics: ['First verse about rockets'],
        style: 'Deep and philosophical',
        model: 'gemini-pro' as const,
        maxTokens: 400,
      }

      const result = await vertexAIService.generateLyric(request)

      expect(result).toBeTruthy()
      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle generation errors gracefully', async () => {
      // Mock a failed response
      const mockGenerateContent = jest.fn().mockRejectedValue(new Error('API Error'))
      ;(VertexAI as any).mockImplementationOnce(() => ({
        preview: {
          getGenerativeModel: jest.fn().mockReturnValue({
            generateContent: mockGenerateContent
          })
        }
      }))

      const service = new VertexAIService()
      const request = {
        theme: 'test',
        style: 'test style',
        model: 'gemini-flash' as const,
      }

      await expect(service.generateLyric(request)).rejects.toThrow('API Error')
    })

    it('should clean generated lyrics properly', async () => {
      // Mock response with markdown and stage directions
      const mockResponse = {
        response: {
          candidates: [{
            content: {
              parts: [{
                text: `\`\`\`
# Rap Verse
(Beat drops)
Yo, this is my rap
(Crowd cheers)
About technology, snap!
\`\`\``
              }]
            }
          }]
        }
      }

      const mockGenerateContent = jest.fn().mockResolvedValue(mockResponse)
      ;(VertexAI as any).mockImplementationOnce(() => ({
        preview: {
          getGenerativeModel: jest.fn().mockReturnValue({
            generateContent: mockGenerateContent
          })
        }
      }))

      const service = new VertexAIService()
      const result = await service.generateLyric({
        theme: 'test',
        style: 'test',
        model: 'gemini-flash' as const,
      })

      expect(result).not.toContain('```')
      expect(result).not.toContain('(Beat drops)')
      expect(result).not.toContain('(Crowd cheers)')
      expect(result).not.toContain('#')
    })
  })

  describe('testConnection', () => {
    it('should return true when connection is successful', async () => {
      const result = await vertexAIService.testConnection()
      expect(result).toBe(true)
    })

    it('should return false when connection fails', async () => {
      const mockGenerateContent = jest.fn().mockRejectedValue(new Error('Connection failed'))
      ;(VertexAI as any).mockImplementationOnce(() => ({
        preview: {
          getGenerativeModel: jest.fn().mockReturnValue({
            generateContent: mockGenerateContent
          })
        }
      }))

      const service = new VertexAIService()
      const result = await service.testConnection()
      expect(result).toBe(false)
    })
  })
})