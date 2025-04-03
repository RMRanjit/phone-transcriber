# Phone Transcriber

A web application that transcribes phone calls or audio recordings, providing transcripts with speaker diarization and AI-generated summaries.

## What is this App?

Phone Transcriber is a React-based web application designed to make transcribing phone conversations or audio recordings simple and efficient. It offers:

- Audio recording and file upload capabilities
- Real-time or batch transcription of audio
- Speaker identification (diarization)
- AI-generated summaries with action items
- Support for multiple transcription services

The application is perfect for professionals who need to keep records of phone conversations, meetings, or interviews, providing both accurate transcripts and concise summaries.

## Design

The application follows a modern, intuitive design that mimics a phone call interface. The main components include:

- **Call Interface**: A phone-like UI with action buttons (ANSWER, MUTE, HOLD, RESET, VIDEO CALL)
- **Transcription Panel**: Real-time display of transcribed text with speaker identification
- **Cognition AI Panel**: Shows sentiment analysis and other AI-derived insights
- **Settings Modal**: Configuration for API keys and transcription service selection
- **Tabbed Interface**: Easily toggle between transcript and summary views

### Code Organization

The codebase is structured as follows:

```
src/
├── components/         # React UI components
├── services/           # API service integrations
│   ├── assemblyAIService.js     # AssemblyAI integration
│   ├── openaiService.js         # OpenAI Whisper integration
│   ├── googleTranscribeService.js # Google Speech-to-Text integration
│   └── transcriptionServiceManager.js # Service abstraction layer
├── utils/              # Utility functions
├── hooks/              # Custom React hooks
├── fallbackModal.js    # Vanilla JS implementation for settings modal
└── App.js              # Main application component
```

The application uses a service-oriented architecture that separates UI components from API integrations. The `transcriptionServiceManager.js` serves as an abstraction layer that standardizes the interface to different transcription services.

## Features

### Transcription Services

- **AssemblyAI**: High-quality transcription with advanced speaker diarization
- **OpenAI Whisper**: Accurate transcription with good performance
- **Google Speech-to-Text**: Excellent for specific use cases

### Audio Input Methods

- Direct microphone recording
- Audio file upload (MP3, WAV, WebM formats supported)
- Multiple fallback recording methods for cross-browser compatibility

### Transcript Processing

- Real-time transcription display
- Speaker identification (diarization)
- Sentiment analysis
- Time-stamped text segments

### Summary Generation

- AI-generated summaries using OpenAI
- Structured format with clear summary section
- Actionable items highlighted in a separate section
- Copy and export functionality

### User Interface

- Phone call-like interface
- Tabbed view for transcript and summary
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

## Troubleshooting

- **Audio Recording Issues**: Ensure your browser allows microphone access and try the alternative recording methods if needed
- **Transcription Errors**: Check that your API keys are entered correctly and that you have sufficient quota
- **API Rate Limits**: If you encounter rate limit errors, wait a few moments before trying again
