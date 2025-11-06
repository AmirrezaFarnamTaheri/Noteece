import { useStore } from '../store';

/**
 * Custom hook to access the active space ID
 * Provides a cleaner API than accessing the store directly
 */
export const useActiveSpace = () => {
  const { activeSpaceId, setActiveSpaceId } = useStore();

  return {
    activeSpaceId,
    setActiveSpaceId,
    hasActiveSpace: activeSpaceId !== null,
  };
};
