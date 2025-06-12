# KOSMA AI Aggregator

> **Multi-Model AI Response Synthesis Platform**  
> *Powered by Mercury Intelligence & LangChain*

[![GitHub License](https://img.shields.io/github/license/ChrisVAyala90/kosma-ai-aggregator)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19.1.0-blue)](https://reactjs.org/)
[![LangChain](https://img.shields.io/badge/LangChain-0.3.28-orange)](https://langchain.com/)

## 🚀 Overview

The KOSMA AI Aggregator is an intelligent synthesis platform that consults multiple leading AI models simultaneously and provides users with unified, confidence-scored responses. Rather than forcing users to query different AI services individually, our platform aggregates insights from OpenAI, Anthropic, and Google AI to deliver superior answers through advanced synthesis algorithms.

**🆕 Now with LangChain Integration** - Enhanced with unified LLM management, structured output parsing, and advanced error handling.

## ✨ Features

### 🤖 **Multi-Model AI Integration**
- **Simultaneous Queries**: Parallel requests to OpenAI GPT, Anthropic Claude, and Google Gemini
- **LangChain Framework**: Unified interface for all AI providers with automatic retries and fallbacks
- **Real-time Processing**: Async API calls with intelligent timeout handling
- **Graceful Degradation**: Continues functioning even when individual APIs fail

### 🧠 **Advanced Response Synthesis**
- **AI-Powered Synthesis**: Uses GPT-3.5-turbo with structured output parsing for intelligent response combination
- **Similarity Analysis**: TF-IDF and cosine similarity to measure agreement between AI responses
- **Confidence Scoring**: High (70%+), Medium (30-70%), Low (<30%) based on model consensus
- **Multiple Synthesis Approaches**:
  - **Consensus Synthesis**: When models strongly agree
  - **Multi-Perspective Integration**: Partial agreement with unique insights
  - **Comparative Analysis**: Significantly different approaches presented side-by-side

### 🎨 **Professional UI/UX**
- **Claude-Inspired Design**: Modern conversational interface with Mercury Bank aesthetic
- **Enhanced Dark Mode**: Improved contrast ratios and accessibility compliance
- **Minimal Design**: Clean, gradient-free interface with muted purple branding (#76708C)
- **Responsive Layout**: Seamless experience across desktop, tablet, and mobile devices
- **Real-time Feedback**: Dynamic submit button colors, loading states, and confidence indicators

### 🔒 **Enterprise-Grade Reliability**
- **Robust Error Handling**: Comprehensive null checking and graceful error recovery
- **Enhanced Mock Responses**: Meaningful fallback content during API outages
- **Rate Limiting Protection**: Intelligent queuing to respect API limitations
- **Health Monitoring**: Real-time backend connectivity status

## 🛠 Tech Stack

### Frontend
- **React 19.1.0** - Modern UI framework
- **Vite** - Fast build tool and development server
- **Modern CSS** - Grid/Flexbox layouts with CSS variables
- **Axios** - HTTP client for API communication

### Backend
- **Node.js** - JavaScript runtime
- **Express 5.1.0** - Web application framework
- **LangChain 0.3.28** - Unified LLM framework
- **Zod** - Schema validation for structured outputs

### AI Integration
- **OpenAI GPT-3.5-turbo** - Fast, cost-effective language model
- **Anthropic Claude 3 Haiku** - Thoughtful, nuanced responses
- **Google Gemini 1.5 Flash** - Comprehensive analysis with fallback to Gemini Pro

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- API keys for OpenAI, Anthropic, and/or Google AI

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/ChrisVAyala90/kosma-ai-aggregator.git
   cd kosma-ai-aggregator
   ```

2. **Install dependencies**
   ```bash
   # Backend dependencies
   cd backend
   npm install
   
   # Frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Configure API Keys**
   ```bash
   cd ../backend
   cp .env.example .env
   # Edit .env with your API keys
   ```

4. **Start the application**
   
   **Option A: LangChain Version (Recommended)**
   ```bash
   # Terminal 1: Start LangChain backend
   cd backend
   npm run dev:langchain
   
   # Terminal 2: Start frontend
   cd frontend
   npm run dev
   ```
   
   **Option B: Original Version**
   ```bash
   # Terminal 1: Start original backend
   cd backend
   npm run dev
   
   # Terminal 2: Start frontend
   cd frontend
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

## 🔑 API Configuration

### Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# API Keys (at least one required)
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key  
GOOGLE_AI_API_KEY=your-google-ai-api-key

# CORS Configuration
FRONTEND_URL=http://localhost:5173
```

### Getting API Keys

- **OpenAI**: https://platform.openai.com/api-keys
- **Anthropic**: https://console.anthropic.com/
- **Google AI**: https://console.cloud.google.com/ (Enable Gemini API)

**Note**: The application works with any combination of API keys. Missing keys will use enhanced mock responses.

## 📊 API Endpoints

### Health Check
```http
GET /api/health
```
Returns server status and API key configuration.

### Aggregate AI Responses
```http
POST /api/aggregate
Content-Type: application/json

{
  "prompt": "Your question here"
}
```

### Model Information (LangChain version only)
```http
GET /api/models
```
Returns information about available models and LangChain features.

## 🎨 UI Features

### Dark Mode Enhancements
- **Improved Contrast**: WCAG AA compliant text colors
- **Better Visibility**: Enhanced borders and focus indicators  
- **Consistent Branding**: Muted purple (#76708C) theme throughout
- **Dynamic Elements**: Submit button changes color when text is entered

### Responsive Design
- **Mobile Optimized**: Touch-friendly interface with adaptive layouts
- **Tablet Support**: Optimized for iPad and similar devices
- **Desktop Experience**: Full-featured interface with sidebar navigation
- **Accessibility**: Keyboard navigation and screen reader support

## 🔧 Development

### Available Scripts

**Backend:**
```bash
npm run start           # Production server
npm run start:langchain # LangChain production server
npm run dev             # Development with nodemon
npm run dev:langchain   # LangChain development with nodemon
```

**Frontend:**
```bash
npm run dev     # Development server
npm run build   # Production build
npm run preview # Preview production build
```

### Project Structure

```
kosma-ai-aggregator/
├── backend/
│   ├── services/
│   │   ├── langchainService.js          # LangChain LLM interface
│   │   ├── langchainSynthesisService.js # AI-powered synthesis
│   │   ├── openAIService.js             # Original OpenAI service
│   │   ├── anthropicService.js          # Original Anthropic service
│   │   ├── googleAIService.js           # Original Google AI service
│   │   └── synthesisService.js          # Original synthesis logic
│   ├── langchainServer.js               # LangChain-powered server
│   ├── server.js                        # Original server
│   ├── .env.example                     # Environment template
│   └── LANGCHAIN_MIGRATION.md           # Migration guide
├── frontend/
│   ├── src/
│   │   ├── App.jsx                      # Main React component
│   │   ├── App.css                      # Styling and themes
│   │   └── main.jsx                     # React entry point
│   └── public/                          # Static assets
└── README.md                            # This file
```

## 🚀 Deployment

### Production Build

1. **Build frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Start production servers**
   ```bash
   cd backend
   npm run start:langchain
   ```

### Environment Variables for Production
```env
NODE_ENV=production
PORT=3001
OPENAI_API_KEY=your-production-openai-key
ANTHROPIC_API_KEY=your-production-anthropic-key
GOOGLE_AI_API_KEY=your-production-google-key
FRONTEND_URL=https://your-domain.com
```

## 🔄 LangChain Migration

The project now includes a full LangChain integration alongside the original implementation. See `backend/LANGCHAIN_MIGRATION.md` for detailed migration information.

### Benefits of LangChain Version
- **Unified Interface**: Single API for all LLM providers
- **Better Error Handling**: Automatic retries and fallbacks
- **Structured Outputs**: Zod schema validation for consistent responses
- **Enhanced Monitoring**: Built-in callbacks and logging
- **Future-Proof**: Easy to add new models and providers

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **LangChain** - For the excellent LLM framework
- **OpenAI** - For GPT models and API
- **Anthropic** - For Claude models and API  
- **Google** - For Gemini models and API
- **Mercury Bank** - Design inspiration
- **Claude by Anthropic** - UI/UX inspiration

## 📧 Support

For support, please open an issue on GitHub or contact the development team.

---

**Built with ❤️ by the KOSMA AI Team**  
*Transforming how humans interact with artificial intelligence*