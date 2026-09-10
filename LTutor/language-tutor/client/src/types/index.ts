export interface Profile {
  id: number;
  name: string;
  target_language: string;
  cefr_level: string;
  explanation_language: string;
  learning_goal: string;
  daily_goal_minutes: number;
  theme: 'light' | 'dark';
  streak_count: number;
}

export interface Language {
  code: string;
  name: string;
  voice_lang_tag: string;
  enabled: number;
}

export type ConversationMode = 'free' | 'teacher' | 'roleplay' | 'pronunciation' | 'listening';

export interface Correction {
  category: string;
  description: string;
  example_wrong?: string;
  example_correct?: string;
}

export interface ChatMessage {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  correction?: Correction | null;
  created_at?: string;
}

export interface Conversation {
  id: number;
  language_code: string;
  mode: ConversationMode;
  topic?: string;
  scenario?: string;
  started_at: string;
  ended_at?: string;
  duration_seconds: number;
  message_count?: number;
  mistake_count?: number;
  messages?: ChatMessage[];
}

export interface VocabWord {
  id: number;
  language_code: string;
  word: string;
  translation: string;
  part_of_speech?: string;
  gender?: string;
  example_sentence?: string;
  pronunciation?: string;
  difficulty: string;
  status: 'learning' | 'known' | 'difficult';
  date_learned: string;
}

export interface Mistake {
  id: number;
  language_code: string;
  category: string;
  description: string;
  example_wrong?: string;
  example_correct?: string;
  frequency: number;
  status: 'needs_practice' | 'improving' | 'resolved';
  last_seen: string;
}

export interface DashboardData {
  profile: Profile;
  streak: number;
  skills: { vocabulary: number; grammar: number; conversation: number; listening: number };
  vocabularyLearned: number;
  conversationCount: number;
  exercisesCompleted: number;
  exerciseAccuracy: number;
  recentMistakes: Mistake[];
  todayPlan: { plan_json: { label: string; minutes: number }[]; focus_json: string[] } | null;
}

export interface GrammarTopic {
  id: number;
  language_code: string;
  cefr_level: string;
  title: string;
  summary: string;
}

export interface ApiError {
  error: { message: string; code: string };
}
