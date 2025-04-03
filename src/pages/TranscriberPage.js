import React, { useState, useEffect, useCallback } from 'react';
import AudioRecorder from '../components/AudioRecorder';
import AudioUploader from '../components/AudioUploader';
import TranscriptDisplay from '../components/TranscriptDisplay';
import CallInterface from '../components/CallInterface';
import { setApiKey as setOpenAIKey } from '../services/openaiService';
import * as transcriptionService from '../services/transcriptionServiceManager';
import { validateAudioFile, formatDuration } from '../utils/audioUtils';
import './TranscriberPage.css';
import { showFallbackSettingsModal } from '../fallbackModal';

// Add a global variable to track if modal is open
let isModalOpen = false;

// Update the openSettingsModal function with better error handling
const openSettingsModal = (handleApiKeyChange, handleServiceChange, transcriptionService, setOpenAIKey) => {
  if (isModalOpen) return; // Prevent multiple modals
  isModalOpen = true;
  
  console.log("Opening settings modal");
  
  try {
    // Get saved service and key
    const activeService = transcriptionService.getActiveService();
    const serviceInfo = transcriptionService.getServiceInfo();
    
    // Create modal container
    const modalContainer = document.createElement('div');
    modalContainer.className = 'api-popup-overlay';
    modalContainer.id = 'settings-modal-container';
    modalContainer.style.cssText = 
      'position: fixed; top: 0; left: 0; right: 0; bottom: 0; ' +
      'background-color: rgba(0,0,0,0.7); display: flex; ' +
      'justify-content: center; align-items: center; z-index: 999999;';
      
    // Add the HTML content with directly embedded form
    modalContainer.innerHTML = `
      <div class="api-popup" style="background: white; border-radius: 8px; 
           width: 90%; max-width: 600px; z-index: 1000000; overflow: hidden;">
        <div class="popup-header" style="display: flex; justify-content: space-between; 
             align-items: center; padding: 16px 20px; border-bottom: 1px solid #eee;">
          <h2 style="margin: 0; font-size: 18px; color: #2c3e50;">API Settings</h2>
          <button id="close-modal-btn" class="close-button" 
                  style="background: none; border: none; font-size: 24px; 
                         color: #666; cursor: pointer; line-height: 1;">×</button>
        </div>
        <div id="modal-content" class="popup-content" 
             style="padding: 20px; max-height: 70vh; overflow-y: auto;">
          
          <div class="service-selector" style="margin-bottom: 20px;">
            <label for="service-select" style="display: block; margin-bottom: 8px; font-weight: 500;">Transcription Service:</label>
            <select id="service-select" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 15px;">
              ${transcriptionService.getServices().map(service => 
                `<option value="${service.id}" ${service.id === activeService ? 'selected' : ''}>
                  ${service.name}
                </option>`
              ).join('')}
            </select>
            <p id="service-description" style="font-size: 14px; color: #666; margin-bottom: 15px;">
              ${serviceInfo.keyInfoText}
              <br />
              <a 
                href="${serviceInfo.keyInfoUrl}" 
                target="_blank" 
                rel="noopener noreferrer"
                style="color: #4a90e2; text-decoration: none;"
              >
                Get a ${serviceInfo.name} API key
              </a>
            </p>
          </div>
          
          <div class="api-key-container">
            <div class="api-key-input-group" style="margin-bottom: 15px;">
              <label for="apiKeyInput" style="display: block; margin-bottom: 8px; font-weight: 500;">
                <span id="service-key-label">${serviceInfo.name} ${serviceInfo.keyType}:</span>
              </label>
              <div class="input-with-actions" style="display: flex;">
                <input
                  type="password"
                  id="apiKeyInput"
                  value="${localStorage.getItem(serviceInfo.keyStorageName) || ''}"
                  placeholder="Enter your API Key"
                  class="api-key-input"
                  style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 4px 0 0 4px;"
                />
                <button 
                  type="button" 
                  id="visibility-toggle"
                  style="padding: 0 12px; background: #f1f1f1; border: 1px solid #ddd; border-left: none; border-radius: 0 4px 4px 0; cursor: pointer;"
                >
                  Show
                </button>
              </div>
            </div>
            
            <div class="api-key-actions" style="display: flex; gap: 10px; margin-bottom: 15px;">
              <button 
                id="save-key-button"
                style="padding: 8px 16px; background: #4a90e2; color: white; border: none; border-radius: 4px; cursor: pointer;"
              >
                Save Key
              </button>
              
              <button 
                id="clear-key-button"
                style="padding: 8px 16px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;"
              >
                Clear Key
              </button>
            </div>
          </div>
          
          <!-- Add OpenAI API key input section -->
          <div class="api-key-container" style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <div class="api-key-input-group" style="margin-bottom: 15px;">
              <label for="openaiKeyInput" style="display: block; margin-bottom: 8px; font-weight: 500; color: #10a37f;">
                OpenAI API Key (for summarization):
              </label>
              <div class="input-with-actions" style="display: flex;">
                <input
                  type="password"
                  id="openaiKeyInput"
                  value="${localStorage.getItem('openai_api_key') || ''}"
                  placeholder="Enter your OpenAI API Key"
                  class="api-key-input"
                  style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 4px 0 0 4px;"
                />
                <button 
                  type="button" 
                  id="openai-visibility-toggle"
                  style="padding: 0 12px; background: #f1f1f1; border: 1px solid #ddd; border-left: none; border-radius: 0 4px 4px 0; cursor: pointer;"
                >
                  Show
                </button>
              </div>
            </div>
            
            <div class="api-key-actions" style="display: flex; gap: 10px; margin-bottom: 15px;">
              <button 
                id="save-openai-key-button"
                style="padding: 8px 16px; background: #10a37f; color: white; border: none; border-radius: 4px; cursor: pointer;"
              >
                Save OpenAI Key
              </button>
              
              <button 
                id="clear-openai-key-button"
                style="padding: 8px 16px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;"
              >
                Clear Key
              </button>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-bottom: 15px;">
              The OpenAI API key is used for generating summaries with proper formatting.
              <br />
              <a 
                href="https://platform.openai.com/api-keys" 
                target="_blank" 
                rel="noopener noreferrer"
                style="color: #10a37f; text-decoration: none;"
              >
                Get an OpenAI API key
              </a>
            </p>
          </div>
          
          <div class="api-instructions">
            <p style="margin-top: 20px;"><strong>Important:</strong> Different transcription services have different capabilities and pricing.</p>
            <ul style="padding-left: 20px;">
              <li><strong>Browser Speech Recognition</strong> - Free built-in transcription, no API key required. Perfect for local transcription with no costs.</li>
              <li><strong>AssemblyAI</strong> - Great transcription quality with speaker diarization.</li>
              <li><strong>OpenAI Realtime</strong> - High accuracy with streaming capabilities for faster results.</li>
              <li><strong>Google Speech-to-Text</strong> - Excellent for phone calls.</li>
            </ul>
            <p style="margin-top: 15px; color: #10a37f;"><strong>Note:</strong> OpenAI is always used for summary generation. Please ensure your OpenAI API key is configured if you want to see summaries.</p>
          </div>
        </div>
      </div>
    `;
    
    // Add to DOM
    document.body.appendChild(modalContainer);
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    
    console.log("Modal container added to DOM", document.getElementById('settings-modal-container'));
    
    // Function to close modal
    const closeModal = () => {
      const container = document.getElementById('settings-modal-container');
      console.log("Attempting to close modal, container exists:", !!container);
      
      if (container && document.body.contains(container)) {
        console.log("Closing settings modal");
        
        try {
          // Remove the container
          document.body.removeChild(container);
          document.body.classList.remove('modal-open');
          document.body.style.overflow = '';
          
          console.log("Modal closed successfully");
        } catch (e) {
          console.error("Error closing modal:", e);
        }
        
        isModalOpen = false;
      } else {
        console.warn("Could not find modal container to close");
        isModalOpen = false;
      }
    };
    
    // Add click handlers
    modalContainer.addEventListener('click', (e) => {
      if (e.target === modalContainer) {
        console.log("Clicked outside modal");
        closeModal();
      }
    });
    
    // Add keyboard handler for ESC key
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        console.log("ESC key pressed");
        closeModal();
        document.removeEventListener('keydown', handleKeyDown);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    
    const closeBtn = modalContainer.querySelector('#close-modal-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        console.log("Close button clicked");
        closeModal();
      });
    } else {
      console.warn("Could not find close button");
    }
    
    // Handle visibility toggle
    const toggleBtn = document.getElementById('visibility-toggle');
    const keyInput = document.getElementById('apiKeyInput');
    
    if (toggleBtn && keyInput) {
      toggleBtn.addEventListener('click', () => {
        if (keyInput.type === 'password') {
          keyInput.type = 'text';
          toggleBtn.textContent = 'Hide';
        } else {
          keyInput.type = 'password';
          toggleBtn.textContent = 'Show';
        }
      });
    }
    
    // Handle service selection changes
    const serviceSelect = document.getElementById('service-select');
    const serviceKeyLabel = document.getElementById('service-key-label');
    const serviceDescription = document.getElementById('service-description');
    
    if (serviceSelect) {
      serviceSelect.addEventListener('change', () => {
        const selectedService = serviceSelect.value;
        const newServiceInfo = transcriptionService.getServiceInfo(selectedService);
        
        // Update key input for the selected service
        if (keyInput) {
          const savedKey = localStorage.getItem(newServiceInfo.keyStorageName) || '';
          keyInput.value = savedKey;
        }
        
        // Update the label
        if (serviceKeyLabel) {
          serviceKeyLabel.textContent = `${newServiceInfo.name} ${newServiceInfo.keyType}:`;
        }
        
        // Update description
        if (serviceDescription) {
          serviceDescription.innerHTML = `
            ${newServiceInfo.keyInfoText}
            <br />
            <a 
              href="${newServiceInfo.keyInfoUrl}" 
              target="_blank" 
              rel="noopener noreferrer"
              style="color: #4a90e2; text-decoration: none;"
            >
              Get a ${newServiceInfo.name} API key
            </a>
          `;
        }
        
        // Notify the component of the service change
        handleServiceChange(selectedService);
      });
    }
    
    // Handle save button
    const saveBtn = document.getElementById('save-key-button');
    if (saveBtn && keyInput && serviceSelect) {
      saveBtn.addEventListener('click', () => {
        const key = keyInput.value.trim();
        const selectedService = serviceSelect.value;
        
        if (key) {
          // Save key to the selected service
          transcriptionService.setApiKey(key, selectedService);
          
          // If this is the active service, update component state
          if (selectedService === transcriptionService.getActiveService()) {
            handleApiKeyChange(key);
          }
          
          // Briefly show success message
          saveBtn.textContent = 'Saved!';
          saveBtn.style.backgroundColor = '#28a745';
          setTimeout(() => {
            saveBtn.textContent = 'Save Key';
            saveBtn.style.backgroundColor = '#4a90e2';
          }, 1500);
        }
      });
    }
    
    // Handle clear button
    const clearBtn = document.getElementById('clear-key-button');
    if (clearBtn && keyInput && serviceSelect) {
      clearBtn.addEventListener('click', () => {
        const selectedService = serviceSelect.value;
        const serviceInfo = transcriptionService.getServiceInfo(selectedService);
        
        // Clear the key from localStorage
        localStorage.removeItem(serviceInfo.keyStorageName);
        keyInput.value = '';
        
        // If this is the active service, update component state
        if (selectedService === transcriptionService.getActiveService()) {
          handleApiKeyChange('');
        }
        
        // Briefly show success message
        clearBtn.textContent = 'Cleared!';
        setTimeout(() => {
          clearBtn.textContent = 'Clear Key';
        }, 1500);
      });
    }
    
    // After handling the service-specific key buttons, add these handlers for the OpenAI key

    // Handle visibility toggle for OpenAI key
    const openaiToggleBtn = document.getElementById('openai-visibility-toggle');
    const openaiKeyInput = document.getElementById('openaiKeyInput');

    if (openaiToggleBtn && openaiKeyInput) {
      openaiToggleBtn.addEventListener('click', () => {
        if (openaiKeyInput.type === 'password') {
          openaiKeyInput.type = 'text';
          openaiToggleBtn.textContent = 'Hide';
        } else {
          openaiKeyInput.type = 'password';
          openaiToggleBtn.textContent = 'Show';
        }
      });
    }

    // Handle save button for OpenAI key
    const saveOpenAIBtn = document.getElementById('save-openai-key-button');
    if (saveOpenAIBtn && openaiKeyInput) {
      saveOpenAIBtn.addEventListener('click', () => {
        const key = openaiKeyInput.value.trim();
        if (key) {
          // Save the OpenAI key
          localStorage.setItem('openai_api_key', key);
          setOpenAIKey(key);
          
          // Show success message
          saveOpenAIBtn.textContent = 'Saved!';
          saveOpenAIBtn.style.backgroundColor = '#28a745';
          setTimeout(() => {
            saveOpenAIBtn.textContent = 'Save OpenAI Key';
            saveOpenAIBtn.style.backgroundColor = '#10a37f';
          }, 1500);
        }
      });
    }

    // Handle clear button for OpenAI key
    const clearOpenAIBtn = document.getElementById('clear-openai-key-button');
    if (clearOpenAIBtn && openaiKeyInput) {
      clearOpenAIBtn.addEventListener('click', () => {
        // Clear the OpenAI key
        localStorage.removeItem('openai_api_key');
        openaiKeyInput.value = '';
        setOpenAIKey('');
        
        // Show cleared message
        clearOpenAIBtn.textContent = 'Cleared!';
        setTimeout(() => {
          clearOpenAIBtn.textContent = 'Clear Key';
        }, 1500);
      });
    }
    
  } catch (error) {
    console.error("Error creating modal:", error);
    isModalOpen = false;
    // Fall back to the simple modal if there's an error
    showFallbackSettingsModal(handleApiKeyChange);
  }
};

const TranscriberPage = () => {
  const [audioFile, setAudioFile] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState('');
  const [diarizedTranscript, setDiarizedTranscript] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [inputMethod, setInputMethod] = useState('upload'); // 'upload', 'record', or 'call'
  const [apiKeySet, setApiKeySet] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({ stage: '', progress: 0 });
  const [recordingTime, setRecordingTime] = useState(0);
  const [sentimentScore, setSentimentScore] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [callActive, setCallActive] = useState(false);
  const [useInlineForm, setUseInlineForm] = useState(false);
  const [activeService, setActiveService] = useState('assemblyai');
  
  // Timer ref for call duration
  const timerRef = React.useRef(null);
  const startTimeRef = React.useRef(null);

  // Initialize transcription services
  useEffect(() => {
    // Initialize all API keys from localStorage
    transcriptionService.initApiKeys();
    
    // Check if browser speech recognition is supported
    const browserSupported = transcriptionService.isBrowserSpeechSupported();
    console.log("Browser speech recognition supported:", browserSupported);
    
    // If browser speech is supported, set it as the active service for live transcription
    if (browserSupported) {
      transcriptionService.setActiveService('browser');
      setActiveService('browser');
      setApiKeySet(true); // Browser speech doesn't require an API key
    } else {
      // Otherwise use the previously active service
      setActiveService(transcriptionService.getActiveService());
      // Check if the active service has an API key
      setApiKeySet(transcriptionService.hasApiKey());
    }
    
    // Also check if OpenAI key is set for summarization
    const openaiKey = localStorage.getItem('openai_api_key');
    if (openaiKey) {
      // Set OpenAI key for summarization
      setOpenAIKey(openaiKey);
    }
  }, []);

  // Display the current active service
  const activeServiceInfo = transcriptionService.getServiceInfo(activeService);
  const activeServiceDisplay = activeServiceInfo.name;

  // Handle API key change
  const handleApiKeyChange = useCallback((key, serviceType = activeService) => {
    if (key) {
      // Set the API key for the specific service
      transcriptionService.setApiKey(key, serviceType);
      
      // If this is the active service, update API key status
      if (serviceType === activeService) {
        setApiKeySet(true);
      }
      
      // If this is OpenAI, make sure to set it for summarization
      if (serviceType === 'openai') {
        setOpenAIKey(key);
        console.log('OpenAI API key set for summarization');
      }
    } else {
      // If clearing the key for the active service, update state
      if (serviceType === activeService) {
        setApiKeySet(false);
      }
    }
  }, [activeService]);
  
  // Handle service change
  const handleServiceChange = useCallback((serviceKey) => {
    console.log(`Changing service to: ${serviceKey}`);
    transcriptionService.setActiveService(serviceKey);
    setActiveService(serviceKey);
    
    // Update API key state based on the selected service
    setApiKeySet(transcriptionService.hasApiKey(serviceKey));
  }, []);

  // Update useEffect to show modal on first load if no key
  useEffect(() => {
    try {
      // Check if the active service has a valid API key
      if (!transcriptionService.hasApiKey()) {
        // If no key, show modal after a delay
        setTimeout(() => {
          try {
            openSettingsModal(handleApiKeyChange, handleServiceChange, transcriptionService, setOpenAIKey);
          } catch (error) {
            console.error("Error showing initial modal, falling back:", error);
            showFallbackSettingsModal(handleApiKeyChange);
          }
        }, 500);
      }
    } catch (error) {
      console.error("Error checking API key:", error);
    }
  }, [handleApiKeyChange, handleServiceChange]);

  // Handle audio file from uploader or recorder
  const handleAudioReady = useCallback((file) => {
    setAudioFile(file);
    setTranscript('');
    setSummary('');
    setDiarizedTranscript([]);
    setError('');
  }, []);
  
  // Calculate sentiment score based on transcript content (placeholder for now)
  const calculateSentiment = useCallback((text) => {
    if (!text) return 0;
    
    // This is just a placeholder. In a real app, you'd use a more sophisticated sentiment analysis
    const positiveWords = ['good', 'great', 'excellent', 'happy', 'positive', 'awesome', 'love', 'like'];
    const negativeWords = ['bad', 'terrible', 'awful', 'unhappy', 'negative', 'hate', 'dislike', 'poor'];
    
    let score = 0;
    const words = text.toLowerCase().split(/\s+/);
    
    words.forEach(word => {
      if (positiveWords.includes(word)) score += 1;
      if (negativeWords.includes(word)) score -= 1;
    });
    
    return score;
  }, []);

  // Start call function
  const handleStartCall = useCallback(() => {
    setIsRecording(true);
    setCallActive(true);
    setTranscript('');
    setSummary('');
    setDiarizedTranscript([]);
    setError('');
    
    // Start timer
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setRecordingTime(Date.now() - startTimeRef.current);
    }, 1000);
    
    // You would also start your audio recording here
    // This would connect to your actual recording logic
    
  }, []);
  
  // Stop call function
  const handleStopCall = useCallback(() => {
    setIsRecording(false);
    setCallActive(false);
    
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // For demo, create a sample transcript
    const sampleTranscript = "User: Hi, I'm calling about my recent order.\nAgent: Hello, I'd be happy to help with your order. Could you provide your order number?\nUser: Yes, it's AB12345.\nAgent: Thank you. I see your order. What seems to be the issue?\nUser: I ordered the blue version but received the red one.\nAgent: I apologize for that mistake. I'd be happy to arrange a replacement for you.";
    
    setTranscript(sampleTranscript);
    
    // Calculate sentiment
    setSentimentScore(calculateSentiment(sampleTranscript));
    
    // Generate simulated diarized transcript
    const diarizedSegments = [
      {
        speaker: "Speaker 1",
        text: "Hi, I'm calling about my recent order.",
        start: 0,
        end: 3
      },
      {
        speaker: "Speaker 2",
        text: "Hello, I'd be happy to help with your order. Could you provide your order number?",
        start: 3.5,
        end: 8
      },
      {
        speaker: "Speaker 1",
        text: "Yes, it's AB12345.",
        start: 8.5,
        end: 10
      },
      {
        speaker: "Speaker 2",
        text: "Thank you. I see your order. What seems to be the issue?",
        start: 10.5,
        end: 14
      },
      {
        speaker: "Speaker 1",
        text: "I ordered the blue version but received the red one.",
        start: 14.5,
        end: 18
      },
      {
        speaker: "Speaker 2",
        text: "I apologize for that mistake. I'd be happy to arrange a replacement for you.",
        start: 18.5,
        end: 23
      }
    ];
    
    setDiarizedTranscript(diarizedSegments);
    
    // Generate a summary with OpenAI
    (async () => {
      try {
        // Always use OpenAI for summary generation
        const summaryText = await transcriptionService.generateSummary(sampleTranscript);
        setSummary(summaryText);
      } catch (error) {
        console.error("Error generating summary for simulated call:", error);
        setSummary(`Summary:\nThis was a call about a wrong product color. Customer received a red item but ordered blue.\n\nAction Required:\n1. Arrange replacement with the correct blue color\n2. Process return for the incorrect red item\n3. Check order fulfillment process for color selection issues`);
      }
    })();
    
  }, [calculateSentiment]);

  // Process the audio file (transcribe and summarize)
  const processAudio = useCallback(async () => {
    if (!audioFile) {
      setError('Please provide an audio file');
      return;
    }

    // Check for both transcription service and OpenAI API keys
    if (!apiKeySet) {
      const serviceName = transcriptionService.getServiceInfo().name;
      setError(`Please set your ${serviceName} API key first`);
      return;
    }
    
    // Also check for OpenAI API key for summarization
    const openaiKey = localStorage.getItem('openai_api_key');
    if (!openaiKey) {
      setError(`Please set your OpenAI API key for summarization. Click Settings to configure.`);
      return;
    }

    try {
      setIsProcessing(true);
      setError('');
      
      // Add a brief validation step before starting the upload
      setProcessingProgress({ stage: 'Validating audio file...', progress: 5 });
      try {
        await validateAudioFile(audioFile);
      } catch (validationError) {
        console.error("Audio validation failed:", validationError);
        throw new Error(`Audio validation failed: ${validationError.message}. Please try a different file or record again with a better microphone.`);
      }
      
      setProcessingProgress({ stage: 'Preparing audio for upload...', progress: 10 });
      
      // Check audio file size and type
      console.log('Processing file:', audioFile.name, audioFile.type, audioFile.size, 'bytes');
      
      if (audioFile.size < 1000) {
        throw new Error('Audio file is too small and likely contains no audio data. Please try recording again with a different microphone.');
      }
      
      // For WebM files, add extra warning about codec issues
      if (audioFile.type.includes('webm')) {
        console.warn("WebM format detected. If upload fails, try recording in MP3 format if possible.");
      }
      
      setProcessingProgress({ stage: 'Uploading audio...', progress: 15 });
      
      // Process the audio completely using the active transcription service
      let result;
      try {
        const serviceName = transcriptionService.getServiceInfo().name;
        console.log(`Processing audio with ${serviceName}...`);
        
        // Use the combined processAudioComplete method
        setProcessingProgress({ stage: `Processing with ${serviceName}...`, progress: 40 });
        result = await transcriptionService.processAudioComplete(audioFile);
        console.log('Transcription complete:', result);
      } catch (apiError) {
        console.error('Transcription API error:', apiError);
        
        // Get the current service name
        const serviceName = transcriptionService.getServiceInfo().name;
        
        // Extract useful error information
        let errorMessage = `Failed to process audio with ${serviceName}`;
        
        // Handle transcoding failure specifically
        if (apiError.message && apiError.message.includes('Transcoding failed') && 
            apiError.message.includes('does not appear to contain audio')) {
          
          errorMessage = 'This file could not be processed because it doesn\'t appear to contain valid audio. ' +
            'Please try the following:\n' +
            '1. Ensure your microphone is working properly\n' +
            '2. Try recording again with different microphone settings\n' +
            '3. Try recording in a different format (MP3 instead of WebM)\n' +
            '4. Check your browser permissions for microphone access';
          
          console.error('Detailed transcoding error:', apiError.message);
        }
        // Handle API-specific errors
        else if (apiError.response) {
          // The request was made and the server responded with a status code
          console.error('API Error Response:', apiError.response.status, apiError.response.data);
          if (apiError.response.data && apiError.response.data.error) {
            errorMessage = `${serviceName} Error: ${apiError.response.data.error}`;
          } else {
            errorMessage = `${serviceName} Error: ${apiError.response.status} - ${apiError.response.statusText}`;
          }
        } else if (apiError.request) {
          // The request was made but no response was received
          console.error('API Request Error (No Response):', apiError.request);
          errorMessage = `No response from ${serviceName}. Please check your internet connection.`;
        } else {
          // Something happened in setting up the request
          console.error('API Setup Error:', apiError.message);
          errorMessage = apiError.message || 'Unknown error occurred';
        }
        
        throw new Error(errorMessage);
      }
      
      // Set the raw transcript text
      setTranscript(result.text);
      
      // Calculate sentiment score
      setSentimentScore(calculateSentiment(result.text));
      
      // Process the diarized transcript
      if (result.utterances && result.utterances.length > 0) {
        const processedDiarization = transcriptionService.processDiarizedTranscript(result);
        setDiarizedTranscript(processedDiarization);
      }
      
      setProcessingProgress({ stage: 'Generating summary with OpenAI...', progress: 80 });
      
      // Generate summary using OpenAI
      try {
        // We always use OpenAI for summary generation regardless of the active transcription service
        const summaryText = await transcriptionService.generateSummary(result.text || result);
        setSummary(summaryText);
      } catch (summaryError) {
        console.error("Error generating summary:", summaryError);
        setSummary(`Summary:\nCould not generate an automatic summary with OpenAI.\n\nAction Required:\n1. Check your OpenAI API key settings\n2. Try processing the audio again`);
      }
      
      setProcessingProgress({ stage: 'Complete!', progress: 100 });
      
    } catch (err) {
      console.error('Error processing audio:', err);
      setError(err.message || 'Failed to process audio');
    } finally {
      setIsProcessing(false);
    }
  }, [audioFile, apiKeySet, calculateSentiment]);

  // Toggle between upload, record, and call interfaces
  const toggleInputMethod = useCallback((method) => {
    // Reset states when changing input method
    setAudioFile(null);
    setTranscript('');
    setSummary('');
    setDiarizedTranscript([]);
    setError('');
    setCallActive(false);
    setIsRecording(false);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setInputMethod(method);
  }, []);

  // Format the recording time
  const formattedCallTime = formatDuration(recordingTime);

  // Handle settings button click
  const handleSettingsClick = () => {
    openSettingsModal(handleApiKeyChange, handleServiceChange, transcriptionService, setOpenAIKey);
  };

  // Determine if we're using browser speech recognition
  const usingBrowserSpeech = activeService === 'browser';

  // Get the current service description for the record tab
  const getRecordTabDescription = () => {
    if (usingBrowserSpeech) {
      return "Record audio using your browser's built-in speech recognition - no API key needed!";
    }
    return "Record audio with your microphone and get a real-time transcript";
  };

  return (
    <div className="transcriber-page">
      <header className="app-header">
        <h1>Demo - Voice Transcriber</h1>
        <p>Upload, record, or simulate a call to get transcriptions and summaries with sentiment analysis.</p>
        
        <div className="settings-container">
          <button 
            className={`settings-button ${apiKeySet ? 'api-configured' : 'api-missing'}`}
            onClick={handleSettingsClick}
            type="button"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            <span>Settings</span>
            <span className="active-service-badge">
              {activeServiceDisplay}
            </span>
            {!apiKeySet && <span className="api-badge">!</span>}
          </button>
        </div>
      </header>
      
      <div className="input-section">
        <div className="input-method-toggle">
          <button 
            onClick={() => toggleInputMethod('upload')} 
            className={`tab-button ${inputMethod === 'upload' ? 'active' : ''}`}
          >
            <i className="icon upload-icon"></i>
            <span>Upload File</span>
            <span className="tab-description">Upload an audio or video file for transcription</span>
          </button>
          
          <button 
            onClick={() => toggleInputMethod('record')} 
            className={`tab-button ${inputMethod === 'record' ? 'active' : ''}`}
          >
            <i className="icon microphone-icon"></i>
            <span>Record Audio</span>
            <span className="tab-description">{getRecordTabDescription()}</span>
          </button>
          
          <button 
            onClick={() => toggleInputMethod('call')} 
            className={`tab-button ${inputMethod === 'call' ? 'active' : ''}`}
          >
            <i className="icon phone-icon"></i>
            <span>Simulate Call</span>
            <span className="tab-description">Simulate a phone call with transcription</span>
          </button>
        </div>
        
        {useInlineForm && (
          <div className="inline-api-form">
            <h3>API Key Configuration</h3>
            <p>Configure your API keys below:</p>
            
            <div className="inline-form-controls">
              <label htmlFor="inline-api-key">
                {transcriptionService.getServiceInfo().name} API Key:
              </label>
              <input 
                type="password" 
                id="inline-api-key" 
                placeholder={`Enter your ${transcriptionService.getServiceInfo().name} API Key`}
                defaultValue={localStorage.getItem(transcriptionService.getServiceInfo().keyStorageName) || ''}
              />
              
              <label htmlFor="inline-openai-key" style={{marginTop: '15px'}}>
                OpenAI API Key (for summarization):
              </label>
              <input 
                type="password" 
                id="inline-openai-key" 
                placeholder="Enter your OpenAI API Key"
                defaultValue={localStorage.getItem('openai_api_key') || ''}
              />
              
              <div className="inline-form-buttons">
                <button onClick={() => {
                  // Save transcription service key
                  const mainKey = document.getElementById('inline-api-key').value.trim();
                  const openaiKey = document.getElementById('inline-openai-key').value.trim();
                  
                  if (mainKey) {
                    localStorage.setItem(transcriptionService.getServiceInfo().keyStorageName, mainKey);
                    handleApiKeyChange(mainKey);
                  }
                  
                  // Save OpenAI key if provided
                  if (openaiKey) {
                    localStorage.setItem('openai_api_key', openaiKey);
                    setOpenAIKey(openaiKey);
                  }
                  
                  setUseInlineForm(false);
                }}>
                  Save Keys
                </button>
                
                <button onClick={() => {
                  // Clear the active service key
                  localStorage.removeItem(transcriptionService.getServiceInfo().keyStorageName);
                  document.getElementById('inline-api-key').value = '';
                  handleApiKeyChange('');
                  
                  // Clear OpenAI key
                  localStorage.removeItem('openai_api_key');
                  document.getElementById('inline-openai-key').value = '';
                  setOpenAIKey('');
                }}>
                  Clear Keys
                </button>
                
                <button onClick={() => setUseInlineForm(false)}>
                  Close
                </button>
              </div>
            </div>
            
            <p>
              <a 
                href={transcriptionService.getServiceInfo().keyInfoUrl} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                Get a {transcriptionService.getServiceInfo().name} API key
              </a>
              &nbsp;|&nbsp;
              <a 
                href="https://platform.openai.com/api-keys" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                Get an OpenAI API key
              </a>
            </p>
          </div>
        )}
        
        <div className="audio-input-container">
          {inputMethod === 'upload' && (
            <AudioUploader onAudioReady={handleAudioReady} />
          )}
          
          {inputMethod === 'record' && (
            <AudioRecorder onAudioReady={handleAudioReady} />
          )}
          
          {inputMethod === 'call' && (
            <CallInterface 
              transcript={transcript}
              sentimentScore={sentimentScore}
              isRecording={isRecording}
              onStartCall={handleStartCall}
              onStopCall={handleStopCall}
              formattedTime={formattedCallTime}
            />
          )}
        </div>
        
        {(inputMethod !== 'call' && audioFile) && (
          <div className="process-button-container">
            <button 
              className="process-button"
              onClick={processAudio}
              disabled={isProcessing || !audioFile || !apiKeySet}
            >
              {isProcessing ? 'Processing...' : 'Transcribe & Summarize'}
            </button>
            
            {!apiKeySet && (
              <div className="api-key-notice">
                <span>⚠️</span> API key required. <button onClick={handleSettingsClick} className="link-button">Configure API key</button>
              </div>
            )}
          </div>
        )}
        
        {isProcessing && (
          <div className="processing-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${processingProgress.progress}%` }}
              ></div>
            </div>
            <div className="progress-text">{processingProgress.stage}</div>
          </div>
        )}
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
      </div>
      
      {(inputMethod !== 'call' && (transcript || summary)) && (
        <div className="results-section">
          <TranscriptDisplay 
            transcript={transcript} 
            summary={summary} 
            isLoading={isProcessing}
            diarizedTranscript={diarizedTranscript}
          />
        </div>
      )}
    </div>
  );
};

export default TranscriberPage; 