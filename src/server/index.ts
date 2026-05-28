import cors from 'cors';
import express from 'express';
import { z } from 'zod';
import { getAudio, saveAudio } from './audioStore';
import { generateScriptFromChat } from './chat';
import { defaultConfig } from './config';
import { analyzeNovelWithMiniMax } from './novel/minimaxAnalyzer';
import { getTtsProvider } from './providers';
import { buildVoiceJobs } from './synthesis/voiceJobs';
import { parseScript } from '../shared/scriptParser';
import { estimateSynthesisUsage } from '../shared/synthesisUsage';
import type {
  RoleVoiceConfig,
  ScriptEngineSettings,
  ScriptProviderConfig,
  TtsEngineSettings,
  TtsProviderConfig,
  VoiceEngineConfig
} from '../shared/types';

const app = express();
const port = Number(process.env.PORT ?? 8787);

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_request, response) => {
  response.json({ ok: true });
});

app.get('/api/config', (_request, response) => {
  response.json(defaultConfig);
});

app.post('/api/parse', (request, response) => {
  const body = parseRequestSchema.parse(request.body);
  response.json({ segments: parseScript(body.script) });
});

app.post('/api/chat-script', async (request, response, next) => {
  try {
    const body = chatScriptRequestSchema.parse(request.body);
    const scriptProviders = body.scriptProviders ?? defaultConfig.scriptProviders;
    const selectedScriptProvider =
      body.scriptEngine?.selectedProvider ?? defaultConfig.scriptEngine.selectedProvider;
    const scriptProvider =
      body.scriptProvider ?? scriptProviders.find((provider) => provider.id === selectedScriptProvider);
    const result = await generateScriptFromChat(
      body.prompt,
      body.roles ?? defaultConfig.roles,
      scriptProvider ?? body.chat ?? defaultConfig.chat
    );
    response.json(result);
  } catch (error) {
    next(error);
  }
});

app.post('/api/analyze-novel', async (request, response, next) => {
  try {
    const body = analyzeNovelRequestSchema.parse(request.body);
    const scriptProviders =
      body.scriptProviders && body.scriptProviders.length > 0
        ? body.scriptProviders
        : defaultConfig.scriptProviders;
    const ttsProviders =
      body.providers && body.providers.length > 0 ? body.providers : defaultConfig.providers;
    const provider =
      (body.scriptProvider?.id === 'minimax' ? body.scriptProvider : undefined) ??
      scriptProviders.find((item) => item.id === 'minimax') ??
      body.provider ??
      ttsProviders.find((item) => item.id === 'minimax');
    if (!provider) {
      throw new Error('MiniMax provider is not configured.');
    }
    const result = await analyzeNovelWithMiniMax(body.novel, provider);
    response.json(result);
  } catch (error) {
    next(error);
  }
});

app.post('/api/synthesize', async (request, response, next) => {
  try {
    const body = synthesizeRequestSchema.parse(request.body);
    const roles = body.roles ?? defaultConfig.roles;
    const providers = body.providers ?? defaultConfig.providers;
    const selectedProvider =
      body.ttsEngine?.selectedProvider ?? defaultConfig.ttsEngine.selectedProvider;
    const segments = body.segments ?? parseScript(body.script ?? '');
    const jobs = buildVoiceJobs(segments, roles, selectedProvider);
    const selectedProviderConfig = providers.find((provider) => provider.id === selectedProvider);
    if (!selectedProviderConfig) {
      throw new Error(`No TTS provider configured for "${selectedProvider}".`);
    }

    const usage = estimateSynthesisUsage(jobs);
    const miniMaxConfirmChars = miniMaxTtsConfirmChars();
    if (
      selectedProviderConfig.type === 'minimax' &&
      usage.characters >= miniMaxConfirmChars &&
      !body.confirmUsage
    ) {
      response.status(409).json({
        error: `MiniMax synthesis would send ${usage.characters} characters across ${usage.segments} clips. Confirm before consuming TTS quota.`,
        confirmationRequired: true,
        usage
      });
      return;
    }

    const synthesized = [];
    for (const job of jobs) {
      const providerConfig = providers.find((provider) => provider.id === job.provider);
      if (!providerConfig) {
        throw new Error(`No TTS provider configured for "${job.provider}".`);
      }

      const provider = getTtsProvider(providerConfig);
      const result = await provider.synthesize(job, providerConfig);
      const audioId = saveAudio(result.audio, result.contentType);
      synthesized.push({
        job,
        audioUrl: `/api/audio/${audioId}`,
        contentType: result.contentType
      });
    }

    response.json({ segments: synthesized });
  } catch (error) {
    next(error);
  }
});

app.get('/api/audio/:id', (request, response) => {
  const record = getAudio(request.params.id);
  if (!record) {
    response.status(404).json({ error: 'Audio not found or expired.' });
    return;
  }

  response.type(record.contentType);
  response.send(record.buffer);
});

app.use(
  (
    error: unknown,
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction
  ) => {
    if (error instanceof z.ZodError) {
      response.status(400).json({ error: 'Invalid request.', details: error.flatten() });
      return;
    }

    response.status(500).json({
      error: error instanceof Error ? error.message : 'Unexpected server error.'
    });
  }
);

app.listen(port, () => {
  console.log(`Voice engine API listening on http://localhost:${port}`);
});

const roleVoiceConfigSchema = z.object({
  role: z.string().min(1),
  displayName: z.string().min(1),
  voice: z.string().min(1),
  instructions: z.string().optional()
}) satisfies z.ZodType<RoleVoiceConfig>;

const ttsEngineSchema = z.object({
  selectedProvider: z.string().min(1)
}) satisfies z.ZodType<TtsEngineSettings>;

const providerSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['mock', 'openai', 'openai-compatible', 'minimax']),
  label: z.string().min(1),
  baseUrl: z.string().optional(),
  apiKey: z.string().optional(),
  model: z.string().optional(),
  responseFormat: z.enum(['mp3', 'opus', 'aac', 'flac', 'wav', 'pcm'])
}) satisfies z.ZodType<TtsProviderConfig>;

const segmentSchema = z.object({
  role: z.string().min(1),
  text: z.string().min(1),
  emotion: z.string().optional()
});

const parseRequestSchema = z.object({
  script: z.string()
});

const chatConfigSchema = z.object({
  baseUrl: z.string().min(1),
  apiKey: z.string().optional(),
  model: z.string().optional()
});

const scriptEngineSchema = z.object({
  selectedProvider: z.string().min(1)
}) satisfies z.ZodType<ScriptEngineSettings>;

const scriptProviderSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['openai-compatible', 'minimax']),
  label: z.string().min(1),
  baseUrl: z.string().min(1),
  apiKey: z.string().optional(),
  model: z.string().optional()
}) satisfies z.ZodType<ScriptProviderConfig>;

const chatScriptRequestSchema = z.object({
  prompt: z.string().min(1),
  roles: z.array(roleVoiceConfigSchema).optional(),
  chat: chatConfigSchema.optional(),
  scriptEngine: scriptEngineSchema.optional(),
  scriptProvider: scriptProviderSchema.optional(),
  scriptProviders: z.array(scriptProviderSchema).optional()
});

const analyzeNovelRequestSchema = z.object({
  novel: z.string().min(1),
  provider: providerSchema.optional(),
  providers: z.array(providerSchema).optional(),
  scriptEngine: scriptEngineSchema.optional(),
  scriptProvider: scriptProviderSchema.optional(),
  scriptProviders: z.array(scriptProviderSchema).optional()
});

const synthesizeRequestSchema = z.object({
  script: z.string().optional(),
  segments: z.array(segmentSchema).optional(),
  roles: z.array(roleVoiceConfigSchema).optional(),
  ttsEngine: ttsEngineSchema.optional(),
  providers: z.array(providerSchema).optional(),
  confirmUsage: z.boolean().optional()
}) satisfies z.ZodType<Partial<VoiceEngineConfig> & { script?: string; confirmUsage?: boolean }>;

function miniMaxTtsConfirmChars(): number {
  const value = Number(process.env.MINIMAX_TTS_CONFIRM_CHARS ?? 1000);
  return Number.isFinite(value) && value > 0 ? value : 1000;
}
