import React, { useState } from 'react';

const TranscriptDisplay = ({ transcript, summary, isLoading, diarizedTranscript }) => {
  const [activeTab, setActiveTab] = useState('transcript');

  if (isLoading) {
    return (
      <div className="transcript-loading">
        <div className="loading-spinner"></div>
        <p>Processing audio...</p>
      </div>
    );
  }

  if (!transcript && !summary && !diarizedTranscript) {
    return null;
  }

  // Process summary to split into summary and action items
  const processSummary = () => {
    if (!summary) return { summaryText: '', actionItems: [] };

    // Check if the summary has "Action Required" or "Action Items" sections
    if (summary.includes("Action Required:") || summary.includes("Action Items:")) {
      // Split by the Action Required/Items heading
      const parts = summary.split(/Action (Required|Items):/i);
      const summaryText = parts[0].replace(/Summary:/i, '').trim();
      const actionText = parts.length > 1 ? parts[2] || parts[1] : '';
      
      // Extract action items (either as a list or paragraph)
      const actionItems = actionText
        .split(/\n\d+\.|\n-|\n\*/g) // Split by numbered or bulleted list indicators
        .filter(item => item.trim()) // Remove empty items
        .map(item => item.trim());   // Trim whitespace
        
      return { summaryText, actionItems };
    }
    
    // Fallback for summaries without explicit "Action Required" section
    // Try to split by numbered list indicators
    const parts = summary.split(/\n\d+\.\s/);
    const summaryText = parts[0].replace(/Summary:/i, '').trim();
    const actionItems = [];
    
    if (parts.length > 1) {
      for (let i = 1; i < parts.length; i++) {
        if (parts[i].trim()) {
          actionItems.push(parts[i].trim());
        }
      }
    }
    
    return { summaryText, actionItems };
  };

  const { summaryText, actionItems } = processSummary();

  // Render diarized transcript if available
  const renderDiarizedTranscript = () => {
    if (!diarizedTranscript || diarizedTranscript.length === 0) {
      return (
        <div className="raw-transcript">
          <pre>{transcript}</pre>
        </div>
      );
    }

    return (
      <div className="diarized-transcript">
        {diarizedTranscript.map((segment, index) => (
          <div key={index} className={`segment ${segment.speaker.toLowerCase().replace(/\s+/g, '-')}`}>
            <div className="speaker-label">{segment.speaker}</div>
            <div className="segment-text">{segment.text}</div>
            {segment.start !== undefined && (
              <div className="timestamp">
                {formatTimestamp(segment.start)} - {formatTimestamp(segment.end)}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Format timestamp (seconds) to MM:SS format
  const formatTimestamp = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="transcript-container">
      <div className="transcript-tabs">
        <button 
          className={`tab-button ${activeTab === 'transcript' ? 'active' : ''}`}
          onClick={() => setActiveTab('transcript')}
        >
          Transcript
        </button>
        <button 
          className={`tab-button ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
          disabled={!summary}
        >
          Summary
          <span className="api-provider-badge">OpenAI</span>
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'transcript' && (
          <div className="transcript-section">
            <div className="transcript-content">
              {renderDiarizedTranscript()}
            </div>
          </div>
        )}
        
        {activeTab === 'summary' && summary && (
          <div className="summary-section">
            <div className="summary-block">
              <h4>Summary</h4>
              <div className="summary-content">
                {summaryText}
              </div>
            </div>
            
            <div className="action-block">
              <h4>Action Required</h4>
              {actionItems.length > 0 ? (
                <ol className="action-items">
                  {actionItems.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ol>
              ) : (
                <p className="no-actions">No action items identified.</p>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="transcript-actions">
        <button 
          className="copy-button"
          onClick={() => {
            const textToCopy = activeTab === 'transcript' 
              ? (diarizedTranscript 
                ? diarizedTranscript.map(segment => `${segment.speaker}: ${segment.text}`).join('\n\n')
                : transcript)
              : `Summary:\n${summaryText}\n\nAction Required:\n${actionItems.map((item, i) => `${i+1}. ${item}`).join('\n')}`;
            navigator.clipboard.writeText(textToCopy);
          }}
        >
          Copy {activeTab === 'transcript' ? 'Transcript' : 'Summary'}
        </button>
        
        <button 
          className="export-button"
          onClick={() => {
            const transcriptText = diarizedTranscript 
              ? diarizedTranscript.map(segment => `${segment.speaker}: ${segment.text}`).join('\n\n')
              : transcript;
            const summaryFormatted = `Summary:\n${summaryText}\n\nAction Required:\n${actionItems.map((item, i) => `${i+1}. ${item}`).join('\n')}`;
            const content = `Transcript:\n${transcriptText}\n\n${summaryFormatted}`;
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'transcript-summary.txt';
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Export All
        </button>
      </div>
    </div>
  );
};

export default TranscriptDisplay; 