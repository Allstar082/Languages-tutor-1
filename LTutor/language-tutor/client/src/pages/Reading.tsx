import { useState } from 'react';
import { api, ApiRequestError } from '../services/api';
import Card from '../components/Card';

interface ReadingPassage {
  title: string;
  passage: string;
  questions: { question: string; answer: string }[];
}

export default function Reading() {
  const [passage, setPassage] = useState<ReadingPassage | null>(null);
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    setRevealed({});
    try {
      setPassage(await api.post<ReadingPassage>('/reading/generate'));
    } catch (e) {
      setError((e as ApiRequestError).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">📖 Reading</h1>
      <button className="btn-primary text-sm" onClick={generate} disabled={loading}>
        {loading ? 'Generating…' : passage ? 'Generate another passage' : 'Generate a passage'}
      </button>
      {error && <div className="text-red-600 text-sm">{error}</div>}

      {passage && (
        <Card title={passage.title}>
          <p className="leading-relaxed whitespace-pre-wrap mb-6">{passage.passage}</p>
          <div className="space-y-3">
            {passage.questions.map((q, i) => (
              <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                <div className="text-sm font-medium">{q.question}</div>
                {revealed[i] ? (
                  <div className="text-sm text-brand-600 dark:text-brand-400 mt-1">{q.answer}</div>
                ) : (
                  <button className="text-xs text-slate-400 underline mt-1" onClick={() => setRevealed((r) => ({ ...r, [i]: true }))}>
                    Reveal answer
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
