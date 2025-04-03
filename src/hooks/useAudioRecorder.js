import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  formatDuration, 
  startRecordingWithFallback, 
  stopRecordingWithFallback 
} from '../utils/audioUtils';
import { connectRealtimeStream } from '../services/assemblyAIService';

// Keep track of the WebSocket connection
let websocket = null;

const useAudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioFile, setAudioFile] = useState(null);
  const [error, setError] = useState(null);
  const [liveTranscript, setLiveTranscript] = useState([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionEnabled, setTranscriptionEnabled] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'disconnected', 'connecting', 'connected', 'error'
  
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const pendingTextRef = useRef("");
  const isNativeRecordingRef = useRef(false);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (websocket) {
        try {
          console.log("Closing WebSocket on unmount");
          websocket.close();
          websocket = null;
        } catch (err) {
          console.error("Error closing WebSocket:", err);
        }
      }
    };
  }, []);
  
  // Clean up previous transcript when starting a new recording
  useEffect(() => {
    if (!isRecording) {
      chunksRef.current = [];
      pendingTextRef.current = "";
      
      // Close the websocket connection when not recording
      if (websocket) {
        try {
          console.log("Closing WebSocket on recording end");
          websocket.close();
          websocket = null;
          setConnectionStatus('disconnected');
        } catch (err) {
          console.error("Error closing WebSocket:", err);
        }
      }
    }
  }, [isRecording]);
  
  // Connect to AssemblyAI WebSocket
  const connectToAssemblyAI = useCallback(() => {
    if (!transcriptionEnabled) {
      console.log("Transcription disabled, not connecting");
      return;
    }
    
    try {
      console.log("Connecting to AssemblyAI WebSocket...");
      setConnectionStatus('connecting');
      setIsTranscribing(true);
      
      // Create a new WebSocket connection
      websocket = connectRealtimeStream(
        // Message handler
        (data) => {
          console.log("WebSocket message:", data.message_type);
          
          if (data.message_type === 'SessionBegins') {
            console.log('AssemblyAI session began:', data);
            setConnectionStatus('connected');
          } else if (data.message_type === 'PartialTranscript') {
            // Handle partial transcript (not final)
            pendingTextRef.current = data.text || '';
            
            if (pendingTextRef.current) {
              // Create a temporary segment for the partial transcript
              const partialSegment = {
                speaker: 'Speaker 1',
                text: pendingTextRef.current,
                partial: true
              };
              
              setLiveTranscript(prev => {
                // Replace the last segment if it was also partial
                if (prev.length > 0 && prev[prev.length - 1].partial) {
                  return [...prev.slice(0, -1), partialSegment];
                }
                return [...prev, partialSegment];
              });
            }
          } else if (data.message_type === 'FinalTranscript') {
            // Handle final transcript
            console.log('Final transcript received:', data);
            pendingTextRef.current = '';
            
            if (data.text && data.text.trim()) {
              // Create a new segment for the final transcript
              const newSegment = {
                speaker: 'Speaker 1', // AssemblyAI doesn't provide speakers in real-time
                text: data.text.trim(),
                start: data.audio_start / 1000, // Convert to seconds
                end: data.audio_end / 1000,     // Convert to seconds
                partial: false
              };
              
              setLiveTranscript(prev => {
                // Remove the last segment if it was partial
                const filtered = prev.filter(segment => !segment.partial);
                
                // Check if we should combine with the previous segment
                if (filtered.length > 0) {
                  const lastSegment = filtered[filtered.length - 1];
                  
                  // If the gap is small enough, combine them
                  if (lastSegment.speaker === newSegment.speaker && 
                      (!lastSegment.end || !newSegment.start || 
                       newSegment.start - lastSegment.end < 2)) {
                    
                    const combinedSegment = {
                      ...lastSegment,
                      text: `${lastSegment.text} ${newSegment.text}`,
                      end: newSegment.end
                    };
                    
                    return [...filtered.slice(0, -1), combinedSegment];
                  }
                }
                
                return [...filtered, newSegment];
              });
            }
          } else if (data.message_type === 'SessionTerminated') {
            console.log('AssemblyAI session terminated:', data);
            setConnectionStatus('disconnected');
            setIsTranscribing(false);
          } else if (data.message_type === 'Error') {
            console.error('AssemblyAI error:', data);
            setConnectionStatus('error');
            setError(`AssemblyAI error: ${data.error || 'Unknown error'}`);
          }
        },
        // Error handler
        (error) => {
          console.error('AssemblyAI WebSocket error:', error);
          setConnectionStatus('error');
          setError('Failed to connect to transcription service: ' + 
            (error.message || 'Connection error'));
        }
      );
      
      // Set up additional event handlers
      if (websocket) {
        websocket.onclose = (event) => {
          console.log(`WebSocket closed with code ${event.code}, reason: ${event.reason}`);
          setConnectionStatus('disconnected');
          setIsTranscribing(false);
        };
        
        // Ping the server every 15 seconds to keep the connection alive
        const pingInterval = setInterval(() => {
          if (websocket && websocket.readyState === WebSocket.OPEN) {
            console.log("Sending ping to keep connection alive");
            websocket.send(JSON.stringify({ message_type: "KeepAlive" }));
          } else {
            clearInterval(pingInterval);
          }
        }, 15000);
      }
    } catch (err) {
      console.error('Error connecting to AssemblyAI:', err);
      setConnectionStatus('error');
      setError(err.message || 'Failed to connect to transcription service');
    }
  }, [transcriptionEnabled]);
  
  // Process audio chunk for live transcription
  const processAudioChunk = useCallback((audioChunk) => {
    if (!transcriptionEnabled || !websocket) {
      return;
    }
    
    if (connectionStatus !== 'connected') {
      console.log(`Not sending audio chunk - connection status: ${connectionStatus}`);
      return;
    }
    
    try {
      // For WebSocket transmission, we need to ensure we send valid data
      // Sometimes blob.arrayBuffer() might not give us what we need
      if (audioChunk instanceof Blob) {
        // If we got a Blob instead of an ArrayBuffer
        console.log("Converting Blob to ArrayBuffer for WebSocket transmission");
        audioChunk.arrayBuffer().then(buffer => {
          if (websocket.readyState === WebSocket.OPEN) {
            websocket.send(buffer);
          }
        });
      } else {
        // Send the audio data to AssemblyAI
        if (websocket.readyState === WebSocket.OPEN) {
          websocket.send(audioChunk);
        } else {
          console.warn(`WebSocket not open (state: ${websocket.readyState}), can't send data`);
        }
      }
    } catch (err) {
      console.error('Error sending audio chunk:', err);
    }
  }, [transcriptionEnabled, connectionStatus]);
  
  // Start recording function
  const start = useCallback(async () => {
    try {
      setError(null);
      setAudioFile(null);
      setLiveTranscript([]);
      
      // Connect to AssemblyAI WebSocket first (if transcription is enabled)
      if (transcriptionEnabled) {
        connectToAssemblyAI();
        
        // Give some time for the connection to establish
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Start recording with real-time processing and fallback if needed
      console.log("Starting recording with fallback mechanism");
      const result = await startRecordingWithFallback((blob) => {
        // Store the chunk for later combined processing
        chunksRef.current.push(blob);
        
        // Get the raw audio data to send to AssemblyAI
        if (transcriptionEnabled && websocket && connectionStatus === 'connected') {
          blob.arrayBuffer().then(buffer => {
            // Send the audio data
            processAudioChunk(buffer);
          }).catch(err => {
            console.error("Error converting blob to array buffer:", err);
          });
        }
      });
      
      // Store the recorder type and references
      recorderRef.current = result.recorder;
      streamRef.current = result.stream;
      
      // If this is native MediaRecorder, keep track of the chunks
      if (result.chunks) {
        isNativeRecordingRef.current = true;
        chunksRef.current = result.chunks;
      } else {
        isNativeRecordingRef.current = false;
      }
      
      setIsRecording(true);
      
      // Start timer
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setRecordingTime(Date.now() - startTimeRef.current);
      }, 1000);
      
    } catch (err) {
      setError(err.message || 'Failed to start recording');
      console.error('Recording error:', err);
    }
  }, [connectToAssemblyAI, processAudioChunk, transcriptionEnabled, connectionStatus]);
  
  // Stop recording function
  const stop = useCallback(async () => {
    if (!recorderRef.current || !streamRef.current) return;
    
    try {
      setIsRecording(false);
      
      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Close the WebSocket connection
      if (websocket) {
        try {
          websocket.close();
          websocket = null;
          setConnectionStatus('disconnected');
        } catch (err) {
          console.error("Error closing WebSocket:", err);
        }
      }
      
      console.log("Stopping recording with appropriate method");
      // Use the right method to stop recording based on which recorder we're using
      const file = await stopRecordingWithFallback(
        recorderRef.current, 
        streamRef.current,
        isNativeRecordingRef.current ? chunksRef.current : null
      );
      
      // If we got a recorded file with a valid size
      if (file && file.size > 0) {
        console.log("Setting audio file:", file.name, file.type, file.size, "bytes");
        setAudioFile(file);
      } else {
        // Handle empty file error
        const errorMsg = "Recording resulted in an empty file. Please check your microphone and try again.";
        console.error(errorMsg);
        setError(errorMsg);
      }
      
      // Reset refs
      recorderRef.current = null;
      streamRef.current = null;
      isNativeRecordingRef.current = false;
      
    } catch (err) {
      setError(err.message || 'Failed to stop recording');
      console.error('Recording error:', err);
    }
  }, []);
  
  // Reset recording state
  const reset = useCallback(() => {
    setAudioFile(null);
    setRecordingTime(0);
    setError(null);
    setLiveTranscript([]);
    chunksRef.current = [];
    pendingTextRef.current = "";
    
    // Close the WebSocket connection
    if (websocket) {
      try {
        websocket.close();
        websocket = null;
        setConnectionStatus('disconnected');
      } catch (err) {
        console.error("Error closing WebSocket:", err);
      }
    }
  }, []);
  
  // Toggle live transcription on/off
  const toggleTranscription = useCallback(() => {
    const newValue = !transcriptionEnabled;
    setTranscriptionEnabled(newValue);
    
    // If turning off transcription while recording, close the connection
    if (!newValue && isRecording && websocket) {
      try {
        websocket.close();
        websocket = null;
        setConnectionStatus('disconnected');
      } catch (err) {
        console.error("Error closing WebSocket:", err);
      }
    } 
    // If turning on transcription while recording, establish connection
    else if (newValue && isRecording && !websocket) {
      connectToAssemblyAI();
    }
  }, [transcriptionEnabled, isRecording, connectToAssemblyAI]);
  
  // Get formatted recording time
  const formattedTime = formatDuration(recordingTime);
  
  // Generate a flat transcript text from segments
  const flatTranscript = liveTranscript
    .filter(segment => !segment.partial)
    .map(segment => `${segment.speaker}: ${segment.text}`)
    .join('\n\n');
  
  return {
    isRecording,
    start,
    stop,
    reset,
    audioFile,
    recordingTime,
    formattedTime,
    error,
    liveTranscript,
    flatTranscript,
    isTranscribing,
    transcriptionEnabled,
    toggleTranscription,
    connectionStatus
  };
};

export default useAudioRecorder; 