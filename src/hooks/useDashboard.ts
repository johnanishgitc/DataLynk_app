import { useState, useCallback } from 'react';
import { useUser } from '../context/UserContext';
import { useSafeNavigation } from './useSafeNavigation';
// TEMPORARILY DISABLED FOR PERFORMANCE TESTING
// import { useNavigationGuard } from './useNavigationGuard';

export const useDashboard = () => {
  const [showMenu, setShowMenu] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { clearUserData } = useUser();
  const { safeReplace, safePush, isAppReady } = useSafeNavigation();
  // TEMPORARILY DISABLED FOR PERFORMANCE TESTING
  // const { navigateWithGuard } = useNavigationGuard();

  // Memoized handlers to prevent unnecessary re-renders
  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return; // Prevent multiple logout attempts
    
    // Set logging out state
    setIsLoggingOut(true);
    
    try {
      // Clear user data first
      await clearUserData();
      
      // Wait for app to be ready and state to clear completely
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Check if app is ready before navigation
      if (!isAppReady) {
        console.log('⏳ App not ready, waiting for navigation...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Navigate to login screen with logout parameter using safe navigation
      safeReplace('/?logout=true');
      
    } catch (error) {
      console.error('❌ Dashboard logout error:', error);
      // Fallback navigation with additional delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      safeReplace('/');
    } finally {
      setIsLoggingOut(false);
    }
  }, [clearUserData, isLoggingOut, safeReplace]);

  const handleOrderEntry = useCallback(() => {
    // TEMPORARILY DISABLED FOR PERFORMANCE TESTING
    // navigateWithGuard('/order-entry', {
    //   alertMessage: 'Master data is required for order entry. Please wait for loading to complete.'
    // });
    safePush('/order-entry');
  }, [safePush]);

  const handleMenuPress = useCallback(() => {
    setShowMenu(prev => !prev);
  }, []);

  const handleNavigation = useCallback((route: string) => {
    setShowMenu(false);
    if (route === 'logout') {
      handleLogout();
    } else if (route === 'company-selection') {
      safePush('/company-selection');
    } else if (route === 'dashboard') {
      safePush('/dashboard');
    } else if (route === 'configuration') {
      safePush('/configuration');
    } else if (route === 'reports') {
      // TEMPORARILY DISABLED FOR PERFORMANCE TESTING
      // Reports require master data
      // navigateWithGuard('/reports', {
      //   alertMessage: 'Master data is required for reports. Please wait for loading to complete.'
      // });
      safePush('/reports');
    } else if (route === 'authorize-vouchers') {
      safePush('/authorize-vouchers');
    } else if (route === 'create-customer') {
      safePush('/create-customer');
    } else if (route === 'salesperson-routes') {
      safePush('/salesperson-routes');
    }
  }, [handleLogout, safePush]);

  const closeMenu = useCallback(() => {
    setShowMenu(false);
  }, []);

  return {
    showMenu,
    handleLogout,
    handleOrderEntry,
    handleMenuPress,
    handleNavigation,
    closeMenu,
    isLoggingOut,
  };
};
