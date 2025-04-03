import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  formatDuration, 
  startRecordingWithFallback, 
  stopRecordingWithFallback 
} from '../utils/audioUtils';
import * as transcriptionService from '../services/transcriptionServiceManager';

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
  const [activeServiceName, setActiveServiceName] = useState('');
  
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const pendingTextRef = useRef("");
  const isNativeRecordingRef = useRef(false);
  
  // Update active service name
  useEffect(() => {
    const serviceInfo = transcriptionService.getServiceInfo();
    setActiveServiceName(serviceInfo.name);
  }, []);
  
  // Define the connectToAssemblyAI function first before it's used in other places
  const connectToAssemblyAI = useCallback(() => {
    if (!transcriptionEnabled) {
      console.log("Transcription disabled, not connecting");
      return;
    }
    
    try {
      console.log("Connecting to transcription service...");
      setConnectionStatus('connecting');
      setIsTranscribing(true);
      startTimeRef.current = Date.now(); // Initialize reference time for connection checks
      
      // Make sure there's no existing connection
      if (websocket) {
        try {
          websocket.close();
          websocket = null;
        } catch (err) {
          console.error("Error closing existing WebSocket:", err);
        }
      }
      
      // Create a new WebSocket connection
      websocket = transcriptionService.connectRealtimeStream(
        // Message handler
        (data) => {
          console.log("WebSocket message:", data.message_type);
          
          if (data.message_type === 'SessionBegins') {
            console.log('Session began:', data);
            setConnectionStatus('connected');
          } else if (data.message_type === 'Connected') {
            console.log('Service connected:', data);
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
                speaker: 'Speaker 1', // Service doesn't provide speakers in real-time
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
            console.log('Session terminated:', data);
            setConnectionStatus('disconnected');
            setIsTranscribing(false);
          } else if (data.message_type === 'Error') {
            console.error('Transcription service error:', data);
            setConnectionStatus('error');
            setError(`Service error: ${data.error || 'Unknown error'}`);
          }
        },
        // Error handler
        (error) => {
          console.error('WebSocket error:', error);
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
        
        // Track websocket readyState to ensure we know its status
        const checkConnection = setInterval(() => {
          if (websocket) {
            const states = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
            console.log(`WebSocket state: ${states[websocket.readyState]}`);
            
            // If it's been in CONNECTING state for too long, mark as error
            if (websocket.readyState === WebSocket.CONNECTING && connectionStatus === 'connecting') {
              const connectionTime = Date.now() - startTimeRef.current;
              if (connectionTime > 5000) { // 5 seconds timeout
                console.error('WebSocket connection timeout');
                setConnectionStatus('error');
                setError('Connection timeout - could not connect to transcription service');
                clearInterval(checkConnection);
              }
            }
            
            // If websocket is OPEN but our status isn't connected, fix it
            if (websocket.readyState === WebSocket.OPEN && connectionStatus !== 'connected') {
              console.log('WebSocket is open but status is not connected, updating...');
              setConnectionStatus('connected');
            }
          } else {
            clearInterval(checkConnection);
          }
        }, 1000);
        
        // Ping the server every 15 seconds to keep the connection alive
        const pingInterval = setInterval(() => {
          if (websocket && websocket.readyState === WebSocket.OPEN) {
            console.log("Sending ping to keep connection alive");
            websocket.send(JSON.stringify({ message_type: "KeepAlive" }));
          } else {
            clearInterval(pingInterval);
          }
        }, 15000);
        
        // Store the interval references for cleanup
        const intervalRefs = [pingInterval, checkConnection];
        
        // Update onclose to clear all intervals
        const originalOnClose = websocket.onclose;
        websocket.onclose = (event) => {
          intervalRefs.forEach(interval => clearInterval(interval));
          if (originalOnClose) originalOnClose(event);
        };
      }
    } catch (err) {
      console.error('Error connecting to transcription service:', err);
      setConnectionStatus('error');
      setError(err.message || 'Failed to connect to transcription service');
    }
  }, [transcriptionEnabled]);
  
  // Define the connectLiveTranscription function that always uses browser speech recognition
  const connectLiveTranscription = useCallback(() => {
    if (!transcriptionEnabled) {
      console.log("Transcription disabled, not connecting");
      return;
    }
    
    try {
      console.log("Connecting to browser speech recognition for live transcription...");
      setConnectionStatus('connecting');
      setIsTranscribing(true);
      startTimeRef.current = Date.now(); // Initialize reference time for connection checks
      
      // Make sure there's no existing connection
      if (websocket) {
        try {
          websocket.close();
          websocket = null;
        } catch (err) {
          console.error("Error closing existing WebSocket:", err);
        }
      }
      
      // Check if browser speech recognition is supported
      if (!transcriptionService.isBrowserSpeechSupported()) {
        console.warn("Browser speech recognition not supported, falling back to service-based transcription");
        
        // Fall back to the selected service
        websocket = transcriptionService.connectRealtimeStream(
          // Message handler
          (data) => {
            console.log("WebSocket message:", data.message_type);
            
            if (data.message_type === 'SessionBegins') {
              console.log('Session began:', data);
              setConnectionStatus('connected');
              // Update active service name to reflect what we're actually using
              setActiveServiceName(transcriptionService.getServiceInfo().name);
            } else if (data.message_type === 'Connected') {
              console.log('Service connected:', data);
              setConnectionStatus('connected');
              // Update active service name to reflect what we're actually using
              setActiveServiceName(transcriptionService.getServiceInfo().name);
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
                  speaker: 'Speaker 1', // Service doesn't provide speakers in real-time
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
              console.log('Session terminated:', data);
              setConnectionStatus('disconnected');
              setIsTranscribing(false);
            } else if (data.message_type === 'Error') {
              console.error('Transcription service error:', data);
              setConnectionStatus('error');
              setError(`Service error: ${data.error || 'Unknown error'}`);
            }
          },
          // Error handler
          (error) => {
            console.error('WebSocket error:', error);
            setConnectionStatus('error');
            setError('Failed to connect to transcription service: ' + 
              (error.message || 'Connection error'));
          }
        );
      } else {
        // Use browser's speech recognition directly
        console.log('Using browser speech recognition for live transcription');
        
        // Import browser transcription service directly to avoid going through the manager
        // which would use the currently selected service
        const browserService = require('../services/browserTranscriptionService');
        
        // Connect using browser speech recognition
        websocket = browserService.connectRealtimeStream(
          // Message handler
          (data) => {
            console.log("Browser speech recognition message:", data.message_type);
            
            if (data.message_type === 'SessionBegins') {
              console.log('Browser speech session began:', data);
              setConnectionStatus('connected');
              // Set service name to browser speech recognition
              setActiveServiceName('Browser Speech Recognition');
            } else if (data.message_type === 'Connected') {
              console.log('Browser speech connected:', data);
              setConnectionStatus('connected');
              // Set service name to browser speech recognition
              setActiveServiceName('Browser Speech Recognition');
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
              console.log('Browser speech final transcript received:', data);
              pendingTextRef.current = '';
              
              if (data.text && data.text.trim()) {
                // Create a new segment for the final transcript
                const newSegment = {
                  speaker: 'Speaker 1',
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
              console.log('Browser speech session terminated:', data);
              setConnectionStatus('disconnected');
              setIsTranscribing(false);
            } else if (data.message_type === 'Error') {
              console.error('Browser speech error:', data);
              setConnectionStatus('error');
              setError(`Browser speech error: ${data.error || 'Unknown error'}`);
            }
          },
          // Error handler
          (error) => {
            console.error('Browser speech error:', error);
            setConnectionStatus('error');
            setError('Failed to use browser speech recognition: ' + 
              (error.message || 'Connection error'));
          }
        );
      }
      
      // Set up additional event handlers
      if (websocket) {
        websocket.onclose = (event) => {
          console.log(`WebSocket closed with code ${event.code}, reason: ${event.reason}`);
          setConnectionStatus('disconnected');
          setIsTranscribing(false);
        };
        
        // Track websocket readyState to ensure we know its status
        const checkConnection = setInterval(() => {
          if (websocket) {
            const states = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
            console.log(`WebSocket state: ${states[websocket.readyState]}`);
            
            // If it's been in CONNECTING state for too long, mark as error
            if (websocket.readyState === WebSocket.CONNECTING && connectionStatus === 'connecting') {
              const connectionTime = Date.now() - startTimeRef.current;
              if (connectionTime > 5000) { // 5 seconds timeout
                console.error('WebSocket connection timeout');
                setConnectionStatus('error');
                setError('Connection timeout - could not connect to transcription service');
                clearInterval(checkConnection);
              }
            }
            
            // If websocket is OPEN but our status isn't connected, fix it
            if (websocket.readyState === WebSocket.OPEN && connectionStatus !== 'connected') {
              console.log('WebSocket is open but status is not connected, updating...');
              setConnectionStatus('connected');
            }
          } else {
            clearInterval(checkConnection);
          }
        }, 1000);
        
        // Ping the server every 15 seconds to keep the connection alive
        const pingInterval = setInterval(() => {
          if (websocket && websocket.readyState === WebSocket.OPEN) {
            console.log("Sending ping to keep connection alive");
            try {
              websocket.send(JSON.stringify({ message_type: "KeepAlive" }));
            } catch (e) {
              console.warn("Error sending ping, may not be supported by this service:", e);
            }
          } else {
            clearInterval(pingInterval);
          }
        }, 15000);
        
        // Store the interval references for cleanup
        const intervalRefs = [pingInterval, checkConnection];
        
        // Update onclose to clear all intervals
        const originalOnClose = websocket.onclose;
        websocket.onclose = (event) => {
          intervalRefs.forEach(interval => clearInterval(interval));
          if (originalOnClose) originalOnClose(event);
        };
      }
    } catch (err) {
      console.error('Error connecting to live transcription service:', err);
      setConnectionStatus('error');
      setError(err.message || 'Failed to connect to live transcription service');
    }
  }, [transcriptionEnabled]);
  
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
  
  // Monitor active service changes and reconnect if needed
  useEffect(() => {
    // Subscribe to service changes (create a monitoring interval)
    let currentService = transcriptionService.getActiveService();
    
    const monitorInterval = setInterval(() => {
      const newService = transcriptionService.getActiveService();
      if (newService !== currentService && isRecording && transcriptionEnabled) {
        console.log(`Transcription service changed from ${currentService} to ${newService}, reconnecting...`);
        currentService = newService;
        
        // Close existing connection and reconnect
        if (websocket) {
          try {
            websocket.close();
            websocket = null;
          } catch (err) {
            console.error("Error closing WebSocket for service change:", err);
          }
        }
        
        // Reconnect with new service after a short delay
        setTimeout(() => {
          if (isRecording && transcriptionEnabled) {
            connectLiveTranscription();
          }
        }, 500);
      }
    }, 2000); // Check every 2 seconds
    
    return () => {
      clearInterval(monitorInterval);
    };
  }, [isRecording, transcriptionEnabled, connectLiveTranscription]);
  
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
  
  // Process audio chunk for live transcription
  const processAudioChunk = useCallback((audioChunk) => {
    if (!transcriptionEnabled || !websocket) {
      console.log("Skipping audio chunk - transcription disabled or no websocket");
      return;
    }
    
    if (websocket.readyState !== WebSocket.OPEN) {
      console.log(`Not sending audio chunk - WebSocket not open, state: ${websocket.readyState}`);
      return;
    }
    
    try {
      // For WebSocket transmission, we need to ensure we send valid data
      if (audioChunk instanceof Blob) {
        // If we got a Blob instead of an ArrayBuffer
        console.log("Converting Blob to ArrayBuffer for WebSocket transmission");
        audioChunk.arrayBuffer().then(buffer => {
          if (websocket && websocket.readyState === WebSocket.OPEN) {
            // Transcription services often require 16kHz 16-bit PCM
            try {
              // Get the audio data as Int16Array
              const rawData = new Int16Array(buffer);
              
              // TODO: If we need to downsample from 44.1kHz to 16kHz for real-time transcription,
              // we would do that here. For simplicity, we're just sending the data as-is.
              
              console.log("Sending audio chunk, length:", rawData.length, "bytes:", rawData.byteLength);
              websocket.send(rawData.buffer);
            } catch (error) {
              console.error("Error processing audio data:", error);
              // Fallback to sending the raw buffer if Int16Array conversion fails
              websocket.send(buffer);
            }
          } else {
            console.warn(`WebSocket not open (state: ${websocket?.readyState}), can't send data`);
          }
        }).catch(err => {
          console.error("Error converting blob to array buffer:", err);
        });
      } else if (audioChunk instanceof ArrayBuffer) {
        // Send the audio data to the service
        if (websocket && websocket.readyState === WebSocket.OPEN) {
          // Convert to Int16Array for proper format
          try {
            const rawData = new Int16Array(audioChunk);
            console.log("Sending ArrayBuffer audio chunk, length:", rawData.length, "bytes:", rawData.byteLength);
            websocket.send(rawData.buffer);
          } catch (error) {
            console.error("Error processing audio buffer:", error);
            // Fallback to sending the raw buffer
            websocket.send(audioChunk);
          }
        } else {
          console.warn(`WebSocket not open (state: ${websocket?.readyState}), can't send data`);
        }
      } else {
        console.warn("Unknown audio chunk type:", typeof audioChunk, audioChunk);
      }
    } catch (err) {
      console.error('Error sending audio chunk:', err);
    }
  }, [transcriptionEnabled]);
  
  // Start recording function
  const start = useCallback(async () => {
    try {
      setError(null);
      setAudioFile(null);
      setLiveTranscript([]);
      
      // Start timer now - ensures startup timing is consistent
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setRecordingTime(Date.now() - startTimeRef.current);
      }, 1000);
      
      // Connect to transcription service first (if transcription is enabled)
      if (transcriptionEnabled) {
        console.log("Connecting to transcription service before recording starts");
        connectLiveTranscription();
        
        // Give more time for the connection to establish
        console.log("Waiting for connection to establish...");
        
        // Use a polling approach to check if the connection is established
        let connectionAttempts = 0;
        while (connectionStatus !== 'connected' && connectionAttempts < 10) {
          await new Promise(resolve => setTimeout(resolve, 500));
          connectionAttempts++;
          console.log(`Connection attempt ${connectionAttempts}, status: ${connectionStatus}`);
          
          // Force a connection status check by manually checking the WebSocket
          if (websocket && websocket.readyState === WebSocket.OPEN && connectionStatus !== 'connected') {
            console.log('WebSocket is open but status not updated, manually setting to connected');
            setConnectionStatus('connected');
            break;
          }
        }
        
        console.log("Connection status after wait:", connectionStatus);
      }
      
      // Start recording with real-time processing and fallback if needed
      console.log("Starting recording with fallback mechanism");
      const result = await startRecordingWithFallback((blob) => {
        // Store the chunk for later combined processing
        chunksRef.current.push(blob);
        
        // Get the raw audio data to send to the service
        if (transcriptionEnabled && websocket && websocket.readyState === WebSocket.OPEN) {
          console.log("Got audio chunk during recording, size:", blob.size);
          blob.arrayBuffer().then(buffer => {
            // Send the audio data
            processAudioChunk(buffer);
          }).catch(err => {
            console.error("Error converting blob to array buffer:", err);
          });
        } else if (transcriptionEnabled) {
          console.warn("Received audio chunk but can't process - websocket:", 
                      !!websocket, "readyState:", websocket?.readyState,
                      "status:", connectionStatus);
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
      
    } catch (err) {
      setError(err.message || 'Failed to start recording');
      console.error('Recording error:', err);
      
      // Stop timer if there was an error
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [connectLiveTranscription, processAudioChunk, transcriptionEnabled, connectionStatus]);
  
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
      connectLiveTranscription();
    }
  }, [transcriptionEnabled, isRecording, connectLiveTranscription]);
  
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
    connectionStatus,
    activeServiceName
  };
};

export default useAudioRecorder; 