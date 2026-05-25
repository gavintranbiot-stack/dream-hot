import type { ChatConfig, RoleVoiceConfig, ScriptSegment } from '../shared/types';
import { parseScript } from '../shared/scriptParser';

export async function generateScriptFromChat(
  prompt: string,
  roles: RoleVoiceConfig[],
  config: ChatConfig
): Promise<{ content: string; segments: ScriptSegment[] }> {
  if (!config.baseUrl || !config.model) {
    throw new Error('Chat config requires baseUrl and model.');
  }

  const response = await fetch(joinChatUrl(config.baseUrl), {
    method: 'POST',
    headers: buildHeaders(config.apiKey),
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'system',
          content:
            'You convert user ideas into JSON scripts for multi-character TTS. Return only a JSON array. Each item must contain role, text, and optional emotion.'
        },
        {
          role: 'user',
          content: `Available roles: ${roles.map((role) => role.role).join(', ')}\n\n${prompt}`
        }
      ],
      temperature: 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`Chat endpoint failed with ${response.status}: ${await response.text()}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content?.trim() ?? '';
  return {
    content,
    segments: parseScript(stripMarkdownFence(content))
  };
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
  return content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
}
