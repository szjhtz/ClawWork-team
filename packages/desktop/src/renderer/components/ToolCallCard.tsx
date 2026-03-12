import { useState } from 'react';
import { ChevronDown, ChevronRight, Loader2, Check, X } from 'lucide-react';
import type { ToolCall } from '@clawwork/shared';

interface ToolCallCardProps {
  toolCall: ToolCall;
}

function statusIcon(status: ToolCall['status']) {
  switch (status) {
    case 'running':
      return <Loader2 size={12} className="animate-spin text-[var(--accent)]" />;
    case 'done':
      return <Check size={12} className="text-green-400" />;
    case 'error':
      return <X size={12} className="text-red-400" />;
  }
}

export default function ToolCallCard({ toolCall }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);

  const duration = toolCall.completedAt
    ? `${((new Date(toolCall.completedAt).getTime() - new Date(toolCall.startedAt).getTime()) / 1000).toFixed(1)}s`
    : null;

  return (
    <div className="my-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)] overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
      >
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {statusIcon(toolCall.status)}
        <span className="font-mono truncate flex-1 text-left">{toolCall.name}</span>
        {duration && <span className="text-[var(--text-muted)]">{duration}</span>}
      </button>

      {expanded && (
        <div className="px-3 pb-2 text-xs font-mono">
          {toolCall.args && (
            <div className="mb-1">
              <p className="text-[var(--text-muted)] mb-0.5">args:</p>
              <pre className="whitespace-pre-wrap text-[var(--text-secondary)] bg-[var(--bg-primary)] p-2 rounded overflow-x-auto">
                {JSON.stringify(toolCall.args, null, 2)}
              </pre>
            </div>
          )}
          {toolCall.result && (
            <div>
              <p className="text-[var(--text-muted)] mb-0.5">result:</p>
              <pre className="whitespace-pre-wrap text-[var(--text-secondary)] bg-[var(--bg-primary)] p-2 rounded overflow-x-auto max-h-40 overflow-y-auto">
                {toolCall.result}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
