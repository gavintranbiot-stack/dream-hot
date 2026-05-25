import type { TtsProvider } from './types';
import { openAiCompatibleTtsProvider } from './openaiCompatible';

export const openAiTtsProvider: TtsProvider = {
  async synthesize(job, provider) {
    if (!provider.apiKey) {
      throw new Error('OpenAI TTS is missing OPENAI_API_KEY or provider apiKey.');
    }

    return openAiCompatibleTtsProvider.synthesize(job, provider);
  }
};
