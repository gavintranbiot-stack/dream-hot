import type { TtsProvider } from './types';

export const mockTtsProvider: TtsProvider = {
  async synthesize(job) {
    const seconds = Math.min(2.4, Math.max(0.45, job.text.length / 22));
    const frequency = voiceFrequency(job.voice);
    return {
      audio: createToneWav(seconds, frequency),
      contentType: 'audio/wav'
    };
  }
};

function voiceFrequency(voice: string): number {
  let hash = 0;
  for (const char of voice) {
    hash = (hash + char.charCodeAt(0)) % 120;
  }
  return 220 + hash * 3;
}

function createToneWav(seconds: number, frequency: number): Buffer {
  const sampleRate = 24000;
  const samples = Math.floor(sampleRate * seconds);
  const dataSize = samples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples; i += 1) {
    const fade = Math.min(1, i / 1200, (samples - i) / 1200);
    const sample = Math.sin((2 * Math.PI * frequency * i) / sampleRate);
    buffer.writeInt16LE(Math.floor(sample * 0.18 * fade * 32767), 44 + i * 2);
  }

  return buffer;
}
