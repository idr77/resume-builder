import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  if (!content) return null;

  // Split by code blocks first
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2.5 text-xs text-gray-700 dark:text-gray-300 font-sans">
      {parts.map((part, index) => {
        if (part.startsWith('```')) {
          // It's a code block
          const lines = part.split('\n');
          const firstLine = lines[0];
          const lang = firstLine.replace('```', '').trim();
          const code = lines.slice(1, -1).join('\n');
          return (
            <div key={`code-block-${index}`} className="my-3 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
              {lang && (
                <div className="bg-gray-100 dark:bg-gray-900 px-3 py-1.5 border-b border-gray-200 dark:border-gray-800 text-[10px] font-mono text-gray-500 flex justify-between items-center select-none">
                  <span>{lang.toUpperCase()}</span>
                </div>
              )}
              <pre className="bg-gray-950 text-emerald-400 p-3 overflow-x-auto text-[10px] font-mono leading-relaxed">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        // It's standard text, process line-by-line
        const lines = part.split('\n');
        return lines.map((line, lineIdx) => {
          const trimmed = line.trim();

          if (trimmed.startsWith('### ')) {
            const text = trimmed.slice(4);
            return (
              <h3 key={`h3-${lineIdx}-${index}`} className="font-bold text-sm text-indigo-600 dark:text-indigo-400 mt-4 mb-2 border-b border-indigo-50 dark:border-indigo-950 pb-1 flex items-center gap-1.5 leading-snug">
                {parseInlineStyles(text)}
              </h3>
            );
          }

          if (trimmed.startsWith('#### ')) {
            const text = trimmed.slice(5);
            return (
              <h4 key={`h4-${lineIdx}-${index}`} className="font-bold text-xs text-gray-800 dark:text-gray-100 mt-3 mb-1.5 flex items-center gap-1.5 leading-snug">
                {parseInlineStyles(text)}
              </h4>
            );
          }

          if (trimmed.startsWith('## ')) {
            const text = trimmed.slice(3);
            return (
              <h2 key={`h2-${lineIdx}-${index}`} className="font-bold text-base text-indigo-700 dark:text-indigo-300 mt-5 mb-2.5 flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-1 leading-snug">
                {parseInlineStyles(text)}
              </h2>
            );
          }

          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const text = trimmed.slice(2);
            return (
              <ul key={`ul-${lineIdx}-${index}`} className="list-disc pl-5 my-1 space-y-0.5">
                <li className="text-gray-600 dark:text-gray-300 marker:text-indigo-500">
                  {parseInlineStyles(text)}
                </li>
              </ul>
            );
          }

          if (/^\d+\.\s/.test(trimmed)) {
            const match = trimmed.match(/^(\d+)\.\s(.*)/);
            if (match) {
              const num = match[1];
              const text = match[2];
              return (
                <ol key={`ol-${lineIdx}-${index}`} className="list-decimal pl-5 my-1 space-y-0.5" start={parseInt(num, 10)}>
                  <li className="text-gray-600 dark:text-gray-300">
                    {parseInlineStyles(text)}
                  </li>
                </ol>
              );
            }
          }

          if (trimmed.startsWith('> ')) {
            const text = trimmed.slice(2);
            return (
              <blockquote key={`quote-${lineIdx}-${index}`} className="border-l-4 border-indigo-500 dark:border-indigo-700 bg-indigo-50/30 dark:bg-indigo-950/20 px-3 py-2 my-2 rounded-r italic text-gray-600 dark:text-gray-400">
                {parseInlineStyles(text)}
              </blockquote>
            );
          }

          if (!trimmed) {
            return <div key={`spacer-${lineIdx}-${index}`} className="h-1.5" />;
          }

          return (
            <p key={`p-${lineIdx}-${index}`} className="leading-relaxed my-1">
              {parseInlineStyles(line)}
            </p>
          );
        });
      })}
    </div>
  );
}

function parseInlineStyles(text: string): React.ReactNode[] {
  const tokens = text.split(/(\*\*.*?\*\*|`.*?`)/g);

  return tokens.map((token, index) => {
    if (token.startsWith('**') && token.endsWith('**')) {
      return (
        <strong key={`bold-${index}`} className="font-bold text-gray-900 dark:text-white">
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith('`') && token.endsWith('`')) {
      return (
        <code key={`code-${index}`} className="bg-gray-100 dark:bg-gray-800 text-pink-600 dark:text-pink-400 px-1.5 py-0.5 rounded font-mono text-[10px] mx-0.5 border border-gray-200 dark:border-gray-700/50">
          {token.slice(1, -1)}
        </code>
      );
    }
    return token;
  });
}
