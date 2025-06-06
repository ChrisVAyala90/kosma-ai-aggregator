// backend/services/anthropicService.js
const axios = require('axios');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

async function getAnthropicResponse(prompt) {
  console.log('Calling Anthropic Service for prompt:', prompt.substring(0, 50) + '...');
  
  if (!ANTHROPIC_API_KEY) {
    console.warn('Anthropic API key not found. Using mock response.');
    return await getMockAnthropicResponse(prompt);
  }

  try {
    console.log('Making actual Anthropic API call...');
    
    const response = await axios.post(
      ANTHROPIC_API_URL,
      {
        model: "claude-3-haiku-20240307",
        max_tokens: 400,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      },
      {
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    const content = response.data.content[0].text;
    console.log(`✅ Anthropic API call successful. Response length: ${content.length} characters`);
    
    return content;

  } catch (error) {
    console.error('❌ Anthropic API Error:', error.response?.status, error.response?.data?.error?.message || error.message);
    
    // Handle low credit balance
    if (error.response?.status === 400 && error.response?.data?.error?.message?.includes('credit balance')) {
      console.warn('Anthropic credit balance too low. Using enhanced mock response.');
      return await getEnhancedMockResponse(prompt, 'Anthropic');
    }
    
    if (error.response?.status === 401) {
      console.warn('Anthropic authentication failed. Using enhanced mock response.');
      return await getEnhancedMockResponse(prompt, 'Anthropic');
    }
    
    // For other errors, return mock response instead of failing
    console.warn('Anthropic API unavailable. Using enhanced mock response.');
    return await getEnhancedMockResponse(prompt, 'Anthropic');
  }
}

async function getMockAnthropicResponse(prompt) {
  await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 300));
  return `Mock Anthropic (Claude) response: This is a simulated response to "${prompt.substring(0, 30)}..." - Claude would typically provide thoughtful analysis with attention to nuance, safety considerations, and helpful step-by-step guidance.`;
}

async function getEnhancedMockResponse(prompt, service) {
  await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 300));
  
  const responses = {
    'Anthropic': `Enhanced ${service} Response: Looking at "${prompt.substring(0, 40)}..." - This response would emphasize careful reasoning, ethical considerations, and practical implementation steps. Claude typically provides balanced perspectives and acknowledges potential limitations or uncertainties.`,
  };
  
  return responses[service] || `Enhanced ${service} response for: ${prompt.substring(0, 50)}...`;
}

module.exports = { getAnthropicResponse };