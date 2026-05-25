import type { ScriptSegment } from './types';

const roleLinePattern = /^\s*(?:\[([^\]]+)\]|([^:：\n]{1,48})\s*[:：])\s*(.*)$/;

export function parseScript(input: string): ScriptSegment[] {
  const trimmed = input.trim();
  if (!trimmed) {
    return [];
  }

  const jsonSegments = parseJsonSegments(trimmed);
  if (jsonSegments) {
    return jsonSegments;
  }

  const segments: ScriptSegment[] = [];
  for (const rawLine of trimmed.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const match = line.match(roleLinePattern);
    if (match) {
      const role = normalizeRole(match[1] ?? match[2]);
      const text = match[3].trim();
      if (text) {
        segments.push({ role, text });
      }
      continue;
    }

    const previous = segments.at(-1);
    if (previous) {
      previous.text = `${previous.text}\n${line}`;
    } else {
      segments.push({ role: 'narrator', text: line });
    }
  }

  return segments;
}

function parseJsonSegments(input: string): ScriptSegment[] | null {
  if (!input.startsWith('[')) {
    return null;
  }

  try {
    const value = JSON.parse(input) as unknown;
    if (!Array.isArray(value)) {
      return null;
    }

    const segments = value
      .map((item) => normalizeJsonSegment(item))
      .filter((item): item is ScriptSegment => Boolean(item));

    return segments.length > 0 ? segments : null;
  } catch {
    return null;
  }
}

function normalizeJsonSegment(value: unknown): ScriptSegment | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.role !== 'string' || typeof record.text !== 'string') {
    return null;
  }

  const segment: ScriptSegment = {
    role: normalizeRole(record.role),
    text: record.text.trim()
  };

  if (!segment.role || !segment.text) {
    return null;
  }

  if (typeof record.emotion === 'string' && record.emotion.trim()) {
    segment.emotion = record.emotion.trim();
  }

  return segment;
}

function normalizeRole(role: string): string {
  return role.trim();
}
