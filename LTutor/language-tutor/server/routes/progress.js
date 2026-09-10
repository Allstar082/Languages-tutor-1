import { Router } from 'express';
import db from '../db.js';
import { getStructuredJSON } from '../services/claude.js';

const router = Router();

function computeStreak(languageCode) {
  const rows = db
    .prepare(`SELECT date FROM progress WHERE language_code = ? AND minutes_studied > 0 ORDER BY date DESC`)
    .all(languageCode);
  if (rows.length === 0) return 0;
  let streak = 0;
  let cursor = new Date();
  for (const row of rows) {
    const rowDate = new Date(row.date + 'T00:00:00');
    const diffDays = Math.round((cursor - rowDate) / 86400000);
    if (diffDays === 0 || diffDays === 1) {
      streak += 1;
      cursor = rowDate;
    } else {
      break;
    }
  }
  return streak;
}

router.get('/', (req, res) => {
  const profile = db.prepare('SELECT * FROM profile WHERE id=1').get();
  const languageCode = req.query.language || profile.target_language;

  const vocabTotal = db.prepare(`SELECT COUNT(*) AS n FROM vocabulary WHERE language_code = ?`).get(languageCode).n;
  const vocabKnown = db.prepare(`SELECT COUNT(*) AS n FROM vocabulary WHERE language_code = ? AND status = 'known'`).get(languageCode).n;
  const vocabPct = vocabTotal ? Math.round((vocabKnown / vocabTotal) * 100) : 0;

  const exerciseStats = db
    .prepare(
      `SELECT COUNT(*) AS total, SUM(correct) AS correctCount
       FROM exercise_results er JOIN exercises e ON e.id = er.exercise_id WHERE e.language_code = ?`
    )
    .get(languageCode);
  const grammarPct = exerciseStats.total ? Math.round((exerciseStats.correctCount / exerciseStats.total) * 100) : 0;

  const convoStats = db
    .prepare(
      `SELECT COUNT(*) AS conversationCount, COALESCE(SUM(duration_seconds), 0) AS totalSeconds
       FROM conversations WHERE language_code = ?`
    )
    .get(languageCode);
  const conversationPct = Math.min(100, Math.round((convoStats.totalSeconds / 60 / 300) * 100));

  const listeningConvos = db
    .prepare(`SELECT COUNT(*) AS n FROM conversations WHERE language_code = ? AND mode = 'listening'`)
    .get(languageCode).n;
  const listeningPct = Math.min(100, listeningConvos * 10);

  const recentMistakes = db
    .prepare(`SELECT * FROM mistakes WHERE language_code = ? ORDER BY last_seen DESC LIMIT 5`)
    .all(languageCode);

  const todayPlan = db.prepare(`SELECT * FROM daily_goals WHERE date = date('now')`).get();

  res.json({
    profile,
    streak: computeStreak(languageCode),
    skills: { vocabulary: vocabPct, grammar: grammarPct, conversation: conversationPct, listening: listeningPct },
    vocabularyLearned: vocabTotal,
    conversationCount: convoStats.conversationCount,
    exercisesCompleted: exerciseStats.total || 0,
    exerciseAccuracy: grammarPct,
    recentMistakes,
    todayPlan: todayPlan ? { ...todayPlan, plan_json: JSON.parse(todayPlan.plan_json), focus_json: JSON.parse(todayPlan.focus_json || '[]') } : null,
  });
});

/** Ask Claude to generate today's study plan from current weaknesses. Called at most once/day. */
router.post('/plan/generate', async (req, res, next) => {
  try {
    const profile = db.prepare('SELECT * FROM profile WHERE id=1').get();
    const existing = db.prepare(`SELECT * FROM daily_goals WHERE date = date('now')`).get();
    if (existing) {
      return res.json({ ...existing, plan_json: JSON.parse(existing.plan_json), focus_json: JSON.parse(existing.focus_json || '[]') });
    }
    const mistakes = db
      .prepare(`SELECT category FROM mistakes WHERE language_code = ? AND status != 'resolved' ORDER BY frequency DESC LIMIT 5`)
      .all(profile.target_language);

    const result = await getStructuredJSON(
      'You are planning a daily language study session for a personal tutoring app.',
      `Learner level: ${profile.cefr_level}, target language: ${profile.target_language}, daily goal: ${profile.daily_goal_minutes} minutes.
       Known weak areas: ${mistakes.map((m) => m.category).join(', ') || 'none yet'}.
       Return JSON: {"plan": [{"label": string, "minutes": number}], "focus": [short focus topic strings, max 3]}
       The minutes in "plan" should sum to approximately ${profile.daily_goal_minutes}.`
    );

    db.prepare(`INSERT INTO daily_goals (plan_json, focus_json) VALUES (?, ?)`).run(
      JSON.stringify(result.plan || []),
      JSON.stringify(result.focus || [])
    );
    const saved = db.prepare(`SELECT * FROM daily_goals WHERE date = date('now')`).get();
    res.json({ ...saved, plan_json: JSON.parse(saved.plan_json), focus_json: JSON.parse(saved.focus_json) });
  } catch (err) {
    next(err);
  }
});

/** Record minutes studied today (called by the client after a session ends). */
router.post('/log', (req, res) => {
  const { minutes = 0, language } = req.body;
  const profile = db.prepare('SELECT target_language FROM profile WHERE id=1').get();
  const languageCode = language || profile.target_language;
  db.prepare(
    `INSERT INTO progress (language_code, date, minutes_studied) VALUES (?, date('now'), ?)
     ON CONFLICT(language_code, date) DO UPDATE SET minutes_studied = minutes_studied + excluded.minutes_studied`
  ).run(languageCode, minutes);
  res.status(204).end();
});

export default router;
