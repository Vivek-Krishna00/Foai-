import { useState, useRef, useEffect } from 'react';
import './index.css';

function App() {
  const [imagePrompt, setImagePrompt] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [image, setImage] = useState(null);
  const [imageError, setImageError] = useState(null);

  const [chatPrompt, setChatPrompt] = useState('');
  const [isGeneratingChat, setIsGeneratingChat] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatError, setChatError] = useState(null);

  const chatEndRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, isGeneratingChat]);

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim() || isGeneratingImage) return;
    
    setIsGeneratingImage(true);
    setImage(null);
    setImageError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_IMAGE_API_URL}${import.meta.env.VITE_IMAGE_MODEL}`,
        {
          headers: { 
            Authorization: `Bearer ${import.meta.env.VITE_HF_TOKEN}`, 
            "Content-Type": "application/json",
            "Accept": "image/png"
          },
          method: "POST",
          body: JSON.stringify({ inputs: imagePrompt }),
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
          // ignore
        }
        throw new Error(errorMsg);
      }

      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      setImage(imageUrl);
    } catch (err) {
      setImageError(err.message || 'An unexpected error occurred during generation.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleChat = async () => {
    if (!chatPrompt.trim() || isGeneratingChat) return;

    const userMessage = chatPrompt;
    setChatPrompt('');
    setIsGeneratingChat(true);
    setChatError(null);
    
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
          
      reply = reply.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, '').trim();
          
      setChatHistory(prev => [...prev, { role: 'assistant', content: reply }]);
      
    } catch (err) {
      setChatError(err.message || 'An unexpected error occurred during chat generation.');
    } finally {
      setIsGeneratingChat(false);
    }
  };

  return (
    <div className="app-container">
      <div className="header-absolute">
        <h1>Nexus AI Suite</h1>
        <p>Imagine anything and chat naturally. Everything runs seamlessly in parallel.</p>
      </div>

      <div className="cards-wrapper">
        {/* --- IMAGE GENERATOR CARD --- */}
        <div className="generator-card">
          <div className="header">
            <h2>Image Studio</h2>
            <p>Generate breathtaking AI imagery instantly</p>
          </div>

          <div className="input-section">
            <div className="input-wrapper">
              <textarea
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                placeholder="Describe what you want to see... e.g. 'A futuristic cyberpunk city'"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleGenerateImage();
                  }
                }}
              />
            </div>
            
            <button 
              className="generate-btn" 
              onClick={handleGenerateImage} 
              disabled={!imagePrompt.trim() || isGeneratingImage}
            >
              {isGeneratingImage ? 'Structuring Noise...' : 'Generate Art'}
              {!isGeneratingImage && (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{pointerEvents: 'none'}}>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              )}
            </button>

            {imageError && (
              <div className="error-message">
                <svg className="error-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>{imageError}</span>
              </div>
            )}
          </div>

          <div className={`display-section ${image && !isGeneratingImage ? 'has-image' : ''}`}>
            {!image && !isGeneratingImage && (
              <div className="empty-state">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                <span>Your resulting artwork will appear here</span>
              </div>
            )}

            {isGeneratingImage && (
              <div className="loading-skeleton">
                <div className="spinner-ring"></div>
                <span className="loading-text">INFERENCING...</span>
              </div>
            )}

            {image && !isGeneratingImage && (
              <>
                <img src={image} alt="Generated art" className="generated-image" />
                <div className="glass-badge">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                  HD Output
                </div>
              </>
            )}
          </div>
        </div>

        {/* --- AI CHAT CARD --- */}
        <div className="generator-card chat-card">
          <div className="header">
            <h2>AI Assistant</h2>
            <p>Engage in comprehensive logical discussion</p>
          </div>

          <div className="display-section mode-chat">
            <div className="chat-history">
              {chatHistory.length === 0 && !isGeneratingChat && (
                 <div className="empty-state" style={{margin: 'auto'}}>
                   <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                     <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                   </svg>
                   <span>Start a conversation with the AI</span>
                 </div>
              )}
              
              {chatHistory.map((msg, index) => (
                <div key={index} className={`chat-bubble ${msg.role}`}>
                  {msg.content}
                </div>
              ))}
              
              {isGeneratingChat && (
                <div className="chat-bubble assistant" style={{display: 'flex', alignItems: 'center', gap: '0.8rem'}}>
                  <div className="spinner-ring" style={{width: '20px', height: '20px', borderWidth: '2px'}}></div>
                  Analyzing logic...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>

          <div className="input-section">
            <div className="input-wrapper">
              <textarea
                value={chatPrompt}
                onChange={(e) => setChatPrompt(e.target.value)}
                placeholder="Ask me anything... e.g. 'Write a haiku about space'"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleChat();
                  }
                }}
                style={{ minHeight: '80px' }}
              />
            </div>
            
            <button 
              className="generate-btn chat-btn" 
              onClick={handleChat} 
              disabled={!chatPrompt.trim() || isGeneratingChat}
            >
              {isGeneratingChat ? 'Thinking...' : 'Send Message'}
              {!isGeneratingChat && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{pointerEvents: 'none'}}>
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              )}
            </button>

            {chatError && (
              <div className="error-message">
                <svg className="error-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>{chatError}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
