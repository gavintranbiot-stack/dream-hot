import {
  Bot,
  Braces,
  Cable,
  BookOpen,
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
import { parseScript } from '../shared/scriptParser';
import { estimateSynthesisUsage } from '../shared/synthesisUsage';
import type {
  ChatConfig,
  NovelAnalysisResult,
  RoleVoiceConfig,
  ScriptEngineSettings,
  ScriptSegment,
  ScriptProviderConfig,
  SynthesizedSegment,
  TtsEngineSettings,
  TtsProviderConfig,
  VoiceEngineConfig
} from '../shared/types';

const sampleScript = `凌晨一点四十七分，顾行推开观测站的金属门时，山顶的风正贴着地面掠过。远处的射电天线一座座立在夜色里，像沉默的白色巨人。

值班员沈禾从控制台前抬起头：“你就是顾博士？”

“是我。”顾行摘下手套，声音有些发紧，“我申请过一次临时观测。我要看宇宙微波背景辐射。”

沈禾愣了一下：“现在？这个时段的窗口很短，而且数据噪声很重。”

“我知道。”顾行走到主屏幕前，“只要能看到实时曲线就行。”

老工程师陆岑从设备间出来，手里还拿着半杯冷掉的咖啡。“年轻人，你大半夜跑到这里，不会只是为了看一条几乎不动的背景曲线吧？”

顾行没有回答。他从口袋里取出一张纸，上面写满了密密麻麻的数字。沈禾看了一眼，忽然皱起眉：“这些是时间点？”

“倒计时。”顾行说。

控制室安静下来，只剩机柜里的风扇低声转动。陆岑把咖啡放下，走到另一台终端前：“接入三号天线阵列，过滤本地干扰，保留背景辐射主频段。”

沈禾敲下指令。几秒钟后，屏幕上出现了一条近乎平直的蓝色曲线。

“这就是你要看的东西。”她说，“宇宙背景辐射，正常得不能再正常。”

顾行盯着屏幕右下角的时间。倒计时还剩十秒。

九。八。七。

陆岑忽然直起身：“等等，基线在抖。”

沈禾迅速放大曲线：“不可能，这个幅度太明显了。”

六。五。四。

蓝色曲线开始有节奏地起伏，像某种巨大而遥远的灯光正在黑暗中一明一灭。整个控制室被屏幕映成幽蓝色。

顾行低声说：“它开始了。”

沈禾的手停在键盘上：“这不是设备误差。三号阵列、七号阵列、十一号阵列都观测到了同样的变化。”

陆岑的脸色变了：“如果这些数据是真的，那就不是某个方向的信号，而是整个天空背景都在同步变化。”

顾行闭了闭眼：“也就是说，不是某颗星在闪。”

沈禾看向他：“那是什么？”

顾行没有立刻回答。窗外，天线阵列缓慢转动，指向更深的夜空。许久之后，他才说：“是宇宙本身。”`;

export function App() {
  const [chat, setChat] = useState<ChatConfig>({ baseUrl: '', apiKey: '', model: '' });
  const [scriptEngine, setScriptEngine] = useState<ScriptEngineSettings>({
    selectedProvider: 'minimax'
  });
  const [scriptProviders, setScriptProviders] = useState<ScriptProviderConfig[]>([]);
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
  const activeScriptProviderIndex = useMemo(
    () => scriptProviders.findIndex((provider) => provider.id === scriptEngine.selectedProvider),
    [scriptProviders, scriptEngine.selectedProvider]
  );
  const activeScriptProvider =
    activeScriptProviderIndex >= 0 ? scriptProviders[activeScriptProviderIndex] : undefined;

  async function loadConfig() {
    const response = await fetch('/api/config');
    const config = (await response.json()) as VoiceEngineConfig;
    setChat(config.chat);
    setScriptEngine(config.scriptEngine);
    setScriptProviders(config.scriptProviders);
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
        body: JSON.stringify({
          prompt: ideaPrompt,
          roles,
          chat,
          scriptEngine,
          scriptProvider: activeScriptProvider,
          scriptProviders
        })
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

  async function analyzeNovelWithMiniMax() {
    setIsBusy(true);
    try {
      const miniMaxProvider =
        (activeScriptProvider?.id === 'minimax' ? activeScriptProvider : undefined) ??
        scriptProviders.find((provider) => provider.id === 'minimax');

      const response = await fetch('/api/analyze-novel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          novel: script,
          scriptEngine,
          scriptProvider: miniMaxProvider,
          scriptProviders: scriptProviders.length > 0 ? scriptProviders : undefined
        })
      });
      const payload = (await response.json()) as NovelAnalysisResult & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Novel analysis failed');

      setRoles(payload.roles);
      setSegments(payload.segments);
      setScript(formatSegmentsAsScript(payload.segments, payload.roles));
      setTtsEngine({ selectedProvider: 'minimax' });
      setStatus(`Analyzed ${payload.segments.length} novel segments`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Novel analysis failed');
    } finally {
      setIsBusy(false);
    }
  }

  async function synthesize() {
    setIsBusy(true);
    try {
      const plannedSegments = segments.length > 0 ? segments : parseScript(script);
      const usage = estimateSynthesisUsage(plannedSegments);
      const confirmUsage = confirmMiniMaxSynthesis(activeProvider, usage);
      if (confirmUsage === false) {
        setStatus(`Canceled synthesis for ${usage.characters} MiniMax characters`);
        return;
      }

      const response = await fetch('/api/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script,
          segments: plannedSegments.length > 0 ? plannedSegments : undefined,
          roles,
          providers,
          ttsEngine,
          confirmUsage
        })
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
        voice: defaultVoiceForProvider(ttsEngine.selectedProvider),
        instructions: ''
      }
    ]);
  }

  function updateScript(value: string) {
    setScript(value);
    setSegments([]);
    setAudioSegments([]);
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

  function updateScriptProvider(index: number, patch: Partial<ScriptProviderConfig>) {
    setScriptProviders((current) =>
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
          <p>Multi-role script generation and TTS orchestration for MiniMax, OpenWebUI, Qwen3-TTS, and OpenAI TTS.</p>
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
          <label className="field">
            <span>LLM Provider</span>
            <select
              value={scriptEngine.selectedProvider}
              onChange={(event) => setScriptEngine({ selectedProvider: event.target.value })}
              aria-label="Script Generator Provider"
            >
              {scriptProviders.map((provider) => (
                <option value={provider.id} key={provider.id}>
                  {provider.label}
                </option>
              ))}
            </select>
          </label>
          {activeScriptProvider && (
            <div className="provider-row">
              <div className="provider-head">
                <strong>{activeScriptProvider.label}</strong>
                <code>{activeScriptProvider.id}</code>
              </div>
              <Field
                label="Base URL"
                value={activeScriptProvider.baseUrl}
                placeholder="https://api.minimaxi.com/v1"
                onChange={(value) => updateScriptProvider(activeScriptProviderIndex, { baseUrl: value })}
              />
              <Field
                label="Model"
                value={activeScriptProvider.model ?? ''}
                placeholder="MiniMax-M2.7"
                onChange={(value) => updateScriptProvider(activeScriptProviderIndex, { model: value })}
              />
              <Field
                label="API Key"
                value={activeScriptProvider.apiKey ?? ''}
                placeholder="optional"
                type="password"
                onChange={(value) => updateScriptProvider(activeScriptProviderIndex, { apiKey: value })}
              />
            </div>
          )}
        </aside>

        <section className="workspace">
          <div className="toolbar">
            <button onClick={parseCurrentScript} disabled={isBusy}>
              <Braces size={17} />
              Parse
            </button>
            <button onClick={analyzeNovelWithMiniMax} disabled={isBusy}>
              <BookOpen size={17} />
              Analyze Novel
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
              <textarea value={script} onChange={(event) => updateScript(event.target.value)} />
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
                Generate Script
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

function formatSegmentsAsScript(segments: ScriptSegment[], roles: RoleVoiceConfig[]) {
  const displayNames = new Map(roles.map((role) => [role.role, role.displayName]));
  return segments
    .map((segment) => `${displayNames.get(segment.role) ?? segment.role}：${segment.text}`)
    .join('\n');
}

function defaultVoiceForProvider(providerId: string): string {
  if (providerId === 'minimax') return 'female-shaonv';
  if (providerId === 'openai') return 'alloy';
  return 'Vivian';
}

function confirmMiniMaxSynthesis(
  provider: TtsProviderConfig | undefined,
  usage: { segments: number; characters: number }
): boolean | undefined {
  if (provider?.type !== 'minimax' || usage.characters === 0) {
    return undefined;
  }

  return window.confirm(
    [
      `MiniMax Speech 2.8 will synthesize ${usage.characters} characters across ${usage.segments} clips.`,
      'Token Plan Plus includes 4,000 Speech 2.8 characters per day.',
      'Continue and consume TTS quota?'
    ].join('\n')
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
