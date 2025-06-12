const { ChatOpenAI } = require('@langchain/openai');
const { ChatAnthropic } = require('@langchain/anthropic');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { RunnableParallel, RunnablePassthrough } = require('@langchain/core/runnables');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { ChatPromptTemplate } = require('@langchain/core/prompts');

class LangChainService {
  constructor() {
    this.initializeModels();
    this.setupChains();
  }

  initializeModels() {
    // Initialize OpenAI only if API key exists
    if (process.env.OPENAI_API_KEY) {
      try {
        this.openAI = new ChatOpenAI({
          modelName: 'gpt-3.5-turbo',
          temperature: 0.7,
          maxTokens: 400,
          openAIApiKey: process.env.OPENAI_API_KEY,
        });
      } catch (error) {
        console.warn('Failed to initialize OpenAI:', error.message);
        this.openAI = null;
      }
    } else {
      console.warn('OpenAI API key not found - will use mock responses');
      this.openAI = null;
    }

    // Initialize Anthropic only if API key exists
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        this.anthropic = new ChatAnthropic({
          modelName: 'claude-3-haiku-20240307',
          temperature: 0.7,
          maxTokens: 400,
          anthropicApiKey: process.env.ANTHROPIC_API_KEY,
        });
      } catch (error) {
        console.warn('Failed to initialize Anthropic:', error.message);
        this.anthropic = null;
      }
    } else {
      console.warn('Anthropic API key not found - will use mock responses');
      this.anthropic = null;
    }

    // Initialize Google Gemini only if API key exists
    if (process.env.GOOGLE_AI_API_KEY) {
      try {
        this.googleAI = new ChatGoogleGenerativeAI({
          model: 'gemini-1.5-flash',
          temperature: 0.7,
          maxOutputTokens: 400,
          apiKey: process.env.GOOGLE_AI_API_KEY,
        });

        // Fallback model for Google
        this.googleAIFallback = new ChatGoogleGenerativeAI({
          model: 'gemini-pro',
          temperature: 0.7,
          maxOutputTokens: 400,
          apiKey: process.env.GOOGLE_AI_API_KEY,
        });
      } catch (error) {
        console.warn('Failed to initialize Google AI:', error.message);
        this.googleAI = null;
        this.googleAIFallback = null;
      }
    } else {
      console.warn('Google AI API key not found - will use mock responses');
      this.googleAI = null;
      this.googleAIFallback = null;
    }
  }

  setupChains() {
    // Create a simple prompt template
    this.promptTemplate = ChatPromptTemplate.fromMessages([
      ['human', '{input}'],
    ]);

    // Create individual chains with output parsers only if models exist
    if (this.openAI) {
      this.openAIChain = this.promptTemplate
        .pipe(this.openAI)
        .pipe(new StringOutputParser());
    }

    if (this.anthropic) {
      this.anthropicChain = this.promptTemplate
        .pipe(this.anthropic)
        .pipe(new StringOutputParser());
    }

    if (this.googleAI) {
      this.googleAIChain = this.promptTemplate
        .pipe(this.googleAI)
        .pipe(new StringOutputParser());
      
      if (this.googleAIFallback) {
        this.googleAIChain = this.googleAIChain.withFallbacks({
          fallbacks: [
            this.promptTemplate
              .pipe(this.googleAIFallback)
              .pipe(new StringOutputParser()),
          ],
        });
      }
    }

    // Create parallel execution chain only with available models
    const availableChains = {};
    if (this.openAIChain) availableChains.openai = this.openAIChain;
    if (this.anthropicChain) availableChains.anthropic = this.anthropicChain;
    if (this.googleAIChain) availableChains.google = this.googleAIChain;

    if (Object.keys(availableChains).length > 0) {
      this.parallelChain = RunnableParallel.from(availableChains);
    } else {
      this.parallelChain = null;
    }
  }

  async queryAllModels(prompt) {
    const results = {
      openai: null,
      anthropic: null,
      google: null,
    };

    try {
      // Execute all models in parallel with individual error handling
      if (this.parallelChain) {
        const parallelResults = await this.parallelChain.invoke(
          { input: prompt },
          {
            // Add callbacks for monitoring
            callbacks: [
              {
                handleLLMStart: async (llm, prompts) => {
                  console.log(`Starting LLM call: ${llm.name}`);
                },
                handleLLMEnd: async (output) => {
                  console.log('LLM call completed');
                },
                handleLLMError: async (err) => {
                  console.error('LLM error:', err.message);
                },
              },
            ],
          }
        );

        // Process results
        results.openai = parallelResults.openai || null;
        results.anthropic = parallelResults.anthropic || null;
        results.google = parallelResults.google || null;
      } else {
        // No models available, use individual queries
        throw new Error('No models available for parallel execution');
      }
    } catch (error) {
      console.error('Parallel execution error:', error);
      // Try individual calls as fallback
      results.openai = await this.queryOpenAI(prompt);
      results.anthropic = await this.queryAnthropic(prompt);
      results.google = await this.queryGoogle(prompt);
    }

    return results;
  }

  async queryOpenAI(prompt) {
    if (!this.openAIChain) {
      return this.getMockResponse('openai', 'no_api_key');
    }
    try {
      const response = await this.openAIChain.invoke({ input: prompt });
      return response;
    } catch (error) {
      console.error('OpenAI error:', error.message);
      if (error.message.includes('insufficient_quota')) {
        return this.getMockResponse('openai', 'quota_exceeded');
      }
      if (error.message.includes('Incorrect API key')) {
        return this.getMockResponse('openai', 'auth_error');
      }
      return this.getMockResponse('openai', 'general_error');
    }
  }

  async queryAnthropic(prompt) {
    if (!this.anthropicChain) {
      return this.getMockResponse('anthropic', 'no_api_key');
    }
    try {
      const response = await this.anthropicChain.invoke({ input: prompt });
      return response;
    } catch (error) {
      console.error('Anthropic error:', error.message);
      if (error.message.includes('credit balance')) {
        return this.getMockResponse('anthropic', 'credit_error');
      }
      if (error.message.includes('Invalid API Key')) {
        return this.getMockResponse('anthropic', 'auth_error');
      }
      return this.getMockResponse('anthropic', 'general_error');
    }
  }

  async queryGoogle(prompt) {
    if (!this.googleAIChain) {
      return this.getMockResponse('google', 'no_api_key');
    }
    try {
      const response = await this.googleAIChain.invoke({ input: prompt });
      return response;
    } catch (error) {
      console.error('Google AI error:', error.message);
      if (error.message.includes('API key not valid')) {
        return this.getMockResponse('google', 'auth_error');
      }
      return this.getMockResponse('google', 'general_error');
    }
  }

  getMockResponse(service, errorType) {
    const mockResponses = {
      openai: {
        no_api_key: 'OpenAI API key not configured. This is a mock response. To use real OpenAI responses, please add your API key to the .env file.',
        quota_exceeded: 'OpenAI API quota exceeded. This is a mock response. The service would normally provide insights based on GPT-3.5-turbo\'s analysis.',
        auth_error: 'OpenAI authentication failed. This is a mock response simulating GPT-3.5-turbo\'s typical analytical style.',
        general_error: 'OpenAI service temporarily unavailable. This mock response represents what GPT-3.5-turbo might say.',
      },
      anthropic: {
        no_api_key: 'Anthropic API key not configured. This is a mock response. To use real Claude responses, please add your API key to the .env file.',
        credit_error: 'Anthropic API credit limit reached. This is a mock response. Claude would typically provide a thoughtful, nuanced perspective here.',
        auth_error: 'Anthropic authentication failed. This mock response simulates Claude\'s characteristic thoroughness and clarity.',
        general_error: 'Anthropic service temporarily unavailable. This represents Claude\'s typical structured approach.',
      },
      google: {
        no_api_key: 'Google AI API key not configured. This is a mock response. To use real Gemini responses, please add your API key to the .env file.',
        auth_error: 'Google AI authentication failed. This is a mock response. Gemini would normally offer comprehensive analysis here.',
        general_error: 'Google AI service temporarily unavailable. This mock response represents Gemini\'s typical informative style.',
      },
    };

    return mockResponses[service]?.[errorType] || `${service} service error - mock response provided.`;
  }
}

module.exports = LangChainService;