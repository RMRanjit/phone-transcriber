import React, { useState, useEffect } from 'react';
import './CallInterface.css';

const CallInterface = ({ transcript, sentimentScore = 0, isRecording, onStartCall, onStopCall, formattedTime }) => {
  const [callActive, setCallActive] = useState(false);
  const [callTime, setCallTime] = useState('00:00');
  
  // Start or stop call
  const toggleCall = () => {
    if (callActive) {
      setCallActive(false);
      onStopCall && onStopCall();
    } else {
      setCallActive(true);
      onStartCall && onStartCall();
    }
  };
  
  // Update call time from props if provided
  useEffect(() => {
    if (formattedTime) {
      setCallTime(formattedTime);
    }
  }, [formattedTime]);
  
  // Handle button actions
  const handleAction = (action) => {
    console.log(`Action triggered: ${action}`);
    // Implement specific actions as needed
  };

  return (
    <div className="call-interface">
      {/* Header with call controls */}
      <div className="call-header">
        <div className="call-title">
          <span className="call-icon">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z" />
            </svg>
          </span>
          <span>Start call</span>
        </div>
        <div className="call-time">
          {callTime}
        </div>
        <div className="call-menu">
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
          </svg>
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="call-actions">
        <button className="action-button" onClick={() => handleAction('answer')}>
          <span className="action-icon">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z" />
            </svg>
          </span>
          ANSWER
        </button>
        <button className="action-button" onClick={() => handleAction('mute')}>
          <span className="action-icon">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          </span>
          MUTE
        </button>
        <button className="action-button" onClick={() => handleAction('hold')}>
          <span className="action-icon">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          </span>
          HOLD
        </button>
        <button className="action-button" onClick={() => handleAction('reset')}>
          <span className="action-icon">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 9h7V2l-2.35 4.35z" />
            </svg>
          </span>
          RESET
        </button>
        <button className="action-button" onClick={() => handleAction('video')}>
          <span className="action-icon">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
            </svg>
          </span>
          VIDEO CALL
        </button>
      </div>
      
      {/* Content panels */}
      <div className="call-content">
        <div className="analysis-panel">
          <div className="panel-header">
            <div className="cognition-header">
              <div className="cognition-icon">?</div>
              <div className="cognition-title">COGNITION AI</div>
            </div>
          </div>
          <div className="sentiment-score">
            <div>Overall Sentiment Score:</div>
            <div className="score-value">{sentimentScore}</div>
          </div>
          <div className="analysis-content">
            {/* Analysis content will go here */}
          </div>
        </div>
        
        <div className="transcript-panel">
          <div className="panel-header">
            <h2>TRANSCRIPT</h2>
          </div>
          <div className="transcript-content">
            {transcript || 'No transcript available yet. Start the call to begin recording.'}
          </div>
        </div>
      </div>
      
      {/* Call toggle button */}
      <div className="call-control">
        <button 
          className={`call-button ${callActive ? 'active' : ''}`}
          onClick={toggleCall}
        >
          {callActive ? 'End Call' : 'Start Call'}
        </button>
      </div>
    </div>
  );
};

export default CallInterface; 