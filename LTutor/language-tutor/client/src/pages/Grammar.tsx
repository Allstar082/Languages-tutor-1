import { useEffect, useState } from 'react';
import { api, ApiRequestError } from '../services/api';
import { GrammarTopic } from '../types';
import Card from '../components/Card';

export default function Grammar() {
  const [grouped, setGrouped] = useState<Record<string, GrammarTopic[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [explaining, setExplaining] = useState<GrammarTopic | null>(null);
  const [explanation, setExplanation] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get<Record<string, GrammarTopic[]>>('/grammar').then(setGrouped).catch((e: ApiRequestError) => setError(e.message));
  }, []);

  const explain = async (topic: GrammarTopic) => {
    setExplaining(topic);
    setExplanation('');
    setLoading(true);
    try {
      const result = await api.post<{ explanation: string }>(`/grammar/${topic.id}/explain`);
      setExplanation(result.explanation);
    } catch (e) {
      setError((e as ApiRequestError).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">🧠 Grammar</h1>
      {error && <div className="text-red-600 text-sm">{error}</div>}

      {explaining && (
        <Card title={`${explaining.title} (${explaining.cefr_level})`}>
          {loading ? <p className="text-sm text-slate-400">Asking Claude…</p> : <p className="text-sm whitespace-pre-wrap">{explanation}</p>}
          <button className="btn-secondary text-xs mt-4" onClick={() => setExplaining(null)}>Close</button>
        </Card>
      )}

      {Object.entries(grouped).map(([level, topics]) => (
        <Card key={level} title={`CEFR ${level}`}>
          <div className="grid sm:grid-cols-2 gap-3">
            {topics.map((t) => (
              <button key={t.id} onClick={() => explain(t)} className="text-left rounded-xl border border-slate-200 dark:border-slate-800 p-3 hover:border-brand-400 transition-colors">
                <div className="font-medium">{t.title}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t.summary}</div>
              </button>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
