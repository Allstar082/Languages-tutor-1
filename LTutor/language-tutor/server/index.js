import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import chatRoutes from './routes/chat.js';
import conversationRoutes from './routes/conversations.js';
import vocabularyRoutes from './routes/vocabulary.js';
import profileRoutes from './routes/profile.js';
import progressRoutes from './routes/progress.js';
import mistakesRoutes from './routes/mistakes.js';
import exercisesRoutes from './routes/exercises.js';
import grammarRoutes from './routes/grammar.js';
import readingRoutes from './routes/reading.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Importing db.js here runs schema creation + seeding as a side effect on startup.
import './db.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, hasApiKey: Boolean(process.env.ANTHROPIC_API_KEY) });
});

app.use('/api/chat', chatRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/vocabulary', vocabularyRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/mistakes', mistakesRoutes);
app.use('/api/exercises', exercisesRoutes);
app.use('/api/grammar', grammarRoutes);
app.use('/api/reading', readingRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('WARNING: ANTHROPIC_API_KEY is not set. Copy .env.example to server/.env and add your key.');
  }
});
