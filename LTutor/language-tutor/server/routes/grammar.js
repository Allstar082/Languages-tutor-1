import { Router } from 'express';
import db from '../db.js';
import { getTutorReply } from '../services/claude.js';
import { buildTutorSystemPrompt } from '../services/tutorPrompt.js';

const router = Router();

router.get('/', (req, res) => {
  const languageCode = req.query.language || db.prepare('SELECT target_language FROM profile WHERE id=1').get().target_language;
  const rows = db
    .prepare(`SELECT * FROM grammar_topics WHERE language_code = ? ORDER BY sort_order ASC`)
    .all(languageCode);
  const grouped = {};
  for (const row of rows) {
    grouped[row.cefr_level] = grouped[row.cefr_level] || [];
    grouped[row.cefr_level].push(row);
  }
  res.json(grouped);
});

/** Ask Claude to explain a grammar topic interactively, in the learner's explanation language. */
router.post('/:id/explain', async (req, res, next) => {
  try {
    const topic = db.prepare('SELECT * FROM grammar_topics WHERE id = ?').get(req.params.id);
    if (!topic) return res.status(404).json({ error: { message: 'Topic not found.', code: 'NOT_FOUND' } });
    const profile = db.prepare('SELECT * FROM profile WHERE id=1').get();

    const systemPrompt = buildTutorSystemPrompt({ profile, mode: 'free', mistakes: [] });
    const reply = await getTutorReply(
      systemPrompt +
        `\n\nRight now, specifically explain the grammar topic "${topic.title}" (${topic.summary || ''}) clearly and
         interactively, in ${profile.explanation_language}, with 2-3 short examples in ${profile.target_language}.`,
      [{ role: 'user', content: `Please explain: ${topic.title}` }]
    );
    res.json({ topic, explanation: reply });
  } catch (err) {
    next(err);
  }
});

export default router;
