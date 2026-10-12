import { ArrowUp, Square } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';

const MAX_LENGTH = 20_000; // matches the server limit
const MAX_HEIGHT = 200; // px before the textarea starts scrolling

export default function PromptInput({ onSend, onStop, isStreaming, disabled }) {
  const [value, setValue] = useState('');
  const textareaRef = useRef(null);

  // Grow with the content up to MAX_HEIGHT.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [value]);

  const canSend = value.trim().length > 0 && !isStreaming && !disabled;

  async function submit() {
    if (!canSend) return;
    const text = value;
    setValue('');
    const sent = await onSend(text);
    // If the request failed before anything was saved, give the text back for a retry.
    if (!sent) setValue((current) => current || text);
    textareaRef.current?.focus();
  }

  function handleKeyDown(event) {
    // Enter sends, Shift+Enter adds a newline. Ignore Enter while an IME is composing.
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <div className="shrink-0 px-4 pb-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="mx-auto flex max-w-3xl items-end gap-2 rounded-3xl border border-zinc-300 bg-white py-2 pr-2 pl-4 shadow-sm transition focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900"
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message Gemini…"
          aria-label="Message"
          maxLength={MAX_LENGTH}
          autoFocus
          className="max-h-[200px] flex-1 resize-none bg-transparent py-1.5 text-[15px] leading-6 outline-none placeholder:text-zinc-400"
        />
        {isStreaming ? (
          <button
            type="button"
            onClick={onStop}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            aria-label="Stop generating"
            title="Stop generating"
          >
            <Square size={14} fill="currentColor" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSend}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-zinc-300 dark:disabled:bg-zinc-700"
            aria-label="Send message"
            title="Send (Enter)"
          >
            <ArrowUp size={18} />
          </button>
        )}
      </form>
      <p className="mt-2 text-center text-xs text-zinc-400">
        Gemini can make mistakes. Double-check important information.
      </p>
    </div>
  );
}
