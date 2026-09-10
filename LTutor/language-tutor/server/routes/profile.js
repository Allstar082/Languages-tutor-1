import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const profile = db.prepare('SELECT * FROM profile WHERE id = 1').get();
  res.json(profile);
});

const EDITABLE_FIELDS = [
  'name', 'target_language', 'cefr_level', 'explanation_language',
  'learning_goal', 'daily_goal_minutes', 'theme',
];

router.put('/', (req, res) => {
  const updates = {};
  for (const field of EDITABLE_FIELDS) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: { message: 'No editable fields provided.', code: 'EMPTY_UPDATE' } });
  }
  const setClause = Object.keys(updates).map((k) => `${k} = @${k}`).join(', ');
  db.prepare(`UPDATE profile SET ${setClause} WHERE id = 1`).run(updates);
  const profile = db.prepare('SELECT * FROM profile WHERE id = 1').get();
  res.json(profile);
});

router.get('/languages', (req, res) => {
  res.json(db.prepare('SELECT * FROM languages WHERE enabled = 1').all());
});

export default router;
