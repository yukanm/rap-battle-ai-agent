const axios = require('axios');

const API_URL = 'http://localhost:8456/api/agent';

async function testAgentEndpoints() {
  console.log('Testing Japanese Rap AI Agent API endpoints...\n');

  try {
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const health = await axios.get(`${API_URL}/health`);
    console.log('Health check:', health.data);
    console.log('✅ Health check passed\n');

    // Test 2: Generate Japanese theme
    console.log('2. Testing Japanese theme generation...');
    const theme = await axios.post(`${API_URL}/generate-theme`, {
      categories: ['culture']
    });
    console.log('Generated Japanese theme:', theme.data);
    console.log('✅ Japanese theme generation passed\n');

    // Test 3: Generate Japanese lyrics
    console.log('3. Testing Japanese lyrics generation...');
    const lyrics = await axios.post(`${API_URL}/generate-lyrics`, {
      theme: theme.data.data.theme,
      rapperStyle: '力強く感情的なスタイル',
      userName: 'テストユーザー'
    });
    console.log('Generated Japanese lyrics:', lyrics.data);
    console.log('✅ Japanese lyrics generation passed\n');

    // Test 4: Check compliance with Japanese content
    console.log('4. Testing compliance check with Japanese content...');
    const compliance = await axios.post(`${API_URL}/check-compliance`, {
      content: lyrics.data.data.lyrics
    });
    console.log('Compliance result for Japanese lyrics:', compliance.data);
    console.log('✅ Japanese compliance check passed\n');

    console.log('All Japanese Rap AI tests passed! 🎤🇯🇵✅');
  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run tests
testAgentEndpoints();