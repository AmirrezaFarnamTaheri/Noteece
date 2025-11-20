import { create, StateCreator } from 'zustand';
import { persist } from 'zustand/middleware';
import { Space } from '@noteece/types';

export interface AppState {
  spaces: Space[];
  activeSpaceId: string | null;
  setSpaces: (spaces: Space[]) => void;
  setActiveSpaceId: (spaceId: string) => void;
  clearStorage: () => void;
}

const store: StateCreator<AppState> = (set) => ({
  spaces: [],
  activeSpaceId: null,
  setSpaces: (spaces) => set({ spaces }),
  setActiveSpaceId: (spaceId) => set({ activeSpaceId: spaceId }),
  clearStorage: () => set({ spaces: [], activeSpaceId: null }),
});

// Only use persist middleware in browser environment
export const useStore =
  process.env.NODE_ENV === 'test'
    ? create<AppState>(store)
    : create<AppState>()(persist(store, { name: 'app-storage' }));
