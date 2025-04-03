# Phone Transcriber

A web application that transcribes phone calls or audio recordings, providing transcripts with speaker diarization and AI-generated summaries.

## What is this App?

Phone Transcriber is a React-based web application designed to make transcribing phone conversations or audio recordings simple and efficient. It offers:

- Audio recording and file upload capabilities
- Real-time or batch transcription of audio
- Speaker identification (diarization)
- AI-generated summaries with action items
- Support for multiple transcription services
- Browser-based speech recognition (no API key required)

The application is perfect for professionals who need to keep records of phone conversations, meetings, or interviews, providing both accurate transcripts and concise summaries.

## Design

The application follows a modern, intuitive design that mimics a phone call interface. The main components include:

- **Call Interface**: A phone-like UI with action buttons (ANSWER, MUTE, HOLD, RESET, VIDEO CALL)
- **Transcription Panel**: Real-time display of transcribed text with speaker identification
- **Cognition AI Panel**: Shows sentiment analysis and other AI-derived insights
- **Settings Modal**: Configuration for API keys and transcription service selection
- **Tabbed Interface**: Easily toggle between transcript and summary views with improved icons and descriptions

### Code Organization

The codebase is structured as follows:

```
src/
├── components/         # React UI components
├── services/           # API service integrations
│   ├── assemblyAIService.js        # AssemblyAI integration
│   ├── openaiService.js            # OpenAI Whisper integration
│   ├── googleTranscribeService.js  # Google Speech-to-Text integration
│   ├── browserTranscriptionService.js # Browser Speech API integration
│   └── transcriptionServiceManager.js # Service abstraction layer
├── utils/              # Utility functions
├── hooks/              # Custom React hooks
├── fallbackModal.js    # Vanilla JS implementation for settings modal
└── App.js              # Main application component
```

The application uses a service-oriented architecture that separates UI components from API integrations. The `transcriptionServiceManager.js` serves as an abstraction layer that standardizes the interface to different transcription services.

## Features

### Transcription Services

- **Browser Speech Recognition**: Free, privacy-focused option using your browser's built-in capabilities
- **AssemblyAI**: High-quality transcription with advanced speaker diarization
- **OpenAI Whisper**: Accurate transcription with good performance
- **Google Speech-to-Text**: Excellent for specific use cases

### Audio Input Methods

- Direct microphone recording with high-quality audio (44.1kHz sample rate)
- Audio file upload (MP3, WAV, WebM formats supported)
- Multiple fallback recording methods for cross-browser compatibility
- Improved audio chunk processing and timestamped filenames

### Transcript Processing

- Real-time transcription display (using browser's speech recognition when available)
- Separate service selection for live transcription and final processing
- Speaker identification (diarization)
- Sentiment analysis
- Time-stamped text segments
- Improved connection status tracking and visualization

### Summary Generation

- AI-generated summaries using OpenAI
- Structured format with clear summary section
- Actionable items highlighted in a separate section
- Copy and export functionality

### User Interface

- Phone call-like interface
- Enhanced tabbed view with icons and better descriptions
- Visual indicators for connection status and transcription service
- Improved error handling and user feedback
- Progress indicators during processing
- Modal for API key and service configuration

## Extensibility

The application is designed for easy extension in several ways:

### Adding New Transcription Services

To add a new transcription service:

1. Create a new service file (e.g., `newService.js`) implementing the standard interface
2. Add the service to the `services` object in `transcriptionServiceManager.js`
3. Include any necessary UI updates to accommodate service-specific features

### Enhancing AI Features

The modular design allows for easy addition of:

- More detailed sentiment analysis
- Topic extraction
- Custom formatting of transcripts and summaries
- Additional language support

### UI Customization

The component-based structure makes it simple to:

- Add new UI themes
- Implement alternative layouts
- Create mobile-optimized views
- Add new visualization options for transcript data

## How to Run the App

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn package manager
- A modern browser with Speech Recognition API support (for browser-based transcription)

### Setup

1. Clone the repository:

   ```
   git clone [repository-url]
   cd phone-transcriber
   ```

2. Install dependencies:

   ```
   npm install
   # or
   yarn install
   ```

3. Create API keys for the services you want to use:

   - [AssemblyAI](https://www.assemblyai.com/dashboard/signup) (free tier available)
   - [OpenAI](https://platform.openai.com/api-keys) (required for summaries)
   - [Google Cloud](https://console.cloud.google.com/apis/api/speech.googleapis.com) (optional)
   - Browser Speech Recognition (no API key required)

4. Start the development server:

   ```
   npm start
   # or
   yarn start
   ```

5. Open your browser and navigate to `http://localhost:3000`

6. Configure your API keys in the settings modal (accessible via the gear icon)

### Building for Production

To create a production build:

```
npm run build
# or
yarn build
```

The build files will be created in the `build/` directory, ready to be deployed to any static site hosting service.

## Recent Improvements

### Live Transcription

- Fixed WebSocket connection issues with transcription services
- Implemented proper audio chunk processing for real-time transcription
- Added automatic service detection and selection
- Browser Speech API is now used for live transcription whenever possible
- Improved connection status tracking and error handling
- Fixed circular dependency issues

### Audio Quality

- Increased sample rate from 16kHz to 44.1kHz for better audio quality
- Configured larger buffer sizes and higher bitrates
- Improved file format handling with proper MIME types
- Added timestamped filenames and better metadata
- Fixed distorted audio during recording and playback

### User Interface

- Added visual indicators for connection status
- Improved tab design with icons and descriptions
- Added informative badges for browser speech recognition
- Enhanced overall visual appearance and user experience
- Better service descriptions and selection interface

## Troubleshooting

- **Audio Recording Issues**: Ensure your browser allows microphone access and try the alternative recording methods if needed
- **Speech Recognition**: Browser-based speech recognition requires a compatible browser (Chrome, Edge, Safari)
- **Transcription Errors**: Check that your API keys are entered correctly and that you have sufficient quota
- **API Rate Limits**: If you encounter rate limit errors, wait a few moments before trying again
- **Connection Problems**: Check your internet connection and browser console for detailed error messages
