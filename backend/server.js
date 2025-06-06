// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3001;

// Import AI service functions
const { getOpenAIResponse } = require('./services/openAIService');
const { getAnthropicResponse } = require('./services/anthropicService');
const { getGoogleAIResponse } = require('./services/googleAIService');
const { synthesizeResponses } = require('./services/synthesisService');

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'Backend is healthy', 
    message: 'AI Aggregator backend is running!',
    timestamp: new Date(),
    services: ['OpenAI', 'Anthropic', 'Google AI']
  });
});

// --- Enhanced Aggregation Route ---
app.post('/api/aggregate', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || prompt.trim().length === 0) {
    return res.status(400).json({ error: 'Prompt is required and cannot be empty' });
  }

  // Validate prompt length
  if (prompt.length > 2000) {
    return res.status(400).json({ error: 'Prompt is too long. Maximum 2000 characters allowed.' });
  }

  try {
    console.log(`\n=== Aggregating responses for prompt ===`);
    console.log(`Prompt: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`);
    console.log(`Prompt length: ${prompt.length} characters`);

    const startTime = Date.now();

    // Call AI services in parallel with timeout
    const timeoutMs = 15000; // 15 second timeout
    const results = await Promise.allSettled([
      Promise.race([
        getOpenAIResponse(prompt),
        new Promise((_, reject) => setTimeout(() => reject(new Error('OpenAI timeout')), timeoutMs))
      ]),
      Promise.race([
        getAnthropicResponse(prompt),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Anthropic timeout')), timeoutMs))
      ]),
      Promise.race([
        getGoogleAIResponse(prompt),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Google AI timeout')), timeoutMs))
      ])
    ]);

    const processingTime = Date.now() - startTime;

    // Process individual responses
    const individualResponses = {
      openai: results[0].status === 'fulfilled' ? results[0].value : { 
        error: true, 
        message: results[0].reason?.message || 'OpenAI call failed',
        source: 'OpenAI'
      },
      anthropic: results[1].status === 'fulfilled' ? results[1].value : { 
        error: true, 
        message: results[1].reason?.message || 'Anthropic call failed',
        source: 'Anthropic'
      },
      google: results[2].status === 'fulfilled' ? results[2].value : { 
        error: true, 
        message: results[2].reason?.message || 'Google AI call failed',
        source: 'Google'
      }
    };

    // Log results
    console.log('\n=== Individual Response Status ===');
    Object.entries(individualResponses).forEach(([service, response]) => {
      if (response.error) {
        console.log(`${service}: ERROR - ${response.message}`);
      } else {
        console.log(`${service}: SUCCESS - ${typeof response === 'string' ? response.length : 'Unknown'} characters`);
      }
    });

    // Generate synthesis
    const synthesis = synthesizeResponses(individualResponses);

    console.log(`\n=== Synthesis Complete ===`);
    console.log(`Confidence: ${synthesis.confidence} (${synthesis.confidenceScore}%)`);
    console.log(`Approach: ${synthesis.approach}`);
    console.log(`Sources used: ${synthesis.sourcesUsed.join(', ')}`);
    console.log(`Total processing time: ${processingTime}ms`);

    // Prepare response
    const response = {
      prompt: prompt,
      synthesis: synthesis,
      individualResponses: individualResponses,
      metadata: {
        processingTimeMs: processingTime,
        timestamp: new Date().toISOString(),
        totalSources: Object.keys(individualResponses).length,
        successfulSources: synthesis.sourcesUsed.length
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
  console.log(`\n🚀 AI Aggregator Backend running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Aggregation endpoint: POST http://localhost:${PORT}/api/aggregate`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Check for API keys
  const apiKeys = {
    'OpenAI': !!process.env.OPENAI_API_KEY,
    'Anthropic': !!process.env.ANTHROPIC_API_KEY,
    'Google': !!process.env.GOOGLE_API_KEY
  };
  
  console.log('\n📋 API Key Status:');
  Object.entries(apiKeys).forEach(([service, hasKey]) => {
    console.log(`  ${service}: ${hasKey ? '✅ Configured' : '❌ Missing (using mock)'}`);
  });
  console.log('');
});