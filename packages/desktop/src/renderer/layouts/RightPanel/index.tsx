import { X, FileText, GitBranch, CheckSquare, Square, Loader2 } from 'lucide-react';
import { useTaskStore } from '../../stores/taskStore';
import { useMessageStore, EMPTY_MESSAGES } from '../../stores/messageStore';
import type { ProgressStep, Artifact } from '@clawwork/shared';

interface RightPanelProps {
  onClose: () => void;
}

function extractProgressSteps(messages: { role: string; content: string }[]): ProgressStep[] {
  const steps: ProgressStep[] = [];
  for (const msg of messages) {
    if (msg.role !== 'assistant') continue;
    // Match patterns like: - [x] Step done, - [ ] Step pending, - Step plain
    const lines = msg.content.split('\n');
    for (const line of lines) {
      const checked = line.match(/^\s*[-*]\s*\[x\]\s+(.+)/i);
      if (checked) {
        steps.push({ label: checked[1].trim(), status: 'completed' });
        continue;
      }
      const unchecked = line.match(/^\s*[-*]\s*\[\s\]\s+(.+)/);
      if (unchecked) {
        steps.push({ label: unchecked[1].trim(), status: 'pending' });
        continue;
      }
      // Numbered lists: 1. Step
      const numbered = line.match(/^\s*\d+\.\s+(.+)/);
      if (numbered && lines.filter((l) => /^\s*\d+\./.test(l)).length >= 3) {
        steps.push({ label: numbered[1].trim(), status: 'pending' });
      }
    }
  }
  return steps;
}

function collectArtifacts(messages: { artifacts: Artifact[] }[]): Artifact[] {
  return messages.flatMap((m) => m.artifacts);
}

function stepIcon(status: ProgressStep['status']) {
  switch (status) {
    case 'completed':
      return <CheckSquare size={14} className="text-green-400 flex-shrink-0" />;
    case 'in_progress':
      return <Loader2 size={14} className="animate-spin text-[var(--accent)] flex-shrink-0" />;
    case 'pending':
      return <Square size={14} className="text-[var(--text-muted)] flex-shrink-0" />;
  }
}

export default function RightPanel({ onClose }: RightPanelProps) {
  const activeTaskId = useTaskStore((s) => s.activeTaskId);
  const messages = useMessageStore((s) =>
    activeTaskId ? (s.messagesByTask[activeTaskId] ?? EMPTY_MESSAGES) : EMPTY_MESSAGES,
  );

  const steps = extractProgressSteps(messages);
  const artifacts = collectArtifacts(messages);

  return (
    <div className="flex flex-col h-full pt-10">
      <div className="flex items-center justify-between px-4 h-12 border-b border-[var(--border)] flex-shrink-0">
        <h3 className="text-sm font-medium text-[var(--text-primary)]">上下文</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Progress section */}
        {steps.length > 0 && (
          <section>
            <h4 className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-2">
              进度 ({steps.filter((s) => s.status === 'completed').length}/{steps.length})
            </h4>
            <div className="space-y-1">
              {steps.map((step, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 px-2 py-1.5 rounded text-sm text-[var(--text-secondary)]"
                >
                  {stepIcon(step.status)}
                  <span className={step.status === 'completed' ? 'line-through opacity-60' : ''}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Artifacts section */}
        <section>
          <h4 className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-2">
            任务产物
          </h4>
          <div className="space-y-1.5">
            {artifacts.length === 0 ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] text-sm text-[var(--text-secondary)]">
                <FileText size={14} className="opacity-60" />
                <span className="truncate">暂无文件</span>
              </div>
            ) : (
              artifacts.map((a) => (
                <button
                  key={a.id}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors text-left"
                  title={a.filePath}
                >
                  <FileText size={14} className="opacity-60 flex-shrink-0" />
                  <span className="truncate flex-1">{a.name}</span>
                </button>
              ))
            )}
          </div>
        </section>

        {/* Git section */}
        <section>
          <h4 className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-2">
            版本记录
          </h4>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] text-sm text-[var(--text-secondary)]">
            <GitBranch size={14} className="opacity-60" />
            <span className="truncate">暂无提交</span>
          </div>
        </section>
      </div>
    </div>
  );
}
