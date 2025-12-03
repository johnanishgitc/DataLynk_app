import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StandardHeader, LightweightList, LedgerRenderer } from '../common';
import ReportsMenu from './ReportsMenu';
import { PeriodSelector } from '../common';
import { apiService } from '../../services/api';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { useReportsMenu } from '../../hooks';
import { useMasterData } from '../../context/MasterDataContext';
import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { SafeAreaView } from 'react-native-safe-area-context';

// Types for the API response
interface Voucher {
  MASTERID: number;
  DATE: string;
  VOUCHERTYPE: string;
  VOUCHERNUMBER: string;
  DEBITAMT: number;
  CREDITAMT: number;
}

interface ReceivableEntry {
  DATE: string;
  REFNO: string;
  DEBITOPENBAL: number;
  CREDITOPENBAL: number;
  DEBITCLSBAL: number;
  CREDITCLSBAL: number;
  DUEON: string;
  OVERDUEDAYS: number;
  VOUCHERS: Voucher[];
  ONACCVOUCHERS?: Voucher[];
}

interface LedgerReceivablesResponse {
  reporttype: string;
  ledgername: string;
  fromdate: number;
  todate: number;
  data: ReceivableEntry[];
}

interface Ledger {
  name: string;
  id: string;
}

interface LedgerReceivablesReportProps {
  companyName?: string;
  guid?: string;
  tallylocId?: string;
}

const LedgerReceivablesReport: React.FC<LedgerReceivablesReportProps> = ({ 
  companyName, 
  guid, 
  tallylocId 
}) => {
  const router = useRouter();
  const masterDataContext = useMasterData();

  // State
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [selectedLedger, setSelectedLedger] = useState<Ledger | null>(null);
  const [loadingLedgers, setLoadingLedgers] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [receivablesData, setReceivablesData] = useState<ReceivableEntry[]>([]);
  const [onAccountData, setOnAccountData] = useState<any>(null);
  const [closingData, setClosingData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [isGrandTotalCollapsed, setIsGrandTotalCollapsed] = useState(false);
  
  // Print state to prevent multiple simultaneous requests
  const [isPrinting, setIsPrinting] = useState(false);
  
  // Menu management
  const { showMenu, handleMenuPress, handleNavigation, closeMenu } = useReportsMenu();
  
  // Three dots menu state
  const [showThreeDotsMenu, setShowThreeDotsMenu] = useState(false);
  
  // Handle three dots menu press
  const handleThreeDotsPress = () => {
    setShowThreeDotsMenu(!showThreeDotsMenu);
  };
  
  // Close three dots menu
  const closeThreeDotsMenu = () => {
    setShowThreeDotsMenu(false);
  };
  
  // Generate HTML for receivables report
  const generateReceivablesHTML = () => {
    if (!receivablesData.length || !selectedLedger) return '';
    
    const rows = receivablesData.map((entry, index) => {
      const isDebit = entry.DEBITCLSBAL > 0;
      const amount = isDebit ? entry.DEBITCLSBAL : entry.CREDITCLSBAL;
      const amountType = isDebit ? 'Dr.' : 'Cr.';
      
      // Calculate opening amount
      const openingIsDebit = entry.DEBITOPENBAL > 0;
      const openingAmount = openingIsDebit ? entry.DEBITOPENBAL : entry.CREDITOPENBAL;
      const openingType = openingIsDebit ? 'Dr.' : 'Cr.';
      
      return `
        <tr>
          <td>${entry.DATE}</td>
          <td>${entry.REFNO}</td>
          <td>${entry.OVERDUEDAYS} Days</td>
          <td style="text-align:right;">${formatAmount(openingAmount)} ${openingType}</td>
          <td style="text-align:right;">${formatAmount(amount)} ${amountType}</td>
        </tr>
      `;
    }).join('');
    
      // Calculate totals - use whichever has value for pending amount
      const totalAmount = receivablesData.reduce((sum, entry) => {
        const pendingAmount = entry.DEBITCLSBAL > 0 ? entry.DEBITCLSBAL : entry.CREDITCLSBAL;
        return sum + pendingAmount;
      }, 0);
    
    const totalOpeningAmount = receivablesData.reduce((sum, entry) => {
      const openingAmount = entry.DEBITOPENBAL > 0 ? entry.DEBITOPENBAL : entry.CREDITOPENBAL;
      return sum + openingAmount;
    }, 0);
    
    // On Account amount - calculate properly
    const onAccountAmount = onAccountData ? 
      (onAccountData.DEBITCLSBAL > 0 ? onAccountData.DEBITCLSBAL : onAccountData.CREDITCLSBAL) : 0;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Ledger Receivables Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          .header { text-align: center; border-bottom: 2px solid #007AFF; padding-bottom: 20px; margin-bottom: 30px; }
          .company-info { margin-bottom: 30px; }
          .report-info { margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { font-weight: bold; }
          .summary { border-top: 2px solid #007AFF; padding-top: 20px; }
          .summary-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
          .total-row { font-weight: bold; font-size: 18px; border-top: 1px solid #ddd; padding-top: 10px; }
          .on-account-row { font-style: italic; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Ledger Receivables Report</h1>
        </div>
        
        <div class="company-info">
          <h2 style="text-align: center; margin-bottom: 10px; color: #333;">${companyName || 'Company Name'}</h2>
          <h3 style="text-align: center; margin-bottom: 20px; color: #666; font-size: 18px;">${selectedLedger.name}</h3>
        </div>
        
        <div class="report-info">
          <h3>Report Period</h3>
          <p><strong>From:</strong> ${startDate.toLocaleDateString()}</p>
          <p><strong>To:</strong> ${endDate.toLocaleDateString()}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Reference</th>
              <th>Overdue Days</th>
              <th>Opening Amount</th>
              <th>Pending Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        
        <div class="summary">
          ${shouldShowSubtotal() ? `
          <div class="summary-row">
            <span>Subtotal:</span>
            <span>${formatAmount(totalAmount)} Dr.</span>
          </div>
          ` : ''}
          ${onAccountData && onAccountData.ONACCVOUCHERSOPEN && hasNonZeroVouchers(onAccountData.ONACCVOUCHERSOPEN) ? `
          <div class="summary-row on-account-row">
            <span>${endDate.toLocaleDateString('en-GB', { 
              day: '2-digit', 
              month: 'short', 
              year: '2-digit' 
            }).replace(/(\d+)\/(\w+)\/(\d+)/, '$1-$2-$3')} | On Account:</span>
            <span>${formatAmount(onAccountData ? (onAccountData.DEBITCLSBAL > 0 ? onAccountData.DEBITCLSBAL : onAccountData.CREDITCLSBAL) : 0)} Cr.</span>
          </div>
          ` : ''}
          <div class="summary-row total-row">
            <span>Total Outstanding Amount:</span>
            <span>${formatAmount(
              // Use closing data for pending amount if available, otherwise calculate from entries
              closingData ? 
                (closingData.DEBITCLSBAL > 0 ? closingData.DEBITCLSBAL : closingData.CREDITCLSBAL) :
                receivablesData.reduce((sum, entry) => {
                  const pendingAmount = entry.DEBITCLSBAL > 0 ? entry.DEBITCLSBAL : entry.CREDITCLSBAL;
                  return sum + pendingAmount;
                }, 0) +
                // On Account amount: only include if there are vouchers with non-zero values
                (onAccountData && onAccountData.ONACCVOUCHERSOPEN && hasNonZeroVouchers(onAccountData.ONACCVOUCHERSOPEN)) ? 
                  (onAccountData.DEBITCLSBAL > 0 ? onAccountData.DEBITCLSBAL : onAccountData.CREDITCLSBAL) : 0
            )} Dr.</span>
          </div>
        </div>
      </body>
      </html>
    `;
  };
  
  // Print receivables report
  const printReceivables = async () => {
    if (isPrinting) {
      Alert.alert('Please wait', 'A print request is already in progress');
      return;
    }
    
    if (!receivablesData.length) {
      Alert.alert('No Data', 'Please load receivables data first before printing.');
      return;
    }
    
    setIsPrinting(true);
    try {
      const html = generateReceivablesHTML();
      await Print.printAsync({ html });
    } catch (error) {
      console.error('Print error:', error);
      Alert.alert('Print Error', `Failed to print receivables: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsPrinting(false);
    }
  };
  
  // Share receivables as PDF
  const shareReceivablesPDF = async () => {
    if (isPrinting) {
      Alert.alert('Please wait', 'A print request is already in progress');
      return;
    }
    
    if (!receivablesData.length) {
      Alert.alert('No Data', 'Please load receivables data first before sharing.');
      return;
    }
    
    setIsPrinting(true);
    try {
      const html = generateReceivablesHTML();
      const { uri } = await Print.printToFileAsync({ html });

      await shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf'
      });
    } catch (error) {
      console.error('Share PDF error:', error);
      Alert.alert('Share Error', `Failed to share receivables PDF: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsPrinting(false);
    }
  };
  
  // Download receivables as Excel
  const downloadReceivablesExcel = async () => {
    try {
      
      if (!receivablesData.length) {
        Alert.alert('No Data', 'Please load receivables data first before downloading.');
        return;
      }
      
      // Generate CSV content (Excel-compatible)
      const csvContent = generateReceivablesCSV();
      
      // Create a simple CSV file content
      const fileName = `receivables-${selectedLedger?.name || 'report'}-${new Date().toISOString().split('T')[0]}.csv`;
      
      // Create a temporary file first
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      
      // Share the file
      const shareResult = await shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Save Receivables Report'
      });
      
      if (shareResult) {
        Alert.alert(
          'Excel Download',
          'The receivables report has been saved as CSV format, which can be opened in Excel.',
          [{ text: 'OK' }]
        );
      } else {
      }
      
    } catch (error) {
      console.error('❌ Receivables Excel download error:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error message:', error instanceof Error ? error.message : String(error));
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      Alert.alert('Download Error', `Failed to download Excel file: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Generate CSV content for Excel
  const generateReceivablesCSV = () => {
    if (!receivablesData.length || !selectedLedger) {
      return '';
    }
    
    try {
      let csvContent = 'Date,Reference,Overdue Days,Opening Amount,Opening Type,Pending Amount,Pending Type\n';
      
      receivablesData.forEach((entry, index) => {
        const isDebit = entry.DEBITCLSBAL > 0;
        const amount = isDebit ? entry.DEBITCLSBAL : entry.CREDITCLSBAL;
        const amountType = isDebit ? 'Dr.' : 'Cr.';
        
        const openingIsDebit = entry.DEBITOPENBAL > 0;
        const openingAmount = openingIsDebit ? entry.DEBITOPENBAL : entry.CREDITOPENBAL;
        const openingType = openingIsDebit ? 'Dr.' : 'Cr.';
        
        csvContent += `${entry.DATE},${entry.REFNO},${entry.OVERDUEDAYS} Days,${openingAmount},${openingType},${amount},${amountType}\n`;
      });
      
      // Add summary section
      const totalAmount = receivablesData.reduce((sum, entry) => {
        const netAmount = entry.DEBITCLSBAL - entry.CREDITCLSBAL;
        return sum + netAmount;
      }, 0);
      
      const onAccountAmount = onAccountData ? 
        (onAccountData.DEBITCLSBAL > 0 ? onAccountData.DEBITCLSBAL : onAccountData.CREDITCLSBAL) : 0;
      
      
      csvContent += '\n';
      csvContent += 'Summary\n';
      if (shouldShowSubtotal()) {
        csvContent += `Subtotal,${totalAmount} Dr.\n`;
      }
      if (onAccountData && onAccountData.ONACCVOUCHERSOPEN && hasNonZeroVouchers(onAccountData.ONACCVOUCHERSOPEN)) {
        csvContent += `On Account,${onAccountAmount} ${onAccountData.DEBITCLSBAL > 0 ? 'Dr.' : 'Cr.'}\n`;
      }
      // Calculate total outstanding using the same logic as screen display
      const totalOutstanding = closingData ? 
        (closingData.DEBITCLSBAL > 0 ? closingData.DEBITCLSBAL : closingData.CREDITCLSBAL) :
        receivablesData.reduce((sum, entry) => {
          const pendingAmount = entry.DEBITCLSBAL > 0 ? entry.DEBITCLSBAL : entry.CREDITCLSBAL;
          return sum + pendingAmount;
        }, 0) +
        (onAccountData && onAccountData.ONACCVOUCHERSOPEN && hasNonZeroVouchers(onAccountData.ONACCVOUCHERSOPEN)) ? 
          (onAccountData.DEBITCLSBAL > 0 ? onAccountData.DEBITCLSBAL : onAccountData.CREDITCLSBAL) : 0;
      
      csvContent += `Total Outstanding,${totalOutstanding} Dr.\n`;
      
      return csvContent;
    } catch (error) {
      console.error('❌ Error generating receivables CSV:', error);
      return '';
    }
  };
  
  // Three dots menu component
  const ThreeDotsMenu = () => (
    <View style={styles.threeDotsMenuContainer}>
      <TouchableOpacity 
        style={styles.threeDotsButton}
        onPress={handleThreeDotsPress}
      >
        <Text style={styles.threeDotsIcon}>⋮</Text>
      </TouchableOpacity>
      
      {showThreeDotsMenu && (
        <View style={styles.dropdownMenu}>
          <TouchableOpacity 
            style={styles.dropdownItem}
            onPress={() => {
              closeThreeDotsMenu();
              downloadReceivablesExcel();
            }}
          >
            <Text style={styles.dropdownItemText}>Download as Excel</Text>
            <Text style={styles.dropdownItemIcon}>📊</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.dropdownItem, isPrinting && styles.dropdownItemDisabled]}
            onPress={() => {
              closeThreeDotsMenu();
              printReceivables();
            }}
            disabled={isPrinting}
          >
            <Text style={[styles.dropdownItemText, isPrinting && styles.dropdownItemTextDisabled]}>
              {isPrinting ? 'Printing...' : 'Print'}
            </Text>
            <Text style={styles.dropdownItemIcon}>🖨️</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.dropdownItem, isPrinting && styles.dropdownItemDisabled]}
            onPress={() => {
              closeThreeDotsMenu();
              shareReceivablesPDF();
            }}
            disabled={isPrinting}
          >
            <Text style={[styles.dropdownItemText, isPrinting && styles.dropdownItemTextDisabled]}>
              {isPrinting ? 'Generating...' : 'Share'}
            </Text>
            <Text style={styles.dropdownItemIcon}>📤</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // Load ledgers when component mounts
  useEffect(() => {
    if (companyName && tallylocId && guid) {
      loadLedgers();
    }
  }, [companyName, tallylocId, guid]);

  // Auto-open ledger dropdown when ledgers are loaded
  useEffect(() => {
    if (ledgers.length > 0 && !selectedLedger) {
      // Small delay to ensure component is fully rendered
      const timer = setTimeout(() => {
        setShowLedgerModal(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [ledgers, selectedLedger]);

  // Load receivables report when ledger or period changes
  useEffect(() => {
    if (selectedLedger?.name && companyName && tallylocId && guid) {
      loadReceivablesReport();
    }
  }, [selectedLedger, startDate, endDate, companyName, tallylocId, guid]);

  // Load ledgers from MasterDataContext (loaded during company selection)
  const loadLedgers = useCallback(async () => {
    if (!companyName || !tallylocId || !guid) {
      return;
    }
    
    setLoadingLedgers(true);
    setError(null);
    
    try {
      // Use customers from MasterDataContext as they are the same as ledgers
      // (both use /api/tally/ledgerlist-w-addrs endpoint)
      const customers = masterDataContext?.customers || [];
      
      // If no customers from context, fallback to API call
      if (customers.length === 0) {
        console.log('No customers in MasterDataContext, falling back to API call');
        const response = await apiService.getLedgersFromTally(tallylocId, companyName, guid);
        
        if (response.success && response.data) {
          // Parse the ledgers from the response
          const ledgersList = parseLedgersResponse(response.data);
          setLedgers(ledgersList);
        } else {
          setError(`Failed to load ledgers: ${response.message}`);
        }
      } else {
        // Convert customers to ledger format
        const ledgersList: Ledger[] = customers.map((customer, index) => ({
          name: customer.name,
          id: customer.id || index.toString(),
        }));
        
        setLedgers(ledgersList);
      }
    } catch (err) {
      setError('Failed to load ledgers. Please try again.');
    } finally {
      setLoadingLedgers(false);
    }
  }, [companyName, tallylocId, guid, masterDataContext?.customers]);

  // Parse ledgers from API response (using ledgerlist-w-addrs endpoint)
  const parseLedgersResponse = (jsonResponse: any): Ledger[] => {
    try {
      // Handle both string and object responses
      let responseData = jsonResponse;
      if (typeof jsonResponse === 'string') {
        responseData = JSON.parse(jsonResponse);
      }
      
      // Handle different possible response structures
      let ledgersData: any[] = [];
      
      if (responseData.success && responseData.data) {
        ledgersData = responseData.data;
      } else if (Array.isArray(responseData)) {
        ledgersData = responseData;
      } else if (responseData.data && Array.isArray(responseData.data)) {
        ledgersData = responseData.data;
      } else if (responseData.ledgers && Array.isArray(responseData.ledgers)) {
        // Handle the ledgerlist-w-addrs response structure
        ledgersData = responseData.ledgers;
      } else {
        return [];
      }
      
      // Convert the data to our Ledger interface
      const ledgers: Ledger[] = ledgersData.map((item, index) => ({
        name: item.name || item.NAME || item.ledger_name || item.description || `Ledger ${index + 1}`,
        id: item.id || item.ledger_id || item.guid || index.toString(),
      }));
      
      return ledgers;
    } catch (error) {
      // Return empty array instead of sample data
      return [];
    }
  };

  // Load receivables report from API
  const loadReceivablesReport = useCallback(async () => {
    if (!selectedLedger?.name || !companyName || !tallylocId || !guid) {
      return;
    }
    
    setLoadingReport(true);
    setError(null);
    
    try {
      const response = await apiService.getLedgerReceivablesFromTally(
        tallylocId,
        companyName,
        guid,
        selectedLedger.name,
        startDate,
        endDate
      );
      
      if (response.success && response.data) {
        try {
          const data = JSON.parse(response.data);
          if (data.data && Array.isArray(data.data)) {
            setReceivablesData(data.data);
          } else {
            setReceivablesData([]);
            setError('No receivables data found for the selected period.');
          }
          
          // Extract onacc data if available
          if (data.onacc) {
            setOnAccountData(data.onacc);
          } else {
            setOnAccountData(null);
          }
          
          // Extract closing data if available
          if (data.closing) {
            setClosingData(data.closing);
          } else {
            setClosingData(null);
          }
        } catch (parseError) {
          setError('Failed to parse receivables data.');
          setReceivablesData([]);
          setOnAccountData(null);
        }
      } else {
        setError(`Failed to load receivables: ${response.message}`);
        setReceivablesData([]);
        setOnAccountData(null);
      }
    } catch (err) {
      setError('Failed to load receivables. Please try again.');
      setReceivablesData([]);
    } finally {
      setLoadingReport(false);
    }
  }, [selectedLedger, startDate, endDate, companyName, tallylocId, guid]);

  // Handle period change
  const handlePeriodChange = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  };



  // Handle ledger selection
  const handleLedgerSelect = (ledger: Ledger) => {
    setSelectedLedger(ledger);
    setShowLedgerModal(false);
  };

  // Format amount with comma separators and 2 decimal places, hide 0.00 values
  const formatAmount = (amount: number): string => {
    if (amount === 0 || amount === null || amount === undefined) {
      return '';
    }
    return amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Format overdue days
  const formatOverdueDays = (days: number): string => {
    if (days === 0) return 'Due Today';
    if (days === 1) return '1 Day';
    return `${days} Days`;
  };

  // Handle drill-down to voucher details
  const handleDrillDown = (entry: ReceivableEntry) => {
    // Check for VOUCHERS array in the entry data
    const vouchers = (entry as any).VOUCHERS || entry.ONACCVOUCHERS || [];
    
    if (vouchers && vouchers.length > 0) {
      // Navigate to drill-down screen with voucher details
      router.push({
        pathname: '/reports/ledger-outstandings-detail',
        params: {
          ledgerName: selectedLedger?.name || '',
          refNo: entry.REFNO,
          vouchers: JSON.stringify(vouchers),
        },
      });
    } else {
      Alert.alert('No Voucher Details', 'No voucher details available for this entry.');
    }
  };

  // Helper function to check if all vouchers have zero values
  const hasNonZeroVouchers = (vouchers: Voucher[]): boolean => {
    if (!vouchers || vouchers.length === 0) return false;
    return vouchers.some(voucher => voucher.DEBITAMT > 0 || voucher.CREDITAMT > 0);
  };

  // Helper function to check if we should show subtotal
  const shouldShowSubtotal = (): boolean => {
    const voucherCount = receivablesData.length;
    const onAccountCount = (onAccountData && onAccountData.ONACCVOUCHERSOPEN && hasNonZeroVouchers(onAccountData.ONACCVOUCHERSOPEN)) ? 1 : 0;
    const totalRecords = voucherCount + onAccountCount;
    return totalRecords > 1;
  };

  // Handle drill-down to On Account voucher details
  const handleOnAccountDrillDown = () => {
    if (onAccountData && onAccountData.ONACCVOUCHERSOPEN && onAccountData.ONACCVOUCHERSOPEN.length > 0) {
      // Navigate to drill-down screen with On Account voucher details
      router.push({
        pathname: '/reports/ledger-outstandings-detail',
        params: {
          ledgerName: selectedLedger?.name || '',
          refNo: 'On Account',
          vouchers: JSON.stringify(onAccountData.ONACCVOUCHERSOPEN),
        },
      });
    } else {
      Alert.alert('No Voucher Details', 'No On Account voucher details available.');
    }
  };

  // Render receivables entry
  const renderReceivablesEntry = (entry: ReceivableEntry, index: number) => {
    const isDebit = entry.DEBITCLSBAL > 0;
    const amount = isDebit ? entry.DEBITCLSBAL : entry.CREDITCLSBAL;
    const amountType = isDebit ? 'Dr.' : 'Cr.';
    
    return (
      <TouchableOpacity 
        key={index} 
        style={styles.entryContainer}
        onPress={() => handleDrillDown(entry)}
        activeOpacity={0.7}
      >
        <View style={styles.entryHeader}>
          <View style={styles.overdueColumn}>
            <Text style={styles.overdueText}>
              {entry.OVERDUEDAYS} Days ({entry.DUEON})
            </Text>
          </View>
          <View style={styles.amountColumn}>
            <Text style={styles.amountText}>
              {formatAmount(amount)} {amountType}
            </Text>
          </View>
        </View>
        <View style={styles.entryDetails}>
          <Text style={styles.detailsText}>
            {entry.DATE} | #{entry.REFNO}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (!companyName || !guid || !tallylocId) {
    return (
      <View style={styles.container}>
        <StandardHeader 
          title="Ledger Receivables" 
          showMenuButton={true}
          onMenuPress={handleMenuPress} 
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Missing company information</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      {/* Overlay to close dropdown when tapping outside */}
      {showThreeDotsMenu && (
        <TouchableOpacity 
          style={styles.overlay}
          activeOpacity={1}
          onPress={closeThreeDotsMenu}
        />
      )}
      
      <StandardHeader 
        title="Ledger Receivables" 
        showMenuButton={true}
        onMenuPress={handleMenuPress}
        rightComponent={<ThreeDotsMenu />}
      />
      
      {/* Ledger Selection */}
      <View style={styles.ledgerSelectionContainer}>
        <TouchableOpacity
          style={styles.ledgerSelector}
          onPress={() => {
            if (ledgers.length > 0) {
              setShowLedgerModal(true);
            }
          }}
        >
          <Text style={styles.ledgerSelectorIcon}>🔍</Text>
          <Text style={styles.ledgerSelectorText}>
            {selectedLedger ? selectedLedger.name : 'Select Ledger'}
          </Text>
          <Text style={styles.ledgerSelectorArrow}>▼</Text>
        </TouchableOpacity>
      </View>

      {/* Period Selection */}
      <View style={styles.periodContainer}>
        <PeriodSelector
          onPeriodChange={handlePeriodChange}
          startDate={startDate}
          endDate={endDate}
        />
      </View>

      {/* Report Content */}
      {selectedLedger && (
        <View style={styles.reportContainer}>
          <ScrollView 
            style={styles.content} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
        {loadingReport ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading receivables...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : receivablesData.length > 0 ? (
          <>
            {/* Receivables Entries */}
            {receivablesData.map((entry, index) => renderReceivablesEntry(entry, index))}
            
            {/* Subtotals Section - Only show if there are multiple records */}
            {shouldShowSubtotal() && (
              <View style={styles.subtotalContainer}>
                <View style={styles.subtotalRow}>
                  <Text style={styles.subtotalLabel}>Subtotal</Text>
                  <Text style={styles.subtotalValue}>
                    {formatAmount(receivablesData.reduce((sum, entry) => {
                      // Use whichever has value for pending amount
                      const pendingAmount = entry.DEBITCLSBAL > 0 ? entry.DEBITCLSBAL : entry.CREDITCLSBAL;
                      return sum + pendingAmount;
                    }, 0))} Dr.
                  </Text>
                </View>
              </View>
            )}
            
            {/* On Account Section - Only show if there are vouchers with non-zero values */}
            {onAccountData && onAccountData.ONACCVOUCHERSOPEN && hasNonZeroVouchers(onAccountData.ONACCVOUCHERSOPEN) && (
              <TouchableOpacity 
                style={styles.onAccountContainer}
                onPress={handleOnAccountDrillDown}
                activeOpacity={0.7}
              >
                <View style={styles.onAccountHeader}>
                  <Text style={styles.onAccountLabel}>
                    {endDate.toLocaleDateString('en-GB', { 
                      day: '2-digit', 
                      month: 'short', 
                      year: '2-digit' 
                    }).replace(/(\d+)\/(\w+)\/(\d+)/, '$1-$2-$3')} | On Account
                  </Text>
                  <Text style={styles.onAccountValue}>
                    {(() => {
                      const isDebit = onAccountData.DEBITCLSBAL > 0;
                      const amount = isDebit ? onAccountData.DEBITCLSBAL : onAccountData.CREDITCLSBAL;
                      const amountType = isDebit ? 'Dr.' : 'Cr.';
                      return `${formatAmount(amount)} ${amountType}`;
                    })()}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </>
        ) : selectedLedger?.name ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No receivables found for the selected period</Text>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Please select a customer to view receivables</Text>
          </View>
            )}
          </ScrollView>

          {/* Fixed Grand Total Section */}
          {receivablesData.length > 0 && (
            <View style={styles.fixedGrandTotalContainer}>
              <TouchableOpacity 
                style={styles.grandTotalHeader}
                onPress={() => {
                  setIsGrandTotalCollapsed(!isGrandTotalCollapsed);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.grandTotalTitle}>GRAND TOTAL</Text>
                <Text style={styles.grandTotalArrow}>
                  {isGrandTotalCollapsed ? '▼' : '▲'}
                </Text>
              </TouchableOpacity>
              
              {!isGrandTotalCollapsed && (
                <View style={styles.grandTotalDetails}>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total Pending Amount</Text>
                    <Text style={styles.totalValue}>
                      {formatAmount(
                        // Use closing data for pending amount if available, otherwise calculate from entries
                        closingData ? 
                          (closingData.DEBITCLSBAL > 0 ? closingData.DEBITCLSBAL : closingData.CREDITCLSBAL) :
                          receivablesData.reduce((sum, entry) => {
                            const pendingAmount = entry.DEBITCLSBAL > 0 ? entry.DEBITCLSBAL : entry.CREDITCLSBAL;
                            return sum + pendingAmount;
                          }, 0) +
                          // On Account amount: only include if there are vouchers with non-zero values
                          (onAccountData && onAccountData.ONACCVOUCHERSOPEN && hasNonZeroVouchers(onAccountData.ONACCVOUCHERSOPEN)) ? 
                            (onAccountData.DEBITCLSBAL > 0 ? onAccountData.DEBITCLSBAL : onAccountData.CREDITCLSBAL) : 0
                      )} Dr.
                    </Text>
                  </View>
                  
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total Opening Amount</Text>
                    <Text style={styles.totalValue}>
                      {formatAmount(
                        // Use closing data for opening amount if available, otherwise calculate from entries
                        closingData ? 
                          (closingData.DEBITOPENBAL > 0 ? closingData.DEBITOPENBAL : closingData.CREDITOPENBAL) :
                          receivablesData.reduce((sum, entry) => {
                            const openingAmount = entry.DEBITOPENBAL > 0 ? entry.DEBITOPENBAL : entry.CREDITOPENBAL;
                            return sum + openingAmount;
                          }, 0)
                      )} Dr.
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* Reports Menu */}
      <ReportsMenu
        showMenu={showMenu}
        onClose={closeMenu}
        onNavigation={handleNavigation}
      />

      {/* Ledger Selection Modal */}
      <Modal
        visible={showLedgerModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLedgerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Ledger</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowLedgerModal(false)}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            <LightweightList
              data={ledgers}
              onItemSelect={handleLedgerSelect}
              loading={loadingLedgers}
              searchPlaceholder="Search ledgers..."
              searchFields={['name']}
              renderItem={(item, onPress) => <LedgerRenderer item={item} onPress={onPress} />}
              emptyMessage="No ledgers found"
              loadingMessage="Loading ledgers..."
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  ledgerSelectionContainer: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 0,
    marginBottom: 0,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  ledgerSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderWidth: 0,
  },
  ledgerSelectorIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  ledgerSelectorText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  ledgerSelectorArrow: {
    fontSize: 12,
    color: '#666',
  },
  periodContainer: {
    backgroundColor: 'transparent',
    marginTop: 0,
    marginBottom: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  reportContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  scrollContent: {
    paddingBottom: 150, // Increased padding to account for fixed grand total and navigation bar
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 16,
    color: Colors.text.primary.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.text.primary.secondary,
    textAlign: 'center',
  },
  entryContainer: {
    backgroundColor: Colors.white,
    padding: 15,
    marginBottom: 0,
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  overdueColumn: {
    flex: 1,
  },
  amountColumn: {
    flex: 1,
    alignItems: 'flex-end',
  },
  overdueText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  amountText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  entryDetails: {
    marginTop: 2,
  },
  detailsText: {
    fontSize: 12,
    color: Colors.text.primary.secondary,
  },
  // Subtotals and Grand Total styles - matching LedgerVoucherReport
  subtotalContainer: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subtotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  subtotalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  // On Account styles
  onAccountContainer: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  onAccountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  onAccountLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    fontStyle: 'italic',
  },
  onAccountValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000', // Black color for amounts
    fontStyle: 'italic',
  },
  grandTotalContainer: {
    backgroundColor: '#f0f0f0',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  fixedGrandTotalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 2,
    borderTopColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
    marginBottom: 0, // Ensure it's at the very bottom of the safe area
  },
  grandTotalHeader: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  grandTotalTitle: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  grandTotalArrow: {
    color: 'white',
    fontSize: 12,
  },
  grandTotalDetails: {
    padding: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  totalLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },

  // Modal styles - matching LedgerVoucherReport exactly
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '100%',
    height: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  
  // Three dots menu styles
  threeDotsMenuContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  threeDotsButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  threeDotsIcon: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 45,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingVertical: 8,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
    flex: 1,
  },
  dropdownItemIcon: {
    fontSize: 18,
    marginLeft: 8,
  },
  dropdownItemDisabled: {
    opacity: 0.5,
  },
  dropdownItemTextDisabled: {
    color: '#999999',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
});

export default LedgerReceivablesReport;
