import { describe, expect, it } from 'vitest';
import {
  buildMiniMaxNovelPayload,
  buildMiniMaxNovelMessages,
  normalizeMiniMaxNovelAnalysis,
  parseMiniMaxNovelRecords,
  stripJsonFence
} from './minimaxAnalyzer';

describe('MiniMax novel analyzer helpers', () => {
  it('builds messages that request strict JSON script segments', () => {
    const messages = buildMiniMaxNovelMessages('雨停了。“你终于来了。”林晚说。');

    expect(messages[0]).toMatchObject({ role: 'system' });
    expect(messages[0].content).toContain('只输出 JSON');
    expect(messages[0].content).toContain('{"records":[...]}');
    expect(messages[1].content).toContain('雨停了');
    expect(messages[1].content).toContain('speaker');
  });

  it('builds MiniMax payloads with enough output room for long novel analysis', () => {
    expect(buildMiniMaxNovelPayload('雨停了。', 'MiniMax-M2.7')).toMatchObject({
      model: 'MiniMax-M2.7',
      max_tokens: 12000,
      response_format: { type: 'json_object' },
      reasoning_split: true
    });
  });

  it('strips markdown fences from model JSON output', () => {
    expect(stripJsonFence('```json\\n[{\"speaker\":\"narrator\"}]\\n```')).toBe(
      '[{\"speaker\":\"narrator\"}]'
    );
    expect(stripJsonFence('<think>先思考</think>\n\n{"records":[]}')).toBe('{"records":[]}');
  });

  it('parses MiniMax JSON object records after reasoning is removed', () => {
    expect(
      parseMiniMaxNovelRecords('<think>略</think>\n{"records":[{"speaker":"narrator","text":"雨停了。"}]}')
    ).toEqual([{ speaker: 'narrator', text: '雨停了。' }]);
  });

  it('normalizes analyzed speaker records into app segments and roles', () => {
    const result = normalizeMiniMaxNovelAnalysis([
      {
        type: 'narration',
        speaker: 'narrator',
        text: '雨停的时候，旧书店门口只剩一盏昏黄的灯。',
        emotion: 'calm',
        confidence: 1
      },
      {
        type: 'dialogue',
        speaker: '林晚',
        text: '找一本没有书名的书。',
        emotion: 'tense',
        confidence: 0.94
      }
    ]);

    expect(result.segments).toEqual([
      {
        role: 'narrator',
        text: '雨停的时候，旧书店门口只剩一盏昏黄的灯。',
        emotion: 'calm'
      },
      {
        role: 'lin-wan',
        text: '找一本没有书名的书。',
        emotion: 'tense'
      }
    ]);
    expect(result.roles).toMatchObject([
      {
        role: 'narrator',
        displayName: '旁白',
        voice: 'male-qn-jingying'
      },
      {
        role: 'lin-wan',
        displayName: '林晚',
        voice: 'female-shaonv'
      }
    ]);
  });
});
