import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiRequestError } from '../services/api';
import { DashboardData } from '../types';
import Card from '../components/Card';
import ProgressBar from '../components/ProgressBar';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);

  const load = () => {
    api.get<DashboardData>('/progress').then(setData).catch((e: ApiRequestError) => setError(e.message));
  };

  useEffect(load, []);

  const generatePlan = async () => {
    setGeneratingPlan(true);
    try {
      await api.post('/progress/plan/generate');
      load();
    } catch (e) {
      setError((e as ApiRequestError).message);
    } finally {
      setGeneratingPlan(false);
    }
  };

  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!data) return <div className="p-6 text-slate-400">Loading…</div>;

  const overall = Math.round((data.skills.vocabulary + data.skills.grammar + data.skills.conversation + data.skills.listening) / 4);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{greeting()}, {data.profile.name} 👋</h1>
        <div className="mt-1 flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
          <span className="uppercase font-semibold tracking-wide">{data.profile.target_language}</span>
          <span>{data.profile.cefr_level}</span>
          <span>🔥 {data.streak} day streak</span>
        </div>
      </div>

      <Card title="Today's Progress">
        <ProgressBar label="Overall" value={overall} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <ProgressBar label="Vocabulary" value={data.skills.vocabulary} />
          <ProgressBar label="Grammar" value={data.skills.grammar} />
          <ProgressBar label="Conversation" value={data.skills.conversation} />
          <ProgressBar label="Listening" value={data.skills.listening} />
        </div>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        <Card title="Today's Plan">
          {data.todayPlan ? (
            <ul className="space-y-2 text-sm">
              {data.todayPlan.plan_json.map((item, i) => (
                <li key={i} className="flex justify-between">
                  <span>{item.label}</span>
                  <span className="text-slate-400">{item.minutes} min</span>
                </li>
              ))}
              {data.todayPlan.focus_json.length > 0 && (
                <li className="pt-2 border-t border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  Focus: {data.todayPlan.focus_json.join(', ')}
                </li>
              )}
            </ul>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">No plan generated for today yet.</p>
              <button className="btn-primary text-sm" onClick={generatePlan} disabled={generatingPlan}>
                {generatingPlan ? 'Generating…' : 'Generate today\'s plan'}
              </button>
            </div>
          )}
        </Card>

        <Card title="Recommended Activity">
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
            Jump into a voice conversation — it's the fastest way to build fluency.
          </p>
          <Link to="/conversation" className="btn-primary text-sm">🎙️ Start Conversation</Link>
        </Card>

        <Card title="Recent Mistakes">
          {data.recentMistakes.length === 0 ? (
            <p className="text-sm text-slate-400">None yet — start a conversation to get feedback.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.recentMistakes.map((m) => (
                <li key={m.id} className="flex justify-between gap-2">
                  <span className="truncate">{m.category}</span>
                  <span className="text-xs text-slate-400 shrink-0">{m.frequency}× · {m.status.replace('_', ' ')}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card title="Vocabulary">
          <div className="text-3xl font-bold">{data.vocabularyLearned}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">words tracked</div>
        </Card>
        <Card title="Conversations">
          <div className="text-3xl font-bold">{data.conversationCount}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">sessions completed</div>
        </Card>
        <Card title="Exercise Accuracy">
          <div className="text-3xl font-bold">{data.exerciseAccuracy}%</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">{data.exercisesCompleted} completed</div>
        </Card>
      </div>
    </div>
  );
}
