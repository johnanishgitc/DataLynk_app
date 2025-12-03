import React, { createContext, useContext, useState, ReactNode } from 'react';

// Types for master data
export interface StockItem {
  id: string;
  name: string;
  availableQty: number;
  rate: number;
  closingStock?: number;
  igst?: number;
  priceLevels?: Array<{
    levelName: string;
    rate: number;
  }>;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  mobile: string;
  email: string;
  address: string;
  gstin: string;
  contact?: string; // Optional contact person field
  priceLevel?: string; // Price level for the customer
  // GST and Address related fields
  stateName?: string;
  country?: string;
  gstType?: string;
  mailingName?: string;
  pincode?: string;
}

export interface VoucherType {
  id: string;
  name: string;
}

interface MasterDataContextType {
  items: StockItem[];
  customers: Customer[];
  voucherTypes: VoucherType[];
  setItems: (items: StockItem[]) => void;
  setCustomers: (customers: Customer[]) => void;
  setVoucherTypes: (voucherTypes: VoucherType[]) => void;
  clearMasterData: () => void;
  isLoadingItems: boolean;
  isLoadingCustomers: boolean;
  isLoadingVoucherTypes: boolean;
  setIsLoadingItems: (loading: boolean) => void;
  setIsLoadingCustomers: (loading: boolean) => void;
  setIsLoadingVoucherTypes: (loading: boolean) => void;
  isMasterDataLoading: boolean;
  masterDataProgress: {
    itemsLoaded: boolean;
    customersLoaded: boolean;
    voucherTypesLoaded: boolean;
    totalProgress: number;
  };
  setMasterDataProgress: (progress: { itemsLoaded: boolean; customersLoaded: boolean; voucherTypesLoaded: boolean; totalProgress: number }) => void;
  isMasterDataReady: boolean;
  updateMasterDataProgress: (updates: Partial<{ itemsLoaded: boolean; customersLoaded: boolean; voucherTypesLoaded: boolean; totalProgress: number }>) => void;
}

const MasterDataContext = createContext<MasterDataContextType | undefined>(undefined);

export const useMasterData = () => {
  const context = useContext(MasterDataContext);
  if (context === undefined) {
    throw new Error('useMasterData must be used within a MasterDataProvider');
  }
  return context;
};

interface MasterDataProviderProps {
  children: ReactNode;
}

export const MasterDataProvider: React.FC<MasterDataProviderProps> = ({ children }) => {
  const [items, setItems] = useState<StockItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [voucherTypes, setVoucherTypes] = useState<VoucherType[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [isLoadingVoucherTypes, setIsLoadingVoucherTypes] = useState(false);
  
  // Global master data loading state
  const [masterDataProgress, setMasterDataProgress] = useState({
    itemsLoaded: false,
    customersLoaded: false,
    voucherTypesLoaded: false,
    totalProgress: 0
  });

  const clearMasterData = () => {
    setItems([]);
    setCustomers([]);
    setVoucherTypes([]);
    setMasterDataProgress({
      itemsLoaded: false,
      customersLoaded: false,
      voucherTypesLoaded: false,
      totalProgress: 0
    });
  };

  // Calculate if master data is ready
  const isMasterDataReady = masterDataProgress.itemsLoaded && masterDataProgress.customersLoaded && masterDataProgress.voucherTypesLoaded;
  
  // Global loading state - consider loading if any master data is being loaded
  const isMasterDataLoading = isLoadingItems || isLoadingCustomers || isLoadingVoucherTypes || (!isMasterDataReady);

  // Update progress with partial updates
  const updateMasterDataProgress = (updates: Partial<{ itemsLoaded: boolean; customersLoaded: boolean; voucherTypesLoaded: boolean; totalProgress: number }>) => {
    setMasterDataProgress(prev => {
      const newProgress = {
        ...prev,
        ...updates
      };
      return newProgress;
    });
  };

  const value: MasterDataContextType = {
    items,
    customers,
    voucherTypes,
    setItems,
    setCustomers,
    setVoucherTypes,
    clearMasterData,
    isLoadingItems,
    isLoadingCustomers,
    isLoadingVoucherTypes,
    setIsLoadingItems,
    setIsLoadingCustomers,
    setIsLoadingVoucherTypes,
    isMasterDataLoading,
    masterDataProgress,
    setMasterDataProgress,
    isMasterDataReady,
    updateMasterDataProgress,
  };

  return (
    <MasterDataContext.Provider value={value}>
      {children}
    </MasterDataContext.Provider>
  );
};
