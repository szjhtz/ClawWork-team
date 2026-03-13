import { create } from 'zustand';
import { buildSessionKey } from '@clawwork/shared';
import type { Task, TaskStatus } from '@clawwork/shared';

interface TaskState {
  tasks: Task[];
  activeTaskId: string | null;
  hydrated: boolean;

  createTask: () => Task;
  setActiveTask: (id: string | null) => void;
  updateTaskTitle: (id: string, title: string) => void;
  updateTaskStatus: (id: string, status: TaskStatus) => void;
  hydrate: () => Promise<void>;
  adoptTasks: (discovered: {
    taskId: string;
    sessionKey: string;
    title: string;
    updatedAt: string;
  }[]) => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  activeTaskId: null,
  hydrated: false,

  createTask: () => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const task: Task = {
      id,
      sessionKey: buildSessionKey(id),
      sessionId: '',
      title: '',
      status: 'active',
      createdAt: now,
      updatedAt: now,
      tags: [],
      artifactDir: '',
    };
    set((s) => ({ tasks: [task, ...s.tasks], activeTaskId: id }));
    window.clawwork.persistTask(task).catch(() => {});
    return task;
  },

  setActiveTask: (id) => set({ activeTaskId: id }),

  updateTaskTitle: (id, title) => {
    const now = new Date().toISOString();
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, title, updatedAt: now } : t)),
    }));
    window.clawwork.persistTaskUpdate({ id, title, updatedAt: now }).catch(() => {});
  },

  updateTaskStatus: (id, status) => {
    const now = new Date().toISOString();
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, status, updatedAt: now } : t)),
    }));
    window.clawwork.persistTaskUpdate({ id, status, updatedAt: now }).catch(() => {});
  },

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const res = await window.clawwork.loadTasks();
      if (res.ok && res.rows) {
        set({
          tasks: res.rows.map((r) => ({
            ...r,
            status: r.status as TaskStatus,
          })),
          hydrated: true,
        });
      }
    } catch {
      console.warn('[taskStore] hydrate failed');
    }
  },

  adoptTasks: (discovered) => {
    const existing = new Set(get().tasks.map((t) => t.id));
    const newTasks: Task[] = [];
    for (const d of discovered) {
      if (existing.has(d.taskId)) continue;
      const task: Task = {
        id: d.taskId,
        sessionKey: d.sessionKey,
        sessionId: '',
        title: d.title,
        status: 'active',
        createdAt: d.updatedAt,
        updatedAt: d.updatedAt,
        tags: [],
        artifactDir: '',
      };
      newTasks.push(task);
      window.clawwork.persistTask(task).catch(() => {});
    }
    if (newTasks.length > 0) {
      set((s) => ({ tasks: [...newTasks, ...s.tasks] }));
    }
  },
}));
