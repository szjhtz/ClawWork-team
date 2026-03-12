import { useState, useRef, useEffect, useCallback, type MouseEvent } from 'react';
import type { TaskStatus } from '@clawwork/shared';

interface MenuItem {
  label: string;
  action: () => void;
  danger?: boolean;
}

interface ContextMenuProps {
  items: MenuItem[];
  position: { x: number; y: number } | null;
  onClose: () => void;
}

export function ContextMenu({ items, position, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!position) return;
    const handler = (e: Event): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [position, onClose]);

  if (!position) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[140px] py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] shadow-lg"
      style={{ left: position.x, top: position.y }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          onClick={() => { item.action(); onClose(); }}
          className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
            item.danger
              ? 'text-red-400 hover:bg-red-500/10'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function useTaskContextMenu(
  updateStatus: (id: string, status: TaskStatus) => void,
) {
  const [menuState, setMenuState] = useState<{
    position: { x: number; y: number } | null;
    taskId: string;
    taskStatus: TaskStatus;
  }>({ position: null, taskId: '', taskStatus: 'active' });

  const openMenu = useCallback(
    (e: MouseEvent, taskId: string, taskStatus: TaskStatus) => {
      e.preventDefault();
      setMenuState({ position: { x: e.clientX, y: e.clientY }, taskId, taskStatus });
    },
    [],
  );

  const closeMenu = useCallback(() => {
    setMenuState((s) => ({ ...s, position: null }));
  }, []);

  const items: MenuItem[] = [];
  if (menuState.taskStatus === 'active') {
    items.push({ label: '标记完成', action: () => updateStatus(menuState.taskId, 'completed') });
    items.push({ label: '归档', action: () => updateStatus(menuState.taskId, 'archived'), danger: true });
  } else if (menuState.taskStatus === 'completed') {
    items.push({ label: '重新激活', action: () => updateStatus(menuState.taskId, 'active') });
    items.push({ label: '归档', action: () => updateStatus(menuState.taskId, 'archived'), danger: true });
  }

  return { menuState, items, openMenu, closeMenu };
}
