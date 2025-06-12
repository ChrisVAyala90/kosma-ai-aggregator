const { ChatOpenAI } = require('@langchain/openai');
const { PromptTemplate, ChatPromptTemplate } = require('@langchain/core/prompts');
const { StructuredOutputParser } = require('@langchain/core/output_parsers');
const { z } = require('zod');
const { RunnableSequence } = require('@langchain/core/runnables');

class LangChainSynthesisService {
  constructor() {
    this.initializeSynthesisModel();
    this.setupParsers();
    this.setupChains();
  }

  initializeSynthesisModel() {
    // Use a more capable model for synthesis
    if (process.env.OPENAI_API_KEY) {
      try {
        this.synthesisModel = new ChatOpenAI({
          modelName: 'gpt-3.5-turbo',
          temperature: 0.3, // Lower temperature for more consistent synthesis
          maxTokens: 800,
          openAIApiKey: process.env.OPENAI_API_KEY,
        });
      } catch (error) {
        console.warn('Failed to initialize synthesis model:', error.message);
        this.synthesisModel = null;
      }
    } else {
      console.warn('OpenAI API key not found - synthesis will use basic aggregation');
      this.synthesisModel = null;
    }
  }

  setupParsers() {
    // Define the structure for synthesis output
    this.synthesisSchema = z.object({
      synthesizedResponse: z.string().describe('The main synthesized response combining insights from all models'),
      confidence: z.enum(['high', 'medium', 'low']).describe('Confidence level based on model agreement'),
      confidenceScore: z.number().min(0).max(100).describe('Numerical confidence score (0-100)'),
      commonThemes: z.array(z.string()).describe('Common themes across all responses'),
      keyDifferences: z.array(z.string()).describe('Key differences or disagreements between models'),
      modelContributions: z.object({
        openai: z.string().describe('Key contribution from OpenAI'),
        anthropic: z.string().describe('Key contribution from Anthropic'),
        google: z.string().describe('Key contribution from Google'),
      }),
    });

    this.synthesisParser = StructuredOutputParser.fromZodSchema(this.synthesisSchema);
  }

  setupChains() {
    // Create a sophisticated synthesis prompt
    this.synthesisPrompt = PromptTemplate.fromTemplate(`
You are an expert AI response synthesizer. Given responses from multiple AI models, create a comprehensive synthesis.

Original User Query: {query}

Model Responses:
OpenAI Response: {openai_response}
Anthropic Response: {anthropic_response}
Google Response: {google_response}

Analyze these responses and provide a synthesis following these guidelines:
1. Identify common themes and agreements
2. Note significant differences or unique insights
3. Create a unified response that captures the best of all models
4. Assess confidence based on model agreement (high: 70%+ agreement, medium: 30-70%, low: <30%)
5. Highlight unique valuable contributions from each model

{format_instructions}
`);

    // Create the synthesis chain only if model is available
    if (this.synthesisModel) {
      this.synthesisChain = RunnableSequence.from([
        this.synthesisPrompt,
        this.synthesisModel,
        this.synthesisParser,
      ]);
    } else {
      this.synthesisChain = null;
    }
  }

  calculateSimilarity(responses) {
    // Enhanced similarity calculation using token overlap
    const validResponses = Object.entries(responses)
      .filter(([_, response]) => response && !response.includes('mock response'))
      .map(([_, response]) => response.toLowerCase());

    if (validResponses.length < 2) {
      return { score: 0, validCount: validResponses.length };
    }

    // Tokenize and calculate Jaccard similarity
    const tokenSets = validResponses.map(response => 
      new Set(response.split(/\s+/).filter(token => token.length > 3))
    );

    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < tokenSets.length; i++) {
      for (let j = i + 1; j < tokenSets.length; j++) {
        const intersection = new Set([...tokenSets[i]].filter(x => tokenSets[j].has(x)));
        const union = new Set([...tokenSets[i], ...tokenSets[j]]);
        const similarity = intersection.size / union.size;
        totalSimilarity += similarity;
        comparisons++;
      }
    }

    const averageSimilarity = comparisons > 0 ? totalSimilarity / comparisons : 0;
    return { 
      score: Math.round(averageSimilarity * 100), 
      validCount: validResponses.length 
    };
  }

  async synthesizeResponses(query, responses) {
    try {
      // Calculate similarity for confidence assessment
      const similarity = this.calculateSimilarity(responses);
      
      // Use LangChain synthesis for valid responses if chain is available
      if (similarity.validCount >= 2 && this.synthesisChain) {
        const formatInstructions = this.synthesisParser.getFormatInstructions();
        
        const synthesis = await this.synthesisChain.invoke({
          query,
          openai_response: responses.openai || 'No response available',
          anthropic_response: responses.anthropic || 'No response available',
          google_response: responses.google || 'No response available',
          format_instructions: formatInstructions,
        });

        return {
          response: synthesis.synthesizedResponse,
          confidence: synthesis.confidence,
          confidenceScore: synthesis.confidenceScore,
          approach: this.getApproachDescription(synthesis.confidence),
          details: {
            commonThemes: synthesis.commonThemes,
            differences: synthesis.keyDifferences,
            modelContributions: synthesis.modelContributions,
            validModels: similarity.validCount,
            similarityScore: similarity.score,
          },
        };
      }

      // Fallback for insufficient valid responses
      return this.createFallbackSynthesis(responses, similarity);
    } catch (error) {
      console.error('Synthesis error:', error);
      return this.createFallbackSynthesis(responses, { score: 0, validCount: 0 });
    }
  }

  getApproachDescription(confidence) {
    const approaches = {
      high: 'Consensus Synthesis - All models strongly agree on the core response.',
      medium: 'Multi-Perspective Integration - Models show partial agreement with some unique insights.',
      low: 'Comparative Analysis - Models provided significantly different approaches.',
    };
    return approaches[confidence] || approaches.medium;
  }

  createFallbackSynthesis(responses, similarity) {
    // Manual synthesis when LangChain synthesis fails
    const validResponses = Object.entries(responses)
      .filter(([_, response]) => response && !response.includes('mock response'));

    if (validResponses.length === 0) {
      return {
        response: 'Unable to get responses from AI models at this time. Please try again later.',
        confidence: 'low',
        confidenceScore: 0,
        approach: 'Service Unavailable',
        details: {
          commonThemes: [],
          differences: [],
          modelContributions: {},
          validModels: 0,
          similarityScore: 0,
        },
      };
    }

    // Simple aggregation for fallback
    const aggregatedResponse = validResponses
      .map(([model, response]) => `${model.toUpperCase()}: ${response}`)
      .join('\n\n');

    return {
      response: aggregatedResponse,
      confidence: similarity.score > 70 ? 'high' : similarity.score > 30 ? 'medium' : 'low',
      confidenceScore: similarity.score,
      approach: 'Direct Model Responses',
      details: {
        commonThemes: [],
        differences: [],
        modelContributions: Object.fromEntries(validResponses),
        validModels: validResponses.length,
        similarityScore: similarity.score,
      },
    };
  }
}

module.exports = LangChainSynthesisService;