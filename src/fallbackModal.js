/**
 * Fallback modal implementation using vanilla JavaScript
 * This avoids any potential issues with React rendering
 */

import * as transcriptionService from './services/transcriptionServiceManager';

// Function to check if API key exists and initialize if found
export const checkApiKey = (handleApiKeyChange) => {
  // Initialize all service API keys from localStorage
  transcriptionService.initApiKeys();
  
  // Check if the active service has an API key
  const hasKey = transcriptionService.hasApiKey();
  
  if (hasKey) {
    // If key exists, notify the component
    const activeService = transcriptionService.getActiveService();
    const serviceInfo = transcriptionService.getServiceInfo(activeService);
    const key = localStorage.getItem(serviceInfo.keyStorageName);
    handleApiKeyChange(key);
    return true;
  }
  
  return false;
};

// Fallback modal if the React-based one fails
export const showFallbackSettingsModal = (handleApiKeyChange, handleServiceChange = null) => {
  // Get active service info
  const activeService = transcriptionService.getActiveService();
  const serviceInfo = transcriptionService.getServiceInfo(activeService);
  
  // Create fallback modal container
  const modalOverlay = document.createElement('div');
  modalOverlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; z-index: 999999;';
  
  const modalContent = document.createElement('div');
  modalContent.style.cssText = 'background: white; border-radius: 8px; padding: 20px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto;';
  
  // Modal header
  const header = document.createElement('h2');
  header.style.cssText = 'margin-top: 0; font-size: 20px;';
  header.textContent = 'API Settings';
  
  // Service selector
  const serviceLabel = document.createElement('label');
  serviceLabel.textContent = 'Transcription Service:';
  serviceLabel.style.cssText = 'display: block; margin: 15px 0 5px; font-weight: bold;';
  
  const serviceSelect = document.createElement('select');
  serviceSelect.style.cssText = 'width: 100%; padding: 8px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 4px;';
  
  // Add service options
  transcriptionService.getServices().forEach(service => {
    const option = document.createElement('option');
    option.value = service.id;
    option.textContent = service.name;
    option.selected = service.id === activeService;
    serviceSelect.appendChild(option);
  });
  
  // Handle service change
  serviceSelect.addEventListener('change', () => {
    const selectedService = serviceSelect.value;
    const newServiceInfo = transcriptionService.getServiceInfo(selectedService);
    
    // Update API key input with the saved key for this service
    apiKeyInput.value = localStorage.getItem(newServiceInfo.keyStorageName) || '';
    
    // Update label
    keyLabel.textContent = `${newServiceInfo.name} ${newServiceInfo.keyType}:`;
    
    // Notify parent component if handler provided
    if (handleServiceChange) {
      handleServiceChange(selectedService);
    }
  });
  
  // Key input section
  const keyLabel = document.createElement('label');
  keyLabel.textContent = `${serviceInfo.name} ${serviceInfo.keyType}:`;
  keyLabel.style.cssText = 'display: block; margin: 15px 0 5px; font-weight: bold;';
  
  const apiKeyInput = document.createElement('input');
  apiKeyInput.type = 'password';
  apiKeyInput.value = localStorage.getItem(serviceInfo.keyStorageName) || '';
  apiKeyInput.placeholder = `Enter your ${serviceInfo.name} API key`;
  apiKeyInput.style.cssText = 'width: 100%; padding: 8px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 4px;';
  
  // Toggle visibility button
  const toggleButton = document.createElement('button');
  toggleButton.textContent = 'Show Key';
  toggleButton.style.cssText = 'margin-right: 10px; padding: 8px 12px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;';
  toggleButton.addEventListener('click', () => {
    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text';
      toggleButton.textContent = 'Hide Key';
    } else {
      apiKeyInput.type = 'password';
      toggleButton.textContent = 'Show Key';
    }
  });
  
  // Save button
  const saveButton = document.createElement('button');
  saveButton.textContent = 'Save Key';
  saveButton.style.cssText = 'margin-right: 10px; padding: 8px 12px; background: #4a90e2; color: white; border: none; border-radius: 4px; cursor: pointer;';
  saveButton.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (key) {
      // Save to the selected service
      const selectedService = serviceSelect.value;
      transcriptionService.setApiKey(key, selectedService);
      
      // If this is the active service, update component state
      if (selectedService === transcriptionService.getActiveService()) {
        handleApiKeyChange(key);
      }
      
      // Show saved confirmation
      saveButton.textContent = 'Saved!';
      setTimeout(() => {
        saveButton.textContent = 'Save Key';
      }, 1500);
    }
  });
  
  // Clear button
  const clearButton = document.createElement('button');
  clearButton.textContent = 'Clear Key';
  clearButton.style.cssText = 'margin-right: 10px; padding: 8px 12px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;';
  clearButton.addEventListener('click', () => {
    const selectedService = serviceSelect.value;
    const info = transcriptionService.getServiceInfo(selectedService);
    
    // Clear from localStorage
    localStorage.removeItem(info.keyStorageName);
    apiKeyInput.value = '';
    
    // If this is the active service, update component state
    if (selectedService === transcriptionService.getActiveService()) {
      handleApiKeyChange('');
    }
    
    // Show cleared confirmation
    clearButton.textContent = 'Cleared!';
    setTimeout(() => {
      clearButton.textContent = 'Clear Key';
    }, 1500);
  });
  
  // Create a divider
  const divider = document.createElement('hr');
  divider.style.cssText = 'margin: 20px 0; border: 0; border-top: 1px solid #eee;';
  
  // OpenAI API Key section
  const openaiLabel = document.createElement('label');
  openaiLabel.textContent = 'OpenAI API Key (for summarization):';
  openaiLabel.style.cssText = 'display: block; margin: 15px 0 5px; font-weight: bold; color: #10a37f;';
  
  const openaiKeyInput = document.createElement('input');
  openaiKeyInput.type = 'password';
  openaiKeyInput.value = localStorage.getItem('openai_api_key') || '';
  openaiKeyInput.placeholder = 'Enter your OpenAI API key';
  openaiKeyInput.style.cssText = 'width: 100%; padding: 8px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 4px;';
  
  // Toggle OpenAI key visibility button
  const openaiToggleButton = document.createElement('button');
  openaiToggleButton.textContent = 'Show Key';
  openaiToggleButton.style.cssText = 'margin-right: 10px; padding: 8px 12px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;';
  openaiToggleButton.addEventListener('click', () => {
    if (openaiKeyInput.type === 'password') {
      openaiKeyInput.type = 'text';
      openaiToggleButton.textContent = 'Hide Key';
    } else {
      openaiKeyInput.type = 'password';
      openaiToggleButton.textContent = 'Show Key';
    }
  });
  
  // Save OpenAI key button
  const saveOpenaiButton = document.createElement('button');
  saveOpenaiButton.textContent = 'Save OpenAI Key';
  saveOpenaiButton.style.cssText = 'margin-right: 10px; padding: 8px 12px; background: #10a37f; color: white; border: none; border-radius: 4px; cursor: pointer;';
  saveOpenaiButton.addEventListener('click', () => {
    const key = openaiKeyInput.value.trim();
    if (key) {
      // Save OpenAI key to localStorage
      localStorage.setItem('openai_api_key', key);
      
      // Update the app to use this key
      const setOpenAIKey = require('./services/openaiService').setApiKey;
      setOpenAIKey(key);
      
      // Show saved confirmation
      saveOpenaiButton.textContent = 'Saved!';
      setTimeout(() => {
        saveOpenaiButton.textContent = 'Save OpenAI Key';
      }, 1500);
    }
  });
  
  // Clear OpenAI key button
  const clearOpenaiButton = document.createElement('button');
  clearOpenaiButton.textContent = 'Clear Key';
  clearOpenaiButton.style.cssText = 'margin-right: 10px; padding: 8px 12px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;';
  clearOpenaiButton.addEventListener('click', () => {
    // Clear OpenAI key from localStorage
    localStorage.removeItem('openai_api_key');
    openaiKeyInput.value = '';
    
    // Update the app
    const setOpenAIKey = require('./services/openaiService').setApiKey;
    setOpenAIKey('');
    
    // Show cleared confirmation
    clearOpenaiButton.textContent = 'Cleared!';
    setTimeout(() => {
      clearOpenaiButton.textContent = 'Clear Key';
    }, 1500);
  });
  
  // OpenAI button container
  const openaiButtonContainer = document.createElement('div');
  openaiButtonContainer.style.cssText = 'display: flex; margin: 20px 0 15px;';
  openaiButtonContainer.appendChild(openaiToggleButton);
  openaiButtonContainer.appendChild(saveOpenaiButton);
  openaiButtonContainer.appendChild(clearOpenaiButton);
  
  // Close button
  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close';
  closeButton.style.cssText = 'padding: 8px 12px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;';
  closeButton.addEventListener('click', () => {
    document.body.removeChild(modalOverlay);
  });
  
  // Helper text
  const helperText = document.createElement('p');
  helperText.style.cssText = 'margin-top: 20px; font-size: 14px; color: #666;';
  helperText.innerHTML = 'Different transcription services have different capabilities and pricing.<br>'
    + '<strong>AssemblyAI</strong> - Best overall quality with diarization<br>'
    + '<strong>OpenAI Whisper</strong> - High accuracy with good performance<br>'
    + '<strong>Google Speech</strong> - Excellent for specific use cases<br><br>'
    + '<span style="color: #10a37f;"><strong>Note:</strong> OpenAI is always used for summary generation.</span>';
  
  // Get transcription service key link
  const keyLink = document.createElement('a');
  keyLink.textContent = `Get a ${serviceInfo.name} API key`;
  keyLink.href = serviceInfo.keyInfoUrl;
  keyLink.target = '_blank';
  keyLink.rel = 'noopener noreferrer';
  keyLink.style.cssText = 'display: block; margin-top: 10px; color: #4a90e2; text-decoration: none;';
  
  // Get OpenAI key link
  const openaiKeyLink = document.createElement('a');
  openaiKeyLink.textContent = 'Get an OpenAI API key';
  openaiKeyLink.href = 'https://platform.openai.com/api-keys';
  openaiKeyLink.target = '_blank';
  openaiKeyLink.rel = 'noopener noreferrer';
  openaiKeyLink.style.cssText = 'display: block; margin-top: 10px; color: #10a37f; text-decoration: none;';
  
  // Close on overlay click
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      document.body.removeChild(modalOverlay);
    }
  });
  
  // Close on escape key
  document.addEventListener('keydown', function escapeClose(e) {
    if (e.key === 'Escape') {
      if (document.body.contains(modalOverlay)) {
        document.body.removeChild(modalOverlay);
      }
      document.removeEventListener('keydown', escapeClose);
    }
  });
  
  // Assemble main service container
  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = 'display: flex; margin: 20px 0 15px;';
  buttonContainer.appendChild(toggleButton);
  buttonContainer.appendChild(saveButton);
  buttonContainer.appendChild(clearButton);
  
  // Assemble the modal content
  modalContent.appendChild(header);
  modalContent.appendChild(serviceLabel);
  modalContent.appendChild(serviceSelect);
  modalContent.appendChild(keyLabel);
  modalContent.appendChild(apiKeyInput);
  modalContent.appendChild(buttonContainer);
  
  // Add OpenAI section
  modalContent.appendChild(divider);
  modalContent.appendChild(openaiLabel);
  modalContent.appendChild(openaiKeyInput);
  modalContent.appendChild(openaiButtonContainer);
  
  // Add help and links
  modalContent.appendChild(helperText);
  modalContent.appendChild(keyLink);
  modalContent.appendChild(openaiKeyLink);
  modalContent.appendChild(document.createElement('br'));
  modalContent.appendChild(closeButton);
  
  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);
}; 