import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildChatCompletionPayload,
  generateScriptFromChat,
  parseGeneratedScriptContent
} from './chat';
import type { RoleVoiceConfig, ScriptProviderConfig } from '../shared/types';

const roles: RoleVoiceConfig[] = [
  {
    role: 'narrator',
    displayName: '旁白',
    voice: 'male-qn-jingying'
  },
  {
    role: 'xiaoyu',
    displayName: '小雨',
    voice: 'female-shaonv'
  }
];

const miniMaxProvider: ScriptProviderConfig = {
  id: 'minimax',
  type: 'minimax',
  label: 'MiniMax M2.7',
  baseUrl: 'https://api.minimaxi.com/v1',
  apiKey: 'test-key',
  model: 'MiniMax-M2.7'
};

describe('chat script generation', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('builds MiniMax chat payloads with JSON object response mode', () => {
    const payload = buildChatCompletionPayload('写一段两人短剧。', roles, miniMaxProvider);

    expect(payload).toMatchObject({
      model: 'MiniMax-M2.7',
      temperature: 0.7,
      response_format: { type: 'json_object' },
      reasoning_split: true
    });
    const messages = payload.messages as Array<{ content: string }>;
    expect(messages[0].content).toContain('{"segments":[...]}');
  });

  it('parses MiniMax JSON object script content after reasoning is removed', () => {
    const result = parseGeneratedScriptContent(
      '<think>先规划角色</think>\n{"segments":[{"role":"narrator","text":"雨停了。"},{"role":"xiaoyu","text":"你来了。","emotion":"gentle"}]}'
    );

    expect(result).toEqual([
      { role: 'narrator', text: '雨停了。' },
      { role: 'xiaoyu', text: '你来了。', emotion: 'gentle' }
    ]);
  });

  it('generates a readable script from a selected MiniMax provider', async () => {
    globalThis.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content:
                  '{"segments":[{"role":"narrator","text":"雨停了。"},{"role":"xiaoyu","text":"你来了。"}]}'
              }
            }
          ],
          base_resp: { status_code: 0, status_msg: 'success' }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as typeof fetch;

    const result = await generateScriptFromChat('写一段两人短剧。', roles, miniMaxProvider);

    expect(result.segments).toEqual([
      { role: 'narrator', text: '雨停了。' },
      { role: 'xiaoyu', text: '你来了。' }
    ]);
    expect(result.content).toBe('旁白：雨停了。\n小雨：你来了。');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.minimaxi.com/v1/chat/completions',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-key' })
      })
    );
  });
});
