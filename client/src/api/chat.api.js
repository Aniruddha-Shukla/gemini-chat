import { api } from './axios.js';

export const chatApi = {
  list: () => api.get('/chats').then((res) => res.data.conversations),
  get: (id) => api.get(`/chats/${id}`).then((res) => res.data.conversation),
  remove: (id) => api.delete(`/chats/${id}`),
};

/**
 * Sends a prompt and reports the reply as it streams in.
 *
 * The server answers with Server-Sent Events, and onEvent({ event, data }) is
 * called for each one: 'meta' → 'chunk'… → ('error') → 'done'.
 *
 * This goes through the same Axios instance as everything else (so the JWT
 * interceptor applies), using the fetch adapter, which can hand back the
 * response body as a ReadableStream.
 */
export async function streamMessage({ conversationId, prompt, signal, onEvent }) {
  let response;
  try {
    response = await api.post(
      '/chats/messages',
      { conversationId, prompt },
      {
        adapter: 'fetch',
        responseType: 'stream',
        timeout: 0, // long answers can take a while; the user can press Stop instead
        signal,
      }
    );
  } catch (error) {
    // Error bodies come back as a stream too; parse them so getErrorMessage() can read them.
    const body = error.response?.data;
    if (body instanceof ReadableStream) {
      error.response.data = await new Response(body).json().catch(() => ({}));
    }
    throw error;
  }

  const reader = response.data.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;

    // Events are separated by a blank line. A network chunk can end mid-event,
    // so the last (possibly incomplete) piece stays in the buffer.
    buffer += value;
    const rawEvents = buffer.split('\n\n');
    buffer = rawEvents.pop();

    for (const raw of rawEvents) {
      const parsed = parseEvent(raw);
      if (parsed) onEvent(parsed);
    }
  }
}

function parseEvent(raw) {
  let event = 'message';
  let data = '';
  for (const line of raw.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) data += line.slice(5).trim();
    // Lines starting with ':' are heartbeats and are ignored.
  }
  return data ? { event, data: JSON.parse(data) } : null;
}
