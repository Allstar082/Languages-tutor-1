# Personal AI Language Tutor

A **private, single-user** language-learning platform powered by the Anthropic Claude API. You talk to it
with your microphone, it understands you, replies intelligently, and speaks the reply back to you.
Italian is the default/first language, but the app is built so you can add more languages later.

This is not a SaaS product — there's no public signup, no multi-tenant auth, no payment system.
It's a tool for one person (you) to run on your own machine.

---

## 1. What's actually built right now (MVP)

- Working Express + SQLite backend with a real database (not mocked)
- Claude API integration on the backend only (key never touches the browser)
- Dynamic tutor system prompt built from your profile + recent mistakes
- Voice conversation loop: mic → browser speech-to-text → Claude → browser text-to-speech
- Text chat mode (no mic needed)
- Free Conversation and Teacher Mode (mistake correction) conversation modes
- Roleplay mode with scenario picker
- Conversation history saved to SQLite, browsable and reopenable
- Vocabulary tracker (add/remove/mark known/mark difficult) with Claude-generated example sentences
- Mistake tracking (Claude tags recurring mistakes, frequency counted automatically)
- Dashboard with streak, per-skill progress bars, today's plan, recent mistakes
- Editable local profile (name, target language, CEFR level, explanation language, daily goal)
- Dark/light mode, responsive sidebar layout

### Stubbed for the next build stage (structured, wired up, but intentionally simple for v1)
Grammar explorer, AI-generated exercises, listening practice, reading practice, and charts on the
progress page all have working pages and API routes, but the content generation for those is
simpler than the conversation tutor for now — see `server/routes/` and `NEXT_STEPS.md` for exactly
what's there vs. what to extend. Nothing is a fake button: every page in the sidebar does something
real, but not every mode listed in the original spec has AI generation behind it yet.

## 2. Requirements

- Node.js 18+ and npm
- An Anthropic API key (https://console.anthropic.com/)
- A Chromium-based browser (Chrome, Edge, Brave) for speech recognition — Web Speech API's
  `SpeechRecognition` is not implemented in Firefox and Safari's support is limited. Text-to-speech
  (`speechSynthesis`) works in all modern browsers.

## 3. Install

```bash
# from the language-tutor/ folder
cd server && npm install
cd ../client && npm install
```

## 4. Configure your API key

```bash
cp .env.example server/.env
```

Edit `server/.env` and paste your key:

```
ANTHROPIC_API_KEY=sk-ant-...
PORT=3001
```

Get a key at https://console.anthropic.com/settings/keys. The key is read only by the Node server
(`server/services/claude.js`) via `process.env.ANTHROPIC_API_KEY` — it is never sent to or bundled
into the frontend. `.env` is listed in `.gitignore` so it will not be committed.

## 5. Run it

Open two terminals.

**Terminal 1 — backend:**
```bash
cd server
npm run dev
```
Starts on `http://localhost:3001`. On first run it creates `server/database/tutor.db` (SQLite file)
and seeds your profile with the defaults from the spec (Name: Eric, Target language: Italian, Level: A2).

**Terminal 2 — frontend:**
```bash
cd client
npm run dev
```
Starts on `http://localhost:5173` and proxies `/api` requests to the backend. Open that URL in Chrome.

## 6. Microphone permissions

The first time you click the microphone button, your browser will ask for microphone permission —
allow it. If you accidentally block it, click the padlock/site-info icon in the address bar and
re-enable microphone access for `localhost:5173`, then reload.

If `SpeechRecognition` isn't available in your browser at all, the app detects this and switches the
conversation page into **text-only mode** automatically, with a visible notice — it does not pretend
voice input works when it can't.

## 7. How text-to-speech works

The app uses the browser's built-in `speechSynthesis` API and picks an Italian voice
(`it-IT`) automatically when one is installed on your OS. You can control:
- Play / pause / stop / replay
- Speed: 0.75x / 1.0x / 1.25x / 1.5x

The TTS layer is written behind a small provider interface (`client/src/services/tts.ts`) so you can
swap in ElevenLabs or OpenAI TTS later without touching the rest of the app — see `NEXT_STEPS.md`.

## 8. Database

SQLite file at `server/database/tutor.db`, created automatically. Schema (see `server/db.js`):

`profile`, `languages`, `vocabulary`, `grammar_topics`, `mistakes`, `conversations`, `messages`,
`exercises`, `exercise_results`, `progress`, `daily_goals`.

Because everything is local SQLite, your history survives closing the browser or restarting your
computer. No cloud storage. The only outbound network call is the Claude API request itself.

## 9. Cost control

Claude is only called when you actually send a message or explicitly ask for something
AI-generated (a vocabulary example sentence, a mistake explanation, a daily plan). It is never
called on routine UI interactions like opening a page or clicking through the dashboard.
Conversation context sent to Claude is capped (see `MAX_CONTEXT_MESSAGES` in
`server/services/claude.js`) — once a conversation gets long, older turns are summarized into a
short note instead of resent verbatim, to keep token usage down.

## 10. Troubleshooting

| Problem | Fix |
|---|---|
| "Invalid API key" error in chat | Check `server/.env` has `ANTHROPIC_API_KEY` set and restart the server |
| Mic button greyed out with a warning | Your browser doesn't support `SpeechRecognition` — use Chrome/Edge, or use text mode |
| No sound on AI replies | Check your OS has an Italian voice installed for `speechSynthesis`, and that the tab isn't muted |
| "Network error" talking to backend | Confirm the backend terminal shows `Server running on port 3001` and that `client/vite.config.ts` proxy target matches |
| Database errors on startup | Delete `server/database/tutor.db` to reset from scratch (you'll lose local history) |

## 11. Project structure

```
language-tutor/
├── server/
│   ├── index.js
│   ├── db.js
│   ├── routes/          (chat, conversations, vocabulary, profile, progress, mistakes, exercises, grammar)
│   ├── services/         (claude.js, tutorPrompt.js)
│   ├── middleware/        (errorHandler.js)
│   ├── database/          (tutor.db, created on first run)
│   ├── .env               (you create this, gitignored)
│   └── package.json
├── client/
│   ├── src/
│   │   ├── components/   (Sidebar, cards, progress bars, mic button, message bubble)
│   │   ├── pages/         (Dashboard, Conversation, Vocabulary, Grammar, Exercises, Progress, Settings)
│   │   ├── hooks/          (useSpeechRecognition, useSpeechSynthesis)
│   │   ├── services/        (api.ts, tts.ts)
│   │   └── types/
│   └── package.json
├── .env.example
├── .gitignore
├── NEXT_STEPS.md
└── README.md (this file)
```

See `NEXT_STEPS.md` for exactly what to build next and where.
