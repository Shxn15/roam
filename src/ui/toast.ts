import { create } from 'zustand';

export interface Toast {
  id: number;
  message: string;
  tone: 'info' | 'error';
}

interface ToastState {
  toasts: Toast[];
  push(message: string, tone?: Toast['tone']): void;
  dismiss(id: number): void;
}

let nextId = 1;

export const useToasts = create<ToastState>((set, get) => ({
  toasts: [],
  push(message, tone = 'info') {
    const id = nextId++;
    set({ toasts: [...get().toasts, { id, message, tone }] });
    setTimeout(() => get().dismiss(id), tone === 'error' ? 7000 : 3500);
  },
  dismiss(id) {
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  },
}));

export function notify(message: string, tone: Toast['tone'] = 'info'): void {
  useToasts.getState().push(message, tone);
}

export function reportError(context: string) {
  return (error: unknown) => {
    console.error(context, error);
    notify(`${context}: ${error instanceof Error ? error.message : String(error)}`, 'error');
  };
}
