import { useState } from 'react';
import { api, ApiRequestError } from '../services/api';
import Card from '../components/Card';

const TYPES = [
  { value: 'multiple_choice', label: 'Multiple choice' },
  { value: 'fill_blank', label: 'Fill in the blank' },
  { value: 'translation', label: 'Translation' },
  { value: 'ordering', label: 'Sentence ordering' },
  { value: 'correct_sentence', label: 'Correct the sentence' },
  { value: 'writing', label: 'Short writing' },
];

interface ExerciseData {
  prompt: string;
  options?: string[];
  answer: string;
  explanation: string;
}

export default function Exercises() {
  const [type, setType] = useState(TYPES[0].value);
  const [exercise, setExercise] = useState<{ id: number; data: ExerciseData } | null>(null);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<{ correct: boolean; correctAnswer: string; explanation: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setAnswer('');
    try {
      const ex = await api.post<{ id: number; data: ExerciseData }>('/exercises/generate', { type });
      setExercise(ex);
    } catch (e) {
      setError((e as ApiRequestError).message);
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (!exercise) return;
    const res = await api.post<{ correct: boolean; correctAnswer: string; explanation: string }>(
      `/exercises/${exercise.id}/submit`, { answer }
    );
    setResult(res);
  };

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">📝 Exercises</h1>

      <Card>
        <div className="flex flex-wrap gap-2 mb-4">
          {TYPES.map((t) => (
            <button key={t.value} onClick={() => setType(t.value)}
              className={`px-3 py-1.5 rounded-full text-sm border ${type === t.value ? 'bg-brand-500 text-white border-brand-500' : 'border-slate-300 dark:border-slate-700'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <button className="btn-primary text-sm" onClick={generate} disabled={loading}>
          {loading ? 'Generating…' : 'Generate exercise'}
        </button>
      </Card>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      {exercise && (
        <Card title="Your exercise">
          <p className="font-medium mb-4">{exercise.data.prompt}</p>

          {exercise.data.options ? (
            <div className="space-y-2">
              {exercise.data.options.map((opt) => (
                <button key={opt} onClick={() => setAnswer(opt)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm ${answer === opt ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-slate-300 dark:border-slate-700'}`}>
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Your answer"
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-4 py-2.5 text-sm" />
          )}

          <button className="btn-primary text-sm mt-4" onClick={submit} disabled={!answer}>Submit</button>

          {result && (
            <div className={`mt-4 rounded-xl p-4 text-sm ${result.correct ? 'bg-green-50 dark:bg-green-950/40 text-green-800 dark:text-green-300' : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300'}`}>
              <div className="font-semibold mb-1">{result.correct ? '✅ Correct!' : `❌ Not quite. Correct answer: ${result.correctAnswer}`}</div>
              <div>{result.explanation}</div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
