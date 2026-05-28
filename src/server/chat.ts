import type {
  ChatConfig,
  RoleVoiceConfig,
  ScriptProviderConfig,
  ScriptSegment
} from '../shared/types';
import { parseScript } from '../shared/scriptParser';

type ScriptGenerationConfig = ChatConfig | ScriptProviderConfig;

export async function generateScriptFromChat(
  prompt: string,
  roles: RoleVoiceConfig[],
  config: ScriptGenerationConfig
): Promise<{ content: string; segments: ScriptSegment[] }> {
  if (!config.baseUrl || !config.model) {
    throw new Error('Chat config requires baseUrl and model.');
  }

  const response = await fetch(joinChatUrl(config.baseUrl), {
    method: 'POST',
    headers: buildHeaders(config.apiKey),
    body: JSON.stringify(buildChatCompletionPayload(prompt, roles, config))
  });

  if (!response.ok) {
    throw new Error(`Chat endpoint failed with ${response.status}: ${await response.text()}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    base_resp?: { status_code?: number; status_msg?: string };
  };
  const statusCode = payload.base_resp?.status_code ?? 0;
  if (statusCode !== 0) {
    throw new Error(payload.base_resp?.status_msg ?? `Chat endpoint failed with ${statusCode}.`);
  }

  const rawContent = payload.choices?.[0]?.message?.content?.trim() ?? '';
  const segments = parseGeneratedScriptContent(rawContent);
  return {
    content: formatScriptSegments(segments, roles) || stripMarkdownFence(rawContent),
    segments
  };
}

export function buildChatCompletionPayload(
  prompt: string,
  roles: RoleVoiceConfig[],
  config: ScriptGenerationConfig
): Record<string, unknown> {
  const isMiniMax = isScriptProviderConfig(config) && config.type === 'minimax';
  const payload: Record<string, unknown> = {
    model: config.model,
    messages: [
      {
        role: 'system',
        content: buildSystemPrompt(isMiniMax)
      },
      {
        role: 'user',
        content: `Available roles: ${roles
          .map((role) => `${role.role}(${role.displayName})`)
          .join(', ')}\n\n${prompt}`
      }
    ],
    temperature: 0.7
  };

  if (isMiniMax) {
    payload.response_format = { type: 'json_object' };
    payload.reasoning_split = true;
    payload.max_tokens = 2048;
  }

  return payload;
}

export function parseGeneratedScriptContent(content: string): ScriptSegment[] {
  const cleanContent = stripMarkdownFence(content);
  if (cleanContent.startsWith('{')) {
    return parseJsonObjectSegments(cleanContent);
  }
  return parseScript(cleanContent);
}

function buildHeaders(apiKey?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  return headers;
}

function joinChatUrl(baseUrl: string): string {
  const cleanBase = baseUrl.replace(/\/$/, '');
  if (cleanBase.endsWith('/v1') || cleanBase.endsWith('/api')) {
    return `${cleanBase}/chat/completions`;
  }

  return `${cleanBase}/v1/chat/completions`;
}

function stripMarkdownFence(content: string): string {
  return content
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

function buildSystemPrompt(isMiniMax: boolean): string {
  const base = [
    'You convert user ideas into scripts for multi-character TTS.',
    'Use only the available role ids.',
    'Each script item must contain role, text, and optional emotion.',
    'Do not explain your answer or use Markdown.'
  ];

  if (isMiniMax) {
    return [...base, 'Return only a JSON object in this shape: {"segments":[...]}'].join(' ');
  }

  return [...base, 'Return only a JSON array.'].join(' ');
}

function parseJsonObjectSegments(content: string): ScriptSegment[] {
  const value = JSON.parse(content) as unknown;
  if (!value || typeof value !== 'object') {
    return [];
  }

  const record = value as Record<string, unknown>;
  const rawSegments = Array.isArray(record.segments)
    ? record.segments
    : Array.isArray(record.records)
      ? record.records
      : [];

  return rawSegments
    .map((item) => normalizeGeneratedSegment(item))
    .filter((item): item is ScriptSegment => Boolean(item));
}

function normalizeGeneratedSegment(value: unknown): ScriptSegment | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const role = typeof record.role === 'string' ? record.role : record.speaker;
  if (typeof role !== 'string' || typeof record.text !== 'string') {
    return null;
  }

  const segment: ScriptSegment = {
    role: role.trim(),
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

function formatScriptSegments(segments: ScriptSegment[], roles: RoleVoiceConfig[]): string {
  const displayNames = new Map(roles.map((role) => [role.role, role.displayName]));
  return segments
    .map((segment) => `${displayNames.get(segment.role) ?? segment.role}：${segment.text}`)
    .join('\n');
}

function isScriptProviderConfig(config: ScriptGenerationConfig): config is ScriptProviderConfig {
  return 'type' in config;
}
