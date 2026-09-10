import { Router } from 'express';
import db from '../db.js';
import { getStructuredJSON } from '../services/claude.js';

const router = Router();

/** Generate a short reading passage + comprehension questions tailored to the learner's level. */
router.post('/generate', async (req, res, next) => {
  try {
    const profile = db.prepare('SELECT * FROM profile WHERE id=1').get();
    const result = await getStructuredJSON(
      `You are generating a short reading-comprehension passage for a ${profile.target_language} language-learning app.`,
      `Learner CEFR level: ${profile.cefr_level}. Explanation language for questions/answers: ${profile.explanation_language}.
       Return JSON: {"title": string, "passage": a short passage (4-8 sentences) written in ${profile.target_language} at this level,
       "questions": [{"question": string in ${profile.explanation_language}, "answer": short expected answer}]}
       Include exactly 3 questions.`
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
