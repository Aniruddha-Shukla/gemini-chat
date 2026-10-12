import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CopyButton from './CopyButton.jsx';

// react-markdown never renders raw HTML from the model (no rehype-raw), so
// replies can't inject scripts or markup into the page.

// Collects the plain text under a syntax-tree node (used to copy code blocks).
const textOf = (node) => (node?.type === 'text' ? node.value : (node?.children ?? []).map(textOf).join(''));

function CodeBlock({ node, children }) {
  const code = node?.children?.[0];
  const language = code?.properties?.className?.[0]?.replace('language-', '') ?? '';

  return (
    <div className="not-prose my-4 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center justify-between bg-zinc-100 py-1 pr-1.5 pl-4 text-xs text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
        <span className="font-mono">{language || 'code'}</span>
        <CopyButton text={textOf(code)} label="Copy code" />
      </div>
      <pre className="overflow-x-auto bg-zinc-50 p-4 font-mono text-[13px] leading-relaxed text-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
        {children}
      </pre>
    </div>
  );
}

const components = {
  pre: CodeBlock,
  a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
  table: ({ node, ...props }) => (
    <div className="overflow-x-auto">
      <table {...props} />
    </div>
  ),
};

export default function Markdown({ children }) {
  return (
    <div className="prose prose-zinc max-w-none dark:prose-invert prose-headings:font-semibold prose-a:text-indigo-600 prose-code:rounded prose-code:bg-zinc-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:font-normal prose-code:before:content-none prose-code:after:content-none dark:prose-a:text-indigo-400 dark:prose-code:bg-zinc-800">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
