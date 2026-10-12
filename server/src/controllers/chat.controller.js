import mongoose from 'mongoose';
import { Conversation } from '../models/Conversation.js';
import { assertGeminiConfigured, describeGeminiError, streamReply } from '../services/gemini.service.js';
import { ApiError } from '../utils/ApiError.js';

const MAX_PROMPT_LENGTH = 20_000;
// How many past messages are sent to Gemini as context. Bounds token cost on long chats.
const MAX_HISTORY_MESSAGES = 40;
// Keeps idle proxies from closing the stream while the model is still thinking.
const HEARTBEAT_MS = 15_000;

// Looks up a conversation that belongs to the current user. Someone else's id is a 404,
// not a 403, so ids can't be probed.
async function findOwnedConversation(id, userId) {
  const conversation = mongoose.isObjectIdOrHexString(id)
    ? await Conversation.findOne({ _id: id, user: userId })
    : null;
  if (!conversation) throw new ApiError(404, 'Conversation not found');
  return conversation;
}

function makeTitle(prompt) {
  const oneLine = prompt.replace(/\s+/g, ' ').trim();
  if (oneLine.length <= 60) return oneLine;
  // Break on a word boundary when there's a reasonable one.
  const cut = oneLine.slice(0, 60);
  const lastSpace = cut.lastIndexOf(' ');
  return `${lastSpace > 30 ? cut.slice(0, lastSpace) : cut}…`;
}

const toSummary = (c) => ({ _id: c._id, title: c.title, createdAt: c.createdAt, updatedAt: c.updatedAt });

// GET /api/chats — sidebar list, newest activity first, without message bodies.
export async function listConversations(req, res) {
  const conversations = await Conversation.find({ user: req.user._id })
    .select('title createdAt updatedAt')
    .sort({ updatedAt: -1 })
    .lean();
  res.json({ conversations });
}

// GET /api/chats/:id — one conversation with its full message log.
export async function getConversation(req, res) {
  const conversation = await findOwnedConversation(req.params.id, req.user._id);
  res.json({ conversation });
}

// DELETE /api/chats/:id
export async function deleteConversation(req, res) {
  const conversation = await findOwnedConversation(req.params.id, req.user._id);
  await conversation.deleteOne();
  res.status(204).end();
}

/**
 * POST /api/chats/messages   body: { conversationId?, prompt }
 *
 * Streams the reply as Server-Sent Events:
 *   event: meta   data: { conversationId, title }   sent first; the id is final even for a new chat
 *   event: chunk  data: { text }                     repeated as Gemini generates
 *   event: error  data: { message }                  generation failed (partial text may have been sent)
 *   event: done   data: { conversation, userMessage, modelMessage }   the exchange was saved
 *
 * The exchange is saved only if Gemini produced some text, so a failed request
 * leaves no orphaned prompt behind. If the client disconnects mid-reply,
 * generation is cancelled and the partial reply is kept.
 */
export async function sendMessage(req, res) {
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
  const { conversationId } = req.body ?? {};

  if (!prompt) throw new ApiError(400, 'Message cannot be empty');
  if (prompt.length > MAX_PROMPT_LENGTH) throw new ApiError(400, `Message is too long (max ${MAX_PROMPT_LENGTH} characters)`);
  if (conversationId != null && typeof conversationId !== 'string') throw new ApiError(400, 'Invalid conversationId');

  const conversation = conversationId
    ? await findOwnedConversation(conversationId, req.user._id)
    : new Conversation({ user: req.user._id, title: makeTitle(prompt) });

  // Checked before the stream opens, so the client gets a normal JSON error.
  assertGeminiConfigured();

  conversation.messages.push({ role: 'user', content: prompt });
  const history = conversation.messages
    .slice(-MAX_HISTORY_MESSAGES)
    .map(({ role, content }) => ({ role, content }));

  // ---- Open the event stream ----
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // disable response buffering in nginx
  });
  const send = (event, data) => {
    if (!res.writableEnded) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };
  const heartbeat = setInterval(() => !res.writableEnded && res.write(': ping\n\n'), HEARTBEAT_MS);

  // If the browser goes away (tab closed, "Stop" clicked), stop paying for tokens nobody will read.
  const abort = new AbortController();
  res.on('close', () => abort.abort());

  send('meta', { conversationId: conversation._id, title: conversation.title });

  let reply = '';
  let failure = null;
  try {
    for await (const text of streamReply(history, abort.signal)) {
      reply += text;
      send('chunk', { text });
    }
  } catch (err) {
    failure = err;
  } finally {
    clearInterval(heartbeat);
  }

  const clientLeft = abort.signal.aborted;
  if (failure && !clientLeft) {
    console.error('Gemini request failed:', failure);
    send('error', { message: describeGeminiError(failure) });
  }

  if (reply) {
    conversation.messages.push({ role: 'model', content: reply });
    try {
      await conversation.save();
      const [userMessage, modelMessage] = conversation.messages.slice(-2);
      send('done', { conversation: toSummary(conversation), userMessage, modelMessage });
    } catch (err) {
      console.error('Failed to save conversation:', err);
      send('error', { message: 'The reply could not be saved. Please try again.' });
    }
  }

  res.end();
}
