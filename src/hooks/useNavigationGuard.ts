import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useMasterData } from '../context/MasterDataContext';
import { useSafeNavigation } from './useSafeNavigation';

export const useNavigationGuard = () => {
  const { isMasterDataReady, isMasterDataLoading } = useMasterData();
  const { safePush, safeReplace } = useSafeNavigation();

  const navigateWithGuard = useCallback((
    route: string, 
    options?: { 
      replace?: boolean; 
      showAlert?: boolean;
      alertMessage?: string;
    }
  ) => {
    const { replace = false, showAlert = true, alertMessage } = options || {};

    // If master data is loading, show loading message
    if (isMasterDataLoading) {
      if (showAlert) {
        Alert.alert(
          'Please Wait',
          'Master data is still loading. Please wait a moment before proceeding.',
          [{ text: 'OK' }]
        );
      }
      return false;
    }

    // If master data is not ready, show alert and prevent navigation
    if (!isMasterDataReady) {
      if (showAlert) {
        Alert.alert(
          'Data Not Ready',
          alertMessage || 'Required data is not yet loaded. Please wait for the loading to complete.',
          [{ text: 'OK' }]
        );
      }
      return false;
    }

    // Master data is ready, proceed with navigation
    if (replace) {
      safeReplace(route);
    } else {
      safePush(route);
    }
    return true;
  }, [isMasterDataReady, isMasterDataLoading, safePush, safeReplace]);

  const canNavigate = useCallback(() => {
    return isMasterDataReady && !isMasterDataLoading;
  }, [isMasterDataReady, isMasterDataLoading]);

  return {
    navigateWithGuard,
    canNavigate,
    isMasterDataReady,
    isMasterDataLoading,
  };
};


