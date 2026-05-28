import { describe, expect, it } from 'vitest';
import { estimateSynthesisUsage } from './synthesisUsage';

describe('estimateSynthesisUsage', () => {
  it('counts segments and Unicode characters that will be sent to TTS', () => {
    expect(
      estimateSynthesisUsage([
        { text: '林砚说。' },
        { text: 'OK🙂' }
      ])
    ).toEqual({
      segments: 2,
      characters: 7
    });
  });
});
