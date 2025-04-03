import React, { useState, useRef } from 'react';
import { validateAudioFile } from '../utils/audioUtils';
import './AudioUploader.css';

const AudioUploader = ({ onAudioReady }) => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const fileInputRef = useRef(null);

  // AssemblyAI supports these formats
  const allowedTypes = [
    'audio/wav', 
    'audio/mp3', 
    'audio/mpeg', 
    'audio/webm', 
    'audio/ogg',
    'audio/m4a',
    'audio/mp4',
    'audio/x-m4a',
    'video/mp4', // AssemblyAI can extract audio from video
    'video/webm',
    'video/quicktime'
  ];
  
  // File extensions we accept
  const allowedExtensions = ['wav', 'mp3', 'webm', 'ogg', 'm4a', 'mp4', 'mov'];
  
  const maxSize = 100 * 1024 * 1024; // 100MB - AssemblyAI limit

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    setError(null);
    setIsValidating(false);

    if (!selectedFile) {
      return;
    }

    console.log("Selected file:", selectedFile.name, selectedFile.type, selectedFile.size);

    // Check extension first
    const extension = selectedFile.name.split('.').pop().toLowerCase();
    if (!extension || !allowedExtensions.includes(extension)) {
      setError(`File has invalid extension: .${extension || 'none'}. Allowed: ${allowedExtensions.join(', ')}`);
      return;
    }

    // Validate file type (MIME type)
    let fileType = selectedFile.type;
    
    // If browser reports no valid type or generic binary
    if (!fileType || fileType === 'application/octet-stream') {
      console.log("File has no MIME type or generic type. Using extension to determine type.");
      
      // Infer type from extension
      const mimeMap = {
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'webm': 'audio/webm',
        'ogg': 'audio/ogg',
        'm4a': 'audio/mp4',
        'mp4': 'video/mp4',
        'mov': 'video/quicktime'
      };
      
      if (mimeMap[extension]) {
        fileType = mimeMap[extension];
      }
    }
    
    if (!allowedTypes.includes(fileType)) {
      setError(`Invalid file type: ${fileType}. Please upload an audio file (WAV, MP3, WebM, OGG, M4A) or video file (MP4, WebM, QuickTime).`);
      return;
    }

    // Validate file size
    if (selectedFile.size > maxSize) {
      setError(`File is too large (${Math.round(selectedFile.size / (1024 * 1024))}MB). Maximum size is 100MB.`);
      return;
    }

    // Create a new File object with a corrected type and shorter name
    const safeFile = new File(
      [selectedFile], 
      `recording.${extension}`, // Simplified name with correct extension
      { type: fileType }        // Ensure the type is correct
    );

    console.log("Processed file:", safeFile.name, safeFile.type, safeFile.size);
    
    // Perform deep validation to ensure the file has valid audio content
    setIsValidating(true);
    try {
      const validationResult = await validateAudioFile(safeFile);
      console.log("File validation result:", validationResult);
      
      setFile(safeFile);
      
      if (onAudioReady) {
        onAudioReady(safeFile);
      }
    } catch (validationError) {
      console.error("File validation error:", validationError);
      setError(`The file appears to be invalid: ${validationError.message}. Please try a different file.`);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setIsValidating(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="audio-uploader">
      {!file ? (
        <div className="upload-container">
          <input
            type="file"
            accept={allowedExtensions.map(ext => `.${ext}`).join(',')}
            onChange={handleFileChange}
            ref={fileInputRef}
            id="audio-file-input"
            className="file-input"
            disabled={isValidating}
          />
          <label htmlFor="audio-file-input" className={`upload-button ${isValidating ? 'disabled' : ''}`}>
            {isValidating ? 'Validating...' : 'Choose Audio or Video File'}
          </label>
          <p className="upload-info">
            Supported formats: WAV, MP3, WebM, OGG, M4A, MP4 video (max 100MB)
          </p>
        </div>
      ) : (
        <div className="file-preview">
          <div className="file-info">
            <p>{file.name}</p>
            <p>{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
            <p>Type: {file.type}</p>
          </div>
          {file.type.includes('audio') ? (
            <audio controls src={URL.createObjectURL(file)} />
          ) : (
            <video controls src={URL.createObjectURL(file)} style={{maxWidth: '100%'}} />
          )}
          <button onClick={handleReset} className="reset-button">
            Choose Another File
          </button>
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </div>
  );
};

export default AudioUploader; 