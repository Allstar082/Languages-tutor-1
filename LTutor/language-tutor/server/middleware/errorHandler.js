// Centralized error handler. Never leaks the API key or stack traces to the client in
// unstructured form; always returns { error: { message, code } } with an appropriate status.

export function errorHandler(err, req, res, _next) {
  console.error(`[error] ${req.method} ${req.path}:`, err.message);

  if (err.code === 'MISSING_API_KEY') {
    return res.status(500).json({
      error: { message: 'The server is missing its Anthropic API key. Set ANTHROPIC_API_KEY in server/.env and restart.', code: 'MISSING_API_KEY' },
    });
  }

  if (err.status === 401 || /authentication/i.test(err.message || '')) {
    return res.status(401).json({
      error: { message: 'Claude API rejected the request — check that ANTHROPIC_API_KEY in server/.env is valid.', code: 'INVALID_API_KEY' },
    });
  }

  if (err.status === 429) {
    return res.status(429).json({
      error: { message: 'Claude API rate limit hit. Wait a moment and try again.', code: 'RATE_LIMITED' },
    });
  }

  if (err.name === 'SqliteError' || err.code?.startsWith?.('SQLITE_')) {
    return res.status(500).json({
      error: { message: 'Local database error: ' + err.message, code: 'DB_ERROR' },
    });
  }

  return res.status(err.status || 500).json({
    error: { message: err.message || 'Unexpected server error.', code: err.code || 'INTERNAL_ERROR' },
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: { message: `No route ${req.method} ${req.path}`, code: 'NOT_FOUND' } });
}
