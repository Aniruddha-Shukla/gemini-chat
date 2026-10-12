import { CircleAlert, X } from 'lucide-react';

export default function ErrorBanner({ message, onDismiss }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-3">
      <div
        role="alert"
        className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 py-2.5 pr-2 pl-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
      >
        <CircleAlert size={16} className="mt-0.5 shrink-0" />
        <span className="flex-1">{message}</span>
        <button type="button" onClick={onDismiss} className="rounded p-0.5 hover:bg-red-100 dark:hover:bg-red-900/50" aria-label="Dismiss error">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
