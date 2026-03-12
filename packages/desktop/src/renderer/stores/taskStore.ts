import { create } from 'zustand';
import { buildSessionKey } from '@clawwork/shared';
import type { Task, TaskStatus } from '@clawwork/shared';

const DEFAULT_AGENT_ID = 'main';

interface TaskState {
  tasks: Task[];
  activeTaskId: string | null;

  createTask: () => Task;
  setActiveTask: (id: string | null) => void;
  updateTaskTitle: (id: string, title: string) => void;
  updateTaskStatus: (id: string, status: TaskStatus) => void;
}

function generateId(): string {
  return crypto.randomUUID();
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  activeTaskId: null,

  createTask: () => {
    const id = generateId();
    const now = new Date().toISOString();
    const task: Task = {
      id,
      sessionKey: buildSessionKey(DEFAULT_AGENT_ID, id),
      sessionId: '',
      title: '',
      status: 'active',
      createdAt: now,
      updatedAt: now,
      tags: [],
      artifactDir: '',
    };
    set((s) => ({
      tasks: [task, ...s.tasks],
      activeTaskId: id,
    }));
    return task;
  },

  setActiveTask: (id) => set({ activeTaskId: id }),

  updateTaskTitle: (id, title) =>
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, title, updatedAt: new Date().toISOString() } : t,
      ),
    })),

  updateTaskStatus: (id, status) =>
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, status, updatedAt: new Date().toISOString() } : t,
      ),
    })),
}));
