import type { TtsProviderConfig, VoiceJob } from '../../shared/types';
import type { SynthesisResult, TtsProvider } from './types';

export const openAiCompatibleTtsProvider: TtsProvider = {
  async synthesize(job, provider) {
    const baseUrl = provider.baseUrl ?? '';
    if (!baseUrl) {
      throw new Error(`Provider "${provider.id}" is missing baseUrl.`);
    }

    const response = await fetch(joinUrl(baseUrl, '/audio/speech'), {
      method: 'POST',
      headers: buildHeaders(provider),
      body: JSON.stringify(buildOpenAiCompatiblePayload(job, provider))
    });

    if (!response.ok) {
      throw new Error(
        `Provider "${provider.id}" failed with ${response.status}: ${await response.text()}`
      );
    }

    return {
      audio: Buffer.from(await response.arrayBuffer()),
      contentType: response.headers.get('content-type') ?? contentTypeFor(provider.responseFormat)
    };
  }
};

export function buildOpenAiCompatiblePayload(
  job: VoiceJob,
  provider: TtsProviderConfig
): Record<string, unknown> {
  return {
    model: provider.model,
    input: job.text,
    voice: job.voice,
    instructions: job.instructions,
    response_format: provider.responseFormat
  };
}

function buildHeaders(provider: TtsProviderConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (provider.apiKey) {
    headers.Authorization = `Bearer ${provider.apiKey}`;
  }

  return headers;
}

function joinUrl(baseUrl: string, path: string): string {
  const cleanBase = baseUrl.replace(/\/$/, '');
  const prefix = cleanBase.endsWith('/v1') ? cleanBase : `${cleanBase}/v1`;
  return `${prefix}${path}`;
}

export function contentTypeFor(format: string): string {
  if (format === 'wav') return 'audio/wav';
  if (format === 'pcm') return 'audio/pcm';
  if (format === 'opus') return 'audio/opus';
  if (format === 'aac') return 'audio/aac';
  if (format === 'flac') return 'audio/flac';
  return 'audio/mpeg';
}
