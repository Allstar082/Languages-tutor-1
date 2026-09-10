import { Router } from 'express';
import db from '../db.js';
import { getTutorReply, getStructuredJSON, summarizeMessages, MAX_CONTEXT_MESSAGES } from '../services/claude.js';
import { buildTutorSystemPrompt } from '../services/tutorPrompt.js';

const router = Router();

function getProfile() {
  return db.prepare('SELECT * FROM profile WHERE id = 1').get();
}

function getRecentMistakes(languageCode, limit = 8) {
  return db
    .prepare(
      `SELECT * FROM mistakes WHERE language_code = ? AND status != 'resolved'
       ORDER BY frequency DESC, last_seen DESC LIMIT ?`
    )
    .all(languageCode, limit);
}

function recordMistakeFromCorrection(languageCode, correction) {
  if (!correction || !correction.category) return;
  const existing = db
    .prepare(`SELECT * FROM mistakes WHERE language_code = ? AND category = ?`)
    .get(languageCode, correction.category);

  if (existing) {
    db.prepare(
      `UPDATE mistakes SET frequency = frequency + 1, last_seen = datetime('now'),
       example_wrong = ?, example_correct = ?,
       status = CASE WHEN frequency + 1 >= 6 THEN 'improving' ELSE status END
       WHERE id = ?`
    ).run(correction.example_wrong || existing.example_wrong, correction.example_correct || existing.example_correct, existing.id);
  } else {
    db.prepare(
      `INSERT INTO mistakes (language_code, category, description, example_wrong, example_correct)
       VALUES (?, ?, ?, ?, ?)`
    ).run(languageCode, correction.category, correction.description || '', correction.example_wrong || '', correction.example_correct || '');
  }
}

/** Lightweight second call: does this user message contain a meaningful, correctable mistake? */
async function extractCorrection({ languageCode, explanationLanguage, userMessage, tutorReply }) {
  if (!userMessage || userMessage.trim().split(/\s+/).length < 2) return null;
  try {
    const result = await getStructuredJSON(
      `You are a language-mistake detector for a ${languageCode} tutoring app. Analyze the learner's
       message for ONE meaningful grammar/vocabulary mistake (ignore trivial typos). Explain in ${explanationLanguage}.`,
      `Learner's message: """${userMessage}"""\nTutor's reply for context: """${tutorReply}"""\n
       Return JSON: {"mistake_found": boolean, "category": short tag string or null, "description": string or null,
       "example_wrong": string or null, "example_correct": string or null}`
    );
    if (result.mistake_found) return result;
    return null;
  } catch (e) {
    console.warn('extractCorrection failed (non-fatal):', e.message);
    return null;
  }
}

router.post('/', async (req, res, next) => {
  try {
    const { conversationId, mode = 'free', scenario = null, message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: { message: 'Message cannot be empty.', code: 'EMPTY_MESSAGE' } });
    }

    const profile = getProfile();
    const languageCode = profile.target_language;

    let convId = conversationId;
    if (!convId) {
      const info = db
        .prepare(`INSERT INTO conversations (language_code, mode, scenario, topic) VALUES (?, ?, ?, ?)`)
        .run(languageCode, mode, scenario, mode === 'roleplay' ? scenario : mode);
      convId = info.lastInsertRowid;
    }

    db.prepare(`INSERT INTO messages (conversation_id, role, content) VALUES (?, 'user', ?)`).run(convId, message);

    // Build recent context, summarizing anything beyond the window to control cost.
    const allMessages = db
      .prepare(`SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY id ASC`)
      .all(convId);

    let contextMessages = allMessages;
    if (allMessages.length > MAX_CONTEXT_MESSAGES) {
      const overflow = allMessages.slice(0, allMessages.length - MAX_CONTEXT_MESSAGES);
      const summary = await summarizeMessages(overflow);
      contextMessages = [
        { role: 'user', content: `[Earlier in this conversation: ${summary}]` },
        ...allMessages.slice(-MAX_CONTEXT_MESSAGES),
      ];
    }

    const mistakes = getRecentMistakes(languageCode);
    const systemPrompt = buildTutorSystemPrompt({ profile, mode, scenario, mistakes });
    const replyText = await getTutorReply(systemPrompt, contextMessages);

    const correction = mode === 'pronunciation'
      ? null
      : await extractCorrection({
          languageCode,
          explanationLanguage: profile.explanation_language,
          userMessage: message,
          tutorReply: replyText,
        });

    if (correction) recordMistakeFromCorrection(languageCode, correction);

    db.prepare(
      `INSERT INTO messages (conversation_id, role, content, correction) VALUES (?, 'assistant', ?, ?)`
    ).run(convId, replyText, correction ? JSON.stringify(correction) : null);

    res.json({
      conversationId: convId,
      reply: replyText,
      correction: correction || null,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
