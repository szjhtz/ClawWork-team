import { useRef, useCallback, type KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion as motionPresets } from '@/styles/design-tokens';
import { Button } from '@/components/ui/button';
import { useTaskStore } from '../stores/taskStore';
import { useMessageStore } from '../stores/messageStore';
import { useUiStore } from '../stores/uiStore';

export default function ChatInput() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeTask = useTaskStore((s) =>
    s.tasks.find((t) => t.id === s.activeTaskId),
  );

  const addMessage = useMessageStore((s) => s.addMessage);
  const setProcessing = useMessageStore((s) => s.setProcessing);
  const updateTaskTitle = useTaskStore((s) => s.updateTaskTitle);
  const isOffline = useUiStore((s) => s.gatewayStatus === 'disconnected');

  const handleSend = useCallback(async () => {
    const textarea = textareaRef.current;
    if (!textarea || !activeTask || isOffline) return;

    const content = textarea.value.trim();
    if (!content) return;

    textarea.value = '';
    textarea.style.height = 'auto';

    addMessage(activeTask.id, 'user', content);
    setProcessing(activeTask.id, true);

    if (!activeTask.title) {
      const title = content.slice(0, 30).replace(/\n/g, ' ').trim();
      updateTaskTitle(activeTask.id, title + (content.length > 30 ? '\u2026' : ''));
    }

    try {
      await window.clawwork.sendMessage(activeTask.sessionKey, content);
    } catch (err) {
      setProcessing(activeTask.id, false);
      const msg = err instanceof Error ? err.message : String(err);
      addMessage(activeTask.id, 'system', `\u53D1\u9001\u5931\u8D25: ${msg}`);
      toast.error('Failed to send message', { description: msg });
    }
  }, [activeTask, addMessage, setProcessing, updateTaskTitle, isOffline]);

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
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, []);

  const disabled = !activeTask || isOffline;
  const placeholder = isOffline
    ? '\u79BB\u7EBF\u6A21\u5F0F \u2014 \u53EA\u8BFB'
    : !activeTask
      ? '\u8BF7\u5148\u521B\u5EFA\u4E00\u4E2A\u4EFB\u52A1\u2026'
      : '\u63CF\u8FF0\u4F60\u7684\u4EFB\u52A1\u2026';

  return (
    <div className="flex-shrink-0 px-6 pb-5">
      <div className="max-w-3xl mx-auto">
        <div className={cn(
          'flex items-end gap-2',
          'bg-[var(--bg-elevated)] rounded-2xl p-3.5',
          'border border-[var(--border-subtle)]',
          'shadow-[var(--shadow-elevated)]',
          'ring-accent-focus transition-all duration-200',
          isOffline && 'opacity-60',
        )}>
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder={placeholder}
            disabled={disabled}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            className={cn(
              'flex-1 resize-none bg-transparent',
              'text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
              'outline-none max-h-40 disabled:opacity-50',
            )}
          />
          <motion.div
            whileHover={motionPresets.scale.whileHover}
            whileTap={motionPresets.scale.whileTap}
            transition={motionPresets.scale.transition}
          >
            <Button
              variant="soft"
              size="icon"
              onClick={handleSend}
              disabled={disabled}
              className="rounded-xl"
            >
              <Send size={16} />
            </Button>
          </motion.div>
        </div>
        <p className="text-xs text-[var(--text-muted)] text-center mt-2.5 tracking-wide">
          {isOffline
            ? '\u79BB\u7EBF\u6A21\u5F0F \u2014 \u53EF\u6D4F\u89C8\u5386\u53F2\u4EFB\u52A1\u548C\u6587\u4EF6'
            : '\u7531 OpenClaw \u9A71\u52A8 \u00B7 \u4EFB\u52A1\u6587\u4EF6\u81EA\u52A8 Git \u5F52\u6863'}
        </p>
      </div>
    </div>
  );
}
