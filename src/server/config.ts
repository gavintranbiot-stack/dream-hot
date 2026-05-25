import type { VoiceEngineConfig } from '../shared/types';

export const defaultConfig: VoiceEngineConfig = {
  chat: {
    baseUrl: process.env.OPENWEBUI_BASE_URL ?? 'http://localhost:3000/api',
    apiKey: process.env.OPENWEBUI_API_KEY ?? '',
    model: process.env.OPENWEBUI_MODEL ?? ''
  },
  ttsEngine: {
    selectedProvider: process.env.TTS_PROVIDER ?? 'mock'
  },
  providers: [
    {
      id: 'mock',
      type: 'mock',
      label: 'Local Mock WAV',
      responseFormat: 'wav'
    },
    {
      id: 'qwen',
      type: 'openai-compatible',
      label: 'Qwen3-TTS',
      baseUrl: process.env.QWEN_TTS_BASE_URL ?? 'http://localhost:8091/v1',
      apiKey: process.env.QWEN_TTS_API_KEY ?? 'none',
      model: process.env.QWEN_TTS_MODEL ?? 'Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice',
      responseFormat: 'wav'
    },
    {
      id: 'openai',
      type: 'openai',
      label: 'OpenAI TTS',
      baseUrl: process.env.OPENAI_TTS_BASE_URL ?? 'https://api.openai.com/v1',
      apiKey: process.env.OPENAI_API_KEY ?? '',
      model: process.env.OPENAI_TTS_MODEL ?? 'gpt-4o-mini-tts',
      responseFormat: 'mp3'
    }
  ],
  roles: [
    {
      role: 'narrator',
      displayName: '旁白',
      voice: 'Uncle_Fu',
      instructions: '沉稳、叙事感强'
    },
    {
      role: 'xiaoyu',
      displayName: '小雨',
      voice: 'Vivian',
      instructions: '温柔但带一点惊讶'
    },
    {
      role: 'aze',
      displayName: '阿泽',
      voice: 'Ryan',
      instructions: '温柔、坚定、有少年感'
    }
  ]
};
