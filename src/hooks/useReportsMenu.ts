import { useState, useCallback } from 'react';
import { useUser } from '../context/UserContext';
import { useSafeNavigation } from './useSafeNavigation';
import { router } from 'expo-router';

export const useReportsMenu = () => {
  const [showMenu, setShowMenu] = useState(false);
  const { clearUserData } = useUser();
  const { safeReplace, safePush } = useSafeNavigation();

  const handleMenuPress = useCallback(() => {
    setShowMenu(prev => !prev);
  }, []);

  const handleNavigation = useCallback((route: string) => {
    setShowMenu(false);
    if (route === 'logout') {
      clearUserData();
      router.replace('/');
    } else if (route === 'company-selection') {
      safePush('/company-selection');
    } else if (route === 'dashboard') {
      safePush('/dashboard');
    } else if (route === 'order-entry') {
      safePush('/order-entry');
    } else if (route === 'reports') {
      safePush('/reports');
    } else if (route === 'configuration') {
      safePush('/configuration');
    }
  }, [clearUserData, safePush]);

  const closeMenu = useCallback(() => {
    setShowMenu(false);
  }, []);

  return {
    showMenu,
    handleMenuPress,
    handleNavigation,
    closeMenu,
  };
};

