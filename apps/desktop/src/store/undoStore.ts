import { create } from 'zustand';

interface UndoToastState {
  visible: boolean;
  message: string;
  action: () => void;
  timer: NodeJS.Timeout | null;
  show: (message: string, action: () => void, duration?: number) => void;
  hide: () => void;
}

export const useUndoToast = create<UndoToastState>((set, get) => ({
  visible: false,
  message: '',
  action: () => {},
  timer: null,
  show: (message, action, duration = 5000) => {
    const { timer } = get();
    if (timer) clearTimeout(timer);

    const newTimer = setTimeout(() => {
      set({ visible: false });
    }, duration);

    set({ visible: true, message, action, timer: newTimer });
  },
  hide: () => {
    const { timer } = get();
    if (timer) clearTimeout(timer);
    set({ visible: false });
  },
}));
