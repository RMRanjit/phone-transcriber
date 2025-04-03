import axios from 'axios';

const API_URL = 'https://api.assemblyai.com/v2';

// Initialize with empty API key - to be set by user
let API_KEY = '';

// Set the API key
export const setApiKey = (key) => {
  console.log("Setting AssemblyAI API key:", key ? "Key provided (hidden for security)" : "No key provided");
  API_KEY = key;
};

// Get the headers for API requests
export const getHeaders = () => {
  if (!API_KEY || API_KEY.trim() === '') {
    console.warn("No AssemblyAI API key is set");
  }
  
  return {
    'authorization': API_KEY,
    'content-type': 'application/json'
  };
};

// Upload audio to AssemblyAI for processing
export const uploadAudio = async (audioFile) => {
  if (!API_KEY) throw new Error('API key not set - please enter your AssemblyAI API key');
  if (API_KEY.trim() === '') throw new Error('API key is empty - please enter a valid AssemblyAI API key');

  try {
    console.log("Starting upload to AssemblyAI...");
    console.log("File details:", {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size,
      lastModified: new Date(audioFile.lastModified).toISOString()
    });

    // Minimum file size check
    if (audioFile.size < 100) {
      throw new Error('File is too small and likely contains no audio data. Please try recording again or use a different file.');
    }

    // Verify we have a valid audio file and fix MIME type if needed
    if (!audioFile.type || audioFile.type === 'application/octet-stream') {
      console.warn("File has no MIME type or generic type. Attempting to infer from extension.");
      // Try to infer type from extension
      const extension = audioFile.name.split('.').pop().toLowerCase();
      const mimeMap = {
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'webm': 'audio/webm',
        'ogg': 'audio/ogg',
        'm4a': 'audio/mp4',
        'mp4': 'video/mp4'
      };
      
      if (mimeMap[extension]) {
        // Create a new file with the correct MIME type
        audioFile = new File(
          [audioFile], 
          audioFile.name,
          { type: mimeMap[extension] }
        );
        console.log("Updated file type to:", audioFile.type);
      } else {
        console.warn("Could not infer MIME type from extension:", extension);
        // Force to MP3 - AssemblyAI handles this well
        audioFile = new File(
          [audioFile],
          'recording.mp3',
          { type: 'audio/mpeg' }
        );
        console.log("Forced file type to audio/mpeg as fallback");
      }
    }

    // Try three different upload approaches to maximize compatibility

    // 1. First try standard FormData upload
    try {
      console.log("Attempting FormData upload with Content-Type determined by browser...");
      const formData = new FormData();
      formData.append('file', audioFile);

      const response = await axios.post(
        'https://api.assemblyai.com/v2/upload',
        formData,
        {
          headers: {
            'authorization': API_KEY,
            // Let browser set content-type with boundary
          },
          timeout: 120000 // 2 minutes
        }
      );

      if (response.data && response.data.upload_url) {
        console.log("FormData upload successful, URL:", response.data.upload_url);
        return response.data.upload_url;
      }
    } catch (error1) {
      console.warn("FormData upload failed:", error1.message);
      
      // 2. Try direct binary upload with explicit content-type
      try {
        console.log("Attempting direct binary upload with explicit Content-Type:", audioFile.type);
        
        const response = await axios.post(
          'https://api.assemblyai.com/v2/upload',
          audioFile, // Send raw file
          {
            headers: {
              'authorization': API_KEY,
              'content-type': audioFile.type
            },
            timeout: 120000
          }
        );
        
        if (response.data && response.data.upload_url) {
          console.log("Direct binary upload successful, URL:", response.data.upload_url);
          return response.data.upload_url;
        }
      } catch (error2) {
        console.warn("Direct binary upload failed:", error2.message);
        
        // 3. Last resort: Try file reading as ArrayBuffer
        try {
          console.log("Attempting ArrayBuffer upload...");
          
          // Read file as ArrayBuffer
          const arrayBuffer = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(audioFile);
          });
          
          // Force MP3 type - most reliable for AssemblyAI
          const contentType = 'audio/mpeg';
          
          const response = await axios.post(
            'https://api.assemblyai.com/v2/upload',
            arrayBuffer,
            {
              headers: {
                'authorization': API_KEY,
                'content-type': contentType
              },
              timeout: 120000
            }
          );
          
          if (response.data && response.data.upload_url) {
            console.log("ArrayBuffer upload successful, URL:", response.data.upload_url);
            return response.data.upload_url;
          }
          
          throw new Error("ArrayBuffer upload failed to get upload URL from response");
        } catch (error3) {
          console.error("All upload methods failed. Last error:", error3);
          throw error3;
        }
      }
    }
    
    throw new Error("All upload attempts failed to return a valid upload URL");
  } catch (error) {
    console.error('Error uploading audio:', error);
    
    // Handle authentication errors specifically
    if (error.response && error.response.status === 401) {
      console.error('Authentication failed. Invalid or missing API key.');
      throw new Error('Authentication failed: Invalid or expired AssemblyAI API key. Please check your API key and try again.');
    }
    
    if (error.response && error.response.status === 422) {
      console.error('Unprocessable content error:', error.response.data);
      throw new Error('File upload failed: AssemblyAI could not process this file. The recording may contain no audio data or use an unsupported codec. Please try recording again with different settings or check your microphone.');
    }
    
    if (error.response && error.response.data) {
      console.error('AssemblyAI response:', error.response.data);
      if (error.response.data.error) {
        throw new Error(`AssemblyAI Error: ${error.response.data.error}`);
      }
    }
    
    // If we get here, it's likely an issue that needs debugging
    throw new Error('Failed to upload audio: ' + (error.message || 'Unknown error') + '. Check browser console for details.');
  }
};

// Start transcription with AssemblyAI
export const startTranscription = async (audioUrl, options = {}) => {
  if (!API_KEY) throw new Error('API key not set');

  try {
    const response = await axios.post(
      `${API_URL}/transcript`,
      {
        audio_url: audioUrl,
        speaker_labels: true, // Enable diarization
        format_text: true,
        punctuate: true,
        ...options
      },
      { headers: getHeaders() }
    );

    return response.data;
  } catch (error) {
    console.error('Error starting transcription:', error);
    throw error;
  }
};

// Get transcription status and results
export const getTranscription = async (transcriptId) => {
  if (!API_KEY) throw new Error('API key not set');

  try {
    const response = await axios.get(
      `${API_URL}/transcript/${transcriptId}`,
      { headers: getHeaders() }
    );

    return response.data;
  } catch (error) {
    console.error('Error getting transcription:', error);
    throw error;
  }
};

// Poll for transcription status until complete
export const pollTranscription = async (transcriptId, interval = 1000, maxAttempts = 60) => {
  let attempts = 0;

  return new Promise((resolve, reject) => {
    const checkStatus = async () => {
      try {
        attempts++;
        const transcript = await getTranscription(transcriptId);

        if (transcript.status === 'completed') {
          return resolve(transcript);
        } else if (transcript.status === 'error') {
          return reject(new Error(`Transcription error: ${transcript.error}`));
        } else if (attempts >= maxAttempts) {
          return reject(new Error('Transcription timed out'));
        }

        setTimeout(checkStatus, interval);
      } catch (error) {
        reject(error);
      }
    };

    checkStatus();
  });
};

// Process an audio file completely (upload, transcribe, and poll until complete)
export const processAudioComplete = async (audioFile) => {
  // Step 1: Upload the audio file
  const uploadUrl = await uploadAudio(audioFile);
  
  // Step 2: Start the transcription
  const transcript = await startTranscription(uploadUrl);
  
  // Step 3: Wait for the transcription to complete
  return await pollTranscription(transcript.id);
};

// WebSocket connection for real-time transcription
export const connectRealtimeStream = (onMessage, onError) => {
  if (!API_KEY) throw new Error('API key not set');

  try {
    console.log('Establishing AssemblyAI WebSocket connection...');
    
    // Create a WebSocket connection with the matching sample rate used in recording (44.1kHz)
    const socket = new WebSocket('wss://api.assemblyai.com/v2/realtime/ws?sample_rate=44100');
    
    // Connection opened
    socket.onopen = () => {
      console.log('AssemblyAI WebSocket connection established');
      
      // Send the API key for authentication
      const authMessage = JSON.stringify({ token: API_KEY });
      console.log('Sending authentication message');
      socket.send(authMessage);
      
      // Immediately notify that connection is established
      onMessage({
        message_type: 'Connected',
        message: 'WebSocket connection established'
      });
      
      // Send configuration with a slight delay to ensure token is processed
      setTimeout(() => {
        if (socket && socket.readyState === WebSocket.OPEN) {
          const startMessage = JSON.stringify({
            message_type: "StartRecognition",
            audio_format: "pcm_s16le",
            sample_rate: 44100
          });
          console.log('Sending AssemblyAI configuration:', startMessage);
          socket.send(startMessage);
        }
      }, 500);
    };
    
    // Listen for messages
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log(`AssemblyAI message: ${data.message_type}`, data);
        
        // Handle connection errors
        if (data.message_type === 'SessionBegins') {
          console.log('AssemblyAI session begun successfully');
        } else if (data.message_type === 'Error') {
          console.error('AssemblyAI error:', data.error || 'Unknown error');
        }
        
        onMessage(data);
      } catch (error) {
        console.error('Error parsing AssemblyAI message:', error, event.data);
      }
    };
    
    // Handle errors
    socket.onerror = (error) => {
      console.error('AssemblyAI WebSocket error:', error);
      if (onError) onError(error);
    };
    
    // Return the socket for later use (closing, etc.)
    return socket;
  } catch (error) {
    console.error('Error creating AssemblyAI WebSocket:', error);
    if (onError) onError(error);
    throw error;
  }
};

// Process diarized transcript from AssemblyAI
export const processDiarizedTranscript = (transcript) => {
  if (!transcript || !transcript.utterances) {
    return [];
  }
  
  return transcript.utterances.map(utterance => ({
    speaker: `Speaker ${utterance.speaker}`,
    text: utterance.text,
    start: utterance.start / 1000, // Convert ms to seconds
    end: utterance.end / 1000     // Convert ms to seconds
  }));
};

// Generate summary using AssemblyAI's LeMUR feature
export const generateSummary = async (transcriptId) => {
  if (!API_KEY) throw new Error('API key not set');

  try {
    const response = await axios.post(
      `${API_URL}/lemur/v3/generate`,
      {
        transcript_ids: [transcriptId],
        prompt: "Please format your response with exactly two sections: 'Summary:' followed by a concise summary of this conversation, and 'Action Required:' followed by a numbered list of specific action items that need to be addressed. Do not add any other sections.",
        answer_format: {
          type: "text"
        }
      },
      { headers: getHeaders() }
    );

    return response.data.response;
  } catch (error) {
    console.error('Error generating summary:', error);
    throw error;
  }
}; 