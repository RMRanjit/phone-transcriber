import axios from 'axios';

// Initialize with empty API key - to be set by user
let API_KEY = '';

// Set the API key
export const setApiKey = (key) => {
  console.log("Setting Google Transcribe API key:", key ? "Key provided (hidden for security)" : "No key provided");
  API_KEY = key;
};

// Get the headers for API requests
export const getHeaders = () => {
  if (!API_KEY || API_KEY.trim() === '') {
    console.warn("No Google Transcribe API key is set");
  }
  
  return {
    'authorization': `Bearer ${API_KEY}`,
    'content-type': 'application/json'
  };
};

// Upload audio to Google Speech-to-Text for processing
export const uploadAudio = async (audioFile) => {
  if (!API_KEY) throw new Error('API key not set - please enter your Google Transcribe API key');
  if (API_KEY.trim() === '') throw new Error('API key is empty - please enter a valid Google Transcribe API key');

  try {
    console.log("Starting upload to Google Transcribe...");
    console.log("File details:", {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size,
      lastModified: new Date(audioFile.lastModified).toISOString()
    });

    // Read file as Base64
    const base64Audio = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // Convert ArrayBuffer to Base64
        const base64 = btoa(
          new Uint8Array(reader.result)
            .reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(audioFile);
    });

    // This is a simplified example - in production, you would:
    // 1. Either use Google Cloud Storage to upload the file first
    // 2. Or send directly to Speech-to-Text API with proper authentication
    
    // Placeholder for actual implementation
    const response = await axios.post(
      'https://speech.googleapis.com/v1p1beta1/speech:recognize',
      {
        config: {
          languageCode: 'en-US',
          enableAutomaticPunctuation: true,
          enableSpeakerDiarization: true,
          diarizationSpeakerCount: 2,
          model: 'phone_call'
        },
        audio: {
          content: base64Audio
        }
      },
      { 
        headers: getHeaders()
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error uploading audio to Google:', error);
    throw error;
  }
};

// Process an audio file completely (upload and transcribe)
export const processAudioComplete = async (audioFile) => {
  // With Google Speech-to-Text, upload and transcription happen in a single step
  return await uploadAudio(audioFile);
};

// Process transcription results to match our application format
export const processDiarizedTranscript = (result) => {
  if (!result || !result.results) {
    return [];
  }
  
  // This is a simplified example - actual implementation would process the Google results format
  const diarizedSegments = [];
  let currentSpeaker = null;
  let currentText = [];
  let startTime = 0;
  
  // Placeholder processing logic
  result.results.forEach(result => {
    if (result.alternatives && result.alternatives[0]) {
      const words = result.alternatives[0].words || [];
      
      words.forEach(word => {
        if (currentSpeaker !== word.speakerTag) {
          // Save previous segment if there was one
          if (currentSpeaker !== null && currentText.length > 0) {
            diarizedSegments.push({
              speaker: `Speaker ${currentSpeaker}`,
              text: currentText.join(' '),
              start: startTime,
              end: parseFloat(word.startTime.replace('s', ''))
            });
          }
          
          // Start new segment
          currentSpeaker = word.speakerTag;
          currentText = [word.word];
          startTime = parseFloat(word.startTime.replace('s', ''));
        } else {
          // Continue current segment
          currentText.push(word.word);
        }
      });
    }
  });
  
  // Add the last segment
  if (currentSpeaker !== null && currentText.length > 0) {
    diarizedSegments.push({
      speaker: `Speaker ${currentSpeaker}`,
      text: currentText.join(' '),
      start: startTime,
      end: startTime + 5 // Placeholder - would use actual end time
    });
  }
  
  return diarizedSegments;
};

// Generate summary (using OpenAI as a fallback since Google doesn't have a built-in summarization)
export const generateSummary = async (transcript) => {
  if (!API_KEY) throw new Error('API key not set');

  try {
    // For now, return a formatted summary message that matches our UI expectations
    return `Summary:
This conversation was transcribed using Google Speech-to-Text. The complete transcript is available in the Transcript tab.

Action Required:
1. Set up OpenAI integration to get proper summarization for Google transcripts
2. Process the transcript manually to identify action items
3. Consider using AssemblyAI for transcripts that require automatic summarization`;
  } catch (error) {
    console.error('Error generating summary:', error);
    throw error;
  }
};

// Stub functions to match the AssemblyAI API service interface
export const startTranscription = async () => {
  throw new Error('Google Transcribe uses a different workflow - use processAudioComplete instead');
};

export const getTranscription = async () => {
  throw new Error('Google Transcribe uses a different workflow - use processAudioComplete instead');
};

export const pollTranscription = async () => {
  throw new Error('Google Transcribe uses a different workflow - use processAudioComplete instead');
}; 