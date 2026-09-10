// services/api.ts — a small typed fetch wrapper. Every request goes through here so error
// handling (friendly messages instead of crashes) is consistent across the app.

export class ApiRequestError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch {
    throw new ApiRequestError(
      'Could not reach the server. Is the backend running (npm run dev in server/)?',
      'NETWORK_ERROR'
    );
  }

  if (response.status === 204) return undefined as T;

  let body: any = null;
  try {
    body = await response.json();
  } catch {
    // no JSON body
  }

  if (!response.ok) {
    const message = body?.error?.message || `Request failed (${response.status})`;
    const code = body?.error?.code || 'UNKNOWN_ERROR';
    throw new ApiRequestError(message, code);
  }
  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'POST', body: data !== undefined ? JSON.stringify(data) : undefined }),
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PUT', body: data !== undefined ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
