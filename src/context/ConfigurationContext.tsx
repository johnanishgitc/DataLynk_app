import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMasterData } from './MasterDataContext';
import { backendConfigService, OrderEntryPermissions, BackendConfigResponse } from '../services/backendConfigService';
import { apiService } from '../services/api';
import { useUser } from './UserContext';

// Types for configuration
export interface OrderConfig {
  voucherTypeName: string; // Keep for backward compatibility
  defaultVoucherTypeId: string; // New field for voucher type ID
  allowVoucherTypeSelection: boolean; // Allow user to select voucher type
  defaultOrderDueDays: number;
  showOrderDueDate: boolean;
  usePriceLevels: boolean;
  showOrderPdfShareOption: boolean;
  showCustomerAddresses: boolean;
  enableBatchTracking: boolean;
  saveAsOptional: boolean;
  showCreditDaysLimit: boolean; // Enable credit days limit checking
  defaultQuantity: number;
  showAvailableStock: boolean;
  showStockAsYesNo: boolean;
  showDiscount: boolean; // Enable/disable discount option in order entry
  // Razorpay Payment Configuration
  enableRazorpayPayment: boolean;
  promptForOnlinePayment: boolean;
  razorpayKeyId: string;
  razorpayCompanyName: string;
  razorpayDescription: string;
  razorpayLedgerName: string;
  // Backend Configuration Integration
  useBackendConfig: boolean; // Flag to enable/disable backend config
  backendPermissions: OrderEntryPermissions | null; // Backend permissions
  // Voucher Types for Prefix/Suffix
  voucherTypes: any[]; // Voucher types loaded from Tally
  voucherTypesLoaded: boolean; // Flag to indicate if voucher types are loaded
}

export interface MasterDataConfig {
  // Master data configuration options removed as they are not used
}

interface ConfigurationContextType {
  orderConfig: OrderConfig;
  masterDataConfig: MasterDataConfig;
  updateOrderConfig: (config: Partial<OrderConfig>) => void;
  updateMasterDataConfig: (config: Partial<MasterDataConfig>) => void;
  resetOrderConfig: () => void;
  resetMasterDataConfig: () => void;
  // Backend Configuration Methods
  loadBackendConfig: (tallylocId?: string, co_guid?: string, authToken?: string) => Promise<void>;
  isBackendConfigLoaded: boolean;
  backendConfigError: string | null;
  backendConfig: BackendConfigResponse | null;
  hasModule: (moduleName: string) => boolean;
  // Roles Data
  rolesData: any | null;
  setRolesData: (data: any) => void;
  hasModuleFromRoles: (moduleName: string) => boolean;
  // All Permissions Data
  allPermissions: any | null;
  setAllPermissions: (data: any) => void;
  loadAllPermissions: () => Promise<void>;
}

const ConfigurationContext = createContext<ConfigurationContextType | undefined>(undefined);

export const useConfiguration = () => {
  const context = useContext(ConfigurationContext);
  if (context === undefined) {
    throw new Error('useConfiguration must be used within a ConfigurationProvider');
  }
  return context;
};

interface ConfigurationProviderProps {
  children: ReactNode;
}

export const ConfigurationProvider: React.FC<ConfigurationProviderProps> = ({ children }) => {
  // Default configuration values
  const [orderConfig, setOrderConfig] = useState<OrderConfig>({
    voucherTypeName: 'Sales Order', // Keep for backward compatibility
    defaultVoucherTypeId: '', // Will be set when voucher types are loaded
    allowVoucherTypeSelection: true, // Allow user to select voucher type by default
    defaultOrderDueDays: 0,
    showOrderDueDate: false,
    usePriceLevels: false,
    showOrderPdfShareOption: true,
    showCustomerAddresses: true,
    enableBatchTracking: false,
    saveAsOptional: false,
    showCreditDaysLimit: false, // Disabled by default
    defaultQuantity: 0,
    showAvailableStock: false,
    showStockAsYesNo: false,
    showDiscount: true, // Enable discount option by default
    // Razorpay Payment Configuration - Default values
    enableRazorpayPayment: false,
    promptForOnlinePayment: false,
    razorpayKeyId: 'rzp_live_RIyEZsVN6uoqfq',
    razorpayCompanyName: 'TallyCatalyst',
    razorpayDescription: 'Order Payment',
    razorpayLedgerName: 'Bank',
    // Backend Configuration Integration - Default values
    useBackendConfig: false, // Disabled by default, enable when ready
    backendPermissions: null,
    // Voucher Types for Prefix/Suffix - Default values
    voucherTypes: [],
    voucherTypesLoaded: false,
  });

  const [masterDataConfig, setMasterDataConfig] = useState<MasterDataConfig>({});
  
  // Backend configuration state
  const [isBackendConfigLoaded, setIsBackendConfigLoaded] = useState(false);
  const [backendConfigError, setBackendConfigError] = useState<string | null>(null);
  const [backendConfig, setBackendConfig] = useState<BackendConfigResponse | null>(null);
  
  // Roles data state
  const [rolesData, setRolesData] = useState<any | null>(null);
  
  // All permissions state
  const [allPermissions, setAllPermissions] = useState<any | null>(null);

  // Load saved configuration on component mount
  useEffect(() => {
    loadSavedConfig();
  }, []);

  // Watch for voucher types changes and set default if needed
  const masterDataContext = useMasterData();
  useEffect(() => {
    if (masterDataContext && masterDataContext.voucherTypes && masterDataContext.voucherTypes.length > 0) {
      // Check if defaultVoucherTypeId is not set or empty
      if (!orderConfig.defaultVoucherTypeId || orderConfig.defaultVoucherTypeId.trim() === '') {
        // Find "Sales Order" voucher type
        const salesOrderVoucher = masterDataContext.voucherTypes.find(vt => {
          const name = vt?.name;
          //Fixing an error on [ASHWIN'S ANDROID PHONE] where vt.name couldn't run toLowerCase. Should check, likely because the obj wasn't retrieved as expected
          if (typeof name !== 'string') return false;
          const lower = name.toLowerCase();
          return lower.includes('sales order') || lower.includes('salesorder');
        });
        
        if (salesOrderVoucher) {
          console.log('Setting default voucher type to:', salesOrderVoucher.name, 'ID:', salesOrderVoucher.id);
          updateOrderConfig({
            defaultVoucherTypeId: salesOrderVoucher.id,
            voucherTypeName: salesOrderVoucher.name
          });
        } else {
          // If "Sales Order" not found, use the first voucher type
          const firstVoucher = masterDataContext.voucherTypes[0];
          if (firstVoucher && firstVoucher.id && firstVoucher.name) {
            console.log('Sales Order not found, using first voucher type:', firstVoucher.name, 'ID:', firstVoucher.id);
            updateOrderConfig({
              defaultVoucherTypeId: firstVoucher.id,
              voucherTypeName: firstVoucher.name
            });
          } else {
            console.warn('Voucher types present but first entry is invalid:', firstVoucher);
          }
        }
      }
    }
  }, [masterDataContext.voucherTypes, orderConfig.defaultVoucherTypeId]); // Run when voucher types change or defaultVoucherTypeId changes

  // Load configuration from storage
  const loadSavedConfig = async () => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        // Web platform - use localStorage
        const savedOrderConfig = localStorage.getItem('tallyCatalyst_orderConfig');
        const savedMasterDataConfig = localStorage.getItem('tallyCatalyst_masterDataConfig');
        
        if (savedOrderConfig) {
          const parsedOrderConfig = JSON.parse(savedOrderConfig);
          setOrderConfig(prev => ({ ...prev, ...parsedOrderConfig }));
        }
        
        if (savedMasterDataConfig) {
          const parsedMasterDataConfig = JSON.parse(savedMasterDataConfig);
          setMasterDataConfig(prev => ({ ...prev, ...parsedMasterDataConfig }));
        }
      } else {
        // React Native platform - use AsyncStorage
        const savedOrderConfig = await AsyncStorage.getItem('tallyCatalyst_orderConfig');
        const savedMasterDataConfig = await AsyncStorage.getItem('tallyCatalyst_masterDataConfig');
        
        if (savedOrderConfig) {
          const parsedOrderConfig = JSON.parse(savedOrderConfig);
          setOrderConfig(prev => ({ ...prev, ...parsedOrderConfig }));
        }
        
        if (savedMasterDataConfig) {
          const parsedMasterDataConfig = JSON.parse(savedMasterDataConfig);
          setMasterDataConfig(prev => ({ ...prev, ...parsedMasterDataConfig }));
        }
      }
    } catch (error) {
      console.warn('Failed to load saved configuration:', error);
    }
  };

  // Save configuration to storage
  const saveOrderConfig = async (config: OrderConfig) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        // Web platform - use localStorage
        localStorage.setItem('tallyCatalyst_orderConfig', JSON.stringify(config));
      } else {
        // React Native platform - use AsyncStorage
        await AsyncStorage.setItem('tallyCatalyst_orderConfig', JSON.stringify(config));
      }
    } catch (error) {
      console.warn('Failed to save order configuration:', error);
    }
  };

  const saveMasterDataConfig = async (config: MasterDataConfig) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        // Web platform - use localStorage
        localStorage.setItem('tallyCatalyst_masterDataConfig', JSON.stringify(config));
      } else {
        // React Native platform - use AsyncStorage
        await AsyncStorage.setItem('tallyCatalyst_masterDataConfig', JSON.stringify(config));
      }
    } catch (error) {
      console.warn('Failed to save master data configuration:', error);
    }
  };

  const updateOrderConfig = (config: Partial<OrderConfig>) => {
    const newConfig = { ...orderConfig, ...config };
    setOrderConfig(newConfig);
    // Save the updated configuration
    saveOrderConfig(newConfig);
  };

  const updateMasterDataConfig = (config: Partial<MasterDataConfig>) => {
    const newConfig = { ...masterDataConfig, ...config };
    setMasterDataConfig(newConfig);
    // Save the updated configuration
    saveMasterDataConfig(newConfig);
  };

  const resetOrderConfig = () => {
    const defaultConfig: OrderConfig = {
      voucherTypeName: 'Sales Order',
      defaultVoucherTypeId: '',
      allowVoucherTypeSelection: true,
      defaultOrderDueDays: 0,
      showOrderDueDate: false,
      usePriceLevels: false,
      showOrderPdfShareOption: true,
      showCustomerAddresses: true,
      enableBatchTracking: false,
      saveAsOptional: false,
      showCreditDaysLimit: false,
      defaultQuantity: 0,
      showAvailableStock: false,
      showStockAsYesNo: false,
      showDiscount: true,
      // Razorpay Payment Configuration - Default values
      enableRazorpayPayment: false,
      promptForOnlinePayment: false,
      razorpayKeyId: 'rzp_live_RIyEZsVN6uoqfq',
      razorpayCompanyName: 'TallyCatalyst',
      razorpayDescription: 'Order Payment',
      razorpayLedgerName: 'Bank',
      // Backend Configuration Integration - Default values
      useBackendConfig: false,
      backendPermissions: null,
      // Voucher Types for Prefix/Suffix - Default values
      voucherTypes: [],
      voucherTypesLoaded: false,
    };
    setOrderConfig(defaultConfig);
    // Save the reset configuration
    saveOrderConfig(defaultConfig);
  };

  const resetMasterDataConfig = () => {
    const defaultConfig = {};
    setMasterDataConfig(defaultConfig);
    // Save the reset configuration
    saveMasterDataConfig(defaultConfig);
  };

  // Backend configuration methods
  const loadBackendConfig = async (tallylocId?: string, co_guid?: string, authToken?: string) => {
    try {
      console.log('🔧 loadBackendConfig called with:', { tallylocId, co_guid, hasAuthToken: !!authToken });
      setBackendConfigError(null);
      setIsBackendConfigLoaded(false);
      
      // Get user data from context if not provided
      let finalTallylocId = tallylocId;
      let finalCoGuid = co_guid;
      let finalAuthToken = authToken;
      
      if (!finalTallylocId || !finalCoGuid || !finalAuthToken) {
        const userContext = useUser();
        console.log('🔧 Getting user context data:', {
          hasSelectedCompany: !!userContext?.selectedCompany,
          hasUserData: !!userContext?.userData,
          tallylocId: userContext?.selectedCompany?.tallyloc_id,
          coGuid: userContext?.selectedCompany?.GUID,
          hasToken: !!userContext?.userData?.token
        });
        if (!userContext?.selectedCompany?.tallyloc_id || !userContext?.selectedCompany?.GUID || !userContext?.userData?.token) {
          throw new Error('User data not available for backend configuration');
        }
        finalTallylocId = userContext.selectedCompany.tallyloc_id;
        finalCoGuid = userContext.selectedCompany.GUID;
        finalAuthToken = userContext.userData.token;
      }
      
      console.log('🔧 Final parameters for API call:', { finalTallylocId, finalCoGuid, hasFinalAuthToken: !!finalAuthToken });
      
      // Fetch backend configuration
      const config = await backendConfigService.fetchUserAccess(finalTallylocId, finalCoGuid, finalAuthToken);
      
      console.log('🔧 Backend config API response:', {
        success: config?.success,
        hasData: !!config?.data,
        modulesCount: config?.data?.modules?.length || 0,
        modules: config?.data?.modules?.map((m: any) => ({
          module_name: m.module_name,
          is_enabled: m.is_enabled,
          display_name: m.module_display_name
        })) || []
      });
      
      // Store the full backend config
      setBackendConfig(config);
      
      // Extract order entry permissions
      const permissions = backendConfigService.getOrderEntryPermissions(config);
      
      // Update order config with backend permissions
      updateOrderConfig({
        backendPermissions: permissions,
        useBackendConfig: true,
      });
      
      setIsBackendConfigLoaded(true);
      console.log('✅ Backend configuration loaded successfully:', permissions);
      console.log('✅ Enabled modules:', backendConfigService.getEnabledModules(config));
    } catch (error) {
      console.error('Error loading backend configuration:', error);
      setBackendConfigError(error instanceof Error ? error.message : 'Failed to load backend configuration');
      setIsBackendConfigLoaded(false);
    }
  };

  // Helper function to check if a module is enabled
  const hasModule = (moduleName: string): boolean => {
    return backendConfigService.hasModule(backendConfig, moduleName);
  };

  // Helper function to check if a module is enabled from roles data
  const hasModuleFromRoles = (moduleName: string): boolean => {
    if (!rolesData?.data?.modules) return false;
    const module = rolesData.data.modules.find((m: any) => m.module_name === moduleName);
    return module ? module.is_enabled === 1 : false;
  };

  // Load all available permissions
  const loadAllPermissions = async () => {
    try {
      console.log('📋 Loading all available permissions...');
      const response = await apiService.getAllPermissions();
      
      if (response.success && response.data) {
        setAllPermissions(response.data);
        console.log('✅ All permissions loaded successfully');
      } else {
        console.error('❌ Failed to load all permissions:', response.message);
      }
    } catch (error) {
      console.error('❌ Error loading all permissions:', error);
    }
  };

  const value: ConfigurationContextType = {
    orderConfig,
    masterDataConfig,
    updateOrderConfig,
    updateMasterDataConfig,
    resetOrderConfig,
    resetMasterDataConfig,
    // Backend Configuration Methods
    loadBackendConfig,
    isBackendConfigLoaded,
    backendConfigError,
    backendConfig,
    hasModule,
    // Roles Data
    rolesData,
    setRolesData,
    hasModuleFromRoles,
    // All Permissions Data
    allPermissions,
    setAllPermissions,
    loadAllPermissions,
  };

  return (
    <ConfigurationContext.Provider value={value}>
      {children}
    </ConfigurationContext.Provider>
  );
};
