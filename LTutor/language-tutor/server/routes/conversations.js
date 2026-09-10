import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT c.*, 
        (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS message_count,
        (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.correction IS NOT NULL) AS mistake_count
       FROM conversations c ORDER BY started_at DESC LIMIT 100`
    )
    .all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const conversation = db.prepare('SELECT * FROM conversations WHERE id = ?').get(req.params.id);
  if (!conversation) {
    return res.status(404).json({ error: { message: 'Conversation not found.', code: 'NOT_FOUND' } });
  }
  const messages = db
    .prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY id ASC')
    .all(req.params.id)
    .map((m) => ({ ...m, correction: m.correction ? JSON.parse(m.correction) : null }));
  res.json({ ...conversation, messages });
});

router.post('/:id/end', (req, res) => {
  const { durationSeconds = 0 } = req.body;
  db.prepare(
    `UPDATE conversations SET ended_at = datetime('now'), duration_seconds = ? WHERE id = ?`
  ).run(durationSeconds, req.params.id);

  const conversation = db.prepare('SELECT * FROM conversations WHERE id = ?').get(req.params.id);
  const newVocabCount = db
    .prepare(
      `SELECT COUNT(*) AS n FROM vocabulary WHERE language_code = ? AND date_learned >= ?`
    )
    .get(conversation.language_code, conversation.started_at).n;
  const mistakesThisConvo = db
    .prepare(
      `SELECT DISTINCT correction FROM messages WHERE conversation_id = ? AND correction IS NOT NULL`
    )
    .all(req.params.id)
    .map((r) => {
      try { return JSON.parse(r.correction).category; } catch { return null; }
    })
    .filter(Boolean);

  res.json({
    conversation,
    summary: {
      durationSeconds,
      newVocabCount,
      mistakeCategories: [...new Set(mistakesThisConvo)],
    },
  });
});

export default router;
