import { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Conversation from './pages/Conversation';
import Vocabulary from './pages/Vocabulary';
import Grammar from './pages/Grammar';
import Exercises from './pages/Exercises';
import Reading from './pages/Reading';
import Listening from './pages/Listening';
import ProgressPage from './pages/Progress';
import Settings from './pages/Settings';
import { api } from './services/api';
import { Profile } from './types';

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(
    (localStorage.getItem('theme') as 'light' | 'dark') || 'dark'
  );

  useEffect(() => {
    api.get<Profile>('/profile').then(setProfile).catch(() => {});
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <div className="flex min-h-screen">
      <Sidebar profile={profile} theme={theme} onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/conversation" element={<Conversation />} />
          <Route path="/vocabulary" element={<Vocabulary />} />
          <Route path="/grammar" element={<Grammar />} />
          <Route path="/exercises" element={<Exercises />} />
          <Route path="/reading" element={<Reading />} />
          <Route path="/listening" element={<Listening />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}
