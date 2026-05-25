import { describe, expect, it } from 'vitest';
import { parseScript } from './scriptParser';

describe('parseScript', () => {
  it('parses Chinese and ASCII role delimiters into ordered speech segments', () => {
    const segments = parseScript(`
旁白：夜色很深。
小雨: 你终于来了。
阿泽：我一直都在。
`);

    expect(segments).toEqual([
      { role: '旁白', text: '夜色很深。' },
      { role: '小雨', text: '你终于来了。' },
      { role: '阿泽', text: '我一直都在。' }
    ]);
  });

  it('parses bracket speaker tags and continues untagged text on the previous role', () => {
    const segments = parseScript(`
[narrator] The hallway lights flickered.
The rain kept tapping on the windows.
[xiaoyu] You finally came.
`);

    expect(segments).toEqual([
      {
        role: 'narrator',
        text: 'The hallway lights flickered.\nThe rain kept tapping on the windows.'
      },
      { role: 'xiaoyu', text: 'You finally came.' }
    ]);
  });

  it('accepts a JSON array of role/text objects', () => {
    const segments = parseScript(
      JSON.stringify([
        { role: 'narrator', text: 'Scene one.' },
        { role: 'xiaoyu', text: 'Hello.', emotion: 'warm' }
      ])
    );

    expect(segments).toEqual([
      { role: 'narrator', text: 'Scene one.' },
      { role: 'xiaoyu', text: 'Hello.', emotion: 'warm' }
    ]);
  });

  it('uses narrator as the fallback role for plain text', () => {
    expect(parseScript('Just a plain sentence.')).toEqual([
      { role: 'narrator', text: 'Just a plain sentence.' }
    ]);
  });
});
