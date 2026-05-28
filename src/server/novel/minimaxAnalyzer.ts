import type { RoleVoiceConfig, ScriptSegment } from '../../shared/types';
import { joinMiniMaxUrl } from '../providers/minimax';

interface MiniMaxMessage {
  role: 'system' | 'user';
  content: string;
}

interface MiniMaxChatResponse {
  choices?: Array<{
    finish_reason?: string;
    message?: {
      content?: string;
    };
  }>;
  base_resp?: {
    status_code?: number;
    status_msg?: string;
  };
}

type MiniMaxNovelPayload = NovelRecord[] | { records?: NovelRecord[]; segments?: NovelRecord[] };

interface MiniMaxTextProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

interface NovelRecord {
  type?: 'narration' | 'dialogue';
  speaker?: string;
  text?: string;
  emotion?: string;
  confidence?: number;
}

export interface NovelAnalysisResult {
  segments: ScriptSegment[];
  roles: RoleVoiceConfig[];
  raw: NovelRecord[];
}

const miniMaxVoicePool = [
  'male-qn-jingying',
  'female-shaonv',
  'male-qn-qingse',
  'female-yujie',
  'male-qn-daxuesheng',
  'female-chengshu'
];

export async function analyzeNovelWithMiniMax(
  novel: string,
  provider: MiniMaxTextProviderConfig,
  textModel = provider.model ?? process.env.MINIMAX_TEXT_MODEL ?? 'MiniMax-M2.7'
): Promise<NovelAnalysisResult> {
  const apiKey = provider.apiKey ?? process.env.MINIMAX_API_KEY ?? '';
  if (!apiKey) {
    throw new Error('MiniMax analyzer is missing MINIMAX_API_KEY or provider apiKey.');
  }

  const response = await fetch(joinMiniMaxUrl(provider.baseUrl ?? '', '/chat/completions'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(buildMiniMaxNovelPayload(novel, textModel))
  });

  const payload = (await response.json()) as MiniMaxChatResponse;
  const statusCode = payload.base_resp?.status_code ?? 0;
  if (!response.ok || statusCode !== 0) {
    throw new Error(payload.base_resp?.status_msg ?? `MiniMax analyzer failed with ${response.status}.`);
  }

  const choice = payload.choices?.[0];
  if (choice?.finish_reason === 'length') {
    throw new Error('MiniMax analyzer response was truncated. Increase MINIMAX_ANALYSIS_MAX_TOKENS or shorten the novel input.');
  }

  const content = choice?.message?.content;
  if (!content) {
    throw new Error('MiniMax analyzer response did not include content.');
  }

  return normalizeMiniMaxNovelAnalysis(parseMiniMaxNovelRecords(content));
}

export function buildMiniMaxNovelPayload(novel: string, textModel: string): Record<string, unknown> {
  return {
    model: textModel,
    messages: buildMiniMaxNovelMessages(novel),
    temperature: 0.1,
    max_tokens: miniMaxAnalysisMaxTokens(),
    response_format: { type: 'json_object' },
    reasoning_split: true
  };
}

export function buildMiniMaxNovelMessages(novel: string): MiniMaxMessage[] {
  return [
    {
      role: 'system',
      content: [
        '你是一个小说转有声剧脚本的结构化解析器。',
        '只输出 JSON，不要解释，不要 Markdown。',
        '把小说拆成适合 TTS 的短 segments。',
        '旁白 speaker 固定为 narrator；角色台词 speaker 使用角色名。',
        '保留原文语义，不改写、不扩写、不润色。',
        '不确定 speaker 时使用 unknown，并把 confidence 设为小于 0.7。',
        '输出 JSON 对象，格式为 {"records":[...]}。',
        'records 每项包含 type、speaker、text、emotion、confidence。'
      ].join('\n')
    },
    {
      role: 'user',
      content: [
        '请把下面小说片段拆成多角色 TTS 脚本。',
        '字段要求：',
        '- type: narration 或 dialogue',
        '- speaker: narrator 或角色名',
        '- text: 可直接朗读的原文片段',
        '- emotion: calm | tense | surprised | sad | angry | gentle | neutral',
        '- confidence: 0 到 1',
        '',
        '小说：',
        novel
      ].join('\n')
    }
  ];
}

function miniMaxAnalysisMaxTokens(): number {
  const value = Number(process.env.MINIMAX_ANALYSIS_MAX_TOKENS ?? 12000);
  return Number.isFinite(value) && value > 0 ? value : 12000;
}

export function stripJsonFence(content: string): string {
  return content
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .trim()
    .replace(/^```(?:json)?(?:\s|\\n)*/i, '')
    .replace(/(?:\s|\\n)*```$/, '')
    .trim();
}

export function parseMiniMaxNovelRecords(content: string): NovelRecord[] {
  const payload = JSON.parse(stripJsonFence(content)) as MiniMaxNovelPayload;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.records)) return payload.records;
  if (Array.isArray(payload.segments)) return payload.segments;
  throw new Error('MiniMax analyzer response JSON did not include records.');
}

export function normalizeMiniMaxNovelAnalysis(records: NovelRecord[]): NovelAnalysisResult {
  const speakerToRole = new Map<string, RoleVoiceConfig>();
  const segments: ScriptSegment[] = [];

  for (const record of records) {
    const text = record.text?.trim();
    if (!text) continue;

    const speaker = normalizeSpeaker(record.speaker, record.type);
    const role = getOrCreateRole(speakerToRole, speaker);
    segments.push({
      role: role.role,
      text,
      emotion: record.emotion?.trim() || undefined
    });
  }

  return {
    segments,
    roles: Array.from(speakerToRole.values()),
    raw: records
  };
}

function normalizeSpeaker(speaker: string | undefined, type: string | undefined): string {
  const cleanSpeaker = speaker?.trim();
  if (!cleanSpeaker || cleanSpeaker === '旁白' || type === 'narration') {
    return 'narrator';
  }
  return cleanSpeaker;
}

function getOrCreateRole(
  speakerToRole: Map<string, RoleVoiceConfig>,
  speaker: string
): RoleVoiceConfig {
  const existing = speakerToRole.get(speaker);
  if (existing) return existing;

  const index = speakerToRole.size;
  const role: RoleVoiceConfig = {
    role: speaker === 'narrator' ? 'narrator' : toRoleId(speaker, index),
    displayName: speaker === 'narrator' ? '旁白' : speaker,
    voice: miniMaxVoicePool[index % miniMaxVoicePool.length],
    instructions: speaker === 'narrator' ? '沉稳、叙事感强' : '贴合角色语气，情绪自然'
  };
  speakerToRole.set(speaker, role);
  return role;
}

function toRoleId(speaker: string, index: number): string {
  const ascii = speaker
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  if (ascii) return ascii;

  const transliterated = speaker
    .split('')
    .map((char) => chineseNameMap[char] ?? '')
    .filter(Boolean)
    .join('-');
  return transliterated || `role-${index}`;
}

const chineseNameMap: Record<string, string> = {
  林: 'lin',
  晚: 'wan',
  周: 'zhou',
  野: 'ye',
  老: 'lao',
  人: 'ren',
  小: 'xiao',
  雨: 'yu',
  阿: 'a',
  泽: 'ze'
};
