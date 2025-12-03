import { useCallback } from 'react';
import { navigationManager } from '../utils/navigationManager';

export const useSafeNavigation = () => {
  const safeNavigate = useCallback((route: string, options?: { replace?: boolean }) => {
    if (options?.replace) {
      navigationManager.replace(route);
    } else {
      navigationManager.navigate(route);
    }
  }, []);

  const safeReplace = useCallback((route: string) => {
    navigationManager.replace(route);
  }, []);

  const safePush = useCallback((route: string) => {
    navigationManager.navigate(route);
  }, []);

  const isAppReady = navigationManager.isReady();

  return {
    safeNavigate,
    safeReplace,
    safePush,
    isAppReady,
  };
};
