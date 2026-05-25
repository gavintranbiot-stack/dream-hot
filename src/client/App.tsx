import {
  Bot,
  Braces,
  Cable,
  Loader2,
  Mic2,
  Play,
  Plus,
  Radio,
  Settings2,
  Trash2,
  Volume2,
  WandSparkles
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  ChatConfig,
  RoleVoiceConfig,
  ScriptSegment,
  SynthesizedSegment,
  TtsEngineSettings,
  TtsProviderConfig,
  VoiceEngineConfig
} from '../shared/types';

const sampleScript = `旁白：夜色很深，楼道里的灯忽明忽暗。
小雨：你终于来了。
阿泽：我一直都在，只是你没有回头。`;

export function App() {
  const [chat, setChat] = useState<ChatConfig>({ baseUrl: '', apiKey: '', model: '' });
  const [ttsEngine, setTtsEngine] = useState<TtsEngineSettings>({ selectedProvider: 'mock' });
  const [providers, setProviders] = useState<TtsProviderConfig[]>([]);
  const [roles, setRoles] = useState<RoleVoiceConfig[]>([]);
  const [script, setScript] = useState(sampleScript);
  const [ideaPrompt, setIdeaPrompt] = useState('写一段三人短剧，旁白、小雨、阿泽轮流说话。');
  const [segments, setSegments] = useState<ScriptSegment[]>([]);
  const [audioSegments, setAudioSegments] = useState<SynthesizedSegment[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [status, setStatus] = useState('Ready');
  const [isBusy, setIsBusy] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    void loadConfig();
  }, []);

  const activeProviderIndex = useMemo(
    () => providers.findIndex((provider) => provider.id === ttsEngine.selectedProvider),
    [providers, ttsEngine.selectedProvider]
  );
  const activeProvider = activeProviderIndex >= 0 ? providers[activeProviderIndex] : undefined;

  async function loadConfig() {
    const response = await fetch('/api/config');
    const config = (await response.json()) as VoiceEngineConfig;
    setChat(config.chat);
    setTtsEngine(config.ttsEngine);
    setProviders(config.providers);
    setRoles(config.roles);
    setStatus('Loaded default config');
  }

  async function parseCurrentScript() {
    setIsBusy(true);
    try {
      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script })
      });
      const payload = (await response.json()) as { segments: ScriptSegment[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Parse failed');
      setSegments(payload.segments);
      setStatus(`Parsed ${payload.segments.length} segments`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Parse failed');
    } finally {
      setIsBusy(false);
    }
  }

  async function generateScriptWithChat() {
    setIsBusy(true);
    try {
      const response = await fetch('/api/chat-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: ideaPrompt, roles, chat })
      });
      const payload = (await response.json()) as {
        content?: string;
        segments?: ScriptSegment[];
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? 'Chat generation failed');
      setScript(payload.content ?? '');
      setSegments(payload.segments ?? []);
      setStatus(`Generated ${payload.segments?.length ?? 0} role segments`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Chat generation failed');
    } finally {
      setIsBusy(false);
    }
  }

  async function synthesize() {
    setIsBusy(true);
    try {
      const response = await fetch('/api/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script, roles, providers, ttsEngine })
      });
      const payload = (await response.json()) as {
        segments?: SynthesizedSegment[];
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? 'Synthesis failed');
      setAudioSegments(payload.segments ?? []);
      setSegments((payload.segments ?? []).map((item) => ({ role: item.job.role, text: item.job.text })));
      setStatus(`Synthesized ${payload.segments?.length ?? 0} audio clips`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Synthesis failed');
    } finally {
      setIsBusy(false);
    }
  }

  function addRole() {
    setRoles((current) => [
      ...current,
      {
        role: `role_${current.length + 1}`,
        displayName: '新角色',
        voice: 'Vivian',
        instructions: ''
      }
    ]);
  }

  function updateRole(index: number, patch: Partial<RoleVoiceConfig>) {
    setRoles((current) =>
      current.map((role, roleIndex) => (roleIndex === index ? { ...role, ...patch } : role))
    );
  }

  function removeRole(index: number) {
    setRoles((current) => current.filter((_, roleIndex) => roleIndex !== index));
  }

  function updateProvider(index: number, patch: Partial<TtsProviderConfig>) {
    setProviders((current) =>
      current.map((provider, providerIndex) =>
        providerIndex === index ? { ...provider, ...patch } : provider
      )
    );
  }

  async function playQueue(startIndex = 0) {
    if (audioSegments.length === 0) return;

    const audio = audioRef.current ?? new Audio();
    audioRef.current = audio;

    for (let index = startIndex; index < audioSegments.length; index += 1) {
      setActiveIndex(index);
      audio.src = audioSegments[index].audioUrl;
      await audio.play();
      await new Promise<void>((resolve) => {
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
      });
    }

    setActiveIndex(null);
  }

  return (
    <main className="app-shell">
      <section className="topbar">
        <div>
          <h1>Dream Hot Voice Engine</h1>
          <p>Multi-role TTS orchestration for OpenWebUI, Qwen3-TTS, and OpenAI TTS.</p>
        </div>
        <div className="status-pill">
          {isBusy ? <Loader2 className="spin" size={16} /> : <Radio size={16} />}
          <span>{status}</span>
        </div>
      </section>

      <section className="layout">
        <aside className="sidebar">
          <PanelTitle icon={<Settings2 size={18} />} title="Engine Settings" />
          <label className="field">
            <span>Active TTS Engine</span>
            <select
              value={ttsEngine.selectedProvider}
              onChange={(event) => setTtsEngine({ selectedProvider: event.target.value })}
              aria-label="Active TTS Engine"
            >
              {providers.map((provider) => (
                <option value={provider.id} key={provider.id}>
                  {provider.label}
                </option>
              ))}
            </select>
          </label>

          {activeProvider && (
            <div className="provider-row">
              <div className="provider-head">
                <strong>{activeProvider.label}</strong>
                <code>{activeProvider.id}</code>
              </div>
              {activeProvider.type !== 'mock' && (
                <>
                  <Field
                    label="Base URL"
                    value={activeProvider.baseUrl ?? ''}
                    placeholder="http://localhost:8091/v1"
                    onChange={(value) => updateProvider(activeProviderIndex, { baseUrl: value })}
                  />
                  <Field
                    label="Model"
                    value={activeProvider.model ?? ''}
                    placeholder="model id"
                    onChange={(value) => updateProvider(activeProviderIndex, { model: value })}
                  />
                  <Field
                    label="API Key"
                    value={activeProvider.apiKey ?? ''}
                    placeholder="none"
                    type="password"
                    onChange={(value) => updateProvider(activeProviderIndex, { apiKey: value })}
                  />
                </>
              )}
            </div>
          )}

          <PanelTitle icon={<Cable size={18} />} title="Script Generator" />
          <Field
            label="Base URL"
            value={chat.baseUrl}
            placeholder="http://localhost:3000/api"
            onChange={(value) => setChat({ ...chat, baseUrl: value })}
          />
          <Field
            label="Model"
            value={chat.model ?? ''}
            placeholder="qwen3"
            onChange={(value) => setChat({ ...chat, model: value })}
          />
          <Field
            label="API Key"
            value={chat.apiKey ?? ''}
            placeholder="optional"
            type="password"
            onChange={(value) => setChat({ ...chat, apiKey: value })}
          />
        </aside>

        <section className="workspace">
          <div className="toolbar">
            <button onClick={parseCurrentScript} disabled={isBusy}>
              <Braces size={17} />
              Parse
            </button>
            <button className="primary" onClick={synthesize} disabled={isBusy}>
              <Volume2 size={17} />
              Synthesize
            </button>
            <button onClick={() => void playQueue()} disabled={audioSegments.length === 0}>
              <Play size={17} />
              Play Queue
            </button>
          </div>

          <div className="editor-grid">
            <section className="panel script-panel">
              <PanelTitle icon={<Bot size={18} />} title="Script" />
              <textarea value={script} onChange={(event) => setScript(event.target.value)} />
            </section>

            <section className="panel">
              <PanelTitle icon={<WandSparkles size={18} />} title="Generate With Chat" />
              <textarea
                className="prompt-box"
                value={ideaPrompt}
                onChange={(event) => setIdeaPrompt(event.target.value)}
              />
              <button onClick={generateScriptWithChat} disabled={isBusy}>
                <WandSparkles size={17} />
                Generate JSON Script
              </button>
            </section>
          </div>

          <section className="panel">
            <div className="section-head">
              <PanelTitle icon={<Mic2 size={18} />} title="Conversation Voice Settings" />
              <button className="icon-button" onClick={addRole} aria-label="Add role">
                <Plus size={17} />
              </button>
            </div>
            <div className="role-table">
              <div className="role-table-head">
                <span>Role ID</span>
                <span>Character</span>
                <span>Voice</span>
                <span>Style</span>
              </div>
              {roles.map((role, index) => (
                <div className="role-row" key={`${role.role}-${index}`}>
                  <input
                    value={role.role}
                    onChange={(event) => updateRole(index, { role: event.target.value })}
                    aria-label="Role id"
                  />
                  <input
                    value={role.displayName}
                    onChange={(event) => updateRole(index, { displayName: event.target.value })}
                    aria-label="Display name"
                  />
                  <input
                    value={role.voice}
                    onChange={(event) => updateRole(index, { voice: event.target.value })}
                    aria-label="Voice"
                  />
                  <input
                    value={role.instructions ?? ''}
                    onChange={(event) => updateRole(index, { instructions: event.target.value })}
                    aria-label="Instructions"
                  />
                  <button className="icon-button" onClick={() => removeRole(index)} aria-label="Remove role">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <div className="editor-grid">
            <section className="panel">
              <PanelTitle icon={<Braces size={18} />} title="Parsed Segments" />
              <pre>{JSON.stringify(segments, null, 2)}</pre>
            </section>

            <section className="panel">
              <PanelTitle icon={<Volume2 size={18} />} title="Audio Queue" />
              <div className="queue-list">
                {audioSegments.map((segment, index) => (
                  <button
                    className={activeIndex === index ? 'queue-item active' : 'queue-item'}
                    key={segment.audioUrl}
                    onClick={() => void playQueue(index)}
                  >
                    <span>{segment.job.displayName}</span>
                    <small>{segment.job.voice}</small>
                  </button>
                ))}
                {audioSegments.length === 0 && <p className="empty-state">No audio generated yet.</p>}
              </div>
            </section>
          </div>
        </section>
      </section>
    </main>
  );
}

function PanelTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="panel-title">
      {icon}
      <h2>{title}</h2>
    </div>
  );
}

function Field({
  label,
  value,
  placeholder,
  type = 'text',
  onChange
}: {
  label: string;
  value: string;
  placeholder?: string;
  type?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
