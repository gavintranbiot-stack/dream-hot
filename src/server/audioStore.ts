import { randomUUID } from 'node:crypto';

interface AudioRecord {
  buffer: Buffer;
  contentType: string;
  createdAt: number;
}

const records = new Map<string, AudioRecord>();
const maxAgeMs = 1000 * 60 * 30;

export function saveAudio(buffer: Buffer, contentType: string): string {
  pruneExpiredAudio();
  const id = randomUUID();
  records.set(id, {
    buffer,
    contentType,
    createdAt: Date.now()
  });
  return id;
}

export function getAudio(id: string): AudioRecord | undefined {
  pruneExpiredAudio();
  return records.get(id);
}

function pruneExpiredAudio(): void {
  const now = Date.now();
  for (const [id, record] of records.entries()) {
    if (now - record.createdAt > maxAgeMs) {
      records.delete(id);
    }
  }
}
