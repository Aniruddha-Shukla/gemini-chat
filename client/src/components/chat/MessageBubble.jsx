import { memo } from 'react';
import Logo from '../Logo.jsx';
import CopyButton from './CopyButton.jsx';
import Markdown from './Markdown.jsx';

// Memoized: while a reply streams, only the message that changed re-renders,
// not every Markdown block above it.
function MessageBubble({ message }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-indigo-600 px-4 py-2.5 break-words whitespace-pre-wrap text-white">
          {message.content}
        </div>
      </div>
    );
  }

  const isWaiting = message.pending && !message.content;

  return (
    <div className="group flex gap-3">
      <div className="pt-0.5">
        <Logo size={28} />
      </div>
      <div className="min-w-0 flex-1">
        {isWaiting ? (
          <TypingIndicator />
        ) : (
          <>
            <Markdown>{message.content}</Markdown>
            {message.pending ? (
              <span className="mt-1 inline-block h-4 w-2 animate-pulse rounded-sm bg-zinc-400" aria-hidden />
            ) : (
              <div className="mt-1 -ml-1.5 opacity-100 transition md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
                <CopyButton text={message.content} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex h-7 items-center gap-1" aria-label="Gemini is thinking">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="size-2 animate-bounce rounded-full bg-zinc-400"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}

export default memo(MessageBubble);
