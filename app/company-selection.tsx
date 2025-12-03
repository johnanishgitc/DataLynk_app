import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  FlatList,
  // RefreshControl, // Disabled - using refresh button in header instead
} from 'react-native';
import { useUser } from '../src/context/UserContext';
import { useMasterData } from '../src/context/MasterDataContext';
import { useConfiguration } from '../src/context/ConfigurationContext';
import { useRoles } from '../src/context/RolesContext';
import { useConnection } from '../src/context/ConnectionContext';
import { useSafeNavigation } from '../src/hooks/useSafeNavigation';
import { useMasterDataLoader } from '../src/hooks/useMasterDataLoader';
import { apiService } from '../src/services/api';
import { backendConfigService } from '../src/services/backendConfigService';
import { permissionsDataService } from '../src/services/permissionsDataService';
// Parsing functions are now handled by useMasterDataLoader hook
import { 
  SearchBar, 
  CompanyHeader, 
} from '../src/components/company';
import { MasterDataLoadingScreen } from '../src/components/common';
import { OfflineBanner } from '../src/components/common/OfflineBanner';
import { UserConnection } from '../src/config/api';
import { router, useFocusEffect } from 'expo-router';

export default function CompanySelectionPage() {
  const { userData, selectedCompany, setSelectedCompany, clearUserData, isSessionRestoring } = useUser();
  const { isOffline, testConnection } = useConnection();
  const { 
    isMasterDataLoading, 
    masterDataProgress, 
    isLoadingItems, 
    isLoadingCustomers,
    isMasterDataReady,
    setVoucherTypes,
    updateMasterDataProgress,
    clearMasterData
  } = useMasterData();
  const { setLoading: setRolesLoading, setError: setRolesError, setCurrentCompanyRoles } = useRoles();
  
  // Get step information and loading function from master data loader
  const { currentStep, stepInfo, loadMasterData } = useMasterDataLoader();
  const { orderConfig, loadBackendConfig, updateOrderConfig, setRolesData } = useConfiguration();
  const { safePush, safeReplace } = useSafeNavigation();
  const [companies, setCompanies] = useState<UserConnection[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<UserConnection[]>([]);
  const [searchText, setSearchText] = useState('');

  // Sort companies: online first, then offline, both alphabetically
  const sortCompanies = useCallback((companiesToSort: UserConnection[]): UserConnection[] => {
    return [...companiesToSort].sort((a, b) => {
      // Determine if company is online
      const aIsOnline = a.status !== 'offline' && a.status !== 'Offline' && a.guid && a.guid.trim() !== '';
      const bIsOnline = b.status !== 'offline' && b.status !== 'Offline' && b.guid && b.guid.trim() !== '';
      
      // Sort by online status first (online companies come before offline)
      if (aIsOnline && !bIsOnline) return -1;
      if (!aIsOnline && bIsOnline) return 1;
      
      // If both have the same online status, sort alphabetically by company name
      const aName = (a.company || a.conn_name || '').toLowerCase();
      const bName = (b.company || b.conn_name || '').toLowerCase();
      return aName.localeCompare(bName);
    });
  }, []);
  const [isLoading, setIsLoading] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedCompanyForLoading, setSelectedCompanyForLoading] = useState<UserConnection | null>(null);
  const [navigationTimeout, setNavigationTimeout] = useState<NodeJS.Timeout | null>(null);
  const [hasNavigated, setHasNavigated] = useState(false);
  const [hasAutoLoaded, setHasAutoLoaded] = useState(false); // Flag to prevent multiple auto-loads
  const [isLoadingAborted, setIsLoadingAborted] = useState(false); // Flag to abort loading after timeout
  const isHandlingCompanySelectRef = React.useRef(false); // Ref to prevent duplicate handleCompanySelect calls
  const hasAutoLoadedRef = React.useRef(false); // Ref for synchronous auto-load check

  // Guard: Redirect to login if no valid session
  useEffect(() => {
    if (!userData || !userData.token) {
      console.log('🔒 No valid session, redirecting to login');
      safeReplace('/');
      return;
    }
  }, [userData, safeReplace]);



  // Test API endpoint directly
  const testApiEndpoint = useCallback(async () => {
    try {
      console.log('🧪 Testing API endpoint directly...');
      const url = 'https://itcatalystindia.com/Development/CustomerPortal_API/api/tally/user-connections';
      const authToken = apiService.getAuthToken();
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('🧪 Direct API test response status:', response.status);
      console.log('🧪 Direct API test response headers:', Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const data = await response.json();
        console.log('🧪 Direct API test response data:', JSON.stringify(data, null, 2));
        return { success: true, data };
      } else {
        const errorText = await response.text();
        console.log('🧪 Direct API test error response:', errorText);
        return { success: false, error: errorText };
      }
    } catch (error) {
      console.error('🧪 Direct API test failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, []);

  // Load companies with retry mechanism
  const loadCompanies = useCallback(async (retryCount = 0) => {
    console.log('🔄 Starting to load companies...', retryCount > 0 ? `(Retry ${retryCount})` : '');
    
    // Clear backend config cache on app start
    backendConfigService.clearCache();
    console.log('🧹 Cleared backend config cache on app start');
    
    setIsLoading(true);
    
    // Set a maximum timeout for the entire operation
    const timeoutId = setTimeout(() => {
      console.log('⏰ Company loading timeout reached');
      setIsLoading(false);
    }, 25000); // 25 second total timeout
    
    try {
      const authToken = apiService.getAuthToken();
      console.log('🔑 Auth token available:', !!authToken);
      
      if (!authToken) {
        console.log('❌ No auth token, clearing companies');
        setCompanies([]);
        setFilteredCompanies([]);
        clearTimeout(timeoutId);
        return;
      }

      // Use offline-first approach by default
      console.log('🔄 Using offline-first approach to load companies...');
      console.log('🔄 Calling apiService.getCompaniesOfflineFirst()...');
      const response = await apiService.getCompaniesOfflineFirst();
      console.log('🔄 getCompaniesOfflineFirst response:', response?.success ? 'Success' : 'Failed', response?.data ? 'Has data' : 'No data');
      
      if (response?.success && response?.data) {
        const allCompanies = [
          ...(response.data.createdByMe || []),
          ...(response.data.sharedWithMe || [])
        ];
        
        console.log('📊 Total companies found:', allCompanies.length);
        console.log('📊 Companies loaded with offline-first approach:', allCompanies.map(c => ({ 
          company: c.company, 
          guid: c.guid, 
          status: c.status 
        })));
        
        // Sort companies: online first, then offline, both alphabetically
        const sortedCompanies = sortCompanies(allCompanies);
        
        setCompanies(sortedCompanies);
        setFilteredCompanies(sortedCompanies);
        clearTimeout(timeoutId);
        return;
      } else {
        console.log('❌ Offline-first approach failed:', response?.message);
        // Fallback to empty companies if offline-first fails
        setCompanies([]);
        setFilteredCompanies([]);
      }
    } catch (error) {
      console.error('❌ Error loading companies:', error);
      
      // Retry logic for caught errors - reduced retry count
      if (retryCount < 1) {
        console.log('🔄 Retrying company load due to error...');
        clearTimeout(timeoutId);
        setTimeout(() => {
          loadCompanies(retryCount + 1);
        }, 2000); // Fixed 2 second delay
        return;
      }
      
      setCompanies([]);
      setFilteredCompanies([]);
      clearTimeout(timeoutId);
    } finally {
      console.log('🏁 Finished loading companies, setting isLoading to false');
      setIsLoading(false);
    }
  }, []); // Remove isLoading dependency to prevent circular dependency

  // Handle company selection
  const handleCompanySelect = useCallback(async (company: UserConnection) => {
    console.log('🎬 handleCompanySelect called for:', company.company, 'isSelecting:', isSelecting, 'refValue:', isHandlingCompanySelectRef.current);
    console.log('🎬 handleCompanySelect - Full company object:', JSON.stringify(company, null, 2));
    
    // Use ref guard first (most reliable)
    if (isHandlingCompanySelectRef.current) {
      console.log('⚠️ Company selection already in progress (ref check), ignoring duplicate call for:', company.company);
      return;
    }
    
    if (isSelecting) {
      console.log('⚠️ Company selection already in progress (state check), ignoring duplicate call for:', company.company);
      return;
    }
    
    // Lock immediately with ref
    isHandlingCompanySelectRef.current = true;
    console.log('🔒 Locked handleCompanySelect with ref');
    
    // Also set hasAutoLoaded immediately to prevent auto-load effect from triggering
    setHasAutoLoaded(true);
    console.log('🔒 Set hasAutoLoaded to true to prevent auto-load interference');
    
    console.log('🔄 Starting company selection process for:', company.company);
    console.log('📊 Current state before selection:', {
      isSelecting,
      selectedCompanyForLoading: selectedCompanyForLoading?.company,
      isLoadingItems,
      isLoadingCustomers,
      isMasterDataReady
    });
    
    // Store company for offline access
    try {
      console.log('📊 Storing company for offline access:', company.company);
      console.log('📊 About to call apiService.storeCompanyOnLoad...');
      console.log('📊 Company data being passed to storage:', JSON.stringify(company, null, 2));
      await apiService.storeCompanyOnLoad(company);
      console.log('✅ Company stored successfully');
    } catch (error) {
      console.error('⚠️ Failed to store company, continuing with selection:', error);
      // Don't block the selection process if storage fails
    }
    
    // Clear old master data before loading new company
    console.log('🧹 Clearing old master data before loading new company');
    clearMasterData();
    
    // Check if company is offline BEFORE setting loading states
    const isCompanyOfflineBeforeLoad = !company.guid || company.guid.trim() === '' || company.status === 'offline' || company.status === 'Offline';
    
    // Only set loading states for online companies
    if (!isCompanyOfflineBeforeLoad) {
      setIsSelecting(true);
      setSelectedCompanyForLoading(company);
      setIsLoadingAborted(false); // Reset abort flag
    } else {
      // For offline companies, don't set loading states to prevent loading screen
      console.log('📴 Offline company detected - skipping loading states');
      setIsSelecting(false);
      setSelectedCompanyForLoading(null);
    }
    
    setHasNavigated(false); // Reset navigation flag for new company selection
    
    // Only set timeout for online companies (offline companies navigate immediately)
    if (!isCompanyOfflineBeforeLoad) {
      // Set a timeout to force navigation after 2 minutes (in case of network issues)
      const timeout = setTimeout(() => {
        console.log('⏰ Navigation timeout reached (2 min), forcing navigation to dashboard');
        setIsLoadingAborted(true); // Signal to abort ongoing loading
        safePush('/dashboard');
        setSelectedCompanyForLoading(null);
        setIsSelecting(false);
      }, 120000); // 2 minutes timeout (increased from 30s)
      
      setNavigationTimeout(timeout as unknown as NodeJS.Timeout);
    }
    
    try {
      // Use conn_name as fallback if company name is empty (for offline companies)
      const companyName = company.company || company.conn_name || 'Unknown Company';
      
      // Set the selected company in context
      setSelectedCompany({
        company: companyName,
        shared_email: company.shared_email,
        access_type: company.access_type,
        tallyloc_id: company.tallyloc_id.toString(),
        GUID: company.guid || '',
        booksfrom: company.booksfrom,
        startingfrom: company.startingfrom,
        address: company.address,
        pincode: company.pincode,
        statename: company.statename,
        countryname: company.countryname,
        email: company.email,
        phonenumber: company.phonenumber,
        mobilenumbers: company.mobilenumbers,
        gstinno: company.gstinno,
        status: company.status,
        createdAt: company.createdAt,
      });

      // If company is offline or GUID is missing, skip remote loads and navigate immediately
      // Note: We already checked this above and cleared loading states, so this is just for navigation
      if (isCompanyOfflineBeforeLoad) {
        console.log('🚀 Offline/no-GUID company selected – navigating immediately');
        console.log('🔍 Company details:', {
          company: company.company || company.conn_name,
          guid: company.guid,
          status: company.status,
          tallyloc_id: company.tallyloc_id
        });
        
        // Try to load permissions from offline storage
        try {
          if (company.guid && company.guid.trim() !== '') {
            console.log('📥 Loading permissions from offline storage...');
            const offlinePermissions = await permissionsDataService.getPermissions(
              company.guid,
              company.tallyloc_id
            );
            
            if (offlinePermissions) {
              console.log('✅ Loaded permissions from offline storage');
              setRolesData(offlinePermissions);
              console.log('✅ Permissions loaded into configuration context');
            } else {
              console.log('⚠️ No offline permissions found for this company');
            }
          }
        } catch (permError) {
          console.error('⚠️ Failed to load offline permissions:', permError);
          // Continue even if permissions loading fails
        }
        
        // Clear any pending timeout (though we shouldn't have set one for offline companies)
        if (navigationTimeout) {
          clearTimeout(navigationTimeout);
          setNavigationTimeout(null);
        }
        
        // Mark as navigated and reset ref immediately
        setHasNavigated(true);
        isHandlingCompanySelectRef.current = false;
        console.log('🔓 Unlocked handleCompanySelect ref (offline company)');
        
        // Navigate immediately using router.push directly for offline companies
        console.log('🚀 Navigating to dashboard for offline company...');
        // Use a small timeout to ensure context update is processed
        setTimeout(() => {
          router.push('/dashboard');
          console.log('✅ Navigation called for offline company');
        }, 100);
        
        // Allow future navigations after a brief delay
        setTimeout(() => {
          setHasNavigated(false);
          console.log('🔄 Reset hasNavigated flag');
        }, 500);
        return;
      }

      // Set auth token for API calls
      if (userData?.token) {
        apiService.setAuthToken(userData.token);
      }

      // Load user roles for the selected company (skip if offline or no GUID)
      // Determine if company is offline
      const isCompanyOffline = company.status === 'offline' || company.status === 'Offline' || !company.guid || company.guid.trim() === '';
      
      try {
        if (!isCompanyOffline && company.guid && company.guid.trim() !== '') {
          setRolesLoading(true);
          setRolesError(null);
          
          console.log('🔐 Loading user roles for company:', company.company || company.conn_name);
          const rolesResponse = await apiService.getUserWiseCoWiseRoles(company.tallyloc_id.toString(), company.guid);
        
        if (rolesResponse.success && rolesResponse.data) {
          console.log('✅ User roles loaded successfully:', rolesResponse.data);
          
          // Parse the access-control response structure
          const responseData = rolesResponse.data.data; // Access the inner data object
          
          // Debug log for modules in roles response
          console.log('🔍 Roles Response - Modules Debug:', {
            hasModules: !!responseData.modules,
            modulesCount: responseData.modules?.length || 0,
            modules: responseData.modules?.map((m: any) => ({
              module_name: m.module_name,
              is_enabled: m.is_enabled,
              display_name: m.module_display_name
            })) || []
          });
          
          // Store roles data in configuration context
          setRolesData(rolesResponse.data);
          console.log('✅ Roles data stored in configuration context');
          
          // Store permissions offline for future use
          try {
            await permissionsDataService.storePermissions(
              company.guid,
              company.tallyloc_id,
              rolesResponse.data
            );
            console.log('✅ Permissions stored offline');
          } catch (permError) {
            console.error('⚠️ Failed to store permissions offline:', permError);
            // Don't block the flow if offline storage fails
          }
          
          // For mobile app order entry, only use permissions from place_order module
          const placeOrderModule = responseData.modules?.find((module: any) => module.module_name === 'place_order');
          
          // Use only place_order module permissions for mobile app
          const uniquePermissions = placeOrderModule?.permissions || [];
          
          const userRoles = uniquePermissions.map((permission: any) => ({
            role_id: permission.permission_key,
            role_name: permission.display_name,
            permissions: [permission.permission_key],
            is_active: permission.granted,
            permission_value: permission.permission_value
          }));
          
          setCurrentCompanyRoles({
            company_guid: company.guid,
            company_name: company.company,
            user_roles: userRoles,
            access_level: responseData.access_summary?.is_owner ? 'owner' : 'read',
            is_active: true
          });

          // Also update the configuration context with backend permissions
          // Convert the permissions to the format expected by the configuration context
          const backendPermissions = {
            showPayTerms: false,
            showDelvTerms: false,
            showRateAmtColumn: false,
            editRate: false,
            showDiscColumn: false,
            editDiscount: false,
            showClsStckColumn: false,
            showGodownBrkup: false,
            showMultiCoBrkup: false,
            saveOptional: false,
          };

          // Update permissions based on the place_order module permissions
          uniquePermissions.forEach((permission: any) => {
            switch (permission.permission_key) {
              case 'show_payterms':
                backendPermissions.showPayTerms = permission.granted;
                break;
              case 'show_delvterms':
                backendPermissions.showDelvTerms = permission.granted;
                break;
              case 'show_rateamt_Column':
                backendPermissions.showRateAmtColumn = permission.granted;
                break;
              case 'edit_rate':
                backendPermissions.editRate = permission.granted;
                break;
              case 'show_disc_Column':
                backendPermissions.showDiscColumn = permission.granted;
                break;
              case 'edit_discount':
                backendPermissions.editDiscount = permission.granted;
                break;
              case 'show_ClsStck_Column':
                backendPermissions.showClsStckColumn = permission.granted;
                break;
              case 'show_godownbrkup':
                backendPermissions.showGodownBrkup = permission.granted;
                break;
              case 'show_multicobrkup':
                backendPermissions.showMultiCoBrkup = permission.granted;
                break;
              case 'save_optional':
                backendPermissions.saveOptional = permission.granted;
                break;
            }
          });

          // Update the configuration context
          updateOrderConfig({
            backendPermissions: backendPermissions,
            useBackendConfig: true,
          });
        } else {
          console.warn('⚠️ Failed to load user roles:', rolesResponse.message);
          setRolesError(rolesResponse.message || 'Failed to load user roles');
        }
        } else {
          console.log('⏭️ Skipping user roles loading - company is offline or has no GUID');
          // Set empty roles for offline companies
          setCurrentCompanyRoles({
            company_guid: company.guid || '',
            company_name: company.company || company.conn_name || '',
            user_roles: [],
            access_level: 'read',
            is_active: true
          });
        }
      } catch (rolesError) {
        console.error('❌ Error loading user roles:', rolesError);
        setRolesError(rolesError instanceof Error ? rolesError.message : 'Failed to load user roles');
      } finally {
        setRolesLoading(false);
      }

      // Load full backend configuration to get modules information (skip if offline or no GUID)
      if (!isCompanyOffline && company.guid && company.guid.trim() !== '') {
        try {
          console.log('🔧 Loading backend configuration for modules...');
          console.log('🔧 Parameters:', {
            tallylocId: company.tallyloc_id.toString(),
            coGuid: company.guid,
            hasToken: !!userData?.token
          });
          
          // Clear backend config cache before loading new company data
          backendConfigService.clearCache();
          console.log('🧹 Cleared backend config cache');
          
          await loadBackendConfig(
            company.tallyloc_id.toString(),
            company.guid,
            userData?.token
          );
          console.log('✅ Backend configuration with modules loaded successfully');
        } catch (configError) {
          console.error('❌ Error loading backend configuration:', configError);
        }
      } else {
        console.log('⏭️ Skipping backend configuration loading - company is offline or has no GUID');
      }

      // Check if loading was aborted
      if (isLoadingAborted) {
        console.log('⚠️ Loading aborted after timeout, skipping voucher types');
        return;
      }

      // Load voucher types for prefix/suffix information (skip if offline)
      if (!isCompanyOffline && company.guid && company.guid.trim() !== '') {
        try {
          const voucherTypesStartTime = Date.now();
          const voucherCompanyName = company.company || company.conn_name || '';
          console.log('🔍 [VoucherTypes] Starting to load voucher types for company:', voucherCompanyName);
          const voucherTypesResponse = await apiService.getVoucherTypes(
            company.tallyloc_id.toString(),
            voucherCompanyName,
            company.guid
          );
        const voucherTypesEndTime = Date.now();
        console.log(`⏱️ [VoucherTypes] API call took ${voucherTypesEndTime - voucherTypesStartTime}ms`);
        
        if (voucherTypesResponse.success && voucherTypesResponse.data?.voucherTypes) {
          console.log('✅ [VoucherTypes] Loaded successfully, count:', voucherTypesResponse.data.voucherTypes.length);
          
          // Store voucher types in both configuration context and master data context
          updateOrderConfig({
            voucherTypes: voucherTypesResponse.data.voucherTypes,
            voucherTypesLoaded: true
          });
          console.log('✅ [VoucherTypes] Updated OrderConfig with voucherTypesLoaded: true');
          
          // Also update master data context for isMasterDataReady calculation
          setVoucherTypes(voucherTypesResponse.data.voucherTypes);
          updateMasterDataProgress({
            voucherTypesLoaded: true
          });
          console.log('✅ [VoucherTypes] Updated MasterDataContext with voucherTypesLoaded: true');
        } else {
          console.warn('⚠️ [VoucherTypes] Failed to load:', voucherTypesResponse.message);
          // Set empty voucher types as fallback
          updateOrderConfig({
            voucherTypes: [],
            voucherTypesLoaded: false
          });
          
          // Also update master data context
          setVoucherTypes([]);
          updateMasterDataProgress({
            voucherTypesLoaded: true // Still mark as loaded even if empty
          });
          console.log('⚠️ [VoucherTypes] Marked as loaded (empty) in MasterDataContext');
        }
      } catch (voucherTypesError) {
        console.error('❌ [VoucherTypes] Error loading:', voucherTypesError);
        // Set empty voucher types as fallback
        updateOrderConfig({
          voucherTypes: [],
          voucherTypesLoaded: false
        });
        
        // Also update master data context
        setVoucherTypes([]);
        updateMasterDataProgress({
          voucherTypesLoaded: true // Still mark as loaded even if empty
        });
        console.log('❌ [VoucherTypes] Marked as loaded (error) in MasterDataContext');
        }
      } else {
        console.log('⏭️ Skipping voucher types loading - company is offline or has no GUID');
        // Set empty voucher types for offline companies
        updateOrderConfig({
          voucherTypes: [],
          voucherTypesLoaded: false
        });
        setVoucherTypes([]);
        updateMasterDataProgress({
          voucherTypesLoaded: true
        });
      }

      // Check if loading was aborted before starting master data load
      if (isLoadingAborted) {
        console.log('⚠️ Loading aborted after timeout, skipping master data load');
        return;
      }

      // Check if items or customers are actually loading (not just the derived state)
      if (isLoadingItems || isLoadingCustomers) {
        console.log('⚠️ Master data already loading (items or customers), skipping duplicate call');
        return;
      }

      // Load master data using the hook (skip if offline or missing required data)
      // Reuse isCompanyOffline from earlier in the function
      const masterDataCompanyName = company.company || company.conn_name || '';
      
      if (isCompanyOffline || !masterDataCompanyName) {
        console.log('⏭️ Skipping master data loading - company is offline or missing required data:', {
          isOffline: isCompanyOffline,
          hasCompanyName: !!masterDataCompanyName,
          companyName: masterDataCompanyName,
          guid: company.guid
        });
      } else {
        console.log('📦 Starting master data loading for:', masterDataCompanyName);
        console.log('📊 Master data state before load:', {
          isLoadingItems,
          isLoadingCustomers,
          isMasterDataLoading,
          isMasterDataReady
        });
        await loadMasterData({
          tallyloc_id: company.tallyloc_id.toString(),
          company: masterDataCompanyName,
          GUID: company.guid || ''
        });
        console.log('✅ Master data loading completed for:', masterDataCompanyName);
      }
      
      // Unlock the ref
      isHandlingCompanySelectRef.current = false;
      console.log('🔓 Unlocked handleCompanySelect ref');

    } catch (error) {
      console.error('❌ Error during company switch:', error);
      setIsSelecting(false);
      setSelectedCompanyForLoading(null);
      
      // Unlock the ref even on error
      isHandlingCompanySelectRef.current = false;
      console.log('🔓 Unlocked handleCompanySelect ref (error)');
    }
  }, [isSelecting, setSelectedCompany, orderConfig.usePriceLevels, userData?.token, setRolesLoading, setRolesError, setCurrentCompanyRoles, clearMasterData]);

  // Handle search
  const handleSearchTextChange = useCallback((text: string) => {
    setSearchText(text);
    
    if (text.trim() === '') {
      // Keep companies sorted when clearing search
      setFilteredCompanies(sortCompanies(companies));
    } else {
      const filtered = companies.filter(company => {
        const companyName = (company.company || company.conn_name || '').toLowerCase();
        const sharedEmail = (company.shared_email || '').toLowerCase();
        const connName = (company.conn_name || '').toLowerCase();
        const searchLower = text.toLowerCase();
        return companyName.includes(searchLower) ||
               sharedEmail.includes(searchLower) ||
               connName.includes(searchLower);
      });
      // Sort filtered results too
      setFilteredCompanies(sortCompanies(filtered));
    }
  }, [companies, sortCompanies]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    await loadCompanies();
  }, [loadCompanies]);

  // Load companies when we have a valid session
  useEffect(() => {
    if (userData && userData.token && !isSessionRestoring) {
      console.log('🚀 useEffect triggered - calling loadCompanies with valid session');
      loadCompanies();
    } else {
      console.log('⏳ Waiting for session restoration or valid user data');
    }
  }, [userData, isSessionRestoring, loadCompanies]);

  // Auto-load master data on app restart (when company is already selected)
  useEffect(() => {
    console.log('🔍 Auto-load effect check:', {
      hasSelectedCompany: !!selectedCompany,
      companiesLength: companies.length,
      selectedCompanyForLoading: !!selectedCompanyForLoading,
      isMasterDataReady,
      isSelecting,
      hasAutoLoaded,
      hasAutoLoadedRef: hasAutoLoadedRef.current,
      isHandlingCompanySelectRef: isHandlingCompanySelectRef.current
    });
    
    // If we have a selected company from previous session and companies are loaded,
    // but no company is being loaded and master data is not ready, auto-load it (only once)
    // Use ref check for synchronous blocking
    if (selectedCompany && companies.length > 0 && !selectedCompanyForLoading && !isMasterDataReady && !isSelecting && !hasAutoLoadedRef.current && !isHandlingCompanySelectRef.current) {
      console.log('🔄 Auto-loading master data for existing company on app restart:', selectedCompany.company);
      
      const matchingCompany = companies.find(company => 
        company.company === selectedCompany.company && 
        company.guid === selectedCompany.GUID
      );
      
      if (matchingCompany) {
        console.log('✅ Found matching company, auto-loading:', matchingCompany.company);
        console.log('🔍 About to call handleCompanySelect from auto-load');
        setHasAutoLoaded(true); // Prevent multiple auto-loads (state)
        hasAutoLoadedRef.current = true; // Prevent multiple auto-loads (ref - synchronous)
        console.log('🔒 Set hasAutoLoadedRef to true (auto-load)');
        // Load the company automatically (isManual = false means no dialog)
        handleCompanySelect(matchingCompany);
        console.log('✅ handleCompanySelect call completed (auto-load)');
      } else {
        console.log('⚠️ No matching company found for auto-load');
        console.log('Available companies:', companies.map(c => ({ company: c.company, guid: c.guid })));
        console.log('Looking for:', { company: selectedCompany.company, guid: selectedCompany.GUID });
      }
    }
  }, [selectedCompany, companies, selectedCompanyForLoading, isMasterDataReady, isSelecting, hasAutoLoaded]);

  // Reset selecting state when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Only reset states if we're not currently loading master data
      // AND we don't have master data ready (prevents running after successful navigation)
      if (!selectedCompanyForLoading && !isMasterDataLoading && !isMasterDataReady) {
        console.log('📱 Screen focused - resetting states (not loading, no data ready)');
        
        // Reset the selecting state when returning to this screen
        // This ensures the company list is always clickable
        setIsSelecting(false);
        
        // Reset auto-load flag when user manually navigates here (e.g., from hamburger menu)
        // This allows auto-load to work again if needed
        setHasAutoLoaded(false);
        
        // Clear any existing navigation timeout
        if (navigationTimeout) {
          clearTimeout(navigationTimeout);
          setNavigationTimeout(null);
        }
        
        // If we have a selected company and we're coming to company selection,
        // it means user wants to switch companies - load companies
        if (selectedCompany) {
          console.log('🔄 User navigating to company selection with existing company - loading companies');
          loadCompanies();
        }
      } else {
        console.log('📱 Screen focused - skipping state reset', {
          loading: selectedCompanyForLoading || isMasterDataLoading,
          dataReady: isMasterDataReady
        });
      }
    }, [selectedCompany, loadCompanies, navigationTimeout, selectedCompanyForLoading, isMasterDataLoading, isMasterDataReady])
  );

  // Navigate to dashboard when master data loading is complete
  useEffect(() => {
    console.log('🔍 Navigation effect triggered:', {
      selectedCompanyForLoading: selectedCompanyForLoading?.company,
      isLoadingItems,
      isLoadingCustomers,
      isMasterDataReady,
      isSelecting,
      masterDataProgress: {
        itemsLoaded: masterDataProgress.itemsLoaded,
        customersLoaded: masterDataProgress.customersLoaded,
        voucherTypesLoaded: masterDataProgress.voucherTypesLoaded,
        totalProgress: masterDataProgress.totalProgress
      }
    });
    
    // For offline companies, allow navigation even without master data
    const isOfflineCompany = selectedCompanyForLoading && (
      selectedCompanyForLoading.status === 'offline' || 
      selectedCompanyForLoading.status === 'Offline' || 
      !selectedCompanyForLoading.guid || 
      selectedCompanyForLoading.guid.trim() === ''
    );
    
    const shouldNavigate = selectedCompanyForLoading && !isLoadingItems && !isLoadingCustomers && (isMasterDataReady || isOfflineCompany);
    console.log('🚀 Navigation decision:', {
      selectedCompanyForLoading: !!selectedCompanyForLoading,
      isLoadingItems,
      isLoadingCustomers,
      notLoadingItems: !isLoadingItems,
      notLoadingCustomers: !isLoadingCustomers,
      masterDataReady: isMasterDataReady,
      isOfflineCompany,
      shouldNavigate
    });
    
    if (shouldNavigate && !hasNavigated) {
      if (isOfflineCompany) {
        console.log('✅ Offline company selected, navigating to dashboard (master data skipped)');
      } else {
        console.log('✅ Master data loading complete, navigating to dashboard');
      }
      console.log('🎯 Navigation state check:', {
        hasNavigated,
        selectedCompanyForLoading: selectedCompanyForLoading?.company,
        isSelecting,
        navigationTimeout: !!navigationTimeout
      });
      setHasNavigated(true); // Prevent multiple navigation attempts
      
      // Clear the navigation timeout
      if (navigationTimeout) {
        clearTimeout(navigationTimeout);
        setNavigationTimeout(null);
      }
      
      // Clear states BEFORE navigation to prevent re-triggers
      setSelectedCompanyForLoading(null);
      setIsSelecting(false);
      
      // Master data loading is complete, navigate to dashboard
      console.log('🚀 Calling safePush to dashboard...');
      safePush('/dashboard');
      console.log('✅ safePush completed');
      
      // Reset navigation flag after a delay
      setTimeout(() => {
        console.log('🔄 Resetting hasNavigated flag');
        setHasNavigated(false); // Reset for future use
      }, 500); // Longer delay to ensure navigation fully completes
    } else if (shouldNavigate && hasNavigated) {
      console.log('⚠️ Navigation already triggered, skipping duplicate navigation');
    }
  }, [selectedCompanyForLoading, isLoadingItems, isLoadingCustomers, isMasterDataReady, safePush, navigationTimeout]);

  // Handle logout
  const handleLogout = useCallback(async () => {
    try {
      // Clear user data first (this will handle navigation)
      clearUserData();
      router.replace('/');
    } catch (error) {
      console.error('Logout error:', error);
      // Fallback navigation
      safeReplace('/');
    }
  }, [clearUserData]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    // Navigate to login
    safeReplace('/');
  }, [safeReplace]);

  // Render company item
  const renderCompanyItem = useCallback(({ item }: { item: UserConnection }) => {
    // Check both global offline status and individual company status
    const isCompanyOffline = isOffline || item.status === 'offline' || item.status === 'Offline';
    
    // Determine access type display text
    const accessTypeDisplay = item.access_type?.toLowerCase() === 'full' ? 'Full Access' : 'Limited Access';
    
    return (
      <TouchableOpacity
        style={[styles.companyCard, isSelecting && styles.companyCardDisabled]}
        onPress={() => {
          console.log('👆 User tapped company:', item.company);
          setHasAutoLoaded(true); // Set state
          hasAutoLoadedRef.current = true; // Set ref synchronously
          console.log('🔒 Set hasAutoLoadedRef to true (user tap)');
          handleCompanySelect(item);
        }}
        disabled={isSelecting}
        activeOpacity={0.7}
      >
        <View style={styles.companyInfo}>
          <Text style={styles.companyName}>{item.company || item.conn_name || 'Unknown Company'}</Text>
          <View style={styles.accessTypeRow}>
            <Text style={styles.accessTypeValue}>{accessTypeDisplay}</Text>
            <View style={[styles.statusDot, isCompanyOffline ? styles.statusDotOffline : styles.statusDotOnline]} />
          </View>
        </View>
        
        {/* COMPACT LAYOUT - REMOVED FIELDS FOR COMPACT VIEW:
            - Removed connectionName
            - Removed companyEmail
            - Removed status indicator with online/offline
            - Removed debug text
            - Removed Select button (entire card is now tappable)
            
            OLD LAYOUT CODE (for easy revert):
            <Text style={styles.connectionName}>{item.conn_name}</Text>
            <Text style={styles.companyEmail}>{item.shared_email}</Text>
            <View style={styles.statusContainer}>
              <View style={[styles.statusIndicator, isCompanyOffline ? styles.statusOffline : styles.statusOnline]}>
                <Text style={styles.statusText}>
                  {isCompanyOffline ? '🔴 Offline' : '🟢 Online'}
                </Text>
              </View>
              <Text style={{fontSize: 10, color: '#666'}}>
                Debug: {item.status} | Offline: {isCompanyOffline ? 'Yes' : 'No'}
              </Text>
            </View>
            <View style={styles.selectButton}>
              <Text style={styles.selectButtonText}>Select</Text>
            </View>
        */}
      </TouchableOpacity>
    );
  }, [isSelecting, handleCompanySelect, isOffline]);


  // Early return if session is still restoring
  if (isSessionRestoring) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  // Early return if no valid session
  if (!userData || !userData.token) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Redirecting to login...</Text>
        </View>
      </View>
    );
  }

  // Show master data loading screen when master data is actively loading
  if (selectedCompanyForLoading && (isLoadingItems || isLoadingCustomers)) {
    return (
      <MasterDataLoadingScreen 
        companyName={selectedCompanyForLoading.company}
        progress={masterDataProgress.totalProgress}
        currentStep={currentStep}
        stepInfo={stepInfo}
      />
    );
  }

  // Show loading screen while selecting a company (covers all other selection states)
  // But skip if it's an offline company that should navigate immediately
  const isOfflineCompanyLoading = selectedCompanyForLoading && (
    !selectedCompanyForLoading.guid || 
    selectedCompanyForLoading.guid.trim() === '' || 
    selectedCompanyForLoading.status === 'offline' || 
    selectedCompanyForLoading.status === 'Offline'
  );
  
  if ((isSelecting || selectedCompanyForLoading) && !isOfflineCompanyLoading && !hasNavigated) {
    console.log('🔄 Showing loading screen:', {
      isSelecting,
      selectedCompanyForLoading: selectedCompanyForLoading?.company,
      isLoadingItems,
      isLoadingCustomers,
      isMasterDataReady,
      isOfflineCompanyLoading,
      hasNavigated
    });
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>
            {selectedCompanyForLoading ? `Loading ${selectedCompanyForLoading.company}...` : 'Switching company...'}
          </Text>
        </View>
      </View>
    );
  }



  // Show loading screen while fetching companies or if no companies yet
  if (isLoading || companies.length === 0) {
    console.log('🔄 Rendering loading screen - isLoading:', isLoading, 'companies.length:', companies.length);
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          {/* Header */}
          <CompanyHeader 
            userName={userData?.name || 'User'} 
            onBack={handleBack} 
          />
          
          {/* Loading State */}
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>
              {isLoading ? 'Fetching companies...' : 'No companies found'}
            </Text>
            
            {/* Manual retry button if not loading */}
            {!isLoading && companies.length === 0 && (
              <View style={styles.retryContainer}>
                <TouchableOpacity 
                  style={styles.retryButton} 
                  onPress={() => loadCompanies()}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.backToLoginButton} 
                  onPress={handleBack}
                >
                  <Text style={styles.backToLoginButtonText}>Back to Login</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.container}>
          {/* Offline Banner */}
          {isOffline && (
            <OfflineBanner 
              lastSyncDate={undefined}
              showLastSync={false}
            />
          )}
          
          <View style={styles.content}>
            {/* Header */}
            <CompanyHeader 
              userName={userData?.name || 'User'} 
              onBack={handleBack}
              onRefresh={handleRefresh}
            />

            {/* Search Bar - Only show when there are companies */}
            {companies.length > 0 && (
              <SearchBar 
                value={searchText}
                onChangeText={handleSearchTextChange}
              />
            )}

            {/* Company List */}
            <View style={styles.listContainer}>
              <FlatList
                data={filteredCompanies}
                renderItem={renderCompanyItem}
                keyExtractor={(item) => `company-${item.tallyloc_id}-${item.guid}`}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                // Disabled pull-to-refresh - using refresh button in header instead
                // refreshControl={
                //   <RefreshControl
                //     refreshing={isLoading}
                //     onRefresh={handleRefresh}
                //     colors={['#007AFF']}
                //     tintColor="#007AFF"
                //   />
                // }
                ListHeaderComponent={
                  isLoading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color="#007AFF" />
                      <Text style={styles.loadingText}>Loading your companies...</Text>
                    </View>
                  ) : null
                }
              />
            </View>

            {/* Logout Button */}
            <TouchableOpacity 
              style={styles.logoutButton} 
              onPress={handleLogout}
            >
              <Text style={styles.logoutButtonText}>
                Logout
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80, // Add bottom padding for navigation bar
  },
  listContainer: {
    flex: 1,
    marginTop: 0, // Removed padding below search box to maximize space
    // OLD: marginTop: 20
  },
  listContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  companyCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    // COMPACT LAYOUT - Removed padding and flexDirection adjustments
    // OLD: padding: 20, justifyContent: 'space-between'
  },
  companyCardDisabled: {
    opacity: 0.6,
    backgroundColor: '#f0f0f0',
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF', // Blue color for company name
    marginBottom: 4,
    // COMPACT LAYOUT - Reduced font size and margin
    // OLD: fontSize: 18, marginBottom: 5, color: '#333'
  },
  connectionName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  companyEmail: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 8,
  },
  accessTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accessTypeLabel: {
    fontSize: 12,
    color: '#999',
    marginRight: 5,
  },
  accessTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accessTypeValue: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
    // COMPACT LAYOUT - Changed color and removed uppercase transform
    // OLD: color: '#28a745', textTransform: 'uppercase'
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  statusDotOnline: {
    backgroundColor: '#28a745', // Green for online
  },
  statusDotOffline: {
    backgroundColor: '#dc3545', // Red for offline
  },
  selectButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  selectButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 0, // Removed top margin to maximize space
    marginBottom: 0, // Removed bottom margin to maximize space
    // OLD: marginTop: 20, marginBottom: 20
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  retryContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  backToLoginButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backToLoginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  statusContainer: {
    marginTop: 8,
    alignItems: 'flex-start',
  },
  statusIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusOnline: {
    backgroundColor: '#d4edda',
  },
  statusOffline: {
    backgroundColor: '#f8d7da',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

