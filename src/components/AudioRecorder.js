import React, { useState, useEffect } from 'react';
import useAudioRecorder from '../hooks/useAudioRecorder';
import './AudioRecorder.css';

const AudioRecorder = ({ onAudioReady }) => {
  const {
    isRecording,
    start,
    stop,
    reset,
    audioFile,
    formattedTime,
    error,
    liveTranscript,
    transcriptionEnabled,
    toggleTranscription,
    connectionStatus
  } = useAudioRecorder();
  
  const [verified, setVerified] = useState(false);
  const [playbackError, setPlaybackError] = useState(null);

  const handleStartRecording = () => {
    start();
  };

  const handleStopRecording = async () => {
    await stop();
  };
  
  const handleVerifyAudio = () => {
    setVerified(true);
    if (audioFile && onAudioReady) {
      onAudioReady(audioFile);
    }
  };
  
  // Check if audio can be played - used to catch audio issues early
  useEffect(() => {
    if (audioFile) {
      setPlaybackError(null);
      const audio = new Audio(URL.createObjectURL(audioFile));
      
      // Try to play the audio to verify it's valid
      audio.oncanplaythrough = () => {
        console.log("Audio file verified - can play through");
        setPlaybackError(null);
      };
      
      audio.onerror = (e) => {
        console.error("Audio playback error:", e);
        setPlaybackError("This recording appears to be invalid or empty. Please try recording again.");
      };
      
      // Set timeout in case playback check hangs
      const timeout = setTimeout(() => {
        if (!audio.duration) {
          console.warn("Audio verification timed out");
          setPlaybackError("Unable to verify audio recording. It may not contain valid audio data.");
        }
      }, 3000);
      
      // Clean up
      return () => {
        clearTimeout(timeout);
        audio.onerror = null;
        audio.oncanplaythrough = null;
      };
    }
  }, [audioFile]);

  // Render diarized transcript segments
  const renderLiveTranscript = () => {
    // Always show the live transcript container when recording and transcription is enabled
    if (!isRecording || !transcriptionEnabled) {
      return null;
    }

    return (
      <div className="live-transcript">
        <h3>
          Live Transcript
          {connectionStatus === 'connected' && <span className="status-badge connected">Connected</span>}
          {connectionStatus === 'connecting' && <span className="status-badge connecting">Connecting...</span>}
          {connectionStatus === 'error' && <span className="status-badge error">Connection Error</span>}
        </h3>
        
        {connectionStatus === 'connecting' && (
          <div className="connection-message">
            Establishing connection to AssemblyAI...
          </div>
        )}
        
        {connectionStatus === 'error' && (
          <div className="error-message">
            Failed to connect to AssemblyAI. Please check your API key and try again.
          </div>
        )}
        
        <div className="transcript-segments">
          {liveTranscript.length > 0 ? (
            liveTranscript.map((segment, index) => (
              <div 
                key={index} 
                className={`segment ${segment.speaker.toLowerCase().replace(/\s+/g, '-')} ${segment.partial ? 'partial' : ''}`}
              >
                <div className="speaker-label">{segment.speaker}</div>
                <div className="segment-text">{segment.text}</div>
              </div>
            ))
          ) : (
            <div className="empty-transcript">
              {connectionStatus === 'connected' ? 
                <div>Waiting for speech...</div> : 
                <div>{connectionStatus === 'connecting' ? 'Connecting...' : 'Enable transcription to see live results'}</div>
              }
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="audio-recorder">
      <div className="recorder-display">
        <div className="time-display">
          {isRecording && <span className="recording-indicator">●</span>}
          <span className="time">{formattedTime}</span>
        </div>
        
        <div className="recorder-controls">
          {!isRecording && !audioFile && (
            <button 
              className="record-button"
              onClick={handleStartRecording}
            >
              Start Recording
            </button>
          )}
          
          {isRecording && (
            <button 
              className="stop-button"
              onClick={handleStopRecording}
            >
              Stop Recording
            </button>
          )}
          
          {audioFile && !verified && !playbackError && (
            <div className="verify-controls">
              <p className="verification-message">
                Please play the audio to verify it was recorded properly
              </p>
              <audio 
                controls 
                src={URL.createObjectURL(audioFile)}
                className="verification-player"
              />
              <div className="verify-buttons">
                <button 
                  className="verify-button"
                  onClick={handleVerifyAudio}
                >
                  Audio Sounds Good - Proceed
                </button>
                <button 
                  className="reset-button"
                  onClick={reset}
                >
                  Try Recording Again
                </button>
              </div>
            </div>
          )}
          
          {audioFile && verified && (
            <button 
              className="reset-button"
              onClick={reset}
            >
              Record Again
            </button>
          )}
          
          <button 
            className={`transcription-toggle ${transcriptionEnabled ? 'enabled' : 'disabled'}`}
            onClick={toggleTranscription}
            title="Toggle live transcription. Turn off to reduce API calls"
          >
            Live Transcription: {transcriptionEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>
      
      {(error || playbackError) && (
        <div className="error-message">
          Error: {playbackError || error}
        </div>
      )}
      
      {audioFile && verified && (
        <div className="audio-preview">
          <audio controls src={URL.createObjectURL(audioFile)} />
          <div className="file-info">
            <p>Recording details: {audioFile.name} ({(audioFile.size / 1024).toFixed(1)} KB)</p>
            <p>Type: {audioFile.type || "unknown"}</p>
          </div>
        </div>
      )}
      
      {renderLiveTranscript()}
      
      {isRecording && transcriptionEnabled && connectionStatus === 'connected' && (
        <div className="recording-tip">
          <strong>Note:</strong> Live transcription with AssemblyAI provides real-time results.
          The complete transcription with speaker detection will be processed when recording completes.
        </div>
      )}
    </div>
  );
};

export default AudioRecorder; 