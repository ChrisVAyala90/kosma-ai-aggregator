// backend/services/googleAIService.js
const axios = require('axios');

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

async function getGoogleAIResponse(prompt) {
  console.log('Calling Google AI Service for prompt:', prompt.substring(0, 50) + '...');
  
  if (!GOOGLE_API_KEY) {
    console.warn('Google AI API key not found. Using mock response.');
    return await getMockGoogleResponse(prompt);
  }

  try {
    console.log('Making actual Google AI API call...');
    
    // Updated to use the correct v1 API endpoint and model name
    const GOOGLE_API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GOOGLE_API_KEY}`;
    
    const response = await axios.post(
      GOOGLE_API_URL,
      {
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          maxOutputTokens: 400,
          temperature: 0.7,
          topP: 0.8,
          topK: 40
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    // Check if response has candidates
    if (!response.data.candidates || response.data.candidates.length === 0) {
      console.warn('Google AI returned no candidates. Using enhanced mock response.');
      return await getEnhancedMockResponse(prompt, 'Google');
    }

    const candidate = response.data.candidates[0];
    
    // Check for content filtering
    if (candidate.finishReason === 'SAFETY') {
      console.warn('Content filtered by Google AI safety. Using enhanced mock response.');
      return await getEnhancedMockResponse(prompt, 'Google');
    }

    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      console.warn('Google AI returned empty content. Using enhanced mock response.');
      return await getEnhancedMockResponse(prompt, 'Google');
    }

    const content = candidate.content.parts[0].text;
    console.log(`✅ Google AI API call successful. Response length: ${content.length} characters`);
    
    return content;

  } catch (error) {
    console.error('❌ Google AI API Error:', error.response?.status, error.response?.data?.error?.message || error.message);
    
    // Handle model not found (try fallback model)
    if (error.response?.status === 404) {
      console.warn('Google AI model not found. Trying fallback model...');
      return await tryFallbackModel(prompt);
    }
    
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.warn('Google AI authentication/permission failed. Using enhanced mock response.');
      return await getEnhancedMockResponse(prompt, 'Google');
    }
    
    // For other errors, return mock response instead of failing
    console.warn('Google AI API unavailable. Using enhanced mock response.');
    return await getEnhancedMockResponse(prompt, 'Google');
  }
}

async function tryFallbackModel(prompt) {
  try {
    console.log('Trying Google AI fallback model...');
    
    // Try the older model name as fallback
    const FALLBACK_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GOOGLE_API_KEY}`;
    
    const response = await axios.post(
      FALLBACK_URL,
      {
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    if (response.data.candidates && response.data.candidates[0]?.content?.parts?.[0]?.text) {
      const content = response.data.candidates[0].content.parts[0].text;
      console.log(`✅ Google AI fallback model successful. Response length: ${content.length} characters`);
      return content;
    }
  } catch (fallbackError) {
    console.warn('Fallback model also failed:', fallbackError.message);
  }
  
  // If fallback also fails, use enhanced mock
  return await getEnhancedMockResponse(prompt, 'Google');
}

async function getMockGoogleResponse(prompt) {
  await new Promise(resolve => setTimeout(resolve, 350 + Math.random() * 250));
  return `Mock Google AI (Gemini) response: This is a simulated response to "${prompt.substring(0, 30)}..." - Gemini would typically provide comprehensive information with factual accuracy and structured formatting.`;
}

async function getEnhancedMockResponse(prompt, service) {
  await new Promise(resolve => setTimeout(resolve, 350 + Math.random() * 250));
  
  const responses = {
    'Google': `Enhanced ${service} Response: Analyzing "${prompt.substring(0, 40)}..." - This would include comprehensive research-backed information, structured data presentation, and multiple viewpoints. Google's AI typically excels at factual accuracy and providing detailed explanations with examples.`,
  };
  
  return responses[service] || `Enhanced ${service} response for: ${prompt.substring(0, 50)}...`;
}

module.exports = { getGoogleAIResponse };