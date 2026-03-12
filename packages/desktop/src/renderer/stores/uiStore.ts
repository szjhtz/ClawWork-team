import { create } from 'zustand';

interface UiState {
  rightPanelOpen: boolean;
  toggleRightPanel: () => void;
  setRightPanelOpen: (open: boolean) => void;

  /** taskIds with unread messages (background tasks that received new content) */
  unreadTaskIds: Set<string>;
  markUnread: (taskId: string) => void;
  clearUnread: (taskId: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  rightPanelOpen: false,
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
  setRightPanelOpen: (open) => set({ rightPanelOpen: open }),

  unreadTaskIds: new Set(),
  markUnread: (taskId) =>
    set((s) => {
      const next = new Set(s.unreadTaskIds);
      next.add(taskId);
      return { unreadTaskIds: next };
    }),
  clearUnread: (taskId) =>
    set((s) => {
      const next = new Set(s.unreadTaskIds);
      next.delete(taskId);
      return { unreadTaskIds: next };
    }),
}));
