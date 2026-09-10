# Next steps

This is a working MVP: voice conversation loop, Claude tutoring, vocabulary, mistakes, dashboard,
grammar explainer, exercise generator, reading generator, and listening practice are all real and
functional end-to-end. Here's what to build next, and exactly where.

## 1. Swap in a different TTS provider (e.g. ElevenLabs)
- Everything TTS-related goes through `client/src/services/tts.ts`'s `TtsProvider` interface.
- Add a new class implementing `isSupported / speak / pause / resume / stop`, e.g. `ElevenLabsTtsProvider`
  that calls a new backend route (`server/routes/tts.js`) which holds the ElevenLabs key server-side
  and streams audio back, rather than calling ElevenLabs directly from the browser.
- Swap the exported `ttsProvider` singleton, or make it selectable in Settings.

## 2. Swap or add an STT provider
- `client/src/hooks/useSpeechRecognition.ts` currently wraps the browser's `SpeechRecognition`.
- To use a server-side STT (e.g. Whisper via the Claude API's multimodal input, or a dedicated
  provider), record audio with `MediaRecorder` instead, POST the blob to a new
  `server/routes/transcribe.js` endpoint, and return text the same shape this hook already
  returns from `start()`'s callback — the rest of `Conversation.tsx` doesn't need to change.

## 3. Real phoneme-level pronunciation scoring
Currently "Pronunciation Practice" is honest about only using ordinary browser STT text, not real
phoneme scoring. A real implementation needs a dedicated pronunciation-assessment API (e.g. Azure
Speech's pronunciation assessment) — that's a bigger integration, deliberately left out of the MVP
per the spec's instruction not to claim functionality that doesn't exist.

## 4. Spaced repetition flashcards
The `vocabulary` table already has `srs_ease`, `srs_interval_days`, `srs_due_date` columns ready.
Add a `client/src/pages/Flashcards.tsx` with Again/Hard/Good/Easy buttons, and a
`POST /api/vocabulary/:id/review` route implementing the SM-2 algorithm to update those columns.

## 5. Charts on the Progress page
`server/routes/progress.js` returns current snapshot numbers. To chart trends over time, query the
`progress` table's daily rows (already recorded via `/api/progress/log`) across a date range and
feed them into a small chart lib (e.g. `recharts`) in `client/src/pages/Progress.tsx`.

## 6. More exercise types / a review queue
`server/routes/exercises.js` already generates from your weak areas — extend `exercise_results` to
schedule re-tests of exercises you got wrong, similar to the flashcard SRS idea above.

## 7. Multi-language progress isolation
The schema already scopes vocabulary/mistakes/exercises/progress/conversations by
`language_code`, so switching `target_language` in Settings and building a language switcher in
the sidebar is mostly a UI change — the data separation is already there.
