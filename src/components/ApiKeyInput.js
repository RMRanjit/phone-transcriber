import React, { useState, useEffect } from 'react';

const ApiKeyInput = ({ 
  onApiKeyChange, 
  label = "API Key:",
  storageKey = "openai_api_key",
  infoText = "Your API key is stored in your browser's local storage and never sent to our servers.",
  infoLinkText = "Get an API key from OpenAI",
  infoLinkUrl = "https://platform.openai.com/api-keys"
}) => {
  const [apiKey, setApiKey] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Check for saved API key in localStorage on component mount
  useEffect(() => {
    const savedKey = localStorage.getItem(storageKey);
    if (savedKey) {
      setApiKey(savedKey);
      setIsSaved(true);
      if (onApiKeyChange) {
        onApiKeyChange(savedKey);
      }
    }
  }, [onApiKeyChange, storageKey]);

  const handleChange = (e) => {
    setApiKey(e.target.value);
    setIsSaved(false);
  };

  const saveApiKey = () => {
    if (!apiKey.trim()) return;
    
    localStorage.setItem(storageKey, apiKey);
    setIsSaved(true);
    
    if (onApiKeyChange) {
      onApiKeyChange(apiKey);
    }
  };

  const clearApiKey = () => {
    localStorage.removeItem(storageKey);
    setApiKey('');
    setIsSaved(false);
    
    if (onApiKeyChange) {
      onApiKeyChange('');
    }
  };

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  return (
    <div className="api-key-container">
      <div className="api-key-input-group">
        <label htmlFor="apiKeyInput">{label}</label>
        <div className="input-with-actions">
          <input
            type={isVisible ? 'text' : 'password'}
            id="apiKeyInput"
            value={apiKey}
            onChange={handleChange}
            placeholder={`Enter your ${label.replace(':', '')}`}
            className="api-key-input"
          />
          <button 
            type="button" 
            className="visibility-toggle"
            onClick={toggleVisibility}
          >
            {isVisible ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>
      
      <div className="api-key-actions">
        <button 
          onClick={saveApiKey} 
          disabled={!apiKey.trim() || isSaved}
          className="save-key-button"
        >
          {isSaved ? 'Saved' : 'Save Key'}
        </button>
        
        {isSaved && (
          <button 
            onClick={clearApiKey}
            className="clear-key-button"
          >
            Clear Key
          </button>
        )}
      </div>
      
      <p className="api-key-info">
        {infoText}
        <br />
        <a 
          href={infoLinkUrl} 
          target="_blank" 
          rel="noopener noreferrer"
        >
          {infoLinkText}
        </a>
      </p>
    </div>
  );
};

export default ApiKeyInput; 