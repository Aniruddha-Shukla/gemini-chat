import { Sparkles } from 'lucide-react';

export default function Logo({ size = 32 }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-fuchsia-500 text-white"
      style={{ width: size, height: size }}
    >
      <Sparkles size={size * 0.55} />
    </span>
  );
}
