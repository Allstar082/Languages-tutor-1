import { Router } from 'express';
import db from '../db.js';
import { getStructuredJSON } from '../services/claude.js';

const router = Router();

router.get('/', (req, res) => {
  const languageCode = req.query.language || db.prepare('SELECT target_language FROM profile WHERE id=1').get().target_language;
  const rows = db
    .prepare(`SELECT * FROM exercises WHERE language_code = ? ORDER BY created_at DESC LIMIT 30`)
    .all(languageCode)
    .map((r) => ({ ...r, data: JSON.parse(r.data) }));
  res.json(rows);
});

const VALID_TYPES = ['multiple_choice', 'fill_blank', 'translation', 'ordering', 'correct_sentence', 'listening', 'writing'];

/** Generate a new exercise from current level + weaknesses, not fully random. */
router.post('/generate', async (req, res, next) => {
  try {
    const { type = 'multiple_choice' } = req.body;
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: { message: `type must be one of ${VALID_TYPES.join(', ')}`, code: 'INVALID_TYPE' } });
    }
    const profile = db.prepare('SELECT * FROM profile WHERE id=1').get();
    const languageCode = profile.target_language;

    const mistakes = db
      .prepare(`SELECT category FROM mistakes WHERE language_code = ? AND status != 'resolved' ORDER BY frequency DESC LIMIT 5`)
      .all(languageCode)
      .map((m) => m.category);
    const recentVocab = db
      .prepare(`SELECT word FROM vocabulary WHERE language_code = ? ORDER BY date_learned DESC LIMIT 10`)
      .all(languageCode)
      .map((v) => v.word);

    const result = await getStructuredJSON(
      `You are generating a single ${type} exercise for a ${languageCode} language-learning app.`,
      `Learner CEFR level: ${profile.cefr_level}. Known weak grammar areas to reinforce: ${mistakes.join(', ') || 'none yet'}.
       Recently learned vocabulary to reuse where natural: ${recentVocab.join(', ') || 'none yet'}.
       Return JSON shaped for type "${type}":
       {"prompt": string, "options": [string,...] (only for multiple_choice/correct_sentence, else omit),
        "answer": string, "explanation": string}`
    );

    const info = db
      .prepare(`INSERT INTO exercises (language_code, type, cefr_level, prompt, data) VALUES (?, ?, ?, ?, ?)`)
      .run(languageCode, type, profile.cefr_level, result.prompt, JSON.stringify(result));

    res.status(201).json({ id: info.lastInsertRowid, language_code: languageCode, type, cefr_level: profile.cefr_level, data: result });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/submit', (req, res) => {
  const exercise = db.prepare('SELECT * FROM exercises WHERE id = ?').get(req.params.id);
  if (!exercise) return res.status(404).json({ error: { message: 'Exercise not found.', code: 'NOT_FOUND' } });
  const data = JSON.parse(exercise.data);
  const { answer } = req.body;
  const correct = String(answer || '').trim().toLowerCase() === String(data.answer || '').trim().toLowerCase();

  db.prepare(`INSERT INTO exercise_results (exercise_id, correct, answer_given) VALUES (?, ?, ?)`).run(
    exercise.id,
    correct ? 1 : 0,
    answer || ''
  );

  res.json({ correct, correctAnswer: data.answer, explanation: data.explanation });
});

export default router;
