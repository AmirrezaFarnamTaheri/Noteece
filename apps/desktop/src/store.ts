import { create } from 'zustand';
import { Space } from '@noteece/types';

interface AppState {
  spaces: Space[];
  activeSpaceId: string | null;
  setSpaces: (spaces: Space[]) => void;
  setActiveSpaceId: (spaceId: string) => void;
}

export const useStore = create<AppState>((set) => ({
  spaces: [],
  activeSpaceId: null,
  setSpaces: (spaces) => set({ spaces }),
  setActiveSpaceId: (spaceId) => set({ activeSpaceId: spaceId }),
}));
