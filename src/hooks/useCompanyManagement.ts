import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import { apiService } from '../services/api';
import { UserConnection } from '../config/api';
import { useMasterData } from '../context/MasterDataContext';
import { useConfiguration } from '../context/ConfigurationContext';
import { parseTallyItemsResponse, parseTallyItemsWithPriceLevelsResponse, convertTallyItemsToStockItems, convertTallyItemsWithPriceLevelsToStockItems, parseTallyStockItemsResponse, parseTallyCustomersResponse, parseTallyCustomersWithAddressesResponse, convertTallyCustomersToCustomers } from '../utils/tallyHelpers';

export interface UseCompanyManagementProps {
  onCompanySelect: (company: UserConnection) => void;
}

export const useCompanyManagement = ({ onCompanySelect }: UseCompanyManagementProps) => {
  const [companies, setCompanies] = useState<UserConnection[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<UserConnection[]>([]);
  const [searchText, setSearchText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  
  const { setItems, setCustomers, setIsLoadingItems, setIsLoadingCustomers } = useMasterData();
  const { orderConfig } = useConfiguration();

  // Simple timeout refs
  const selectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSelectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Memoized filtered companies
  const memoizedFilteredCompanies = useMemo(() => {
    if (searchText.trim() === '') {
      return companies;
    }
    return companies.filter(company =>
      company.company.toLowerCase().includes(searchText.toLowerCase()) ||
      company.shared_email.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [searchText, companies]);

  // SIMPLE load companies function - no complex logic
  const loadCompanies = useCallback(async () => {
    console.log('🌐 loadCompanies called - SIMPLE VERSION');
    
    // Simple check - if already loading, don't start another
    if (isLoading) {
      console.log('🌐 Already loading, skipping duplicate call');
      return;
    }
    
    
    setIsLoading(true);
    
    try {
      console.log('🌐 Making API call to getUserConnections...');
      const response = await apiService.getUserConnections();
      
      console.log('🌐 API Response received!');
      console.log('🌐 Success:', response.success);
      console.log('🌐 Message:', response.message);
      console.log('🌐 Data type:', typeof response.data);
      
      if (response.success && response.data) {
        console.log('🌐 Processing successful response...');
        
        const allCompanies = [
          ...(response.data.createdByMe || []),
          ...(response.data.sharedWithMe || [])
        ];
        
        console.log('🌐 Total companies found:', allCompanies.length);
        console.log('🌐 Created by me:', response.data.createdByMe?.length || 0);
        console.log('🌐 Shared with me:', response.data.sharedWithMe?.length || 0);
        
        setCompanies(allCompanies);
        setFilteredCompanies(allCompanies);
        
        console.log('🌐 ✅ Companies loaded successfully!');
      } else {
        console.log('🌐 ❌ API call failed:', response.message);
        const errorMsg = response.message || 'Failed to load companies';
        
        if (Platform.OS === 'web') {
          throw new Error(errorMsg);
        } else {
          Alert.alert('Error', errorMsg);
        }
      }
    } catch (error) {
      console.error('🌐 ❌ Error in loadCompanies:', error);
      const errorMsg = 'Network error. Please check your connection.';
      
      if (Platform.OS === 'web') {
        throw new Error(errorMsg);
      } else {
        Alert.alert('Connection Error', errorMsg);
      }
    } finally {
      console.log('🌐 Setting isLoading to false');
      setIsLoading(false);
    }
  }, []); // No dependencies - stable function

  // Company selection handler
  const handleCompanySelect = useCallback(async (company: UserConnection) => {
    if (isSelecting) {
      console.log('🚫 Selection already in progress, ignoring');
      return;
    }
    
    console.log('🎯 Company selection triggered for:', company.company);
    setIsSelecting(true);
    
    // Clear any existing timeout
    if (selectionTimeoutRef.current) {
      clearTimeout(selectionTimeoutRef.current);
      selectionTimeoutRef.current = null;
    }
    
    // Execute selection logic with delay for Android
    selectionTimeoutRef.current = setTimeout(async () => {
      try {
        // Call the callback - master data loading is now handled in company selection page
        onCompanySelect(company);
      } catch (error) {
        console.error('❌ Error in company selection:', error);
        setIsSelecting(false);
      }
    }, Platform.OS === 'android' ? 150 : 50);
  }, [isSelecting, onCompanySelect]);

  // Search text change handler
  const handleSearchTextChange = useCallback((text: string) => {
    setSearchText(text);
  }, []);

  // Auto-select if only one company available
  useEffect(() => {
    if (companies.length === 1 && !isLoading && !isSelecting) {
      console.log('🌐 Auto-selecting single company:', companies[0]);
      
      if (autoSelectTimeoutRef.current) {
        clearTimeout(autoSelectTimeoutRef.current);
      }
      
      autoSelectTimeoutRef.current = setTimeout(() => {
        handleCompanySelect(companies[0]);
        autoSelectTimeoutRef.current = null;
      }, 200);
    }

    return () => {
      if (autoSelectTimeoutRef.current) {
        clearTimeout(autoSelectTimeoutRef.current);
        autoSelectTimeoutRef.current = null;
      }
    };
  }, [companies, isLoading, isSelecting, handleCompanySelect]);

  // Update filtered companies when memoized result changes
  useEffect(() => {
    setFilteredCompanies(memoizedFilteredCompanies);
  }, [memoizedFilteredCompanies]);

  // Cleanup function
  useEffect(() => {
    return () => {
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
        selectionTimeoutRef.current = null;
      }
      if (autoSelectTimeoutRef.current) {
        clearTimeout(autoSelectTimeoutRef.current);
        autoSelectTimeoutRef.current = null;
      }
    };
  }, []);

  // SIMPLE: Load companies when component mounts
  useEffect(() => {
    console.log('🌐 Component mounted - loading companies immediately');
    loadCompanies();
  }, []); // Empty dependency array - only run once on mount

  // Reset function
  const resetCompanies = useCallback(() => {
    setCompanies([]);
    setFilteredCompanies([]);
    setSearchText('');
    setIsLoading(false);
    setIsSelecting(false);
  }, []);

  return {
    companies,
    filteredCompanies,
    searchText,
    isLoading,
    isSelecting,
    handleCompanySelect,
    handleSearchTextChange,
    loadCompanies,
    resetCompanies,
  };
};
