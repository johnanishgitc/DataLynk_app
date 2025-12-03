import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { backgroundCheckService, BackgroundCheckConfig } from '../services/backgroundService';

interface BackgroundServiceContextType {
  config: BackgroundCheckConfig;
  isInitialized: boolean;
  updateConfig: (config: Partial<BackgroundCheckConfig>, companyData?: any) => Promise<void>;
  manualCheck: (companyData?: any, currentHighestMasterId?: number) => Promise<{ newVouchersFound: number; latestMasterId: number }>;
}

const BackgroundServiceContext = createContext<BackgroundServiceContextType | undefined>(undefined);

export const useBackgroundService = () => {
  const context = useContext(BackgroundServiceContext);
  if (!context) {
    throw new Error('useBackgroundService must be used within a BackgroundServiceProvider');
  }
  return context;
};

interface BackgroundServiceProviderProps {
  children: React.ReactNode;
}

export const BackgroundServiceProvider: React.FC<BackgroundServiceProviderProps> = ({ children }) => {
  const [config, setConfig] = useState<BackgroundCheckConfig>({
    enabled: false,
    frequencyMinutes: 5,
    lastMasterId: 0,
  });
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initializeBackgroundService();
  }, []);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isInitialized) {
        // App came to foreground, refresh configuration
        refreshConfiguration();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isInitialized]);

  const initializeBackgroundService = async () => {
    try {
      console.log('🚀 [BackgroundServiceProvider] Initializing background service...');
      await backgroundCheckService.initialize();
      
      const currentConfig = backgroundCheckService.getConfiguration();
      setConfig(currentConfig);
      setIsInitialized(true);
      
      console.log('✅ [BackgroundServiceProvider] Background service initialized successfully');
    } catch (error) {
      console.error('❌ [BackgroundServiceProvider] Failed to initialize background service:', error);
    }
  };

  const refreshConfiguration = async () => {
    try {
      const currentConfig = backgroundCheckService.getConfiguration();
      setConfig(currentConfig);
    } catch (error) {
      console.error('❌ [BackgroundServiceProvider] Failed to refresh configuration:', error);
    }
  };

  const updateConfig = async (newConfig: Partial<BackgroundCheckConfig>, companyData?: any) => {
    try {
      await backgroundCheckService.updateConfiguration(newConfig, companyData);
      const updatedConfig = backgroundCheckService.getConfiguration();
      setConfig(updatedConfig);
    } catch (error) {
      console.error('❌ [BackgroundServiceProvider] Failed to update configuration:', error);
      throw error;
    }
  };

  const manualCheck = async (companyData?: any, currentHighestMasterId?: number) => {
    try {
      return await backgroundCheckService.manualCheck(companyData, currentHighestMasterId);
    } catch (error) {
      console.error('❌ [BackgroundServiceProvider] Manual check failed:', error);
      throw error;
    }
  };

  const value: BackgroundServiceContextType = {
    config,
    isInitialized,
    updateConfig,
    manualCheck,
  };

  return (
    <BackgroundServiceContext.Provider value={value}>
      {children}
    </BackgroundServiceContext.Provider>
  );
};
