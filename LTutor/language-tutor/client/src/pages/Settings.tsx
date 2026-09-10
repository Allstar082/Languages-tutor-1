import { useEffect, useState } from 'react';
import { api, ApiRequestError } from '../services/api';
import { Language, Profile } from '../types';
import Card from '../components/Card';

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export default function Settings() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Profile>('/profile').then(setProfile);
    api.get<Language[]>('/profile/languages').then(setLanguages);
  }, []);

  const update = (field: keyof Profile, value: string | number) => {
    if (!profile) return;
    setProfile({ ...profile, [field]: value } as Profile);
    setSaved(false);
  };

  const save = async () => {
    if (!profile) return;
    try {
      await api.put('/profile', {
        name: profile.name,
        target_language: profile.target_language,
        cefr_level: profile.cefr_level,
        explanation_language: profile.explanation_language,
        learning_goal: profile.learning_goal,
        daily_goal_minutes: profile.daily_goal_minutes,
      });
      setSaved(true);
    } catch (e) {
      setError((e as ApiRequestError).message);
    }
  };

  if (!profile) return <div className="p-8 text-slate-400">Loading…</div>;

  return (
    <div className="p-8 max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">⚙️ Settings</h1>

      <Card title="Profile">
        <div className="space-y-4">
          <label className="block text-sm">
            Name
            <input value={profile.name} onChange={(e) => update('name', e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" />
          </label>

          <label className="block text-sm">
            Target language
            <select value={profile.target_language} onChange={(e) => update('target_language', e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm">
              {languages.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </label>

          <label className="block text-sm">
            Current CEFR level
            <select value={profile.cefr_level} onChange={(e) => update('cefr_level', e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm">
              {CEFR_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>

          <label className="block text-sm">
            Explanation language
            <input value={profile.explanation_language} onChange={(e) => update('explanation_language', e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" />
          </label>

          <label className="block text-sm">
            Learning goal
            <input value={profile.learning_goal} onChange={(e) => update('learning_goal', e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" />
          </label>

          <label className="block text-sm">
            Daily study target (minutes)
            <input type="number" min={5} value={profile.daily_goal_minutes} onChange={(e) => update('daily_goal_minutes', Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" />
          </label>

          <button className="btn-primary text-sm" onClick={save}>Save</button>
          {saved && <span className="text-sm text-green-600 ml-3">Saved ✓</span>}
          {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
        </div>
      </Card>
    </div>
  );
}
