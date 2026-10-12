import { LoaderCircle } from 'lucide-react';

export default function Spinner({ size = 20, className = '' }) {
  return <LoaderCircle size={size} className={`animate-spin text-zinc-400 ${className}`} aria-label="Loading" />;
}

export function FullPageSpinner() {
  return (
    <div className="flex h-full items-center justify-center">
      <Spinner size={28} />
    </div>
  );
}
