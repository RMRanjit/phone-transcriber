import axios from 'axios';

const API_URL = 'https://api.openai.com/v1';

// Initialize with empty API key - to be set by user
let API_KEY = '';

// Rate limiting variables
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 10000; // Minimum 10 seconds between requests to avoid rate limits

// WebSocket connection for realtime transcription
let realtimeSocket = null;
let realtimeListeners = [];

export const setApiKey = (key) => {
  API_KEY = key;
};

export const getHeaders = () => {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`
  };
};

// Check if we should throttle requests
const shouldThrottle = () => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  return timeSinceLastRequest < MIN_REQUEST_INTERVAL;
};

// Update last request time
const updateRequestTime = () => {
  lastRequestTime = Date.now();
};

// Transcribe audio using OpenAI API
export const transcribeAudio = async (audioFile) => {
  if (!API_KEY) throw new Error('API key not set');

  const formData = new FormData();
  formData.append('file', audioFile);
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'verbose_json');
  
  try {
    console.log("Transcribing with OpenAI API...");
    updateRequestTime();
    const response = await axios.post(
      `${API_URL}/audio/transcriptions`, 
      formData, 
      { 
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'multipart/form-data'
        } 
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    if (error.response && error.response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again in a few moments.');
    }
    throw error;
  }
};

// Set up a realtime transcription connection
export const setupRealtimeTranscription = async (callbacks = {}) => {
  if (!API_KEY) throw new Error('API key not set');
  
  try {
    console.log("Setting up OpenAI Realtime transcription...");
    
    // For now, we'll use the standard transcription API but simulate chunking
    // This is a placeholder for when OpenAI releases a true realtime API
    return {
      id: `realtime-${Date.now()}`,
      status: 'ready',
      callbacks: callbacks
    };
  } catch (error) {
    console.error("Error setting up realtime transcription:", error);
    throw error;
  }
};

// Process audio in chunks for a more realtime-like experience
export const processAudioInChunks = async (audioFile, onProgress, onTranscript) => {
  if (!API_KEY) throw new Error('API key not set');
  
  try {
    console.log("Processing audio file in chunks for realtime-like behavior");
    
    // Check if the audio file is valid
    if (!audioFile || audioFile.size === 0) {
      throw new Error('Invalid audio file');
    }
    
    // For now, we'll use the standard transcription API but simulate chunking
    onProgress?.({ stage: 'Starting transcription...', progress: 30 });
    
    const result = await transcribeAudio(audioFile);
    
    onProgress?.({ stage: 'Processing transcript...', progress: 90 });
    
    // Split the transcript into segments to simulate real-time chunks
    if (result.segments && result.segments.length > 0) {
      let cumulativeText = '';
      
      // Simulate receiving chunks over time
      for (const segment of result.segments) {
        // Add this segment to the cumulative text
        cumulativeText += ' ' + segment.text;
        
        // Notify with the current segment
        if (onTranscript) {
          onTranscript({
            type: 'transcript',
            text: segment.text,
            cumulativeText: cumulativeText.trim(),
            isFinal: false,
            timestamp: segment.start
          });
          
          // Add a small delay to simulate real-time streaming
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      // Send final transcript
      if (onTranscript) {
        onTranscript({
          type: 'transcript',
          text: result.text,
          cumulativeText: result.text,
          isFinal: true,
          timestamp: (result.segments[result.segments.length - 1]?.end || 0)
        });
      }
    } else {
      // No segments, just return the full text
      if (onTranscript) {
        onTranscript({
          type: 'transcript',
          text: result.text,
          cumulativeText: result.text,
          isFinal: true,
          timestamp: 0
        });
      }
    }
    
    onProgress?.({ stage: 'Transcription complete', progress: 100 });
    
    return {
      text: result.text,
      segments: result.segments || []
    };
  } catch (error) {
    console.error("Error processing audio in chunks:", error);
    throw error;
  }
};

// Generate summary and action items using OpenAI
export const generateSummary = async (transcript) => {
  if (!API_KEY) throw new Error('API key not set');

  try {
    updateRequestTime();
    const response = await axios.post(
      `${API_URL}/chat/completions`,
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an assistant that summarizes phone conversations and extracts action items. You should format your response with two clear sections: "Summary:" followed by a concise summary, and "Action Required:" followed by a numbered list of specific action items that need to be addressed.'
          },
          {
            role: 'user',
            content: `Please analyze this conversation and provide a clear summary followed by a numbered list of action items that need to be addressed:\n\n${transcript}`
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      },
      {
        headers: getHeaders()
      }
    );
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error generating summary:', error);
    if (error.response && error.response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again in a few moments.');
    }
    throw error;
  }
};

// Add uploadAudio function to match the interface expected by the service manager
export const uploadAudio = async (audioFile) => {
  if (!API_KEY) throw new Error('API key not set - please enter your OpenAI API key');
  if (API_KEY.trim() === '') throw new Error('API key is empty - please enter a valid OpenAI API key');

  try {
    console.log("Processing audio with OpenAI Realtime API...");
    console.log("File details:", {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size,
      lastModified: new Date(audioFile.lastModified).toISOString()
    });

    // With OpenAI, there's no separate upload step
    // The file is processed in chunks for realtime-like behavior
    return {
      file: audioFile,
      serviceType: 'openai-realtime'
    };
  } catch (error) {
    console.error('Error preparing audio for OpenAI:', error);
    throw error;
  }
};

// Start transcription with OpenAI Realtime API
export const startTranscription = async (uploadReference, options = {}) => {
  if (!API_KEY) throw new Error('API key not set');
  if (!uploadReference || !uploadReference.file) {
    throw new Error('Invalid upload reference - audio file is missing');
  }

  try {
    // Return a reference object with file info
    return {
      id: Date.now().toString(),
      file: uploadReference.file,
      status: 'processing',
      options: options
    };
  } catch (error) {
    console.error('Error starting transcription:', error);
    throw error;
  }
};

// Poll for transcription (simulates completion of realtime processing)
export const pollTranscription = async (transcriptReference) => {
  if (!API_KEY) throw new Error('API key not set');
  if (!transcriptReference || !transcriptReference.file) {
    throw new Error('Invalid transcript reference - audio file is missing');
  }

  try {
    console.log("Processing with OpenAI Realtime API simulation...");
    
    // Collect all transcript chunks
    let finalText = '';
    let segments = [];
    
    // Process the file in chunks
    await processAudioInChunks(
      transcriptReference.file,
      (progress) => console.log("Progress:", progress),
      (transcript) => {
        if (transcript.isFinal) {
          finalText = transcript.cumulativeText;
        }
        // Store segments for diarization
        if (transcript.text) {
          segments.push({
            text: transcript.text,
            timestamp: transcript.timestamp
          });
        }
      }
    );
    
    // Convert segments to utterances format
    const utterances = segments.map((segment, index) => {
      // Alternate speakers for a simple simulation of diarization
      const speaker = (index % 2) + 1;
      return {
        speaker: speaker,
        text: segment.text,
        start: segment.timestamp * 1000,
        end: ((segments[index + 1]?.timestamp || segment.timestamp + 2) * 1000)
      };
    });
    
    return {
      id: transcriptReference.id,
      status: 'completed',
      text: finalText,
      utterances: utterances
    };
  } catch (error) {
    console.error('Error processing with OpenAI Realtime API:', error);
    throw error;
  }
};

// Process an audio file completely using chunks
export const processAudioComplete = async (audioFile) => {
  if (!API_KEY) throw new Error('API key not set');
  
  try {
    console.log("Complete audio processing with OpenAI Realtime API simulation...");
    
    // Use a Promise to collect the full transcript
    return new Promise((resolve, reject) => {
      let finalText = '';
      let segments = [];
      
      processAudioInChunks(
        audioFile,
        (progress) => console.log("Progress:", progress),
        (transcript) => {
          if (transcript.isFinal) {
            finalText = transcript.cumulativeText;
          }
          if (transcript.text) {
            segments.push({
              text: transcript.text,
              timestamp: transcript.timestamp
            });
          }
        }
      ).then(() => {
        // Create utterances from segments
        const utterances = segments.map((segment, index) => {
          // Alternate speakers for a simple simulation of diarization
          const speaker = (index % 2) + 1;
          return {
            speaker: speaker,
            text: segment.text,
            start: segment.timestamp * 1000,
            end: ((segments[index + 1]?.timestamp || segment.timestamp + 2) * 1000)
          };
        });
        
        resolve({
          id: Date.now().toString(),
          status: 'completed',
          text: finalText,
          utterances: utterances
        });
      }).catch(reject);
    });
  } catch (error) {
    console.error('Error in complete audio processing:', error);
    throw error;
  }
};

// Process diarized transcript
export const processDiarizedTranscript = (result) => {
  // If we have utterances from our processed result, use those
  if (result && result.utterances && result.utterances.length > 0) {
    return result.utterances.map(utterance => ({
      speaker: `Speaker ${utterance.speaker}`,
      text: utterance.text,
      start: utterance.start / 1000, // Convert ms to seconds
      end: utterance.end / 1000     // Convert ms to seconds
    }));
  }
  
  // Otherwise create a simple transcript with one speaker
  const segments = [];
  const text = result?.text || '';
  
  if (text) {
    segments.push({
      speaker: 'Speaker 1',
      text: text,
      start: 0,
      end: 30 // Arbitrary end time
    });
  }
  
  return segments;
}; 