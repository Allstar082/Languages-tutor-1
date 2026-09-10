import { NavLink } from 'react-router-dom';
import { Profile } from '../types';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: '🏠' },
  { to: '/conversation', label: 'AI Conversation', icon: '🎙️' },
  { to: '/vocabulary', label: 'Vocabulary', icon: '📚' },
  { to: '/grammar', label: 'Grammar', icon: '🧠' },
  { to: '/exercises', label: 'Exercises', icon: '📝' },
  { to: '/reading', label: 'Reading', icon: '📖' },
  { to: '/listening', label: 'Listening', icon: '🎧' },
  { to: '/progress', label: 'Progress', icon: '📊' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Sidebar({ profile, theme, onToggleTheme }: { profile: Profile | null; theme: string; onToggleTheme: () => void }) {
  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <div className="px-6 py-6">
        <div className="text-xl font-extrabold tracking-tight">🗣️ Language Tutor</div>
        {profile && (
          <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {profile.name} · {profile.target_language.toUpperCase()} · {profile.cefr_level}
          </div>
        )}
      </div>
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-500 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`
            }
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <button onClick={onToggleTheme} className="btn-secondary w-full text-sm">
          {theme === 'dark' ? '☀️ Light mode' : '🌙 Dark mode'}
        </button>
      </div>
    </aside>
  );
}
