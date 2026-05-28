import type { TtsProviderConfig, VoiceJob } from '../../shared/types';
import { contentTypeFor } from './openaiCompatible';
import type { SynthesisResult, TtsProvider } from './types';

interface MiniMaxAudioResponse {
  data?: {
    audio?: string;
    status?: number;
  } | null;
  base_resp?: {
    status_code?: number;
    status_msg?: string;
  };
}

export const miniMaxTtsProvider: TtsProvider = {
  async synthesize(job, provider) {
    const apiKey = provider.apiKey ?? process.env.MINIMAX_API_KEY ?? '';
    if (!apiKey) {
      throw new Error('MiniMax TTS is missing MINIMAX_API_KEY or provider apiKey.');
    }

    const response = await fetch(joinMiniMaxUrl(provider.baseUrl ?? '', '/t2a_v2'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(buildMiniMaxTtsPayload(job, provider))
    });

    const payload = (await response.json()) as MiniMaxAudioResponse;
    if (!response.ok) {
      throw new Error(`MiniMax TTS failed with ${response.status}: ${JSON.stringify(payload)}`);
    }

    return decodeMiniMaxAudioResponse(payload, provider);
  }
};

export function buildMiniMaxTtsPayload(
  job: VoiceJob,
  provider: TtsProviderConfig
): Record<string, unknown> {
  return {
    model: provider.model ?? 'speech-2.8-hd',
    text: job.text,
    stream: false,
    language_boost: 'Chinese',
    output_format: 'hex',
    voice_setting: {
      voice_id: job.voice,
      speed: 1,
      vol: 1,
      pitch: 0
    },
    audio_setting: {
      sample_rate: 32000,
      bitrate: 128000,
      format: provider.responseFormat,
      channel: 1
    }
  };
}

export function decodeMiniMaxAudioResponse(
  payload: MiniMaxAudioResponse,
  provider: TtsProviderConfig
): SynthesisResult {
  const statusCode = payload.base_resp?.status_code ?? 0;
  if (statusCode !== 0) {
    throw new Error(payload.base_resp?.status_msg ?? `MiniMax TTS failed with ${statusCode}.`);
  }

  const audio = payload.data?.audio;
  if (!audio) {
    throw new Error('MiniMax TTS response did not include audio.');
  }

  return {
    audio: Buffer.from(audio, 'hex'),
    contentType: contentTypeFor(provider.responseFormat)
  };
}

export function joinMiniMaxUrl(baseUrl: string, path: string): string {
  const cleanBase = (baseUrl || 'https://api.minimaxi.com/v1').replace(/\/$/, '');
  const prefix = cleanBase.endsWith('/v1') ? cleanBase : `${cleanBase}/v1`;
  return `${prefix}${path}`;
}
