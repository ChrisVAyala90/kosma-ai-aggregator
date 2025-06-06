// frontend/src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [healthStatus, setHealthStatus] = useState('');
  const [prompt, setPrompt] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showIndividual, setShowIndividual] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const [showIndividualResponses, setShowIndividualResponses] = useState({});
  const chatContainerRef = useRef(null);
  const textareaRef = useRef(null);

  const API_BASE_URL = 'http://localhost:3001';

  // Detect mobile device and screen size
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // Check backend health on component mount
    axios.get(`${API_BASE_URL}/api/health`)
      .then(response => {
        setHealthStatus(response.data.message);
        console.log('Backend connected successfully:', response.data);
      })
      .catch(error => {
        console.error('Error connecting to backend:', error);
        setHealthStatus('Error connecting to backend');
      });
  }, []);

  // Auto-resize textarea with responsive limits
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const maxHeight = isMobile ? 120 : 200;
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, maxHeight) + 'px';
    }
  }, [prompt, isMobile]);

  // Scroll to bottom when new results appear
  useEffect(() => {
    if (results && chatContainerRef.current) {
      setTimeout(() => {
        chatContainerRef.current.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [results]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    if (prompt.length > 2000) {
      setError('Prompt is too long. Maximum 2000 characters allowed.');
      return;
    }

    const userMessage = {
      type: 'user',
      content: prompt.trim(),
      timestamp: new Date().toISOString()
    };

    // Add user message to conversation
    setConversationHistory(prev => [...prev, userMessage]);
    setLoading(true);
    setError('');
    setResults(null);
    setShowIndividual(false);

    // Clear the input
    const currentPrompt = prompt.trim();
    setPrompt('');

    try {
      console.log('Sending request to backend...');
      const response = await axios.post(`${API_BASE_URL}/api/aggregate`, {
        prompt: currentPrompt
      });

      console.log('Response received:', response.data);
      
      const aiMessage = {
        type: 'ai',
        content: response.data,
        timestamp: new Date().toISOString()
      };

      setConversationHistory(prev => [...prev, aiMessage]);
      setResults(response.data);
      
    } catch (err) {
      console.error('Error during aggregation:', err);
      const errorMessage = err.response?.data?.error || err.message || 'An unexpected error occurred';
      setError(errorMessage);
      
      // Remove user message if request failed
      setConversationHistory(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const getConfidenceBadgeColor = (confidence) => {
    if (confidence.includes('High')) return 'high-confidence';
    if (confidence.includes('Multiple')) return 'medium-confidence';
    if (confidence.includes('Diverse')) return 'low-confidence';
    return 'error-confidence';
  };

  const formatSynthesizedAnswer = (text) => {
    // Convert markdown-style formatting to HTML with responsive considerations
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n•/g, '<br>•')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');
  };

  const getSourceIcon = (source) => {
    const icons = {
      'OpenAI': '🤖',
      'Anthropic': '🧠', 
      'Google': '🔍'
    };
    return icons[source] || '💬';
  };

  const truncateForMobile = (text, maxLength = 100) => {
    if (!isMobile || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const toggleIndividualResponses = (messageIndex) => {
    setShowIndividualResponses(prev => ({
      ...prev,
      [messageIndex]: !prev[messageIndex]
    }));
  };

  const renderMessage = (message, index) => {
    if (message.type === 'user') {
      return (
        <div key={index} className="message-wrapper user">
          <div className="message-bubble">
            <div className="message-content">
              {isMobile && message.content.length > 150 
                ? message.content.substring(0, 150) + '...' 
                : message.content}
            </div>
          </div>
        </div>
      );
    } else {
      const data = message.content;
      return (
        <div key={index} className="message-wrapper ai">
          <div className="message-bubble">
            <div className="synthesis-header">
              <div className="synthesis-title">
                {isMobile ? '🎯 Synthesis' : '🎯 AI Synthesis'}
              </div>
              <div className={`confidence-badge ${getConfidenceBadgeColor(data.synthesis.confidence)}`}>
                {isMobile 
                  ? `${data.synthesis.confidenceScore}%` 
                  : `${data.synthesis.confidence} (${data.synthesis.confidenceScore}%)`}
              </div>
            </div>
            
            <div 
              className="synthesized-content"
              dangerouslySetInnerHTML={{ 
                __html: formatSynthesizedAnswer(data.synthesis.synthesizedAnswer) 
              }}
            />
            
            {/* Individual AI Responses Toggle */}
            <div className="individual-ai-responses-section">
              <button 
                onClick={() => toggleIndividualResponses(index)}
                className="toggle-individual-ai-button"
              >
                {showIndividualResponses[index] ? '▲' : '▼'} {isMobile ? 'AI Responses' : 'View Individual AI Responses'}
              </button>

              {showIndividualResponses[index] && (
                <div className="individual-ai-responses">
                  <div className="individual-responses-grid">
                    {Object.entries(data.individualResponses).map(([service, response]) => (
                      <div key={service} className={`individual-ai-response ${response.error ? 'error' : ''}`}>
                        <div className="ai-service-header">
                          <span className="service-icon">{getSourceIcon(service.charAt(0).toUpperCase() + service.slice(1))}</span>
                          <span className="service-name">{service.charAt(0).toUpperCase() + service.slice(1)}</span>
                          {response.error && <span className="error-indicator">⚠️</span>}
                        </div>
                        <div className="ai-response-text">
                          {response.error ? (
                            <span className="error-text">
                              Error: {response.message}
                            </span>
                          ) : (
                            <span className="response-text">
                              {isMobile && response.length > 200 
                                ? response.substring(0, 200) + '...' 
                                : response}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="synthesis-meta">
              <div className="meta-row">
                <div className="sources-used">
                  <strong>Sources:</strong>
                  {data.synthesis.sourcesUsed.map(source => (
                    <span key={source} className="source-tag">
                      {getSourceIcon(source)} {isMobile ? source.substring(0, 3) : source}
                    </span>
                  ))}
                </div>
                {data.metadata && !isMobile && (
                  <div className="processing-time">
                    {data.metadata.processingTimeMs}ms
                  </div>
                )}
              </div>
              <div className="meta-row">
                <div className="reasoning">
                  {isMobile 
                    ? truncateForMobile(data.synthesis.reasoning, 80)
                    : data.synthesis.reasoning}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
  };

  const getPlaceholderText = () => {
    if (isMobile) {
      return "Ask anything... (Enter to send)";
    }
    return "Ask me anything... (Press Enter to send, Shift+Enter for new line)";
  };

  const getEmptyStateContent = () => {
    if (isMobile) {
      return {
        icon: '💬',
        title: 'Ask AI Anything',
        subtitle: 'Get insights from multiple AI models'
      };
    }
    return {
      icon: '💬',
      title: 'Ask anything to get synthesized insights',
      subtitle: 'I\'ll consult multiple AI models and give you a combined answer with confidence scoring.'
    };
  };

  const emptyState = getEmptyStateContent();

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-content">
          <div>
            <h1>{isMobile ? '⚡ AI Hub' : '⚡ AI Aggregator'}</h1>
            <p className="subtitle">
              {isMobile ? 'KOSMA AI' : 'Powered by KOSMA AI'}
            </p>
          </div>
          <div className={`health-status ${healthStatus.includes('Error') ? 'error' : 'success'}`}>
            <span className="status-indicator" />
            <span className="status-text">
              {healthStatus.includes('Error') ? 'Offline' : 'Online'}
            </span>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="chat-container" ref={chatContainerRef}>
          {conversationHistory.length === 0 && (
            <div style={{ 
              textAlign: 'center', 
              color: 'var(--text-muted)', 
              padding: isMobile ? '2rem 1rem' : '4rem 2rem',
              fontSize: isMobile ? '0.85rem' : '0.95rem'
            }}>
              <div style={{ 
                fontSize: isMobile ? '1.5rem' : '2rem', 
                marginBottom: isMobile ? '0.75rem' : '1rem' 
              }}>
                {emptyState.icon}
              </div>
              <h3 style={{ 
                marginBottom: '0.5rem', 
                color: 'var(--text-secondary)',
                fontSize: isMobile ? '0.95rem' : '1.1rem'
              }}>
                {emptyState.title}
              </h3>
              <p style={{ fontSize: isMobile ? '0.8rem' : '0.95rem' }}>
                {emptyState.subtitle}
              </p>
            </div>
          )}

          {conversationHistory.map((message, index) => renderMessage(message, index))}

          {loading && (
            <div className="ai-loading-placeholder">
              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span>
                {isMobile 
                  ? '🤔 Thinking...' 
                  : '🤔 Consulting AI models...'}
              </span>
            </div>
          )}

          {error && (
            <div className="chat-error-message">
              <strong>Error:</strong> {error}
            </div>
          )}

          {results && (
            <div className="individual-responses-section">
              <button 
                onClick={() => setShowIndividual(!showIndividual)}
                className="toggle-individual-button"
              >
                {showIndividual ? '▲' : '▼'} {isMobile ? 'Individual Responses' : 'Individual AI Responses'}
              </button>

              {showIndividual && (
                <div className="individual-responses-content">
                  {Object.entries(results.individualResponses).map(([service, response]) => (
                    <div key={service} className={`individual-response-item ${response.error ? 'error' : ''}`}>
                      <h3>
                        {getSourceIcon(service.charAt(0).toUpperCase() + service.slice(1))} 
                        {service.charAt(0).toUpperCase() + service.slice(1)}
                      </h3>
                      {response.error ? (
                        <div className="error-content-text">
                          <strong>Error:</strong> {response.message}
                        </div>
                      ) : (
                        <div className="response-content-text">
                          {isMobile && response.length > 300 
                            ? response.substring(0, 300) + '...' 
                            : response}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="query-form-wrapper">
          <form onSubmit={handleSubmit} className="query-form">
            <div className="input-container">
              <div className="input-wrapper">
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={getPlaceholderText()}
                  disabled={loading}
                  maxLength={2000}
                  rows={1}
                />
                <div className="character-count">
                  {`${prompt.length}/2000`}
                </div>
              </div>
              <button 
                type="submit" 
                disabled={loading || !prompt.trim()}
                className="submit-button"
                title="Send message"
              >
                {loading ? (
                  <div className="loading-spinner"></div>
                ) : (
                  '→'
                )}
              </button>
            </div>
          </form>
        </div>
      </main>

      <footer className="app-footer">
        <p>
          {isMobile 
            ? 'KOSMA AI • Multi-model synthesis' 
            : 'KOSMA AI Aggregator • Synthesizing insights from leading AI models'}
        </p>
      </footer>
    </div>
  );
}

export default App;