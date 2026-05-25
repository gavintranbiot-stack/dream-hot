import type { TtsProviderConfig, VoiceJob } from '../../shared/types';

export interface SynthesisResult {
  audio: Buffer;
  contentType: string;
}

export interface TtsProvider {
  synthesize(job: VoiceJob, provider: TtsProviderConfig): Promise<SynthesisResult>;
}
