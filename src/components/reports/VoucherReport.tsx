import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '../../context/UserContext';
import { useConnection } from '../../context/ConnectionContext';
import { useSafeNavigation } from '../../hooks/useSafeNavigation';
import { apiService } from '../../services/api';
import { voucherDataService } from '../../services/voucherDataService';
import { StandardHeader, OfflineBanner } from '../common';
import { PeriodSelector } from '../analytics/PeriodSelector';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
interface VoucherData {
  mstid: string;
  vchno: string;
  date: string;
  party: string;
  state: string;
  country: string;
  gstno: string;
  partyid: string;
  amt: number;
  vchtype: string;
  issale: string;
  pincode: string;
}

interface LoadingProgress {
  current: number;
  total: number;
  message: string;
}

export default function VoucherReport() {
  const { selectedCompany } = useUser();
  const { isOffline } = useConnection();
  const { safePush } = useSafeNavigation();
  
  // State
  const [loadingReport, setLoadingReport] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<LoadingProgress>({ current: 0, total: 0, message: '' });
  const [backgroundSyncing, setBackgroundSyncing] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [vouchers, setVouchers] = useState<VoucherData[]>([]);
  const [hasSyncedForCompany, setHasSyncedForCompany] = useState<string | null>(null);
  const [syncCancelled, setSyncCancelled] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [dateRangeLoaded, setDateRangeLoaded] = useState(false);
  const [showPeriodSelector, setShowPeriodSelector] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVchType, setSelectedVchType] = useState<string | null>(null);
  const [drilldownVouchers, setDrilldownVouchers] = useState<VoucherData[]>([]);

  // Helper function to format date as "01-Apr-25" in IST (UTC+5:30)
  const formatDateForDisplay = (date: Date): string => {
    try {
      const ist = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
      let y = ist.getUTCFullYear();
      let m = ist.getUTCMonth();
      let d = ist.getUTCDate();
      // If the adjusted time lands on 31-Mar (UTC perspective), display 01-Apr for India FY semantics
      if (m === 2 && d === 31) { // 0=Jan,2=Mar
        m = 3; // Apr
        d = 1;
      }
      const day = d.toString().padStart(2, '0');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[m];
      const year = y.toString().slice(-2);
      return `${day}-${month}-${year}`;
    } catch (error) {
      console.error('❌ Error formatting date for display:', error);
      return 'Invalid Date';
    }
  };

  // Helper function to convert booksfrom date format to YYYY-MM-DD
  const convertBooksfromDate = (booksfromDate: string): string => {
    try {
      console.log('🔄 Converting booksfrom date:', booksfromDate);
      
      // Handle format like "1-Apr-25" -> "2025-04-01"
      // Parse the date components
      const parts = booksfromDate.split('-');
      if (parts.length !== 3) {
        console.error('❌ Invalid booksfrom date format:', booksfromDate);
        return '2025-04-01'; // fallback
      }
      
      const day = parseInt(parts[0]);
      const monthStr = parts[1];
      const yearStr = parts[2];
      const year = parseInt('20' + yearStr); // Convert "25" to "2025"
      
      console.log('🔍 Parsed components:', { 
        day, 
        monthStr, 
        yearStr, 
        year,
        parts 
      });
      
      // Convert month name to number
      const monthMap: { [key: string]: number } = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      };
      
      const month = monthMap[monthStr];
      if (month === undefined) {
        console.error('❌ Invalid month in booksfrom date:', monthStr);
        return '2025-04-01'; // fallback
      }
      
      // Create date with correct month (month is 0-indexed, so Apr = 3)
      const date = new Date(year, month, day);
      if (isNaN(date.getTime())) {
        console.error('❌ Invalid date after parsing:', { day, month, year });
        return '2025-04-01'; // fallback
      }
      
      // Verify the date was created correctly
      const result = date.toISOString().split('T')[0];
      console.log('✅ Converted booksfrom date:', booksfromDate, '->', result);
      console.log('🔍 Date components:', { day, month, year, result });
      console.log('🔍 Date object details:', { 
        getDate: date.getDate(), 
        getMonth: date.getMonth(), 
        getFullYear: date.getFullYear(),
        toISOString: date.toISOString()
      });
      
      // For April (month 3), ensure we get April 1st, not March 31st
      if (month === 3 && day === 1) {
        // Force April 1st for this specific case, but use the correct year
        const correctYear = year;
        console.log(`🔧 Forcing April 1st for 1-Apr-${year.toString().slice(-2)} -> ${correctYear}-04-01`);
        return `${correctYear}-04-01`;
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error converting booksfrom date:', error);
      return '2025-04-01'; // fallback
    }
  };

  // Load saved date range on mount
  useEffect(() => {
    const loadSavedDateRange = async () => {
      try {
        console.log('🔄 Loading saved date range from AsyncStorage...');
        console.log('📱 Selected company at load:', selectedCompany);
        console.log('📱 Company booksfrom at load:', selectedCompany?.booksfrom);
        
        // Don't proceed if no company is selected yet
        if (!selectedCompany) {
          console.log('📱 No company selected yet, waiting...');
          return;
        }
        
        const savedStartDate = await AsyncStorage.getItem('voucherReport_startDate');
        const savedEndDate = await AsyncStorage.getItem('voucherReport_endDate');
        
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
            await AsyncStorage.removeItem('voucherReport_startDate');
            await AsyncStorage.removeItem('voucherReport_endDate');
            setDateRangeLoaded(true);
            return;
          }
          
          console.log('✅ Setting restored dates to state...');
          setStartDate(restoredStartDate);
          setEndDate(restoredEndDate);
          console.log('📅 Restored saved date range:', savedStartDate, 'to', savedEndDate);
        } else {
          console.log('📱 No saved dates found, setting period to current FY start to today (IST)');
          console.log('📱 Selected company:', selectedCompany);
          console.log('📱 Company booksfrom:', selectedCompany?.booksfrom);
          
          // Set default period to Current Financial Year start (Apr 1) to Today (IST)
          const now = new Date();
          const istOffsetMs = 5.5 * 60 * 60 * 1000; // 5.5 hours
          const istNow = new Date(now.getTime() + istOffsetMs);
          const currentYear = istNow.getFullYear();
          const currentMonth = istNow.getMonth(); // 0=Jan
          const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1; // Apr is month 3
          const fyStart = new Date(fyStartYear, 3, 1);
          const todayIst = istNow;

          console.log('📅 FY period (UI):', {
            fyStart: fyStart.toISOString(),
            todayIst: todayIst.toISOString(),
          });

          setStartDate(fyStart);
          setEndDate(todayIst);
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
  }, [selectedCompany]);

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
      
      await AsyncStorage.setItem('voucherReport_startDate', start.toISOString());
      await AsyncStorage.setItem('voucherReport_endDate', end.toISOString());
      console.log('💾 Saved date range:', start.toISOString(), 'to', end.toISOString());
    } catch (error) {
      console.error('❌ Failed to save date range:', error);
    }
  }, []);

  // Load voucher data with offline-first approach
  // Background incremental sync function
  const syncIncrementalData = useCallback(async () => {
    console.log('🚀 SYNC FUNCTION CALLED - Starting syncIncrementalData');
    if (!selectedCompany) return;

    // Check if company is offline - don't sync if offline
    if (selectedCompany.status === 'offline') {
      console.log('📱 Company is offline, skipping sync');
      return;
    }

    // Check if sync was cancelled
    if (syncCancelled) {
      console.log('🚫 Sync cancelled, aborting...');
      return;
    }

    setBackgroundSyncing(true);
    
    // Create abort controller for this sync
    const controller = new AbortController();
    setAbortController(controller);
    
    try {
      await voucherDataService.initialize();
      
      // Get highest alterid from SQLite
      const highestAlterId = await voucherDataService.getHighestAlterId(selectedCompany.GUID!, selectedCompany.tallyloc_id!);
      
      // If no data exists, use 0 to get full data from Tally
      const lastAlterId = highestAlterId === 0 ? 0 : highestAlterId;
      
      if (highestAlterId === 0) {
        console.log('📱 No existing data, will fetch full data from Tally (alterid: 0)');
      } else {
        console.log(`📱 Found existing data, will fetch incremental data from alterid: ${highestAlterId}`);
      }

      // Get company's booksfrom date and convert to YYYY-MM-DD format
      console.log('🔍 Company booksfrom from selectedCompany:', selectedCompany.booksfrom);
      console.log('🔍 SelectedCompany object:', {
        company: selectedCompany.company,
        booksfrom: selectedCompany.booksfrom,
        guid: selectedCompany.GUID
      });
      
      const booksFromDate = selectedCompany.booksfrom 
        ? convertBooksfromDate(selectedCompany.booksfrom)
        : '2025-04-01';
      
      console.log('🔍 Converted booksfrom date:', booksFromDate);
      
      // Use IST for current date (UTC+5:30)
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
      const istDate = new Date(now.getTime() + istOffset);
      const currentDate = istDate.toISOString().split('T')[0];
      
      console.log(`🔄 Syncing data from alterid ${lastAlterId} (${booksFromDate} to ${currentDate})`);
      
      // Check if sync was cancelled before making API call
      if (syncCancelled) {
        console.log('🚫 Sync cancelled before API call, aborting...');
        return;
      }

      // Call incremental sync API with abort signal
      console.log('🚀 ABOUT TO CALL API - getIncrementalVoucherDataFromTally');
      const response = await apiService.getIncrementalVoucherDataFromTally(
        selectedCompany.tallyloc_id,
        selectedCompany.company,
        selectedCompany.GUID!,
        booksFromDate,
        currentDate,
        lastAlterId,
        undefined, // onProgress callback
        controller.signal // abort signal
      );

      if (response.success) {
        if (response.message === 'Sync cancelled') {
          console.log('🚫 Sync was cancelled gracefully');
          return; // Exit gracefully without updating UI
        } else if (response.data?.vouchers) {
          console.log(`✅ Incremental sync completed: ${response.data.vouchers.length} new vouchers`);
          
          // Refresh the current view with updated data
          if (startDate && endDate) {
            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];
            const updatedVouchers = await voucherDataService.getVouchersByDateRange(startDateStr, endDateStr, selectedCompany.GUID!, selectedCompany.tallyloc_id!);
            setVouchers(updatedVouchers);
          }
        }
      }
    } catch (error) {
      // Handle specific error cases
      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.message.includes('Request cancelled')) {
          console.log('🚫 Sync was cancelled, stopping gracefully');
          setSyncCancelled(true);
        } else if (error.message.includes('401') || error.message.includes('HTTP error! status: 401')) {
          console.log('🔐 Authentication error - user may have logged out, stopping sync');
          setSyncCancelled(true);
        } else if (error.message.includes('Network request failed')) {
          console.log('🌐 Network error - stopping sync');
          setSyncCancelled(true);
        } else {
          // Only log as error if it's not a cancellation
          console.error('❌ Incremental sync failed:', error);
        }
      }
    } finally {
      setBackgroundSyncing(false);
      setAbortController(null); // Clear the controller
    }
  }, [selectedCompany, startDate, endDate, syncCancelled]);

  const loadVoucherData = useCallback(async (reportStartDate: Date, reportEndDate: Date) => {
    if (!selectedCompany) {
      console.error('❌ No company selected');
      return;
    }

    const { tallyloc_id, company: companyName, GUID: guid } = selectedCompany;

    // Validate dates
    if (!reportStartDate || !reportEndDate) {
      console.error('❌ Invalid dates for data loading:', { reportStartDate, reportEndDate });
      setLoadingReport(false);
      setLoadingProgress({ current: 0, total: 0, message: 'Invalid date range' });
      return;
    }

    // Validate date range
    if (reportStartDate > reportEndDate) {
      console.error('❌ Invalid date range: Start date is after end date');
      setLoadingReport(false);
      setLoadingProgress({ current: 0, total: 0, message: 'Invalid date range' });
      return;
    }

    // Don't show loading screen - show data immediately
    setLoadingProgress({ current: 0, total: 0, message: '' });

    try {
      console.log('🌐 Loading voucher data with offline-first approach...');
      console.log('📅 Loading data for date range:', { 
        endDate: reportEndDate.toISOString(), 
        endDateStr: reportEndDate.toISOString().split('T')[0], 
        startDate: reportStartDate.toISOString(), 
        startDateStr: reportStartDate.toISOString().split('T')[0] 
      });

      // Load data from SQLite for the selected date range
      console.log('📱 Loading data from SQLite for selected date range...');
      
      await voucherDataService.initialize();
      
      // Debug: Check what data is in the database
      await voucherDataService.debugDataInfo();
      
      // Convert dates to YYYY-MM-DD format for SQLite query
      const startDateStr = reportStartDate.toISOString().split('T')[0];
      const endDateStr = reportEndDate.toISOString().split('T')[0];
      
      console.log(`📱 Querying SQLite for date range: ${startDateStr} to ${endDateStr}`);
      console.log(`📱 Report start date: ${reportStartDate.toISOString()}`);
      console.log(`📱 Report end date: ${reportEndDate.toISOString()}`);
      
      // Get vouchers from SQLite for the selected date range
      const vouchers = await voucherDataService.getVouchersByDateRange(startDateStr, endDateStr, selectedCompany.GUID!, selectedCompany.tallyloc_id!);
      
      if (vouchers && vouchers.length > 0) {
        console.log('📱 Loaded vouchers from SQLite:', vouchers.length, 'vouchers');
        setVouchers(vouchers);
        return;
      } else {
        console.log('📱 No data in SQLite for selected date range, showing empty state...');
        setVouchers([]);
        return;
      }

      // This code is now handled in background sync
    } catch (error) {
      console.error('❌ Error loading voucher data:', error);
      setVouchers([]);
    }
  }, [selectedCompany]);

  // Pulse animation for sync indicator
  useEffect(() => {
    if (backgroundSyncing) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.7,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [backgroundSyncing, pulseAnim]);

  // Cleanup effect - cancel sync when component unmounts
  useEffect(() => {
    return () => {
      console.log('🧹 Component unmounting, cancelling background sync...');
      setSyncCancelled(true);
      setBackgroundSyncing(false);
      
      // Abort any ongoing requests
      if (abortController) {
        console.log('🚫 Aborting ongoing API requests...');
        abortController.abort();
      }
    };
  }, [abortController]);

  // Reset sync state when company changes
  useEffect(() => {
    if (selectedCompany?.GUID && hasSyncedForCompany !== selectedCompany.GUID) {
      console.log('📱 Company changed, resetting sync state');
      setHasSyncedForCompany(null);
      setSyncCancelled(false); // Reset cancellation flag for new company
    }
  }, [selectedCompany?.GUID, hasSyncedForCompany]);

  // Load data when component mounts or dates change
  useEffect(() => {
    console.log('🔍 Data loading useEffect triggered:', { 
      guid: !!selectedCompany?.GUID, 
      tallylocId: !!selectedCompany?.tallyloc_id, 
      companyName: !!selectedCompany?.company, 
      dateRangeLoaded,
      startDate: startDate?.toISOString() || 'null',
      endDate: endDate?.toISOString() || 'null'
    });
    
    if (selectedCompany?.GUID && selectedCompany?.tallyloc_id && selectedCompany?.company && dateRangeLoaded && startDate && endDate) {
      console.log('🚀 Loading data for company...');
      console.log('📅 Using date range:', startDate.toISOString(), 'to', endDate.toISOString());
      loadVoucherData(startDate, endDate);
      
      // Run background sync only if we haven't synced for this company yet and sync is not cancelled
      if (hasSyncedForCompany !== selectedCompany.GUID && !syncCancelled) {
        console.log('🔄 First time loading this company, starting background sync...');
        setHasSyncedForCompany(selectedCompany.GUID);
        syncIncrementalData();
      } else if (syncCancelled) {
        console.log('🚫 Sync cancelled, skipping background sync');
      } else {
        console.log('📱 Company already synced, skipping background sync');
      }
    }
  }, [selectedCompany?.GUID, selectedCompany?.tallyloc_id, selectedCompany?.company, dateRangeLoaded, startDate, endDate, loadVoucherData, hasSyncedForCompany, syncCancelled, syncIncrementalData]);

  // Handle period selection
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
    loadVoucherData(start, end);
  }, [saveDateRange, loadVoucherData]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    if (startDate && endDate) {
      setRefreshing(true);
      loadVoucherData(startDate, endDate).finally(() => {
        setRefreshing(false);
      });
    } else {
      console.log('⚠️ Cannot refresh: dates not available yet');
    }
  }, [startDate, endDate, loadVoucherData]);

  // Calculate summary statistics by ReservedName and VchType
  const summaryStats = useMemo(() => {
    if (!vouchers.length) return null;

    // Group vouchers by ReservedName and VchType
    const groupedData: { [key: string]: { [vchType: string]: number } } = {};
    
    vouchers.forEach(voucher => {
      const reservedName = voucher.reservedname || 'Unknown';
      const vchType = voucher.vchtype || 'Unknown';
      
      if (!groupedData[reservedName]) {
        groupedData[reservedName] = {};
      }
      
      if (!groupedData[reservedName][vchType]) {
        groupedData[reservedName][vchType] = 0;
      }
      
      groupedData[reservedName][vchType]++;
    });

    // Convert to array format for display
    const summaryData = Object.entries(groupedData).map(([reservedName, vchTypes]) => ({
      reservedName,
      vchTypes: Object.entries(vchTypes).map(([vchType, count]) => ({
        vchType,
        count
      })),
      totalVouchers: Object.values(vchTypes).reduce((sum, count) => sum + count, 0)
    }));

    const totalVouchers = vouchers.length;
    const totalAmount = vouchers.reduce((sum, voucher) => {
      let amount = 0;
      if (typeof voucher.amt === 'string') {
        // Handle string amounts with commas like "2,640.00"
        const cleanAmount = voucher.amt.replace(/,/g, '');
        amount = parseFloat(cleanAmount);
      } else {
        amount = voucher.amt;
      }
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    
    console.log('📊 Summary stats calculation:', {
      totalVouchers,
      totalAmount,
      voucherCount: vouchers.length,
      sampleVouchers: vouchers.slice(0, 3).map(v => ({ 
        date: v.date, 
        vchno: v.vchno, 
        party: v.party, 
        amt: v.amt, 
        amtType: typeof v.amt 
      }))
    });

    return {
      summaryData,
      totalVouchers,
      totalAmount
    };
  }, [vouchers]);

  // Handle drilldown to show individual vouchers for a specific type
  const handleDrilldown = (reservedName: string, vchType: string) => {
    if (!selectedCompany || !startDate || !endDate) return;
    // IST-safe YYYY-MM-DD to avoid 31-Mar vs 01-Apr drift
    const toYmd = (d: Date) => {
      const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
      const yyyy = ist.getUTCFullYear();
      const mm = (ist.getUTCMonth() + 1).toString().padStart(2, '0');
      const dd = ist.getUTCDate().toString().padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };
    const normalizeStartYmd = (s: string) => s.endsWith('-03-31') ? s.replace('-03-31','-04-01') : s;
    const startYmd = normalizeStartYmd(toYmd(startDate));
    const endYmd = toYmd(endDate);

    const params = {
      reservedName: String(reservedName),
      vchType: String(vchType),
      startDate: String(startYmd),
      endDate: String(endYmd),
      company: String(selectedCompany.company || ''),
      guid: String(selectedCompany.GUID || ''),
      tallylocId: String(selectedCompany.tallyloc_id || ''),
    } as any;
    // Navigate to dedicated drilldown screen
    // Pass params separately to avoid [object Object] in logs
    // Navigate with params object so Expo Router receives them correctly
    // @ts-ignore
    safePush({ pathname: '/voucher-drilldown', params });
  };

  // Handle back to summary
  const handleBackToSummary = () => {
    setSelectedVchType(null);
    setDrilldownVouchers([]);
  };

  // Render voucher item
  const renderVoucherItem = (voucher: VoucherData, index: number) => (
    <View key={voucher.mstid} style={styles.voucherItem}>
      <View style={styles.voucherRow}>
        <View style={styles.voucherField}>
          <Text style={styles.fieldLabel}>Date</Text>
          <Text style={styles.fieldValue}>{voucher.date}</Text>
        </View>
        <View style={styles.voucherField}>
          <Text style={styles.fieldLabel}>VchNo</Text>
          <Text style={styles.fieldValue}>{voucher.vchno}</Text>
        </View>
        <View style={styles.voucherField}>
          <Text style={styles.fieldLabel}>VchType</Text>
          <Text style={styles.fieldValue}>{voucher.vchtype}</Text>
        </View>
        <View style={styles.voucherField}>
          <Text style={styles.fieldLabel}>Party</Text>
          <Text style={styles.fieldValue}>{voucher.party}</Text>
        </View>
        <View style={styles.voucherField}>
          <Text style={styles.fieldLabel}>Amount</Text>
          <Text style={styles.fieldValue}>₹{voucher.amt.toLocaleString()}</Text>
        </View>
      </View>
    </View>
  );

  // Early return after all hooks to prevent hooks error
  if (!selectedCompany) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      {/* Offline Banner */}
      {isOffline && (
        <OfflineBanner 
          lastSyncDate={undefined}
          showLastSync={false}
        />
      )}
      
      <StandardHeader
        title="Voucher Report"
        onMenuPress={() => safePush('/reports')}
        showMenuButton={true}
        rightComponent={
          backgroundSyncing ? (
            <Animated.View style={[styles.headerSyncIndicator, { opacity: pulseAnim }]}>
              <Text style={styles.headerSyncIcon}>🔄</Text>
            </Animated.View>
          ) : null
        }
      />
      
      {/* Background sync indicator */}
      {backgroundSyncing && (
        <View style={styles.syncIndicator}>
          <Animated.View style={[styles.syncContent, { opacity: pulseAnim }]}>
            <Text style={styles.syncIcon}>🔄</Text>
            <Text style={styles.syncText}>Syncing fresh data from Tally...</Text>
            <View style={styles.syncPulse} />
          </Animated.View>
        </View>
      )}
      

      {/* Period Selector */}
      <View style={styles.periodContainer}>
        <TouchableOpacity
          style={styles.periodButton}
          onPress={() => setShowPeriodSelector(true)}
        >
          <Text style={styles.periodButtonText}>
            📅 {startDate ? formatDateForDisplay(startDate) : 'Start Date'} to {endDate ? formatDateForDisplay(endDate) : 'End Date'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
          disabled={loadingReport}
        >
          <Text style={styles.refreshButtonText}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Loading Progress */}
      {loadingReport && loadingProgress.total > 0 && (
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {loadingProgress.message} ({loadingProgress.current}/{loadingProgress.total})
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${(loadingProgress.current / loadingProgress.total) * 100}%` }
              ]} 
            />
          </View>
        </View>
      )}


      {/* Vouchers List */}
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {loadingReport ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#5D8277" />
            <Text style={styles.loadingText}>Loading voucher data...</Text>
          </View>
        ) : vouchers.length > 0 ? (
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Voucher Summary Report</Text>
            <View style={styles.summaryTable}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={styles.headerCell}>Reserved Name</Text>
                <Text style={styles.headerCell}>Vch Type</Text>
                <Text style={styles.headerCell}>Total Vouchers</Text>
              </View>
              
              {/* Table Rows */}
              {summaryStats?.summaryData.map((group, groupIndex) => (
                <View key={groupIndex}>
                  {group.vchTypes.map((vchType, vchIndex) => (
                    <TouchableOpacity 
                      key={`${groupIndex}-${vchIndex}`} 
                      style={styles.tableRow}
                      onPress={() => handleDrilldown(group.reservedName, vchType.vchType)}
                    >
                      <Text style={styles.cellText}>
                        {vchIndex === 0 ? group.reservedName : ''}
                      </Text>
                      <Text style={styles.cellText}>{vchType.vchType}</Text>
                      <Text style={styles.cellText}>{vchType.count}</Text>
                      <Text style={styles.drilldownIndicator}>🔍</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>
            
            {/* Drilldown moved to separate screen */}
            
            {/* Total Summary */}
            <View style={styles.totalSummary}>
              <Text style={styles.totalText}>
                Total Vouchers: {summaryStats?.totalVouchers}
              </Text>
              <Text style={styles.totalText}>
                Total Amount: ₹{summaryStats?.totalAmount.toLocaleString()}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataMessage}>
              {loadingReport ? 'Loading voucher data...' : 
               (startDate && endDate && startDate > endDate) ? 'Invalid date range: Start date is after end date' :
               'No voucher data found for the selected period.'}
            </Text>
            <TouchableOpacity
              style={[
                styles.refreshDataButton,
                (isOffline || selectedCompany?.status === 'offline') && styles.refreshDataButtonDisabled
              ]}
              disabled={isOffline || selectedCompany?.status === 'offline'}
              onPress={() => {
                if (selectedCompany?.GUID) {
                  if (isOffline) {
                    Alert.alert('Offline Mode', 'You are offline and cannot sync data. Please check your internet connection.');
                    return;
                  }
                  if (selectedCompany.status === 'offline') {
                    console.log('📱 Company is offline, cannot sync');
                    Alert.alert('Offline Company', 'This company is offline and cannot be synced. Please check your internet connection and try again.');
                    return;
                  }
                  console.log('🔄 Manual refresh requested, starting background sync...');
                  syncIncrementalData();
                } else {
                  console.log('⚠️ Cannot refresh: no company selected');
                }
              }}
            >
              <Text style={[
                styles.refreshDataButtonText,
                (isOffline || selectedCompany?.status === 'offline') && styles.refreshDataButtonTextDisabled
              ]}>
                Sync Data
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Period Selector Modal */}
      {showPeriodSelector && (
        <PeriodSelector
          visible={showPeriodSelector}
          currentStartDate={startDate?.toISOString().split('T')[0] || ''}
          currentEndDate={endDate?.toISOString().split('T')[0] || ''}
          onApplyPeriod={(startDateStr, endDateStr) => {
            const start = new Date(startDateStr);
            const end = new Date(endDateStr);
            handlePeriodSelect(start, end);
          }}
          onClose={() => setShowPeriodSelector(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6c757d',
  },
  periodContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  periodButton: {
    flex: 1,
    backgroundColor: '#5D8277',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  periodButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  refreshButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#ffffff',
    fontSize: 16,
  },
  progressContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  progressText: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e9ecef',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#5D8277',
  },
  scrollView: {
    flex: 1,
  },
  summaryContainer: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryTable: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 6,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#5D8277',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  headerCell: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: '#ffffff',
  },
  cellText: {
    flex: 1,
    fontSize: 13,
    color: '#495057',
    textAlign: 'center',
  },
  totalSummary: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  totalText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    textAlign: 'center',
    marginBottom: 4,
  },
  voucherItem: {
    backgroundColor: '#ffffff',
    padding: 12,
    marginBottom: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  voucherRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  voucherField: {
    width: '48%',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 11,
    color: '#6c757d',
    fontWeight: '500',
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 13,
    color: '#495057',
    fontWeight: '400',
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noDataMessage: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 20,
  },
  refreshDataButton: {
    backgroundColor: '#5D8277',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  refreshDataButtonDisabled: {
    backgroundColor: '#d1d5db',
    opacity: 0.6,
  },
  refreshDataButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  refreshDataButtonTextDisabled: {
    color: '#9ca3af',
  },
  // Drilldown styles
  drilldownIndicator: {
    fontSize: 12,
    color: '#5D8277',
    marginLeft: 8,
  },
  drilldownContainer: {
    marginTop: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    overflow: 'hidden',
  },
  drilldownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5D8277',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  backButton: {
    marginRight: 12,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  drilldownTitle: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  drilldownTable: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 6,
    overflow: 'hidden',
  },
  drilldownTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  drilldownHeaderCell: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#495057',
    textAlign: 'center',
  },
  drilldownTableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
    backgroundColor: '#ffffff',
  },
  drilldownCellText: {
    flex: 1,
    fontSize: 12,
    color: '#495057',
    textAlign: 'center',
  },
  syncIndicator: {
    backgroundColor: '#f0fdf4',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#22c55e',
    borderTopWidth: 2,
    borderTopColor: '#22c55e',
  },
  syncContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  syncIcon: {
    fontSize: 18,
    marginRight: 8,
    color: '#22c55e',
  },
  syncText: {
    fontSize: 14,
    color: '#16a34a',
    fontWeight: '600',
  },
  syncPulse: {
    position: 'absolute',
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
    opacity: 0.6,
  },
  headerSyncIndicator: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
  },
  headerSyncIcon: {
    fontSize: 16,
    color: '#ffffff',
  },
});
