import { useEffect, useRef, useState } from 'react';
import { api, ApiRequestError } from '../services/api';
import { ChatMessage, ConversationMode, Language, Profile } from '../types';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import MicButton, { ConversationUiState } from '../components/MicButton';
import MessageBubble from '../components/MessageBubble';

const MODES: { value: ConversationMode; label: string; hint: string }[] = [
  { value: 'free', label: 'Free Conversation', hint: 'Natural chat, light-touch corrections' },
  { value: 'teacher', label: 'Teacher Mode', hint: 'Corrections + score after every message' },
  { value: 'roleplay', label: 'Roleplay', hint: 'AI stays in character for a scenario' },
  { value: 'pronunciation', label: 'Pronunciation Practice', hint: 'Repeat sentences, get feedback' },
  { value: 'listening', label: 'Listening Practice', hint: 'AI speaks, you answer questions' },
];

const SCENARIOS = [
  'Restaurant', 'Airport', 'Hotel', 'University', 'Job interview', 'Shopping',
  'Doctor', 'Train station', 'Making friends', 'Renting an apartment', 'Government office', 'Italian university',
];

const RATES = [0.75, 1, 1.25, 1.5];

export default function Conversation() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [mode, setMode] = useState<ConversationMode>('free');
  const [scenario, setScenario] = useState<string>(SCENARIOS[0]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [uiState, setUiState] = useState<ConversationUiState>('ready');
  const [error, setError] = useState<string | null>(null);
  const [textMode, setTextMode] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const [sessionSummary, setSessionSummary] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get<Profile>('/profile').then(setProfile);
    api.get<Language[]>('/profile/languages').then(setLanguages);
  }, []);

  const langTag = languages.find((l) => l.code === profile?.target_language)?.voice_lang_tag || 'it-IT';

  const speech = useSpeechRecognition(langTag);
  const tts = useSpeechSynthesis(langTag);

  useEffect(() => {
    if (!speech.isSupported) setTextMode(true);
  }, [speech.isSupported]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (speech.state === 'listening') setUiState('listening');
    else if (speech.state === 'processing') setUiState('processing');
    else if (speech.state === 'error' && speech.error) setError(speech.error);
  }, [speech.state, speech.error]);

  useEffect(() => {
    if (tts.state === 'speaking') setUiState('speaking');
    else if (tts.state === 'idle' && uiState === 'speaking') setUiState('ready');
    else if (tts.state === 'error' && tts.error) setError(tts.error);
  }, [tts.state]);

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;
    if (!sessionStartedAt) setSessionStartedAt(Date.now());
    setError(null);
    setSessionSummary(null);
    setMessages((prev) => [...prev, { role: 'user', content }]);
    setUiState('thinking');
    try {
      const result = await api.post<{ conversationId: number; reply: string; correction: any }>('/chat', {
        conversationId,
        mode,
        scenario: mode === 'roleplay' ? scenario : undefined,
        message: content,
      });
      setConversationId(result.conversationId);
      setMessages((prev) => [...prev, { role: 'assistant', content: result.reply, correction: result.correction }]);
      if (!textMode) {
        tts.speak(result.reply);
      } else {
        setUiState('ready');
      }
    } catch (e) {
      setError((e as ApiRequestError).message);
      setUiState('error');
    }
  };

  const handleMicClick = () => {
    if (speech.state === 'listening') {
      speech.stop();
      return;
    }
    speech.start((finalText) => sendMessage(finalText));
  };

  const endSession = async () => {
    if (!conversationId || !sessionStartedAt) return;
    const durationSeconds = Math.round((Date.now() - sessionStartedAt) / 1000);
    try {
      const result = await api.post(`/conversations/${conversationId}/end`, { durationSeconds });
      await api.post('/progress/log', { minutes: Math.round(durationSeconds / 60) });
      setSessionSummary((result as any).summary);
      setConversationId(null);
      setSessionStartedAt(null);
      setMessages([]);
    } catch (e) {
      setError((e as ApiRequestError).message);
    }
  };

  if (!profile) return <div className="p-8 text-slate-400">Loading…</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto flex flex-col gap-6" style={{ minHeight: '100vh' }}>
      <div>
        <h1 className="text-2xl font-bold">🎧 {profile.target_language.toUpperCase()} Conversation</h1>
        <div className="flex flex-wrap gap-2 mt-4">
          {MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => setMode(m.value)}
              title={m.hint}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                mode === m.value
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-brand-400'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        {mode === 'roleplay' && (
          <select
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            className="mt-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
          >
            {SCENARIOS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      {!speech.isSupported && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          Your browser doesn't support voice input (Web Speech API). You're in <strong>text mode</strong> —
          try Chrome or Edge for the full voice experience. Text-to-speech for AI replies still works.
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {sessionSummary && (
        <div className="card p-5 space-y-2">
          <div className="font-semibold">SESSION COMPLETE</div>
          <div className="text-sm text-slate-600 dark:text-slate-300">Duration: {Math.round(sessionSummary.durationSeconds / 60)} min</div>
          <div className="text-sm text-slate-600 dark:text-slate-300">New vocabulary logged: {sessionSummary.newVocabCount}</div>
          {sessionSummary.mistakeCategories.length > 0 && (
            <div className="text-sm text-slate-600 dark:text-slate-300">Main mistakes: {sessionSummary.mistakeCategories.join(', ')}</div>
          )}
        </div>
      )}

      <div ref={scrollRef} className="card flex-1 min-h-[320px] max-h-[50vh] overflow-y-auto p-5 space-y-4">
        {messages.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-12">
            {mode === 'roleplay'
              ? `Say something to start the "${scenario}" roleplay.`
              : 'Start speaking, or type below, to begin.'}
          </p>
        ) : (
          messages.map((m, i) => <MessageBubble key={i} message={m} />)
        )}
        {speech.transcript && speech.state === 'listening' && (
          <div className="text-right text-sm text-slate-400 italic">{speech.transcript}…</div>
        )}
      </div>

      <div className="flex flex-col items-center gap-4 py-4">
        {!textMode && <MicButton uiState={uiState} onClick={handleMicClick} disabled={uiState === 'thinking'} />}

        {tts.isSupported && messages.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <button className="btn-secondary text-xs" onClick={() => (tts.state === 'speaking' ? tts.pause() : tts.resume())}>
              {tts.state === 'speaking' ? '⏸ Pause' : '▶️ Resume'}
            </button>
            <button className="btn-secondary text-xs" onClick={tts.stop}>⏹ Stop</button>
            <button className="btn-secondary text-xs" onClick={tts.replay}>🔁 Replay</button>
            <div className="flex items-center gap-1">
              {RATES.map((r) => (
                <button
                  key={r}
                  onClick={() => tts.changeRate(r)}
                  className={`px-2 py-1 rounded-md text-xs border ${tts.rate === r ? 'bg-brand-500 text-white border-brand-500' : 'border-slate-300 dark:border-slate-700'}`}
                >
                  {r}x
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button className="text-xs text-slate-400 underline" onClick={() => setTextMode((v) => !v)}>
            {textMode ? 'Switch to voice mode' : 'Switch to text mode'}
          </button>
          {conversationId && (
            <button className="text-xs text-slate-400 underline" onClick={endSession}>
              End session
            </button>
          )}
        </div>

        {textMode && (
          <form
            className="w-full flex gap-2"
            onSubmit={(e) => { e.preventDefault(); sendMessage(textInput); setTextInput(''); }}
          >
            <input
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={`Write in ${profile.target_language}...`}
              className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm"
            />
            <button type="submit" className="btn-primary" disabled={uiState === 'thinking'}>Send</button>
          </form>
        )}
      </div>
    </div>
  );
}
