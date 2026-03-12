import { useRef, useCallback, type KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { useTaskStore } from '../stores/taskStore';
import { useMessageStore } from '../stores/messageStore';

export default function ChatInput() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeTask = useTaskStore((s) =>
    s.tasks.find((t) => t.id === s.activeTaskId),
  );

  const addMessage = useMessageStore((s) => s.addMessage);
  const updateTaskTitle = useTaskStore((s) => s.updateTaskTitle);

  const handleSend = useCallback(async () => {
    const textarea = textareaRef.current;
    if (!textarea || !activeTask) return;

    const content = textarea.value.trim();
    if (!content) return;

    textarea.value = '';
    textarea.style.height = 'auto';

    // Add user message to store
    addMessage(activeTask.id, 'user', content);

    // Auto-title from first user message
    if (!activeTask.title) {
      const title = content.slice(0, 30).replace(/\n/g, ' ').trim();
      updateTaskTitle(activeTask.id, title + (content.length > 30 ? '…' : ''));
    }

    // Send to Gateway
    try {
      await window.clawwork.sendMessage(activeTask.sessionKey, content);
    } catch (err) {
      addMessage(activeTask.id, 'system', `发送失败: ${String(err)}`);
    }
  }, [activeTask, addMessage, updateTaskTitle]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleInput = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`;
  }, []);

  const disabled = !activeTask;

  return (
    <div className="flex-shrink-0 px-6 pb-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end gap-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-3">
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder={disabled ? '请先创建一个任务…' : '描述你的任务…'}
            disabled={disabled}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            className="flex-1 resize-none bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none max-h-32 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={disabled}
            className="flex-shrink-0 p-2 rounded-lg bg-[var(--accent)] text-black hover:opacity-90 transition-opacity disabled:opacity-30"
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-[11px] text-[var(--text-muted)] text-center mt-2">
          由 OpenClaw 驱动 · 任务文件自动 Git 归档
        </p>
      </div>
    </div>
  );
}
