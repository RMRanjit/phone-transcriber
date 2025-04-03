import * as assemblyAIService from './assemblyAIService';
import * as openaiService from './openaiService';
import * as googleTranscribeService from './googleTranscribeService';

// Default is AssemblyAI
let activeService = 'assemblyai';

// Service configurations
const services = {
  assemblyai: {
    name: 'AssemblyAI',
    service: assemblyAIService,
    keyStorageName: 'assemblyai_api_key',
    keyType: 'API Key',
    keyInfoText: 'Get a free AssemblyAI API key - no credit card required.',
    keyInfoUrl: 'https://www.assemblyai.com/dashboard/signup',
    supportsDiarization: true,
    supportsSummary: true
  },
  openai: {
    name: 'OpenAI Whisper',
    service: openaiService,
    keyStorageName: 'openai_api_key',
    keyType: 'API Key',
    keyInfoText: 'Get an OpenAI API key for transcription and summarization.',
    keyInfoUrl: 'https://platform.openai.com/api-keys',
    supportsDiarization: true,
    supportsSummary: true
  },
  google: {
    name: 'Google Speech-to-Text',
    service: googleTranscribeService,
    keyStorageName: 'google_api_key',
    keyType: 'API Key',
    keyInfoText: 'Get a Google Cloud API key with Speech-to-Text enabled.',
    keyInfoUrl: 'https://console.cloud.google.com/apis/api/speech.googleapis.com',
    supportsDiarization: true,
    supportsSummary: false
  }
};

// Get the currently active service
export const getActiveService = () => {
  return activeService;
};

// Get service info object
export const getServiceInfo = (serviceKey = activeService) => {
  return services[serviceKey] || services.assemblyai;
};

// Set the active transcription service
export const setActiveService = (serviceKey) => {
  if (services[serviceKey]) {
    console.log(`Switching transcription service to: ${serviceKey}`);
    activeService = serviceKey;
    return true;
  }
  console.error(`Unknown transcription service: ${serviceKey}`);
  return false;
};

// Set the API key for a service
export const setApiKey = (key, serviceKey = activeService) => {
  if (services[serviceKey]) {
    services[serviceKey].service.setApiKey(key);
    // Also save to localStorage
    localStorage.setItem(services[serviceKey].keyStorageName, key);
    return true;
  }
  return false;
};

// Initialize API keys from localStorage
export const initApiKeys = () => {
  Object.keys(services).forEach(serviceKey => {
    const savedKey = localStorage.getItem(services[serviceKey].keyStorageName);
    if (savedKey) {
      services[serviceKey].service.setApiKey(savedKey);
    }
  });
};

// Check if the active service has an API key set
export const hasApiKey = (serviceKey = activeService) => {
  const savedKey = localStorage.getItem(services[serviceKey]?.keyStorageName);
  return !!savedKey && savedKey.trim() !== '';
};

// Get the supported services list
export const getServices = () => {
  return Object.keys(services).map(key => ({
    id: key,
    name: services[key].name
  }));
};

// Proxy method for uploadAudio
export const uploadAudio = async (audioFile) => {
  return await services[activeService].service.uploadAudio(audioFile);
};

// Proxy method for startTranscription
export const startTranscription = async (audioUrl, options = {}) => {
  return await services[activeService].service.startTranscription(audioUrl, options);
};

// Proxy method for pollTranscription
export const pollTranscription = async (transcriptId) => {
  return await services[activeService].service.pollTranscription(transcriptId);
};

// Proxy method for processDiarizedTranscript
export const processDiarizedTranscript = (result) => {
  return services[activeService].service.processDiarizedTranscript(result);
};

// Proxy method for generateSummary
export const generateSummary = async (transcriptId) => {
  try {
    // Always use OpenAI for summary generation regardless of the active service
    console.log("Using OpenAI for summary generation");
    
    // Different services provide different data formats, we need to extract the transcript text
    let transcriptText;
    
    // If transcriptId is a string and not a numeric ID, it's already the transcript text
    if (typeof transcriptId === 'string' && !transcriptId.match(/^[0-9]+$/)) {
      transcriptText = transcriptId;
    }
    // If we have an object with text property, use that
    else if (transcriptId && transcriptId.text) {
      transcriptText = transcriptId.text;
    }
    // If it's an AssemblyAI transcript ID, we need to fetch the transcript first
    else if (activeService === 'assemblyai' && transcriptId) {
      try {
        const transcript = await services.assemblyai.service.getTranscription(transcriptId);
        transcriptText = transcript.text;
      } catch (error) {
        console.error("Error fetching AssemblyAI transcript:", error);
        return "Summary:\nCould not retrieve transcript text from AssemblyAI.\n\nAction Required:\n1. Try processing the audio again";
      }
    }
    
    // If we still don't have transcript text, return error message
    if (!transcriptText) {
      return "Summary:\nCould not generate summary due to missing transcript text.\n\nAction Required:\n1. Try processing the audio again";
    }
    
    // Use OpenAI to generate the summary
    const summaryResult = await services.openai.service.generateSummary(transcriptText);
    return summaryResult;
    
  } catch (error) {
    console.error("Error generating summary with OpenAI:", error);
    return `Summary:\nAn error occurred while generating the summary with OpenAI.\n\nAction Required:\n1. Check your OpenAI API key settings\n2. Try processing the audio again`;
  }
};

// Process audio completely using the active service
export const processAudioComplete = async (audioFile) => {
  try {
    const service = services[activeService].service;
    
    // If service provides a direct processAudioComplete method, use it
    if (typeof service.processAudioComplete === 'function') {
      console.log(`Using ${services[activeService].name} direct processing method`);
      return await service.processAudioComplete(audioFile);
    }
    
    console.log(`Using step-by-step approach for ${services[activeService].name}`);
    // Otherwise use our step-by-step approach
    // 1. Upload audio
    console.log("Step 1: Uploading audio");
    const uploadResult = await service.uploadAudio(audioFile);
    
    // 2. Start transcription
    console.log("Step 2: Starting transcription");
    const transcriptionResponse = await service.startTranscription(uploadResult);
    
    // 3. Poll for results
    console.log("Step 3: Polling for results");
    return await service.pollTranscription(transcriptionResponse);
  } catch (error) {
    console.error(`Error in processAudioComplete for ${services[activeService].name}:`, error);
    throw new Error(`Failed to process audio with ${services[activeService].name}: ${error.message}`);
  }
}; 