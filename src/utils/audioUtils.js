import RecordRTC from 'recordrtc';

// Convert audio blob to file
export const blobToFile = (blob, filename) => {
  return new File([blob], filename, { type: blob.type });
};

// Validate audio file with comprehensive checks
export const validateAudioFile = async (file) => {
  return new Promise((resolve, reject) => {
    try {
      // Check file exists
      if (!file) {
        return reject(new Error('No file provided'));
      }
      
      // Basic file type check
      const allowedTypes = [
        'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/webm', 'audio/ogg',
        'audio/m4a', 'audio/mp4', 'audio/x-m4a', 'video/mp4', 'video/webm',
        'video/quicktime'
      ];
      
      const fileType = file.type;
      if (!allowedTypes.includes(fileType)) {
        return reject(new Error(`Invalid file type: ${fileType}`));
      }
      
      // Create an object URL for the file
      const objectUrl = URL.createObjectURL(file);
      
      // Use an audio/video element to verify the file can be played
      const element = fileType.includes('video') ? 
        document.createElement('video') : 
        document.createElement('audio');
      
      // Listen for errors in loading/decoding the media
      element.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Cannot decode audio data from this file. It may be corrupted or not a valid audio file.'));
      };
      
      // If we can get metadata, it's likely a valid file
      element.onloadedmetadata = () => {
        const duration = element.duration;
        
        // Very short files are suspicious
        if (duration < 0.1) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('File appears to be too short (less than 0.1 seconds) or empty.'));
          return;
        }
        
        // File is valid
        URL.revokeObjectURL(objectUrl);
        resolve({
          valid: true,
          duration,
          message: 'Valid audio file'
        });
      };
      
      // Start loading the file
      element.src = objectUrl;
      element.load();
      
      // Set a timeout in case the metadata loading hangs
      setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Timed out while validating audio file. File may be corrupted.'));
      }, 5000);
      
    } catch (error) {
      reject(error);
    }
  });
};

// Function to get available MIME types
export const getAvailableMimeTypes = () => {
  const possibleTypes = [
    // Order from most compatible with AssemblyAI to least
    'audio/mp3',
    'audio/mpeg',
    'audio/wav',
    'audio/mp4',
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg'
  ];
  
  // Check if MediaRecorder supports these types
  if (typeof MediaRecorder !== 'undefined') {
    return possibleTypes.filter(type => MediaRecorder.isTypeSupported(type));
  }
  
  // Fallback if MediaRecorder is not available
  return ['audio/mp3', 'audio/wav', 'audio/webm'];
};

// Start recording audio with chunking for real-time transcription
export const startRecording = async (onDataAvailable) => {
  try {
    console.log("Starting to record audio...");
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        // Use higher sample rate for better audio quality
        sampleRate: 44100, 
        channelCount: 1    // Mono for better compatibility
      } 
    });
    
    // Check actual track settings and log them
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      const settings = audioTrack.getSettings();
      console.log("Actual audio track settings:", settings);
    }
    
    // Get available MIME types
    const availableMimeTypes = getAvailableMimeTypes();
    console.log("Available MIME types:", availableMimeTypes);
    
    // Choose the best MIME type for audio quality
    let mimeType = 'audio/webm';
    if (!availableMimeTypes.includes(mimeType)) {
      if (availableMimeTypes.includes('audio/wav')) {
        mimeType = 'audio/wav';
      } else if (availableMimeTypes.includes('audio/mp3')) {
        mimeType = 'audio/mp3';
      } else {
        mimeType = availableMimeTypes.length > 0 ? availableMimeTypes[0] : 'audio/webm';
      }
      console.log("Using MIME type:", mimeType);
    }
    
    // RecordRTC settings for best audio quality
    const recorder = new RecordRTC(stream, {
      type: 'audio',
      mimeType: mimeType,
      recorderType: RecordRTC.StereoAudioRecorder,
      numberOfAudioChannels: 1,     // Mono
      desiredSampRate: 44100,       // Higher sample rate for better quality
      sampleRate: 44100,            // Consistent with desired rate
      timeSlice: 500,               // Larger time slice for better quality
      disableLogs: false,           // Enable logs for debugging
      bufferSize: 16384,            // Larger buffer size for less distortion
      // Better quality settings
      bitRate: 128,                 // Higher bitrate for better quality
      audioBitsPerSecond: 128000,   // Explicit bitrate setting
      ondataavailable: (blob) => {
        if (onDataAvailable && blob.size > 0) { 
          console.log("Audio chunk captured, size:", blob.size, "type:", blob.type);
          onDataAvailable(blob);
        }
      }
    });
    
    recorder.startRecording();
    console.log("Recording started with configuration:", recorder.getState());
    
    return { recorder, stream };
  } catch (error) {
    console.error('Error starting recording:', error);
    throw error;
  }
};

// Stop recording audio
export const stopRecording = async (recorder, stream) => {
  console.log("Stopping recording...");
  return new Promise((resolve, reject) => {
    try {
      recorder.stopRecording(() => {
        const blob = recorder.getBlob();
        console.log("Recording stopped, blob:", blob.type, blob.size, "bytes");
        
        if (blob.size < 100) {
          console.error("Recording produced empty or very small file");
          stream.getTracks().forEach(track => track.stop());
          return reject(new Error("Recording failed to produce valid audio data. Please try again or check your microphone."));
        }
        
        // Create a proper file with the correct format and extension
        let fileExtension = 'webm';
        let mimeType = blob.type || 'audio/webm';
        
        // Set correct extension based on mime type
        if (mimeType.includes('mp3') || mimeType.includes('mpeg')) {
          fileExtension = 'mp3';
          mimeType = 'audio/mpeg';
        } else if (mimeType.includes('wav')) {
          fileExtension = 'wav';
          mimeType = 'audio/wav';
        } else if (mimeType.includes('m4a') || mimeType.includes('mp4')) {
          fileExtension = 'mp4';
          mimeType = 'audio/mp4';
        } else {
          // Default to WebM which is well supported
          fileExtension = 'webm';
          mimeType = 'audio/webm';
        }
        
        // Create a file with the explicit content type
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `recording-${timestamp}.${fileExtension}`;
        
        const file = new File([blob], filename, { 
          type: mimeType,
          lastModified: Date.now()
        });
        
        console.log("Created file:", file.name, file.type, file.size, "bytes");
        
        // Stop all audio tracks
        stream.getTracks().forEach(track => track.stop());
        
        // Validate the file has actual audio content
        validateRecordedAudio(file)
          .then(() => {
            console.log("Audio validation successful");
            resolve(file);
          })
          .catch(err => {
            console.error("Audio validation failed:", err);
            reject(err);
          });
      });
    } catch (error) {
      console.error("Error in stopRecording:", error);
      // Stop tracks even on error
      stream.getTracks().forEach(track => track.stop());
      reject(error);
    }
  });
};

// Special validation for recorded audio
const validateRecordedAudio = (file) => {
  return new Promise((resolve, reject) => {
    // Simple size check first
    if (file.size < 100) {
      return reject(new Error("Recorded file is too small - no audio was captured"));
    }
    
    const objectUrl = URL.createObjectURL(file);
    const audio = new Audio();
    
    // Set up event handlers
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      console.log("Audio duration:", audio.duration, "seconds");
      
      if (audio.duration < 0.1) {
        reject(new Error("Recorded audio is too short or empty"));
      } else {
        resolve(true);
      }
    };
    
    audio.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Cannot play the recorded audio - recording may have failed"));
    };
    
    // Set a timeout
    const timeout = setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Timed out while validating audio"));
    }, 3000);
    
    // Clear timeout when metadata loads
    audio.onloadedmetadata = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(objectUrl);
      
      if (audio.duration < 0.1) {
        reject(new Error("Recorded audio is too short or empty"));
      } else {
        resolve(true);
      }
    };
    
    audio.src = objectUrl;
    audio.load();
  });
};

// Convert recording duration from milliseconds to readable format
export const formatDuration = (durationMs) => {
  const seconds = Math.floor((durationMs / 1000) % 60);
  const minutes = Math.floor((durationMs / (1000 * 60)) % 60);
  const hours = Math.floor(durationMs / (1000 * 60 * 60));

  const formattedHours = hours > 0 ? `${hours}:` : '';
  const formattedMinutes = minutes < 10 && hours > 0 ? `0${minutes}:` : `${minutes}:`;
  const formattedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;

  return `${formattedHours}${formattedMinutes}${formattedSeconds}`;
};

// Merge transcript segments with speaker identification
export const processDiarizedTranscript = (segments) => {
  if (!segments || segments.length === 0) {
    return [];
  }
  
  console.log("Processing segments:", segments);
  
  // Group consecutive segments by the same speaker
  let currentSpeaker = null;
  let currentText = '';
  let result = [];
  let currentStartTime = 0;
  
  segments.forEach((segment, index) => {
    // Skip empty segments
    if (!segment.text || !segment.text.trim()) {
      return;
    }
    
    // Simple heuristic for speaker identification
    // In reality, this would be replaced by actual diarization from an API
    const speakerId = 
      segment.speakerId || 
      (segment.speaker_id) || 
      (segment.start % 2 === 0 ? 'Speaker 1' : 'Speaker 2');
    
    if (currentSpeaker === null) {
      // First segment
      currentSpeaker = speakerId;
      currentText = segment.text;
      currentStartTime = segment.start || 0;
    } else if (currentSpeaker === speakerId) {
      // Same speaker, append text
      currentText += ' ' + segment.text;
    } else {
      // New speaker, push the current one and start new
      result.push({
        speaker: currentSpeaker,
        text: currentText,
        start: currentStartTime,
        end: segment.start || (currentStartTime + 2)
      });
      
      currentSpeaker = speakerId;
      currentText = segment.text;
      currentStartTime = segment.start || 0;
    }
    
    // Push the last segment
    if (index === segments.length - 1) {
      result.push({
        speaker: currentSpeaker,
        text: currentText,
        start: currentStartTime,
        end: segment.end || (currentStartTime + 2)
      });
    }
  });
  
  console.log("Processed result:", result);
  
  return result;
};

// Fallback function to use native MediaRecorder if RecordRTC fails
export const startRecordingNative = async (onDataAvailable) => {
  try {
    console.log("Starting to record audio using native MediaRecorder...");
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 44100, // Higher sample rate for better quality
        channelCount: 1    // Mono audio
      } 
    });
    
    // Log the actual track settings
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      const settings = audioTrack.getSettings();
      console.log("Native MediaRecorder track settings:", settings);
    }
    
    // Get available MIME types
    const availableMimeTypes = getAvailableMimeTypes();
    
    // Choose the format with best audio quality
    let mimeType = '';
    
    // Prefer specific codecs in order of quality
    const preferredTypes = [
      'audio/wav',
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4;codecs=mp4a.40.2', // AAC codec
      'audio/mpeg',
      'audio/mp3'
    ];
    
    // Find the first supported MIME type
    for (const type of preferredTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        mimeType = type;
        break;
      }
    }
    
    // If none of our preferred types are supported, use any available type
    if (!mimeType && availableMimeTypes.length > 0) {
      mimeType = availableMimeTypes[0];
    }
    
    // Options for MediaRecorder
    const options = {};
    if (mimeType) {
      options.mimeType = mimeType;
    }
    
    // Set higher bitrate if supported
    if ('audioBitsPerSecond' in MediaRecorder) {
      options.audioBitsPerSecond = 128000;
    }
    
    console.log("Using native MediaRecorder with options:", options);
    
    // Create MediaRecorder
    const recorder = new MediaRecorder(stream, options);
    
    // Array to store audio chunks
    const chunks = [];
    
    // Listen for data - use optimal chunk size for better quality
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
        if (onDataAvailable) {
          console.log("MediaRecorder chunk:", event.data.type, event.data.size);
          onDataAvailable(event.data);
        }
      }
    };
    
    // When recording stops, create final blob
    recorder.onstop = () => {
      console.log("MediaRecorder stopped");
    };
    
    // Start recording, capture data less frequently for better quality
    recorder.start(500);
    
    return { recorder, stream, chunks };
  } catch (error) {
    console.error('Error with native recording:', error);
    throw error;
  }
};

// Stop native MediaRecorder
export const stopRecordingNative = async (recorder, stream, chunks) => {
  console.log("Stopping native MediaRecorder...");
  return new Promise((resolve) => {
    recorder.onstop = () => {
      // Determine the best MIME type for the audio file
      const mimeType = recorder.mimeType || 'audio/webm';
      console.log("Creating blob from", chunks.length, "chunks, type:", mimeType);
      
      // Create blob with the correct MIME type
      const blob = new Blob(chunks, { type: mimeType });
      console.log("Created blob:", blob.size, "bytes, type:", blob.type);
      
      // Determine the appropriate file extension
      let extension = 'webm'; // Default
      if (mimeType.includes('mp3') || mimeType.includes('mpeg')) {
        extension = 'mp3';
      } else if (mimeType.includes('wav')) {
        extension = 'wav';
      } else if (mimeType.includes('m4a') || mimeType.includes('mp4')) {
        extension = 'mp4';
      } else if (mimeType.includes('ogg')) {
        extension = 'ogg';
      } else if (mimeType.includes('webm')) {
        extension = 'webm';
      }
      
      // Create a timestamped filename for uniqueness
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `recording-${timestamp}.${extension}`;
      
      // Create a proper File object with the right metadata
      const file = new File([blob], filename, { 
        type: mimeType,
        lastModified: Date.now()
      });
      
      console.log("Created file:", file.name, file.type, file.size);
      
      // Stop all tracks
      stream.getTracks().forEach(track => track.stop());
      
      resolve(file);
    };
    
    recorder.stop();
  });
};

// Start recording, trying RecordRTC first, then falling back to native
export const startRecordingWithFallback = async (onDataAvailable) => {
  try {
    // Try RecordRTC first
    return await startRecording(onDataAvailable);
  } catch (error) {
    console.warn("RecordRTC failed, falling back to native MediaRecorder:", error);
    return await startRecordingNative(onDataAvailable);
  }
};

// Stop recording with fallback awareness
export const stopRecordingWithFallback = async (recorder, stream, chunks) => {
  // Check if this is a RecordRTC recorder or a MediaRecorder
  if (recorder.getState && typeof recorder.stopRecording === 'function') {
    // This is RecordRTC
    return await stopRecording(recorder, stream);
  } else if (typeof recorder.stop === 'function') {
    // This is a MediaRecorder
    return await stopRecordingNative(recorder, stream, chunks);
  } else {
    throw new Error('Unknown recorder type');
  }
}; 