import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const languageCode = req.query.language || db.prepare('SELECT target_language FROM profile WHERE id=1').get().target_language;
  const rows = db
    .prepare(`SELECT * FROM mistakes WHERE language_code = ? ORDER BY frequency DESC, last_seen DESC`)
    .all(languageCode);
  res.json(rows);
});

router.put('/:id', (req, res) => {
  const { status } = req.body;
  if (!['needs_practice', 'improving', 'resolved'].includes(status)) {
    return res.status(400).json({ error: { message: 'Invalid status.', code: 'INVALID_STATUS' } });
  }
  db.prepare('UPDATE mistakes SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json(db.prepare('SELECT * FROM mistakes WHERE id = ?').get(req.params.id));
});

export default router;
