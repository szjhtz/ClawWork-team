import Markdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import { Bot } from 'lucide-react';

interface StreamingMessageProps {
  content: string;
}

export default function StreamingMessage({ content }: StreamingMessageProps) {
  return (
    <div className="flex gap-3 py-3">
      <div className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-[var(--accent-dim)]">
        <Bot size={14} className="text-[var(--accent)]" />
      </div>
      <div className="min-w-0 max-w-[85%]">
        <div className="text-sm leading-relaxed text-[var(--text-primary)]">
          <div className="prose-chat">
            <Markdown rehypePlugins={[rehypeHighlight]}>
              {content}
            </Markdown>
          </div>
          <span className="inline-block w-2 h-4 bg-[var(--accent)] animate-pulse ml-0.5 align-middle" />
        </div>
      </div>
    </div>
  );
}
