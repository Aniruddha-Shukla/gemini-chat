import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function CopyButton({ text, label = 'Copy', className = '' }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // Clipboard blocked (e.g. non-HTTPS origin): nothing useful to do.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-zinc-500 transition hover:bg-zinc-200/70 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 ${className}`}
      aria-label={copied ? 'Copied' : label}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      <span>{copied ? 'Copied' : label}</span>
    </button>
  );
}
