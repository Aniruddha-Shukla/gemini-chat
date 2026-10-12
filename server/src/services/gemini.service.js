import { GoogleGenAI, ApiError as GeminiApiError } from '@google/genai';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

// This is the only module that reads GEMINI_API_KEY or talks to Google.
// Controllers pass in plain { role, content } messages and get text back.

const SYSTEM_INSTRUCTION = [
  'You are a helpful, accurate assistant inside a chat app.',
  'Format answers with GitHub-flavored Markdown (headings, lists, tables, fenced code blocks with a language) when it improves readability.',
  'Be concise unless the user asks for depth.',
].join(' ');

let client = null;

export function isGeminiConfigured() {
  return Boolean(env.geminiApiKey);
}

export function assertGeminiConfigured() {
  if (!isGeminiConfigured()) {
    throw new ApiError(503, "Gemini is not configured yet. Set GEMINI_API_KEY (server/.env locally, or your host's environment variables) and restart the server.");
  }
}

// Created lazily so the server can boot (and auth can be used) before a key is added.
function getClient() {
  assertGeminiConfigured();
  client ??= new GoogleGenAI({ apiKey: env.geminiApiKey });
  return client;
}

/**
 * Streams a reply to the conversation so far.
 * @param {{ role: 'user' | 'model', content: string }[]} messages  Oldest first; the last one is the new prompt.
 * @param {AbortSignal} [signal]  Abort to stop generation (e.g. the browser disconnected).
 * @returns {AsyncGenerator<string>} Text fragments as Gemini produces them.
 */
export async function* streamReply(messages, signal) {
  const stream = await getClient().models.generateContentStream({
    model: env.geminiModel,
    contents: messages.map(({ role, content }) => ({ role, parts: [{ text: content }] })),
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      abortSignal: signal,
    },
  });

  for await (const chunk of stream) {
    // `text` is undefined for chunks that carry only metadata or thinking.
    if (chunk.text) yield chunk.text;
  }
}

// Turns SDK/network failures into messages that are safe and useful to show in the UI.
export function describeGeminiError(err) {
  if (err instanceof ApiError) return err.message;

  if (err instanceof GeminiApiError) {
    const { status } = err;
    if (status === 400 && /api key/i.test(err.message)) return "The Gemini API key was rejected. Check the server's GEMINI_API_KEY setting.";
    if (status === 401 || status === 403) return "The Gemini API key is not authorized for this request. Check the server's GEMINI_API_KEY setting.";
    if (status === 404) return `The model "${env.geminiModel}" was not found. Check the server's GEMINI_MODEL setting.`;
    if (status === 429) return 'Gemini rate limit or quota reached. Please wait a moment and try again.';
    if (status >= 500) return 'Gemini is temporarily unavailable. Please try again.';
    if (status === 400) return 'Gemini could not process this request. Try rephrasing your message.';
  }

  return 'Could not get a response from Gemini. Please try again.';
}
