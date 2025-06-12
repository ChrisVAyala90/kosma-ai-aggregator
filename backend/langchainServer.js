require('dotenv').config();
const express = require('express');
const cors = require('cors');
const LangChainService = require('./services/langchainService');
const LangChainSynthesisService = require('./services/langchainSynthesisService');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize LangChain services
const langchainService = new LangChainService();
const synthesisService = new LangChainSynthesisService();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'Backend is healthy', 
    message: 'AI Aggregator backend with LangChain is running!',
    timestamp: new Date(),
    services: ['OpenAI', 'Anthropic', 'Google AI'],
    framework: 'LangChain'
  });
});

// Enhanced Aggregation Route with LangChain
app.post('/api/aggregate', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || prompt.trim().length === 0) {
    return res.status(400).json({ error: 'Prompt is required and cannot be empty' });
  }

  if (prompt.length > 2000) {
    return res.status(400).json({ error: 'Prompt is too long. Maximum 2000 characters allowed.' });
  }

  try {
    console.log(`\n=== LangChain Aggregation for prompt ===`);
    console.log(`Prompt: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`);
    console.log(`Prompt length: ${prompt.length} characters`);

    const startTime = Date.now();

    // Query all models using LangChain
    const modelResponses = await langchainService.queryAllModels(prompt);
    
    const queryTime = Date.now() - startTime;
    console.log(`\n=== Model queries completed in ${queryTime}ms ===`);

    // Log response status
    Object.entries(modelResponses).forEach(([model, response]) => {
      if (response && !response.includes('mock response')) {
        console.log(`${model}: SUCCESS - ${response.length} characters`);
      } else {
        console.log(`${model}: FALLBACK - Using mock response`);
      }
    });

    // Synthesize responses using LangChain
    const synthesisStartTime = Date.now();
    const synthesis = await synthesisService.synthesizeResponses(prompt, modelResponses);
    const synthesisTime = Date.now() - synthesisStartTime;

    console.log(`\n=== Synthesis completed in ${synthesisTime}ms ===`);
    console.log(`Confidence: ${synthesis.confidence} (${synthesis.confidenceScore}%)`);
    console.log(`Approach: ${synthesis.approach}`);
    console.log(`Valid models: ${synthesis.details.validModels}`);

    // Format individual responses for client
    const formattedResponses = {
      openai: modelResponses.openai || 'No response available',
      anthropic: modelResponses.anthropic || 'No response available',
      google: modelResponses.google || 'No response available'
    };

    // Prepare complete response
    const response = {
      prompt: prompt,
      synthesis: {
        response: synthesis.response,
        confidence: synthesis.confidence,
        confidenceScore: synthesis.confidenceScore,
        approach: synthesis.approach,
        sourcesUsed: Object.keys(modelResponses).filter(key => 
          modelResponses[key] && !modelResponses[key].includes('mock response')
        ),
        details: synthesis.details
      },
      individualResponses: formattedResponses,
      metadata: {
        processingTimeMs: Date.now() - startTime,
        queryTimeMs: queryTime,
        synthesisTimeMs: synthesisTime,
        timestamp: new Date().toISOString(),
        totalSources: 3,
        successfulSources: synthesis.details.validModels,
        framework: 'LangChain'
      }
    };

    res.json(response);

  } catch (error) {
    console.error('\n=== Error in /api/aggregate route ===');
    console.error('Error details:', error);
    res.status(500).json({ 
      error: 'Failed to aggregate responses due to an internal error.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// LangChain-specific endpoints
app.get('/api/models', (req, res) => {
  res.json({
    models: {
      openai: 'gpt-3.5-turbo',
      anthropic: 'claude-3-haiku-20240307',
      google: 'gemini-1.5-flash (with gemini-pro fallback)',
      synthesis: 'gpt-3.5-turbo'
    },
    framework: 'LangChain',
    features: [
      'Parallel model execution',
      'Automatic retries and fallbacks',
      'Structured output parsing',
      'Advanced synthesis with AI',
      'Token usage tracking',
      'Callback monitoring'
    ]
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 AI Aggregator Backend with LangChain running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Aggregation endpoint: POST http://localhost:${PORT}/api/aggregate`);
  console.log(`Model info: GET http://localhost:${PORT}/api/models`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Check for API keys
  const apiKeys = {
    'OpenAI': !!process.env.OPENAI_API_KEY,
    'Anthropic': !!process.env.ANTHROPIC_API_KEY,
    'Google': !!process.env.GOOGLE_AI_API_KEY
  };
  
  console.log('\n📋 API Key Status:');
  Object.entries(apiKeys).forEach(([service, hasKey]) => {
    console.log(`  ${service}: ${hasKey ? '✅ Configured' : '❌ Missing (will use fallbacks)'}`);
  });
  console.log('\n🔗 Using LangChain for unified AI model management');
  console.log('');
});