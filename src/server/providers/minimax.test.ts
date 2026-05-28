import { describe, expect, it } from 'vitest';
import {
  buildMiniMaxTtsPayload,
  decodeMiniMaxAudioResponse,
  joinMiniMaxUrl
} from './minimax';
import type { TtsProviderConfig, VoiceJob } from '../../shared/types';

describe('MiniMax TTS provider helpers', () => {
  const provider: TtsProviderConfig = {
    id: 'minimax',
    type: 'minimax',
    label: 'MiniMax Speech',
    baseUrl: 'https://api.minimaxi.com/v1',
    model: 'speech-2.8-hd',
    apiKey: 'test-key',
    responseFormat: 'mp3'
  };

  const job: VoiceJob = {
    id: 'segment-1',
    order: 0,
    role: 'xiaoyu',
    displayName: '小雨',
    provider: 'minimax',
    voice: 'female-shaonv',
    text: '你终于来了。',
    instructions: '温柔但带一点惊讶'
  };

  it('builds the documented t2a_v2 payload with per-role voice id', () => {
    expect(buildMiniMaxTtsPayload(job, provider)).toEqual({
      model: 'speech-2.8-hd',
      text: '你终于来了。',
      stream: false,
      language_boost: 'Chinese',
      output_format: 'hex',
      voice_setting: {
        voice_id: 'female-shaonv',
        speed: 1,
        vol: 1,
        pitch: 0
      },
      audio_setting: {
        sample_rate: 32000,
        bitrate: 128000,
        format: 'mp3',
        channel: 1
      }
    });
  });

  it('decodes successful hex audio responses into buffers', () => {
    const result = decodeMiniMaxAudioResponse(
      {
        data: { audio: '48656c6c6f', status: 2 },
        base_resp: { status_code: 0, status_msg: 'success' }
      },
      provider
    );

    expect(result.audio.toString('utf8')).toBe('Hello');
    expect(result.contentType).toBe('audio/mpeg');
  });

  it('joins base URLs without duplicating /v1', () => {
    expect(joinMiniMaxUrl('https://api.minimaxi.com/v1', '/t2a_v2')).toBe(
      'https://api.minimaxi.com/v1/t2a_v2'
    );
    expect(joinMiniMaxUrl('https://api.minimaxi.com', '/t2a_v2')).toBe(
      'https://api.minimaxi.com/v1/t2a_v2'
    );
  });
});
