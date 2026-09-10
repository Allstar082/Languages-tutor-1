import { Router } from 'express';
import db from '../db.js';
import { getStructuredJSON } from '../services/claude.js';

const router = Router();

router.get('/', (req, res) => {
  const languageCode = req.query.language || db.prepare('SELECT target_language FROM profile WHERE id=1').get().target_language;
  const status = req.query.status;
  let rows;
  if (status) {
    rows = db.prepare(`SELECT * FROM vocabulary WHERE language_code = ? AND status = ? ORDER BY date_learned DESC`).all(languageCode, status);
  } else {
    rows = db.prepare(`SELECT * FROM vocabulary WHERE language_code = ? ORDER BY date_learned DESC`).all(languageCode);
  }
  res.json(rows);
});

router.post('/', (req, res) => {
  const { word, translation, part_of_speech, gender, example_sentence, pronunciation, difficulty, language_code } = req.body;
  if (!word || !translation) {
    return res.status(400).json({ error: { message: 'word and translation are required.', code: 'MISSING_FIELDS' } });
  }
  const languageCode = language_code || db.prepare('SELECT target_language FROM profile WHERE id=1').get().target_language;
  const info = db
    .prepare(
      `INSERT INTO vocabulary (language_code, word, translation, part_of_speech, gender, example_sentence, pronunciation, difficulty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(languageCode, word, translation, part_of_speech || null, gender || null, example_sentence || null, pronunciation || null, difficulty || 'medium');
  res.status(201).json(db.prepare('SELECT * FROM vocabulary WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM vocabulary WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: { message: 'Word not found.', code: 'NOT_FOUND' } });

  const fields = ['word', 'translation', 'part_of_speech', 'gender', 'example_sentence', 'pronunciation', 'difficulty', 'status'];
  const updates = {};
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
  if (Object.keys(updates).length === 0) return res.json(existing);

  const setClause = Object.keys(updates).map((k) => `${k} = @${k}`).join(', ');
  db.prepare(`UPDATE vocabulary SET ${setClause} WHERE id = @id`).run({ ...updates, id: req.params.id });
  res.json(db.prepare('SELECT * FROM vocabulary WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM vocabulary WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

/** Ask Claude for an example sentence (and fill missing fields) for a word. */
router.post('/:id/example', async (req, res, next) => {
  try {
    const word = db.prepare('SELECT * FROM vocabulary WHERE id = ?').get(req.params.id);
    if (!word) return res.status(404).json({ error: { message: 'Word not found.', code: 'NOT_FOUND' } });
    const profile = db.prepare('SELECT * FROM profile WHERE id=1').get();

    const result = await getStructuredJSON(
      `You are a helpful ${word.language_code} language teacher generating study material.`,
      `Word: "${word.word}" (translation: "${word.translation}"). Learner CEFR level: ${profile.cefr_level}.
       Return JSON: {"example_sentence": one natural sentence using the word at this level,
       "pronunciation": simple phonetic hint using Latin letters, "gender": "masculine"|"feminine"|null if not applicable,
       "part_of_speech": short string}`
    );

    db.prepare(
      `UPDATE vocabulary SET example_sentence = ?, pronunciation = COALESCE(?, pronunciation),
       gender = COALESCE(?, gender), part_of_speech = COALESCE(?, part_of_speech) WHERE id = ?`
    ).run(result.example_sentence || word.example_sentence, result.pronunciation, result.gender, result.part_of_speech, req.params.id);

    res.json(db.prepare('SELECT * FROM vocabulary WHERE id = ?').get(req.params.id));
  } catch (err) {
    next(err);
  }
});

export default router;
