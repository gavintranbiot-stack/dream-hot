import { describe, expect, it } from 'vitest';
import { buildVoiceJobs } from './voiceJobs';
import type { RoleVoiceConfig } from '../../shared/types';

describe('buildVoiceJobs', () => {
  const roles: RoleVoiceConfig[] = [
    {
      role: 'narrator',
      displayName: '旁白',
      voice: 'Uncle_Fu',
      instructions: 'calm narration'
    },
    {
      role: 'xiaoyu',
      displayName: '小雨',
      voice: 'Vivian',
      instructions: 'warm and surprised'
    }
  ];

  it('maps each segment to the selected engine, configured voice, and instructions', () => {
    const jobs = buildVoiceJobs(
      [
        { role: 'narrator', text: '夜色很深。' },
        { role: 'xiaoyu', text: '你终于来了。', emotion: 'surprised' }
      ],
      roles,
      'qwen'
    );

    expect(jobs).toEqual([
      {
        id: 'segment-1',
        order: 0,
        role: 'narrator',
        displayName: '旁白',
        provider: 'qwen',
        voice: 'Uncle_Fu',
        instructions: 'calm narration',
        text: '夜色很深。'
      },
      {
        id: 'segment-2',
        order: 1,
        role: 'xiaoyu',
        displayName: '小雨',
        provider: 'qwen',
        voice: 'Vivian',
        instructions: 'warm and surprised; emotion: surprised',
        text: '你终于来了。'
      }
    ]);
  });

  it('maps display names from scripts to the configured role voice', () => {
    const jobs = buildVoiceJobs(
      [
        { role: '旁白', text: '夜色很深。' },
        { role: '小雨', text: '你终于来了。' }
      ],
      roles,
      'qwen'
    );

    expect(jobs).toMatchObject([
      {
        role: 'narrator',
        displayName: '旁白',
        voice: 'Uncle_Fu'
      },
      {
        role: 'xiaoyu',
        displayName: '小雨',
        voice: 'Vivian'
      }
    ]);
  });

  it('uses the selected engine for every conversation role voice', () => {
    const jobs = buildVoiceJobs(
      [
        { role: '旁白', text: '夜色很深。' },
        { role: '小雨', text: '你终于来了。' }
      ],
      roles,
      'openai'
    );

    expect(jobs).toMatchObject([
      {
        provider: 'openai',
        voice: 'Uncle_Fu'
      },
      {
        provider: 'openai',
        voice: 'Vivian'
      }
    ]);
  });

  it('falls back to narrator config when a role has no explicit voice mapping', () => {
    const [job] = buildVoiceJobs([{ role: 'unknown', text: 'Fallback line.' }], roles, 'qwen');

    expect(job).toMatchObject({
      role: 'unknown',
      displayName: 'unknown',
      provider: 'qwen',
      voice: 'Uncle_Fu',
      instructions: 'calm narration',
      text: 'Fallback line.'
    });
  });
});
