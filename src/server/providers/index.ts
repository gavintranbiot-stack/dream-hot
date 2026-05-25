import type { TtsProviderConfig } from '../../shared/types';
import type { TtsProvider } from './types';
import { mockTtsProvider } from './mock';
import { openAiTtsProvider } from './openai';
import { openAiCompatibleTtsProvider } from './openaiCompatible';

export function getTtsProvider(provider: TtsProviderConfig): TtsProvider {
  if (provider.type === 'mock') return mockTtsProvider;
  if (provider.type === 'openai') return openAiTtsProvider;
  return openAiCompatibleTtsProvider;
}
