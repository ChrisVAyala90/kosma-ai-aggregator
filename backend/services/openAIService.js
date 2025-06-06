// backend/services/openAIService.js
const axios = require('axios');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

async function getOpenAIResponse(prompt) {
  console.log('Calling OpenAI Service for prompt:', prompt.substring(0, 50) + '...');
  
  if (!OPENAI_API_KEY) {
    console.warn('OpenAI API key not found. Using mock response.');
    return await getMockOpenAIResponse(prompt);
  }

  try {
    console.log('Making actual OpenAI API call...');
    
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 400,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    const content = response.data.choices[0].message.content;
    console.log(`✅ OpenAI API call successful. Response length: ${content.length} characters`);
    
    return content;

  } catch (error) {
    console.error('❌ OpenAI API Error:', error.response?.status, error.response?.data?.error?.message || error.message);
    
    // Handle quota exceeded or billing issues
    if (error.response?.status === 429) {
      console.warn('OpenAI quota exceeded. Using enhanced mock response.');
      return await getEnhancedMockResponse(prompt, 'OpenAI');
    }
    
    if (error.response?.status === 401) {
      console.warn('OpenAI authentication failed. Using enhanced mock response.');
      return await getEnhancedMockResponse(prompt, 'OpenAI');
    }
    
    // For other errors, return mock response instead of failing
    console.warn('OpenAI API unavailable. Using enhanced mock response.');
    return await getEnhancedMockResponse(prompt, 'OpenAI');
  }
}

async function getMockOpenAIResponse(prompt) {
  await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));
  return `Mock OpenAI (GPT-3.5) response: This is a simulated response to "${prompt.substring(0, 30)}..." - In a real implementation, GPT would provide detailed analysis and suggestions based on its training data.`;
}

async function getEnhancedMockResponse(prompt, service) {
  await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));
  
  const responses = {
    'OpenAI': `Enhanced ${service} Response: Regarding "${prompt.substring(0, 40)}..." - This would typically involve analyzing the query, considering multiple perspectives, and providing structured recommendations. Key considerations would include practical implementation, potential challenges, and best practices in the field.`,
  };
  
  return responses[service] || `Enhanced ${service} response for: ${prompt.substring(0, 50)}...`;
}

module.exports = { getOpenAIResponse };