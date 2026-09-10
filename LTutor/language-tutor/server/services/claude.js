// services/claude.js
// The ONLY module that talks to the Anthropic API. The key lives in process.env and never
// leaves the server process. If you grep the client/ folder you will not find this key referenced.

import Anthropic from '@anthropic-ai/sdk';

const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';

// Cost control: cap how many prior turns we resend verbatim. Older turns are folded into
// a short running summary instead (see summarizeIfNeeded below), rather than sent in full.
export const MAX_CONTEXT_MESSAGES = 16;

let client = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    const err = new Error(
      'ANTHROPIC_API_KEY is not set. Copy .env.example to server/.env and add your key.'
    );
    err.code = 'MISSING_API_KEY';
    throw err;
  }
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

/**
 * Send a tutoring turn to Claude.
 * @param {string} systemPrompt - dynamic tutor system prompt (see tutorPrompt.js)
 * @param {{role: 'user'|'assistant', content: string}[]} messages - recent conversation turns
 * @returns {Promise<string>} assistant reply text
 */
export async function getTutorReply(systemPrompt, messages) {
  const anthropic = getClient();
  const trimmed = messages.slice(-MAX_CONTEXT_MESSAGES);

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: trimmed.map((m) => ({ role: m.role, content: m.content })),
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  return textBlock ? textBlock.text : '';
}

/**
 * Ask Claude for a strict-JSON structured result (used for vocabulary examples,
 * mistake extraction, exercise generation, daily plan generation).
 * @param {string} systemPrompt
 * @param {string} userPrompt
 */
export async function getStructuredJSON(systemPrompt, userPrompt) {
  const anthropic = getClient();
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: `${systemPrompt}\n\nRespond ONLY with valid JSON. No markdown fences, no preamble, no commentary.`,
    messages: [{ role: 'user', content: userPrompt }],
  });
  const textBlock = response.content.find((b) => b.type === 'text');
  const raw = (textBlock?.text || '{}').trim().replace(/^```json\s*|```$/g, '');
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Claude did not return valid JSON: ' + raw.slice(0, 200));
  }
}

/**
 * Summarize a batch of older messages into one short paragraph, to keep long conversations cheap.
 */
export async function summarizeMessages(messages) {
  if (messages.length === 0) return '';
  const anthropic = getClient();
  const transcript = messages.map((m) => `${m.role}: ${m.content}`).join('\n');
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 200,
    system: 'Summarize this language-tutoring conversation excerpt in 2-3 sentences, in English, for the tutor\'s own memory. Note the topic and any corrections given.',
    messages: [{ role: 'user', content: transcript }],
  });
  const textBlock = response.content.find((b) => b.type === 'text');
  return textBlock ? textBlock.text : '';
}
