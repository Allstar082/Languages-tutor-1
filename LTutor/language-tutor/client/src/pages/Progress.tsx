import { useEffect, useState } from 'react';
import { api, ApiRequestError } from '../services/api';
import { DashboardData, Mistake } from '../types';
import Card from '../components/Card';
import ProgressBar from '../components/ProgressBar';

export default function ProgressPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<DashboardData>('/progress').then(setData).catch((e: ApiRequestError) => setError(e.message));
    api.get<Mistake[]>('/mistakes').then(setMistakes).catch(() => {});
  }, []);

  const markResolved = async (id: number) => {
    await api.put(`/mistakes/${id}`, { status: 'resolved' });
    setMistakes((prev) => prev.map((m) => (m.id === id ? { ...m, status: 'resolved' } : m)));
  };

  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!data) return <div className="p-8 text-slate-400">Loading…</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">📊 Progress</h1>

      <Card title="Skill Breakdown">
        <div className="space-y-4">
          <ProgressBar label="Vocabulary" value={data.skills.vocabulary} />
          <ProgressBar label="Grammar" value={data.skills.grammar} />
          <ProgressBar label="Conversation" value={data.skills.conversation} />
          <ProgressBar label="Listening" value={data.skills.listening} />
        </div>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        <Card title="Streak"><div className="text-3xl font-bold">🔥 {data.streak}</div><div className="text-sm text-slate-400">days</div></Card>
        <Card title="Conversations"><div className="text-3xl font-bold">{data.conversationCount}</div></Card>
        <Card title="Exercise accuracy"><div className="text-3xl font-bold">{data.exerciseAccuracy}%</div></Card>
      </div>

      <Card title="Mistake Tracker">
        {mistakes.length === 0 ? (
          <p className="text-sm text-slate-400">No mistakes tracked yet — start a conversation.</p>
        ) : (
          <div className="space-y-3">
            {mistakes.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                <div>
                  <div className="font-medium text-sm">{m.category}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{m.description}</div>
                  <div className="text-xs text-slate-400 mt-1">Frequency: {m.frequency} · Status: {m.status.replace('_', ' ')}</div>
                </div>
                {m.status !== 'resolved' && (
                  <button className="btn-secondary text-xs shrink-0" onClick={() => markResolved(m.id)}>Mark resolved</button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
