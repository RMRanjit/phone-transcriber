/**
 * Browser Transcription Service
 * Uses the Web Speech API for in-browser transcription
 */

// No API key needed since we're using browser APIs
let API_KEY = 'browser-native';

// Set the API key (not actually used, but kept for interface compatibility)
export const setApiKey = (key) => {
  API_KEY = key;
};

// Check if the browser supports speech recognition
export const isBrowserSupported = () => {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
};

// Create a WebSocket-like interface for browser-based transcription
export const connectRealtimeStream = (onMessage, onError) => {
  // Check browser support
  if (!isBrowserSupported()) {
    const error = new Error('Speech recognition not supported in this browser');
    console.error(error);
    if (onError) onError(error);
    throw error;
  }
  
  console.log('Initializing browser speech recognition...');
  
  try {
    // Initialize speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    // Configure
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    // Mock the WebSocket interface
    const browserRecognition = {
      readyState: WebSocket.CONNECTING,
      lastTranscriptId: 0,
      lastTimestamp: Date.now(),
      
      // Start method (will be called after configuration)
      start: () => {
        recognition.start();
        console.log('Browser speech recognition started');
        
        // Notify connected status
        onMessage({
          message_type: 'Connected',
          message: 'Browser speech recognition connected'
        });
        
        // Notify session start
        onMessage({
          message_type: 'SessionBegins',
          message: 'Browser speech recognition session started'
        });
      },
      
      // Send method (not used but required for interface compatibility)
      send: (data) => {
        if (typeof data === 'string') {
          try {
            const msg = JSON.parse(data);
            if (msg.message_type === 'KeepAlive') {
              console.log('Browser recognition keep-alive ping received');
            }
          } catch (e) {
            // Ignore parsing errors for non-JSON strings
          }
        }
        // Ignore audio data - browser handles audio natively
      },
      
      // Close method
      close: () => {
        try {
          recognition.stop();
          console.log('Browser speech recognition stopped');
          browserRecognition.readyState = WebSocket.CLOSED;
          
          // Notify session end
          onMessage({
            message_type: 'SessionTerminated',
            message: 'Browser speech recognition session terminated'
          });
        } catch (err) {
          console.error('Error stopping speech recognition:', err);
        }
      }
    };
    
    // Set up event handlers
    recognition.onstart = () => {
      console.log('Browser speech recognition started successfully');
      browserRecognition.readyState = WebSocket.OPEN;
    };
    
    recognition.onerror = (event) => {
      console.error('Browser speech recognition error:', event.error);
      if (onError) {
        onError(new Error(`Speech recognition error: ${event.error}`));
      }
      
      // Send an error message
      onMessage({
        message_type: 'Error',
        error: event.error || 'Unknown speech recognition error'
      });
      
      if (event.error === 'network') {
        // Network errors may require restart
        setTimeout(() => {
          try {
            recognition.stop();
            recognition.start();
          } catch (e) {
            console.error('Error restarting recognition after network error:', e);
          }
        }, 1000);
      }
    };
    
    recognition.onend = () => {
      console.log('Browser speech recognition ended');
      
      // Auto-restart if connection was open (unless explicitly closed)
      if (browserRecognition.readyState === WebSocket.OPEN) {
        console.log('Restarting browser speech recognition');
        try {
          recognition.start();
        } catch (e) {
          console.error('Error restarting recognition:', e);
          browserRecognition.readyState = WebSocket.CLOSED;
        }
      }
    };
    
    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';
      
      const now = Date.now();
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPiece = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPiece;
          browserRecognition.lastTranscriptId++;
          
          // Send final transcript event with timestamps
          onMessage({
            message_type: 'FinalTranscript',
            text: transcriptPiece.trim(),
            audio_start: browserRecognition.lastTimestamp,
            audio_end: now,
            id: browserRecognition.lastTranscriptId
          });
          
          browserRecognition.lastTimestamp = now;
        } else {
          interimTranscript += transcriptPiece;
          
          // Send partial transcript event
          onMessage({
            message_type: 'PartialTranscript',
            text: interimTranscript.trim()
          });
        }
      }
    };
    
    // Auto-start after a short delay to allow setup
    setTimeout(() => {
      browserRecognition.start();
    }, 500);
    
    return browserRecognition;
  } catch (error) {
    console.error('Error creating browser speech recognition:', error);
    if (onError) onError(error);
    throw error;
  }
};

// Implement the required API methods for compatibility
export const uploadAudio = async (audioFile) => {
  // Browser doesn't need to upload audio
  return { id: 'browser-transcription', file: audioFile };
};

export const startTranscription = async (uploadReference) => {
  // Browser handles transcription directly, no start needed
  return { id: 'browser-transcription-' + Date.now() };
};

export const pollTranscription = async (transcriptId) => {
  // Browser provides results in real-time, no polling needed
  return { 
    id: transcriptId, 
    status: 'completed',
    text: 'Browser transcription completed',
    utterances: []
  };
};

export const processDiarizedTranscript = (result) => {
  // No diarization in browser speech recognition, just return simple format
  if (result && result.utterances && result.utterances.length > 0) {
    return result.utterances.map(utterance => ({
      speaker: 'Speaker 1',
      text: utterance.text,
      start: utterance.start / 1000,
      end: utterance.end / 1000
    }));
  }
  
  return result?.text ? [{ speaker: 'Speaker 1', text: result.text, start: 0, end: 30 }] : [];
};

// Generate a basic summary (we'll redirect to OpenAI for proper summarization)
export const generateSummary = async (transcript) => {
  return `Summary:\nTranscript from browser speech recognition.\n\nAction Required:\n1. Review the transcript for accuracy\n2. Note any corrections needed`;
};

// Process audio completely - not used for browser speech recognition but needed for API compatibility
export const processAudioComplete = async (audioFile) => {
  // Browser handles speech directly, so this is just a dummy implementation for compatibility
  return { 
    id: 'browser-transcription-' + Date.now(), 
    status: 'completed',
    text: 'Browser transcription completed. Audio processing is handled directly by the browser.',
    utterances: []
  };
}; 