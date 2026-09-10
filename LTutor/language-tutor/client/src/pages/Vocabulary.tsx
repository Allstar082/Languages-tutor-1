import { useEffect, useState } from 'react';
import { api, ApiRequestError } from '../services/api';
import { VocabWord } from '../types';
import Card from '../components/Card';

export default function Vocabulary() {
  const [words, setWords] = useState<VocabWord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'learning' | 'known' | 'difficult'>('all');
  const [newWord, setNewWord] = useState('');
  const [newTranslation, setNewTranslation] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = () => { api.get<VocabWord[]>('/vocabulary').then(setWords).catch((e: ApiRequestError) => setError(e.message)); };
  useEffect(load, []);

  const addWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim() || !newTranslation.trim()) return;
    try {
      await api.post('/vocabulary', { word: newWord, translation: newTranslation });
      setNewWord(''); setNewTranslation('');
      load();
    } catch (e) {
      setError((e as ApiRequestError).message);
    }
  };

  const setStatus = async (id: number, status: string) => {
    await api.put(`/vocabulary/${id}`, { status });
    load();
  };

  const remove = async (id: number) => {
    await api.delete(`/vocabulary/${id}`);
    load();
  };

  const generateExample = async (id: number) => {
    setBusyId(id);
    try {
      await api.post(`/vocabulary/${id}/example`);
      load();
    } catch (e) {
      setError((e as ApiRequestError).message);
    } finally {
      setBusyId(null);
    }
  };

  const filtered = filter === 'all' ? words : words.filter((w) => w.status === filter);

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">📚 Vocabulary</h1>

      <Card title="Add a word">
        <form onSubmit={addWord} className="flex gap-2 flex-wrap">
          <input value={newWord} onChange={(e) => setNewWord(e.target.value)} placeholder="Word"
            className="flex-1 min-w-[140px] rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" />
          <input value={newTranslation} onChange={(e) => setNewTranslation(e.target.value)} placeholder="Translation"
            className="flex-1 min-w-[140px] rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" />
          <button type="submit" className="btn-primary text-sm">Add</button>
        </form>
      </Card>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <div className="flex gap-2">
        {(['all', 'learning', 'known', 'difficult'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-sm border ${filter === f ? 'bg-brand-500 text-white border-brand-500' : 'border-slate-300 dark:border-slate-700'}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {filtered.map((w) => (
          <div key={w.id} className="card p-4 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold text-lg">{w.word}{w.gender && <span className="text-xs text-slate-400 ml-2">({w.gender})</span>}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">{w.translation}{w.part_of_speech ? ` — ${w.part_of_speech}` : ''}</div>
              </div>
              <button onClick={() => remove(w.id)} className="text-slate-400 hover:text-red-500 text-sm">✕</button>
            </div>
            {w.example_sentence && <div className="text-sm italic text-slate-600 dark:text-slate-300">"{w.example_sentence}"</div>}
            <div className="flex gap-2 flex-wrap pt-1">
              <button onClick={() => setStatus(w.id, 'known')} className={`text-xs px-2 py-1 rounded-full border ${w.status === 'known' ? 'bg-green-500 text-white border-green-500' : 'border-slate-300 dark:border-slate-700'}`}>Known</button>
              <button onClick={() => setStatus(w.id, 'difficult')} className={`text-xs px-2 py-1 rounded-full border ${w.status === 'difficult' ? 'bg-red-500 text-white border-red-500' : 'border-slate-300 dark:border-slate-700'}`}>Difficult</button>
              <button onClick={() => setStatus(w.id, 'learning')} className={`text-xs px-2 py-1 rounded-full border ${w.status === 'learning' ? 'bg-brand-500 text-white border-brand-500' : 'border-slate-300 dark:border-slate-700'}`}>Learning</button>
              <button onClick={() => generateExample(w.id)} disabled={busyId === w.id} className="text-xs px-2 py-1 rounded-full border border-slate-300 dark:border-slate-700 ml-auto">
                {busyId === w.id ? 'Asking Claude…' : '✨ Ask Claude for example'}
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-slate-400">No words here yet.</p>}
      </div>
    </div>
  );
}
