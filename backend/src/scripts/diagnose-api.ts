#!/usr/bin/env node
import 'dotenv/config'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createLogger } from '../utils/logger'

const logger = createLogger('diagnose-api')

async function diagnoseAPIConfiguration() {
  logger.info('Starting API diagnosis...')
  
  // 1. Check environment variables
  logger.info('\n=== Environment Variables ===')
  const envVars = {
    'GEMINI_API_KEY': process.env.GEMINI_API_KEY ? '✓ Set' : '✗ Missing',
    'GOOGLE_API_KEY': process.env.GOOGLE_API_KEY ? '✓ Set' : '✗ Missing',
    'GOOGLE_APPLICATION_CREDENTIALS': process.env.GOOGLE_APPLICATION_CREDENTIALS ? '✓ Set' : '✗ Missing',
    'GOOGLE_CLOUD_PROJECT_ID': process.env.GOOGLE_CLOUD_PROJECT_ID ? '✓ Set' : '✗ Missing',
  }
  
  for (const [key, value] of Object.entries(envVars)) {
    logger.info(`${key}: ${value}`)
  }
  
  // 2. Test Gemini API connection
  logger.info('\n=== Testing Gemini API Connection ===')
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  
  if (!apiKey) {
    logger.error('No API key found! Please set GEMINI_API_KEY or GOOGLE_API_KEY')
    return
  }
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    
    // Simple test prompt
    logger.info('Sending test request to Gemini API...')
    const startTime = Date.now()
    
    const result = await model.generateContent('Say "API test successful" in exactly 3 words')
    const response = await result.response
    const text = response.text()
    
    const elapsed = Date.now() - startTime
    
    logger.info(`✓ API Response: ${text}`)
    logger.info(`✓ Response time: ${elapsed}ms`)
    
    // Test with a longer prompt (similar to actual usage)
    logger.info('\n=== Testing with Rap Battle Prompt ===')
    const rapStartTime = Date.now()
    
    const rapResult = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{
          text: 'Generate a short 4-bar rap verse about technology. Keep it under 50 words.'
        }]
      }],
      generationConfig: {
        maxOutputTokens: 200,
        temperature: 0.8,
      }
    })
    
    const rapResponse = await rapResult.response
    const rapText = rapResponse.text()
    const rapElapsed = Date.now() - rapStartTime
    
    logger.info(`✓ Rap Response: ${rapText}`)
    logger.info(`✓ Response time: ${rapElapsed}ms`)
    
  } catch (error: any) {
    logger.error('✗ API Test Failed:', {
      message: error.message,
      status: error.status,
      statusText: error.statusText,
      details: error.errorDetails,
      stack: error.stack
    })
    
    // Provide specific guidance based on error
    if (error.message?.includes('API key not valid')) {
      logger.error('\nSolution: Your API key is invalid. Please check:')
      logger.error('1. The API key is correct and not expired')
      logger.error('2. The Gemini API is enabled in your Google Cloud project')
      logger.error('3. Visit: https://makersuite.google.com/app/apikey')
    } else if (error.message?.includes('fetch failed')) {
      logger.error('\nSolution: Network error. Please check:')
      logger.error('1. Your internet connection')
      logger.error('2. Any firewall or proxy settings')
      logger.error('3. The Gemini API endpoint is accessible')
    } else if (error.status === 429) {
      logger.error('\nSolution: Rate limit exceeded. Please:')
      logger.error('1. Wait a few minutes before retrying')
      logger.error('2. Consider implementing request throttling')
      logger.error('3. Check your API quota in Google Cloud Console')
    }
  }
  
  // 3. Test Google Cloud Text-to-Speech
  logger.info('\n=== Testing Text-to-Speech API ===')
  try {
    const { TextToSpeechClient } = await import('@google-cloud/text-to-speech')
    const ttsClient = new TextToSpeechClient()
    
    const ttsStartTime = Date.now()
    const [response] = await ttsClient.synthesizeSpeech({
      input: { text: 'Test' },
      voice: { languageCode: 'en-US', ssmlGender: 'NEUTRAL' },
      audioConfig: { audioEncoding: 'MP3' },
    })
    
    const ttsElapsed = Date.now() - ttsStartTime
    
    if (response.audioContent) {
      logger.info(`✓ TTS API working`)
      logger.info(`✓ Response time: ${ttsElapsed}ms`)
    }
  } catch (error: any) {
    logger.error('✗ TTS API Test Failed:', error.message)
    logger.error('Solution: Check GOOGLE_APPLICATION_CREDENTIALS points to valid service account key')
  }
  
  logger.info('\n=== Diagnosis Complete ===')
}

// Run diagnosis
diagnoseAPIConfiguration().catch(console.error)