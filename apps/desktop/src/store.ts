import { create, StateCreator } from 'zustand';
import { persist } from 'zustand/middleware';
import { Space } from '@noteece/types';
import { checkSpaceExists } from './services/api';

export interface AppState {
  spaces: Space[];
  activeSpaceId: string | null;
  zenMode: boolean;
  setSpaces: (spaces: Space[]) => void;
  setActiveSpaceId: (spaceId: string) => void;
  toggleZenMode: () => void;
  clearStorage: () => void;
}

const store: StateCreator<AppState> = (set) => ({
  spaces: [],
  activeSpaceId: null,
  zenMode: false,
  setSpaces: (spaces) => set({ spaces }),
  setActiveSpaceId: (spaceId) => set({ activeSpaceId: spaceId }),
  toggleZenMode: () => set((state) => ({ zenMode: !state.zenMode })),
  clearStorage: () => set({ spaces: [], activeSpaceId: null, zenMode: false }),
});

// Only use persist middleware in browser environment
export const useStore =
  process.env.NODE_ENV === 'test'
    ? create<AppState>(store)
    : create<AppState>()(
        persist(store, {
          name: 'app-storage',
          partialize: (state) => ({
            activeSpaceId: state.activeSpaceId,
            zenMode: state.zenMode,
            // spaces are not persisted to ensure fresh data on load
            spaces: [],
          }),
          onRehydrateStorage: () => (state) => {
            const spaceId = state?.activeSpaceId;
            if (spaceId) {
              return new Promise((resolve) => {
                checkSpaceExists(spaceId).then((exists) => {
                  if (!exists && state) {
                    console.warn('Hydrated space ID not found, resetting.');
                    state.activeSpaceId = null;
                  }
                  resolve(undefined);
                });
              });
            }
          },
        })
      );
