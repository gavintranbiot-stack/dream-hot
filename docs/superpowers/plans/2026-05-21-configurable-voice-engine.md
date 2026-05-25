# Configurable Voice Engine Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan in this session. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone web app that turns multi-role script text into configurable TTS jobs and can call Qwen/OpenAI-compatible and OpenAI TTS providers.

**Architecture:** A Vite React client provides global engine settings, per-conversation role/voice configuration, script editor, JSON preview, and audio playback queue. An Express server exposes provider discovery, script parsing, and synthesis endpoints, with provider adapters behind a shared interface. Shared TypeScript modules hold the engine, role, segment, and job types and parsing logic so tests cover the core behavior.

**Tech Stack:** TypeScript, React, Vite, Express, Vitest, Zod, lucide-react.

---

## File Structure

- `src/shared/types.ts`: Shared provider, role, segment, and synthesis job types.
- `src/shared/scriptParser.ts`: Parses script text and JSON into normalized role segments.
- `src/shared/scriptParser.test.ts`: Tests script parsing behavior.
- `src/server/synthesis/voiceJobs.ts`: Maps parsed segments and the selected engine to synthesis jobs.
- `src/server/synthesis/voiceJobs.test.ts`: Tests role-to-voice job construction.
- `src/server/providers/openaiCompatible.ts`: Calls `/v1/audio/speech` for Qwen/OpenAI-compatible TTS.
- `src/server/providers/openai.ts`: Calls OpenAI TTS with official request shape.
- `src/server/providers/mock.ts`: Produces tiny WAV placeholders for local UI testing.
- `src/server/audioStore.ts`: Keeps generated audio buffers in memory and serves them by id.
- `src/server/index.ts`: Express API server and Vite dev integration target.
- `src/client/App.tsx`: Main web UI.
- `src/client/main.tsx`: React entrypoint.
- `src/client/styles.css`: App styles.
- `README.md`, `.env.example`, `voice-engine.config.example.json`: Setup and configuration docs.

## Task 1: Project Scaffold

- [ ] Create package/config files.
- [ ] Install dependencies.
- [ ] Add scripts for dev, test, typecheck, and build.

## Task 2: Shared Parsing

- [ ] Write failing tests for `parseScript`.
- [ ] Implement parser for `Role: text`, `Role：text`, bracket tags, and JSON segment arrays.
- [ ] Run tests and keep them green.

## Task 3: Voice Job Construction

- [ ] Write failing tests for fallback role/voice selection and selected engine routing.
- [ ] Implement `buildVoiceJobs`.
- [ ] Run tests and keep them green.

## Task 4: Server Providers and API

- [ ] Implement mock, OpenAI-compatible, and OpenAI provider adapters.
- [ ] Add `GET /api/config`, `POST /api/parse`, `POST /api/synthesize`, and `GET /api/audio/:id`.
- [ ] Validate inputs with Zod and return explicit errors.

## Task 5: Web UI

- [ ] Build configuration forms for chat endpoint, active TTS engine, and provider connection details.
- [ ] Build per-conversation role table with voice/instruction fields.
- [ ] Build script editor, parse preview, synthesize action, and queued playback.

## Task 6: Verification

- [ ] Run `npm test`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
- [ ] Start the dev server and provide the local URL.
