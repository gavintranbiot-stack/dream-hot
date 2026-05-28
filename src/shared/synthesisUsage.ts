import type { ScriptSegment } from './types';

export interface SynthesisUsageEstimate {
  segments: number;
  characters: number;
}

export function estimateSynthesisUsage(segments: Pick<ScriptSegment, 'text'>[]): SynthesisUsageEstimate {
  return {
    segments: segments.length,
    characters: segments.reduce((total, segment) => total + [...segment.text].length, 0)
  };
}
