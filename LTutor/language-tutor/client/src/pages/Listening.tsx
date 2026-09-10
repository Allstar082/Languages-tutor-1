import { useEffect, useState } from 'react';
import { api, ApiRequestError } from '../services/api';
import { Language, Profile } from '../types';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import Card from '../components/Card';
import MessageBubble from '../components/MessageBubble';

export default function Listening() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Profile>('/profile').then(setProfile);
    api.get<Language[]>('/profile/languages').then(setLanguages);
  }, []);

  const langTag = languages.find((l) => l.code === profile?.target_language)?.voice_lang_tag || 'it-IT';
  const tts = useSpeechSynthesis(langTag);

  const send = async (content: string) => {
    setLoading(true);
    setError(null);
    setMessages((prev) => (content === '(begin)' ? prev : [...prev, { role: 'user', content }]));
    try {
      const result = await api.post<{ conversationId: number; reply: string }>('/chat', {
        conversationId,
        mode: 'listening',
        message: content,
      });
      setConversationId(result.conversationId);
      setMessages((prev) => [...prev, { role: 'assistant', content: result.reply }]);
      tts.speak(result.reply);
    } catch (e) {
      setError((e as ApiRequestError).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">🎧 Listening Practice</h1>
      <Card>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          The AI will speak to you in {profile?.target_language.toUpperCase()} and ask comprehension
          questions. Listen, then answer below (difficulty adapts to your CEFR level).
        </p>
        {messages.length === 0 ? (
          <button className="btn-primary text-sm" onClick={() => send('(begin)')} disabled={loading}>
            {loading ? 'Starting…' : 'Start listening practice'}
          </button>
        ) : (
          <>
            <div className="space-y-3 mb-4 max-h-[40vh] overflow-y-auto">
              {messages.map((m, i) => <MessageBubble key={i} message={m} />)}
            </div>
            <div className="flex gap-2 mb-4">
              <button className="btn-secondary text-xs" onClick={tts.replay}>🔁 Replay audio</button>
              <button className="btn-secondary text-xs" onClick={tts.stop}>⏹ Stop</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); send(answer); setAnswer(''); }} className="flex gap-2">
              <input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Your answer"
                className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-4 py-2.5 text-sm" />
              <button type="submit" className="btn-primary text-sm" disabled={loading}>Send</button>
            </form>
          </>
        )}
        {error && <div className="text-red-600 text-sm mt-3">{error}</div>}
      </Card>
    </div>
  );
}
