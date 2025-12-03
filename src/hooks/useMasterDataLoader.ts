import React, { useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import { useUser } from '../context/UserContext';
import { useMasterData } from '../context/MasterDataContext';
import { apiService } from '../services/api';
import { 
  parseTallyItemsResponse, 
  parseTallyItemsWithPriceLevelsResponse, 
  convertTallyItemsToStockItems, 
  convertTallyItemsWithPriceLevelsToStockItems,
  parseTallyStockItemsResponse,
  parseTallyCustomersResponse,
  parseTallyCustomersWithAddressesResponse,
  convertTallyCustomersToCustomers,
  parseVoucherTypesResponse,
  convertTallyVoucherTypesToVoucherTypes
} from '../utils/tallyHelpers';

export const useMasterDataLoader = () => {
  const { selectedCompany } = useUser();
  const masterDataContext = useMasterData();
  
  // Add a ref to track if loading is in progress (survives re-renders)
  const isLoadingRef = React.useRef(false);
    
    // Safety check to ensure context is available
    if (!masterDataContext || !masterDataContext.setItems || !masterDataContext.setCustomers || !masterDataContext.setVoucherTypes || !masterDataContext.updateMasterDataProgress) {
      console.warn('MasterDataContext not fully available, returning fallback');
      return {
        loadMasterData: async () => {},
        isLoadingItems: false,
        isLoadingCustomers: false,
        isLoadingVoucherTypes: false,
        currentStep: 1,
        stepInfo: ''
      };
    }
    
    // Don't destructure the functions to avoid binding issues
    // Use them directly from the context
    
    // Track current step for loading screen
    const [currentStep, setCurrentStep] = React.useState(1);
    const [stepInfo, setStepInfo] = React.useState('');

    // Load master data when company is selected
    const loadMasterData = useCallback(async (company?: any) => {
      const callId = Date.now();
      console.log(`🎬 [${callId}] loadMasterData called!`, {
        providedCompany: company?.company,
        selectedCompany: selectedCompany?.company,
        isLoadingItems: masterDataContext?.isLoadingItems,
        isLoadingCustomers: masterDataContext?.isLoadingCustomers,
        isLoadingRefValue: isLoadingRef.current
      });
      // Removed console.trace to avoid logging issues
      
      const companyToUse = company || selectedCompany;
      if (!companyToUse) {
        console.log('⚠️ No company to load, returning');
        return;
      }
      
      // Safety check for required functions
      
      if (!masterDataContext?.setItems || !masterDataContext?.setCustomers || !masterDataContext?.updateMasterDataProgress) {
        console.error('Required functions not available:', { 
          setItems: !!(masterDataContext?.setItems), 
          setCustomers: !!(masterDataContext?.setCustomers), 
          updateMasterDataProgress: !!(masterDataContext?.updateMasterDataProgress) 
        });
        return;
      }
      
      // Check if already loading to prevent duplicates (using ref for reliability)
      if (isLoadingRef.current) {
        console.log(`⚠️ [${callId}] Master data already loading (ref check), skipping duplicate loadMasterData call`);
        return;
      }
      
      if (masterDataContext.isLoadingItems || masterDataContext.isLoadingCustomers) {
        console.log(`⚠️ [${callId}] Master data already loading (state check), skipping duplicate loadMasterData call`);
        return;
      }
      
      // Mark as loading using ref (survives re-renders)
      isLoadingRef.current = true;
      console.log(`🔒 [${callId}] Locked loading with ref`);
      
      // Starting master data loading process
      console.log('✅ Proceeding with master data load for:', companyToUse.company);
      
      try {
        // Reset progress and step (but preserve voucherTypesLoaded since it's loaded separately)
        setCurrentStep(1);
        setStepInfo('');
        masterDataContext.updateMasterDataProgress({
          itemsLoaded: false,
          customersLoaded: false,
          // Don't reset voucherTypesLoaded - it's loaded separately in handleCompanySelect
          totalProgress: 0
        });
        
        // Load items - try new JSON API first, fallback to old XML API
        console.log('📦 About to load items for:', companyToUse.company);
        setCurrentStep(1);
        setStepInfo('Connecting to Tally server...');
        console.log('🔄 Setting isLoadingItems to true');
        masterDataContext.setIsLoadingItems(true);
        const itemsStartTime = Date.now();
        console.log('⏰ Items load start time:', itemsStartTime);
        
        let itemsResponse = await apiService.getStockItemsFromTally(
          companyToUse.tallyloc_id,
          companyToUse.company,
          companyToUse.GUID
        );
        
        const itemsFetchTime = Date.now() - itemsStartTime;
        
        if (itemsResponse.success && itemsResponse.data) {
          // Use new JSON format
          setCurrentStep(2);
          setStepInfo('Decrypting prices and validating data...');
          const processingStartTime = Date.now();
          
          const stockItems = parseTallyStockItemsResponse(itemsResponse.data);
          
          const processingTime = Date.now() - processingStartTime;
          
          masterDataContext.setItems(stockItems);
          masterDataContext.updateMasterDataProgress({
            itemsLoaded: true,
            totalProgress: 50
          });
          console.log('✅ Items loading completed (JSON format)');
          masterDataContext.setIsLoadingItems(false);
        } else {
          // Fallback to old XML format
          itemsResponse = await apiService.getItemsFromTally(
            companyToUse.tallyloc_id,
            companyToUse.company,
            companyToUse.GUID,
            false // Default to no price levels for now
          );
          
          if (itemsResponse.success && itemsResponse.data) {
            const tallyItems = parseTallyItemsResponse(itemsResponse.data);
            const stockItems = convertTallyItemsToStockItems(tallyItems);
            masterDataContext.setItems(stockItems);
            masterDataContext.updateMasterDataProgress({
              itemsLoaded: true,
              totalProgress: 50
            });
            console.log('✅ Items loading completed (JSON format)');
            masterDataContext.setIsLoadingItems(false);
          } else {
            // Items loading failed - keep empty array but mark as NOT loaded
            masterDataContext.setItems([]);
            masterDataContext.updateMasterDataProgress({
              itemsLoaded: false,
              totalProgress: 0
            });
            console.log('❌ Items loading failed (both JSON and XML formats failed)');
            console.error('Items API Error:', itemsResponse.message || 'Unknown error');
            masterDataContext.setIsLoadingItems(false);
          }
        }
        
        // Load customers - try new API first, fallback to old one
        setCurrentStep(3);
        setStepInfo('Getting customer data from Tally...');
        console.log('🔄 Setting isLoadingCustomers to true');
        masterDataContext.setIsLoadingCustomers(true);
        const customersStartTime = Date.now();
        
        let customersResponse = await apiService.getCustomersWithAddressesFromTally(
          companyToUse.tallyloc_id,
          companyToUse.company,
          companyToUse.GUID
        );
        
        const customersFetchTime = Date.now() - customersStartTime;
        
        if (customersResponse.success && customersResponse.data) {
          // Use new JSON format
          setCurrentStep(4);
          setStepInfo('Formatting addresses and finalizing data...');
          const customersProcessingStartTime = Date.now();
          
          const tallyCustomers = parseTallyCustomersWithAddressesResponse(customersResponse.data);
          const customers = convertTallyCustomersToCustomers(tallyCustomers);
          
          const customersProcessingTime = Date.now() - customersProcessingStartTime;
          
          masterDataContext.setCustomers(customers);
          
          // Update progress
          masterDataContext.updateMasterDataProgress({
            customersLoaded: true,
            totalProgress: 100
          });
          masterDataContext.setIsLoadingCustomers(false);
        } else {
          // Fallback to old XML API
          customersResponse = await apiService.getCustomersFromTally(
            companyToUse.tallyloc_id,
            companyToUse.company,
            companyToUse.GUID
          );
          
          if (customersResponse.success && customersResponse.data) {
            const tallyCustomers = parseTallyCustomersResponse(customersResponse.data);
            const customers = convertTallyCustomersToCustomers(tallyCustomers);
            masterDataContext.setCustomers(customers);
            
            // Update progress
            masterDataContext.updateMasterDataProgress({
              customersLoaded: true,
              totalProgress: 100
            });
            masterDataContext.setIsLoadingCustomers(false);
          } else {
            // Customers loading failed - keep empty array but mark as NOT loaded
            masterDataContext.setCustomers([]);
            masterDataContext.updateMasterDataProgress({
              customersLoaded: false,
              totalProgress: 50 // Only items loaded (if successful)
            });
            console.log('❌ Customers loading failed (both JSON and XML formats failed)');
            console.error('Customers API Error:', customersResponse.message || 'Unknown error');
            masterDataContext.setIsLoadingCustomers(false);
          }
        }
        
        // Load voucher types
        setCurrentStep(5);
        setStepInfo('Getting voucher types from Tally...');
        const voucherTypesStartTime = Date.now();
        
        try {
          const voucherTypesResponse = await apiService.getVoucherTypesFromTally(
            companyToUse.tallyloc_id,
            companyToUse.company,
            companyToUse.GUID
          );
          
          const voucherTypesFetchTime = Date.now() - voucherTypesStartTime;
          
          if (voucherTypesResponse.success && voucherTypesResponse.data) {
            setCurrentStep(6);
            setStepInfo('Processing voucher types...');
            const voucherTypesProcessingStartTime = Date.now();
            
            const tallyVoucherTypes = parseVoucherTypesResponse(voucherTypesResponse.data);
            const voucherTypes = convertTallyVoucherTypesToVoucherTypes(tallyVoucherTypes);
            
            const voucherTypesProcessingTime = Date.now() - voucherTypesProcessingStartTime;
            
            masterDataContext.setVoucherTypes(voucherTypes);
            
            // Update progress
            masterDataContext.updateMasterDataProgress({
              voucherTypesLoaded: true,
              totalProgress: 100
            });
          } else {
            // Voucher types loading failed
            masterDataContext.setVoucherTypes([]);
            masterDataContext.updateMasterDataProgress({
              voucherTypesLoaded: false,
              totalProgress: 75 // Items and customers may be loaded
            });
            console.log('❌ Voucher types loading failed');
            console.error('Voucher Types API Error:', voucherTypesResponse.message || 'Unknown error');
          }
        } catch (error) {
          console.error('❌ Error loading voucher types:', error);
          masterDataContext.setVoucherTypes([]);
          masterDataContext.updateMasterDataProgress({
            voucherTypesLoaded: false,
            totalProgress: 75 // Items and customers may be loaded
          });
        }
        
        const totalTime = Date.now() - (itemsStartTime || Date.now());
        
        // Mark master data as completely ready
        setCurrentStep(6);
        setStepInfo('Master data ready! Redirecting to dashboard...');
        
        // Final safety check - ensure all loading states are false
        masterDataContext.setIsLoadingItems(false);
        masterDataContext.setIsLoadingCustomers(false);
        console.log('✅ All loading states reset to false');
        
        // Unlock the ref
        isLoadingRef.current = false;
        console.log(`🔓 [${callId}] Unlocked loading ref`);
        
      } catch (error) {
        console.error('❌ Failed to load master data:', error);
        // Reset loading states on error
        masterDataContext.setIsLoadingItems(false);
        masterDataContext.setIsLoadingCustomers(false);
        
        // Unlock the ref even on error
        isLoadingRef.current = false;
        console.log(`🔓 [${callId}] Unlocked loading ref (error)`);
      }
    }, [masterDataContext]);

    // Note: Auto-loading is handled by the calling component (company-selection.tsx)
    // This prevents circular dependencies and gives better control over when loading starts

  return {
    loadMasterData,
    isLoadingItems: masterDataContext.isLoadingItems,
    isLoadingCustomers: masterDataContext.isLoadingCustomers,
    isLoadingVoucherTypes: masterDataContext.isLoadingVoucherTypes,
    currentStep,
    stepInfo
  };
};
