# Dream Hot Voice Engine

Configurable multi-role TTS web app for OpenWebUI/OpenAI-compatible chat, Qwen3-TTS, and OpenAI TTS.

## What It Does

- Parses scripts like `小雨：你终于来了。` into `{ role, text }` segments.
- Matches script role names by either role id or display name, so `小雨：...` can use the configured `xiaoyu` voice.
- Splits TTS into two settings layers: one active engine, plus per-conversation role voices.
- Maps each conversation role to a configurable voice and delivery instructions.
- Generates one audio clip per segment, then plays the clips as an ordered queue.
- Supports:
  - Local mock WAV output for no-key testing.
  - Qwen3-TTS through an OpenAI-compatible `/v1/audio/speech` endpoint.
  - OpenAI TTS through the official `/v1/audio/speech` endpoint.
  - OpenWebUI or any OpenAI-compatible chat endpoint for script generation.

## Run Locally

```bash
npm install
npm run dev
```

Open:

- Web UI: `http://localhost:5173`
- API: `http://localhost:8787`

The default active TTS engine is `mock`, so the app works before you configure real TTS.

## Qwen3-TTS Provider

Run Qwen3-TTS behind an OpenAI-compatible endpoint, for example with vLLM-Omni:

```bash
vllm serve Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice \
  --deploy-config vllm_omni/deploy/qwen3_tts.yaml \
  --omni \
  --port 8091 \
  --trust-remote-code \
  --enforce-eager
```

Then set the Qwen provider Base URL to:

```text
http://localhost:8091/v1
```

Set `Active TTS Engine` to `Qwen3-TTS` in the web UI.

Common built-in Qwen voices include `Vivian`, `Serena`, `Uncle_Fu`, `Dylan`, `Eric`, `Ryan`, `Aiden`, `Ono_Anna`, and `Sohee`.

## OpenAI TTS Provider

Create `.env` from `.env.example` and set:

```bash
OPENAI_API_KEY=sk-...
OPENAI_TTS_MODEL=gpt-4o-mini-tts
```

OpenAI built-in voices include `alloy`, `ash`, `ballad`, `coral`, `echo`, `fable`, `nova`, `onyx`, `sage`, `shimmer`, `verse`, `marin`, and `cedar`.

Set `Active TTS Engine` to `OpenAI TTS` in the web UI.

## Configuration Layers

Engine settings are global for the current synthesis run:

- `ttsEngine.selectedProvider`: which TTS engine to use, such as `mock`, `qwen`, or `openai`.
- `providers`: connection details for each engine, such as Base URL, model, API key, and response format.

Conversation voice settings are scoped to the current script or dialogue:

- `roles`: character role id, display name, voice, and speaking instructions.
- Role entries do not choose the engine. They only describe character voices inside the current conversation.

## OpenWebUI / Chat Endpoint

The chat generator expects an OpenAI-compatible chat completions endpoint. For OpenWebUI, use the base URL that exposes chat completions, commonly:

```text
http://localhost:3000/api
```

Set a model name that your OpenWebUI instance exposes.

## Script Formats

Plain role lines:

```text
旁白：夜色很深。
小雨：你终于来了。
阿泽：我一直都在。
```

Bracket tags:

```text
[narrator] The hallway lights flickered.
[xiaoyu] You finally came.
```

JSON:

```json
[
  { "role": "narrator", "text": "夜色很深。", "emotion": "calm" },
  { "role": "xiaoyu", "text": "你终于来了。", "emotion": "surprised" }
]
```

## Verification

```bash
npm test
npm run typecheck
npm run build
```
