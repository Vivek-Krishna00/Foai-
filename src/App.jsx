import { useState, useRef, useEffect } from 'react';
import './index.css';

function App() {
  const [mode, setMode] = useState('image'); // 'image' | 'chat'
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [image, setImage] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [error, setError] = useState(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current && mode === 'chat') {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, mode, isGenerating]);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    
    if (mode === 'chat') {
      await handleChat();
      return;
    }

    setIsGenerating(true);
    setImage(null);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_IMAGE_API_URL}${import.meta.env.VITE_IMAGE_MODEL}`,
        {
          headers: { 
            Authorization: `Bearer ${import.meta.env.VITE_HF_TOKEN}`, 
            "Content-Type": "application/json",
            "Accept": "image/*"
          },
          method: "POST",
          body: JSON.stringify({ inputs: prompt }),
        }
      );

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("Missing Model Permissions: Your token lacks 'Inference Access'. Please go to huggingface.co/settings/tokens, create a new 'Fine-grained' token, and explicitly check 'Make calls to the serverless Inference API'.");
        }
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.error) errorMsg = errorData.error;
        } catch (e) {
          // ignore json parse error
        }
        throw new Error(errorMsg);
      }

      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      setImage(imageUrl);
    } catch (err) {
      console.error("Generation error:", err);
      setError(err.message || 'An unexpected error occurred during generation.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleChat = async () => {
    const userMessage = prompt;
    setPrompt('');
    setIsGenerating(true);
    setError(null);
    
    const newHistory = [...chatHistory, { role: 'user', content: userMessage }];
    setChatHistory(newHistory);

    try {
      const messages = newHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await fetch(
        import.meta.env.VITE_CHAT_API_URL,
        {
          headers: { 
            Authorization: `Bearer ${import.meta.env.VITE_HF_TOKEN}`, 
            "Content-Type": "application/json" 
          },
          method: "POST",
          body: JSON.stringify({ 
             model: import.meta.env.VITE_CHAT_MODEL,
             messages: messages
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("Missing Model Permissions: Your token lacks 'Inference Access'. Please go to huggingface.co/settings/tokens, create a new 'Fine-grained' token, and explicitly check 'Make calls to the serverless Inference API'.");
        }
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.error) errorMsg = errorData.error;
        } catch (e) {
          // ignore parsing error
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      let reply = data.choices && data.choices[0] && data.choices[0].message 
          ? data.choices[0].message.content 
          : "No response received.";
          
      // Remove <think> blocks even if the model hit the max_tokens limit before closing it
      reply = reply.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, '').trim();
          
      setChatHistory(prev => [...prev, { role: 'assistant', content: reply }]);
      
    } catch (err) {
      console.error("Generation error:", err);
      setError(err.message || 'An unexpected error occurred during chat generation.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="app-container">
      <div className="generator-card">
        <div className="header">
          <h1>Nexus AI Suite</h1>
          <p>Imagine anything or chat naturally. We've got you covered.</p>
        </div>

        <div className="mode-toggle">
          <button 
            className={`toggle-btn ${mode === 'image' ? 'active' : ''}`}
            onClick={() => setMode('image')}
          >
            Image Studio
          </button>
          <button 
            className={`toggle-btn ${mode === 'chat' ? 'active' : ''}`}
            onClick={() => setMode('chat')}
          >
            AI Chat
          </button>
        </div>

        <div className="input-section">
          <div className="input-wrapper">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={mode === 'image' ? "Describe what you want to see... e.g. 'A futuristic cyberpunk city'" : "Ask me anything... e.g. 'Write a haiku about space'"}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
            />
          </div>
          
          <button 
            className="generate-btn" 
            onClick={handleGenerate} 
            disabled={!prompt.trim() || isGenerating}
          >
            {isGenerating ? (mode === 'image' ? 'Generating Image...' : 'Thinking...') : (mode === 'image' ? 'Generate Art' : 'Send Message')}
            {!isGenerating && (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{pointerEvents: 'none'}}>
                {mode === 'image' ? (
                  <>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </>
                ) : (
                  <>
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </>
                )}
              </svg>
            )}
          </button>

          {error && (
            <div className="error-message">
              <svg className="error-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className={`display-section ${mode === 'chat' ? 'mode-chat' : (image && !isGenerating ? 'has-image' : '')}`}>
          {mode === 'image' && !image && !isGenerating && (
            <div className="empty-state">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              <span>Your resulting artwork will appear here</span>
            </div>
          )}

          {mode === 'image' && isGenerating && (
            <div className="loading-skeleton">
              <div className="spinner-ring"></div>
              <span className="loading-text">STRUCTURING NOISE...</span>
            </div>
          )}

          {mode === 'image' && image && !isGenerating && (
            <>
              <img src={image} alt="Generated art" className="generated-image" />
              <div className="glass-badge">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
                HD Output
              </div>
            </>
          )}

          {mode === 'chat' && (
            <div className="chat-history">
              {chatHistory.length === 0 && !isGenerating && (
                 <div className="empty-state" style={{margin: 'auto'}}>
                   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                     <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                   </svg>
                   <span>Start a conversation with Zephyr AI</span>
                 </div>
              )}
              
              {chatHistory.map((msg, index) => (
                <div key={index} className={`chat-bubble ${msg.role}`}>
                  {msg.content}
                </div>
              ))}
              
              {isGenerating && (
                <div className="chat-bubble assistant" style={{display: 'flex', alignItems: 'center', gap: '0.8rem'}}>
                  <div className="spinner-ring" style={{width: '20px', height: '20px', borderWidth: '2px'}}></div>
                  Analyzing logic...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
