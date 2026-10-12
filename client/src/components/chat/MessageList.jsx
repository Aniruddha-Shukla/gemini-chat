import { useLayoutEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import Logo from '../Logo.jsx';
import Spinner from '../Spinner.jsx';
import MessageBubble from './MessageBubble.jsx';

const SUGGESTIONS = [
  'Explain how JWT authentication works, step by step',
  'Write a debounce function in JavaScript with comments',
  'Compare SQL and NoSQL databases in a table',
  'Give me 5 ideas for a weekend side project',
];

// Distance from the bottom (px) within which we keep following new text.
const STICKY_THRESHOLD = 80;

export default function MessageList({ messages, isLoading, onSuggestion }) {
  const scrollRef = useRef(null);
  const stickToBottom = useRef(true);
  const lastCount = useRef(0);

  // Follow the reply as it streams, unless the user scrolled up to read something.
  // A new message (sent or loaded) always jumps to the bottom.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (messages.length !== lastCount.current) stickToBottom.current = true;
    lastCount.current = messages.length;
    if (stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages, isLoading]);

  function handleScroll() {
    const el = scrollRef.current;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICKY_THRESHOLD;
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner size={24} />
      </div>
    );
  }

  if (messages.length === 0) {
    return <EmptyState onSuggestion={onSuggestion} />;
  }

  return (
    <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        {messages.map((message) => (
          <MessageBubble key={message._id} message={message} />
        ))}
      </div>
    </div>
  );
}

function EmptyState({ onSuggestion }) {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0];

  return (
    <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-8">
      <Logo size={48} />
      <h2 className="mt-4 text-center text-2xl font-semibold tracking-tight">
        {firstName ? `Hi ${firstName}, how can I help?` : 'How can I help?'}
      </h2>
      <div className="mt-8 grid w-full max-w-2xl gap-3 sm:grid-cols-2">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onSuggestion(suggestion)}
            className="rounded-xl border border-zinc-200 px-4 py-3 text-left text-sm text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
