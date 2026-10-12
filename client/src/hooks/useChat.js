import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../api/axios.js';
import { chatApi, streamMessage } from '../api/chat.api.js';

let tempCounter = 0;
const tempId = (prefix) => `${prefix}-${Date.now()}-${++tempCounter}`;

/**
 * All chat state for the page: sidebar list, the open conversation's messages,
 * and sending/streaming. `conversationId` comes from the URL (undefined = new chat).
 */
export function useChat(conversationId) {
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);

  const streamRef = useRef(null); // AbortController of the reply currently streaming
  const loadedIdRef = useRef(null); // conversation whose messages are in `messages`
  const viewRef = useRef(0); // incremented every time the user switches conversations

  // Add a conversation to the sidebar, or move it to the top.
  const upsertConversation = useCallback((summary) => {
    setConversations((list) => [summary, ...list.filter((c) => c._id !== summary._id)]);
  }, []);

  // Leave the current view: stop any reply streaming into it and clear the messages.
  const resetView = useCallback(() => {
    streamRef.current?.abort();
    streamRef.current = null;
    setIsStreaming(false);
    viewRef.current += 1;
    loadedIdRef.current = null;
    setMessages([]);
  }, []);

  // ---- Sidebar: load the user's conversations once ----
  useEffect(() => {
    let active = true;
    chatApi
      .list()
      .then((list) => active && setConversations(list))
      .catch((err) => active && setError(getErrorMessage(err)))
      .finally(() => active && setIsLoadingList(false));
    return () => {
      active = false;
    };
  }, []);

  // ---- Messages: load whenever the conversation in the URL changes ----
  useEffect(() => {
    // We just created this conversation ourselves and are already showing it.
    if (conversationId && conversationId === loadedIdRef.current) return;

    resetView();
    if (!conversationId) {
      setIsLoadingMessages(false);
      return;
    }

    let active = true;
    setIsLoadingMessages(true);
    chatApi
      .get(conversationId)
      .then((conversation) => {
        if (!active) return;
        loadedIdRef.current = conversation._id;
        setMessages(conversation.messages);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(getErrorMessage(err));
        if (err.response?.status === 404) navigate('/chat', { replace: true });
      })
      .finally(() => active && setIsLoadingMessages(false));
    return () => {
      active = false;
    };
  }, [conversationId, navigate, resetView]);

  // Stop streaming if the page unmounts (e.g. logout).
  useEffect(() => () => streamRef.current?.abort(), []);

  /**
   * Sends a prompt and streams the reply into the message list.
   * Resolves to false when nothing was sent, so the input can restore the text.
   */
  const sendMessage = useCallback(
    async (prompt) => {
      const text = prompt.trim();
      if (!text || streamRef.current) return false;

      const controller = new AbortController();
      streamRef.current = controller;
      const view = viewRef.current;
      const stillViewing = () => viewRef.current === view;

      // Optimistic UI: show the prompt and an empty reply immediately.
      // Temp ids are unique, so these updates are harmless no-ops if the user switches away.
      const userId = tempId('user');
      const modelId = tempId('model');
      const patchModel = (update) =>
        setMessages((list) => list.map((m) => (m._id === modelId ? { ...m, ...update(m) } : m)));

      setError(null);
      setIsStreaming(true);
      setMessages((list) => [
        ...list,
        { _id: userId, role: 'user', content: text },
        { _id: modelId, role: 'model', content: '', pending: true },
      ]);

      let meta = null; // { conversationId, title }
      let gotText = false; // once the server has text, it saves the exchange
      let streamError = null;

      try {
        await streamMessage({
          conversationId,
          prompt: text,
          signal: controller.signal,
          onEvent: ({ event, data }) => {
            switch (event) {
              case 'meta':
                meta = data;
                break;
              case 'chunk':
                if (!gotText) {
                  gotText = true;
                  upsertConversation({ _id: meta.conversationId, title: meta.title, updatedAt: new Date().toISOString() });
                }
                patchModel((m) => ({ content: m.content + data.text }));
                break;
              case 'error':
                streamError = data.message;
                break;
              case 'done':
                // Swap the optimistic messages for the saved ones (real ids and timestamps).
                upsertConversation(data.conversation);
                setMessages((list) =>
                  list.map((m) => (m._id === userId ? data.userMessage : m._id === modelId ? data.modelMessage : m))
                );
                break;
            }
          },
        });
      } catch (err) {
        // Pressing Stop or switching chats aborts the request; that's not an error.
        if (!controller.signal.aborted) streamError = getErrorMessage(err);
      } finally {
        if (streamRef.current === controller) {
          streamRef.current = null;
          setIsStreaming(false);
        }
      }

      if (!gotText) {
        // Nothing reached the server's database: drop the optimistic messages.
        setMessages((list) => list.filter((m) => m._id !== userId && m._id !== modelId));
        if (!stillViewing()) return true;
        if (streamError) setError(streamError);
        return false;
      }

      patchModel(() => ({ pending: false }));
      if (!stillViewing()) return true;
      if (streamError) setError(streamError);

      // A brand-new chat now exists on the server: give it its own URL.
      if (!conversationId && meta) {
        loadedIdRef.current = meta.conversationId;
        navigate(`/chat/${meta.conversationId}`, { replace: true });
      }
      return true;
    },
    [conversationId, navigate, upsertConversation]
  );

  const stop = useCallback(() => streamRef.current?.abort(), []);

  const startNewChat = useCallback(() => {
    setError(null);
    if (conversationId) navigate('/chat'); // the effect above resets the view
    else resetView();
  }, [conversationId, navigate, resetView]);

  const deleteConversation = useCallback(
    async (id) => {
      try {
        await chatApi.remove(id);
        setConversations((list) => list.filter((c) => c._id !== id));
        if (id === conversationId) navigate('/chat', { replace: true });
      } catch (err) {
        setError(getErrorMessage(err));
      }
    },
    [conversationId, navigate]
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    conversations,
    messages,
    isLoadingList,
    isLoadingMessages,
    isStreaming,
    error,
    sendMessage,
    stop,
    startNewChat,
    deleteConversation,
    clearError,
  };
}
