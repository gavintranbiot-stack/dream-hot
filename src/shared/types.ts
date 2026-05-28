export interface ScriptSegment {
  role: string;
  text: string;
  emotion?: string;
}

export interface RoleVoiceConfig {
  role: string;
  displayName: string;
  voice: string;
  instructions?: string;
}

export interface VoiceJob {
  id: string;
  order: number;
  role: string;
  displayName: string;
  provider: string;
  voice: string;
  text: string;
  instructions?: string;
}

export interface ChatConfig {
  baseUrl: string;
  apiKey?: string;
  model?: string;
}

export type ScriptProviderType = 'openai-compatible' | 'minimax';

export interface ScriptProviderConfig {
  id: string;
  type: ScriptProviderType;
  label: string;
  baseUrl: string;
  apiKey?: string;
  model?: string;
}

export interface ScriptEngineSettings {
  selectedProvider: string;
}

export type TtsProviderType = 'mock' | 'openai' | 'openai-compatible' | 'minimax';

export interface TtsProviderConfig {
  id: string;
  type: TtsProviderType;
  label: string;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  responseFormat: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm';
}

export interface TtsEngineSettings {
  selectedProvider: string;
}

export interface VoiceEngineConfig {
  chat: ChatConfig;
  scriptEngine: ScriptEngineSettings;
  scriptProviders: ScriptProviderConfig[];
  ttsEngine: TtsEngineSettings;
  providers: TtsProviderConfig[];
  roles: RoleVoiceConfig[];
}

export interface SynthesizedSegment {
  job: VoiceJob;
  audioUrl: string;
  contentType: string;
}

export interface NovelAnalysisResult {
  segments: ScriptSegment[];
  roles: RoleVoiceConfig[];
}
