import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StandardHeader } from '../common';
import { apiService } from '../../services/api';
import { SalesAnalytics } from '../analytics/SalesAnalytics';
import { AnalyticsFilters } from '../analytics/AnalyticsFilters';
import { PeriodSelector } from '../analytics/PeriodSelector';
import { useMasterData } from '../../context/MasterDataContext';
// Removed database dependencies for direct Tally integration

interface SalesDataReportProps {
  companyName?: string;
  tallylocId?: string;
  guid?: string;
}

export default function SalesDataReport({ 
  companyName, 
  tallylocId, 
  guid 
}: SalesDataReportProps) {
  const { items } = useMasterData();
  
  // State management - Initialize with null to prevent race conditions
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Load saved date range on component mount
  useEffect(() => {
    const loadSavedDateRange = async () => {
      try {
        console.log('🔄 Loading saved date range from AsyncStorage...');
        const savedStartDate = await AsyncStorage.getItem('salesReport_startDate');
        const savedEndDate = await AsyncStorage.getItem('salesReport_endDate');
        
        console.log('📱 Retrieved from AsyncStorage:', { savedStartDate, savedEndDate });
        
        if (savedStartDate && savedEndDate) {
          const restoredStartDate = new Date(savedStartDate);
          const restoredEndDate = new Date(savedEndDate);
          
          console.log('📅 Parsed dates:', { 
            restoredStartDate: restoredStartDate.toISOString(), 
            restoredEndDate: restoredEndDate.toISOString() 
          });
          
          // Validate restored dates
          if (isNaN(restoredStartDate.getTime()) || isNaN(restoredEndDate.getTime())) {
            console.error('❌ Invalid saved dates, using defaults');
            setDateRangeLoaded(true);
            return;
          }
          
          // Check if start date is after end date (invalid range)
          if (restoredStartDate > restoredEndDate) {
            console.error('❌ Invalid saved date range: start > end, clearing corrupted data');
            // Clear the corrupted saved dates
            await AsyncStorage.removeItem('salesReport_startDate');
            await AsyncStorage.removeItem('salesReport_endDate');
            setDateRangeLoaded(true);
            return;
          }
          
          console.log('✅ Setting restored dates to state...');
          setStartDate(restoredStartDate);
          setEndDate(restoredEndDate);
          console.log('📅 Restored saved date range:', savedStartDate, 'to', savedEndDate);
        } else {
          console.log('📱 No saved dates found, using defaults');
          // Set default dates (current month) if no saved dates
          const now = new Date();
          const defaultStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
          const defaultEndDate = new Date();
          setStartDate(defaultStartDate);
          setEndDate(defaultEndDate);
        }
        
        // Mark that date range loading is complete
        console.log('✅ Date range loading complete, setting dateRangeLoaded to true');
        setDateRangeLoaded(true);
      } catch (error) {
        console.error('❌ Failed to load saved date range:', error);
        setDateRangeLoaded(true);
      }
    };
    
    loadSavedDateRange();
  }, []);

  // Save date range when it changes
  const saveDateRange = useCallback(async (start: Date, end: Date) => {
    try {
      // Validate dates before saving
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        console.error('❌ Invalid dates, not saving:', start, end);
        return;
      }
      
      if (start > end) {
        console.error('❌ Invalid date range: start > end, not saving');
        return;
      }
      
      await AsyncStorage.setItem('salesReport_startDate', start.toISOString());
      await AsyncStorage.setItem('salesReport_endDate', end.toISOString());
      console.log('💾 Saved date range:', start.toISOString(), 'to', end.toISOString());
    } catch (error) {
      console.error('❌ Failed to save date range:', error);
    }
  }, []);

  const [filteredTransactions, setFilteredTransactions] = useState<any[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({
    current: 0,
    total: 0,
    message: ''
  });
  const [dateRangeLoaded, setDateRangeLoaded] = useState(false);

  const [showFilters, setShowFilters] = useState(false);
  const [showPeriodSelector, setShowPeriodSelector] = useState(false);
  const [hasActiveFilters, setHasActiveFilters] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<{
    selectedStockGroup: string;
    selectedPinCode: string;
    selectedCustomer: string;
    selectedItem: string;
    periodicity: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    scaleFactor: number;
    avgSalesDays: number;
    metricType: 'sales' | 'profit';
    enabledCards: {
      stockGroupChart: boolean;
      pinCodeChart: boolean;
      customersChart: boolean;
      monthlySales: boolean;
      topItems: boolean;
    };
  }>({
    selectedStockGroup: 'all',
    selectedPinCode: 'all',
    selectedCustomer: 'all',
    selectedItem: 'all',
    periodicity: 'monthly',
    scaleFactor: 1,
    avgSalesDays: 30,
    metricType: 'sales',
    enabledCards: {
      stockGroupChart: true,
      pinCodeChart: true,
      customersChart: true,
      monthlySales: true,
      topItems: true,
    },
  });

  // Load data directly from Tally on mount
  useEffect(() => {
    console.log('🔍 Data loading useEffect triggered:', { 
      guid: !!guid, 
      tallylocId: !!tallylocId, 
      companyName: !!companyName, 
      dateRangeLoaded,
      startDate: startDate?.toISOString() || 'null',
      endDate: endDate?.toISOString() || 'null'
    });
    
    if (guid && tallylocId && companyName && dateRangeLoaded && startDate && endDate) {
      console.log('🚀 Loading fresh data from Tally...');
      console.log('📅 Using date range:', startDate.toISOString(), 'to', endDate.toISOString());
      loadSalesDataFromTally(startDate, endDate);
    }
  }, [guid, tallylocId, companyName, dateRangeLoaded, startDate, endDate]);

  // Removed database-dependent functions - using direct Tally data

  const loadSalesDataFromTally = useCallback(async (customStartDate?: Date, customEndDate?: Date) => {
    if (!tallylocId || !companyName || !guid) return;

    try {
      setLoadingReport(true);
      setLoadingProgress({ current: 0, total: 0, message: 'Checking offline data...' });
      console.log('🌐 Loading sales data with offline-first approach...');

      const reportStartDate = customStartDate || startDate;
      const reportEndDate = customEndDate || endDate;
      
      // Validate dates
      if (!reportStartDate || !reportEndDate) {
        console.error('❌ Invalid dates for data loading:', { reportStartDate, reportEndDate });
        setLoadingReport(false);
        setLoadingProgress({ current: 0, total: 0, message: 'Invalid date range' });
        return;
      }

      console.log('📅 Loading data for date range:', {
        startDate: reportStartDate.toISOString(),
        endDate: reportEndDate.toISOString(),
        startDateStr: reportStartDate.toISOString().split('T')[0],
        endDateStr: reportEndDate.toISOString().split('T')[0]
      });

      // Validate date range
      if (reportStartDate > reportEndDate) {
        console.error('❌ Invalid date range: Start date is after end date');
        setLoadingReport(false);
        setLoadingProgress({ current: 0, total: 0, message: 'Invalid date range' });
        return;
      }

      // First, try to load from SQLite (offline)
      try {
        setLoadingProgress({ current: 0, total: 2, message: 'Checking offline data...' });
        const offlineResponse = await apiService.getSalesDataFromSQLite(reportStartDate, reportEndDate);
        
        if (offlineResponse.success && offlineResponse.data?.entries) {
          console.log(`📱 Loaded ${offlineResponse.data.entries.length} entries from offline storage`);
          
          // Convert to format expected by SalesAnalytics
          const salesData = offlineResponse.data.entries.map((entry: any) => ({
            id: entry.id || '',
            date: entry.date || '',
            invoiceNumber: entry.invoiceNumber || '',
            customer: entry.customer || '',
            itemName: entry.itemName || '',
            stockGroup: entry.stockGroup || '',
            pinCode: entry.pinCode || '',
            quantity: parseFloat(entry.quantity) || 0,
            rate: parseFloat(entry.rate) || 0,
            amount: parseFloat(entry.amount) || 0,
            profit: parseFloat(entry.profit) || 0,
            masterId: entry.masterId || '',
            alterId: entry.alterId || '',
            vchType: entry.vchType || '',
          }));

          setFilteredTransactions(salesData as any);
          setHasActiveFilters(false);
          setLoadingProgress({ current: 2, total: 2, message: 'Offline data loaded!' });
          
          console.log('✅ Sales data loaded from offline storage');
          return; // Successfully loaded from offline storage
        }
      } catch (offlineError) {
        console.log('📱 No offline data available, fetching from Tally...');
      }

      // If offline data not available, fetch from Tally
      setLoadingProgress({ current: 0, total: 0, message: 'Fetching from Tally...' });
      console.log('🌐 Loading fresh sales data from Tally with chunked approach...');

      const response = await apiService.getSalesDataReport(
        tallylocId,
        companyName,
        guid!,
        reportStartDate,
        reportEndDate,
        (current, total, message) => {
          setLoadingProgress({ current, total, message });
        }
      );

      console.log('🔍 Full API response:', response);
      
      // API response received
      
      if (response && response.data) {
        // Handle different response structures
        let entries = [];
        if (response.data.entries) {
          entries = response.data.entries;
        } else if (Array.isArray(response.data)) {
          entries = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          entries = response.data.data;
        }
        
        console.log(`📊 Loaded ${entries.length} transactions from Tally`);

        // Convert to format expected by SalesAnalytics
        const salesData = entries.map((entry: any) => ({
          id: entry.id || '',
          date: entry.date || '',
          invoiceNumber: entry.invoiceNumber || '',
          customer: entry.customer || '',
          itemName: entry.itemName || '',
          stockGroup: entry.stockGroup || '',
          pinCode: entry.pinCode || '',
          quantity: parseFloat(entry.quantity) || 0,
          rate: parseFloat(entry.rate) || 0,
          amount: parseFloat(entry.amount) || 0,
          profit: parseFloat(entry.profit) || 0,
          masterId: entry.masterId || '',
          alterId: entry.alterId || '',
          vchType: entry.vchType || '',
        }));

        // Set the data directly for display
        setFilteredTransactions(salesData as any);
        setHasActiveFilters(false);
        
        setLoadingProgress({ current: 0, total: 0, message: 'Complete!' });
        console.log('✅ Sales data loaded and ready for display');
        
        // Data loaded successfully
        
        // Force a re-render check
      } else {
        console.log('❌ No data found in response');
      }
    } catch (error) {
      console.error('❌ Failed to load sales data from Tally:', error);
      setLoadingProgress({ current: 0, total: 0, message: 'Error loading data' });
    } finally {
      setLoadingReport(false);
    }
  }, [tallylocId, companyName, guid]);

  const handleAnalyticsDateRangeChange = useCallback((newStartDate: string, newEndDate: string) => {
    const start = new Date(newStartDate);
    const end = new Date(newEndDate);
    
    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      console.error('❌ Invalid date format:', newStartDate, newEndDate);
      return;
    }
    
    console.log('📅 Date range change:', { newStartDate, newEndDate, start: start.toISOString(), end: end.toISOString() });
    
    setStartDate(start);
    setEndDate(end);
    
    // Save the new date range
    saveDateRange(start, end);
    
    // Reload data with new date range
    loadSalesDataFromTally(start, end);
  }, [saveDateRange]);

  const handlePeriodSelect = useCallback((start: Date, end: Date) => {
    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      console.error('❌ Invalid date in period select:', start, end);
      return;
    }
    
    console.log('📅 Period select:', { start: start.toISOString(), end: end.toISOString() });
    
    setStartDate(start);
    setEndDate(end);
    setShowPeriodSelector(false);
    
    // Save the new date range
    saveDateRange(start, end);
    
    // Reload data with new period
    loadSalesDataFromTally(start, end);
  }, [saveDateRange]);

  const handleFiltersChange = useCallback((newFilters: typeof currentFilters) => {
    setCurrentFilters(newFilters);
    setShowFilters(false);
    
    // Only reload if we have valid dates
    if (startDate && endDate) {
      console.log('🔄 Reloading data with new filters...');
      loadSalesDataFromTally(startDate, endDate);
    } else {
      console.log('⚠️ Cannot reload data: dates not available yet');
    }
  }, [startDate, endDate]);

  // Loading states
  if (loadingReport) {
    const progressPercent = loadingProgress.total > 0 ? (loadingProgress.current / loadingProgress.total) * 100 : 0;
    
    return (
      <SafeAreaView style={styles.container}>
        <StandardHeader title="Sales Analytics" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingTitle}>Loading Sales Data from Tally...</Text>
          <Text style={styles.loadingSubtitle}>{loadingProgress.message}</Text>
          
          {loadingProgress.total > 0 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${progressPercent}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {loadingProgress.current} / {loadingProgress.total} ({Math.round(progressPercent)}%)
              </Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }


  // Use the loaded sales data directly
  const salesDataForAnalytics = filteredTransactions;
  
  
  // Component state debugging

  // No summary data needed - using direct data from Tally
  const summaryData = undefined;

  // Create header right component
  const headerRightComponent = (
    <View style={styles.headerIcons}>
      <TouchableOpacity
        onPress={() => setShowPeriodSelector(true)}
        style={styles.headerIconButton}
      >
        <Text style={styles.headerIcon}>📅</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setShowFilters(true)}
        style={styles.headerIconButton}
      >
        <Text style={styles.headerIcon}>⚙️</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => {
          if (startDate && endDate) {
            loadSalesDataFromTally(startDate, endDate);
          } else {
            console.log('⚠️ Cannot refresh: dates not available yet');
          }
        }}
        style={styles.headerIconButton}
      >
        <Text style={styles.headerIcon}>🔄</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StandardHeader 
        title="Sales Analytics"
        rightComponent={headerRightComponent}
      />
      
      {salesDataForAnalytics.length > 0 ? (
        <>
          <SalesAnalytics 
            salesData={salesDataForAnalytics}
            summaryData={summaryData}
            onClose={() => {}}
            onDateRangeChange={handleAnalyticsDateRangeChange}
            currentDataDateRange={startDate && endDate ? { start: startDate, end: endDate } : undefined}
            initialDateRange={startDate && endDate ? { start: startDate, end: endDate } : undefined}
            onPeriodSelect={() => setShowPeriodSelector(true)}
            onConfigSelect={() => setShowFilters(true)}
            filters={currentFilters}
            stockItems={items}
          />
        </>
      ) : (
        <>
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataTitle}>No Data Available</Text>
            <Text style={styles.noDataMessage}>
              {loadingReport ? 'Loading data from Tally...' : 
               (startDate && endDate && startDate > endDate) ? 'Invalid date range: Start date is after end date' :
               'No sales data found for the selected period.'}
            </Text>
            <TouchableOpacity 
              style={styles.refreshButton} 
              onPress={() => {
                if (startDate && endDate) {
                  loadSalesDataFromTally(startDate, endDate);
                } else {
                  console.log('⚠️ Cannot refresh: dates not available yet');
                }
              }}
            >
              <Text style={styles.refreshButtonText}>Refresh Data</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
      
      <AnalyticsFilters
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        onApplyFilters={handleFiltersChange}
        currentFilters={currentFilters}
        allStockGroups={[]}
        allPinCodes={[]}
        allItems={[]}
        allCustomers={[]}
      />
      
      <PeriodSelector
        visible={showPeriodSelector}
        onClose={() => setShowPeriodSelector(false)}
        onApplyPeriod={(startDateStr, endDateStr) => {
          const start = new Date(startDateStr);
          const end = new Date(endDateStr);
          handlePeriodSelect(start, end);
        }}
        currentStartDate={startDate?.toISOString().split('T')[0] || ''}
        currentEndDate={endDate?.toISOString().split('T')[0] || ''}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#d32f2f',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
    padding: 8,
    marginLeft: 8,
  },
  headerIcon: {
    fontSize: 20,
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noDataTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  noDataMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
