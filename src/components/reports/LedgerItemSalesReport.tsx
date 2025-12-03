import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PeriodSelector } from '../common/PeriodSelector';
import { LightweightList, LedgerRenderer, StandardHeader } from '../common';
import ReportsMenu from './ReportsMenu';
import { useReportsMenu } from '../../hooks';
import { useMasterData } from '../../context/MasterDataContext';
import { apiService } from '../../services/api';
import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { convertNumberToWords } from '../../utils/numberToWords';

interface LedgerItemSalesReportProps {
  companyName?: string;
  tallylocId?: string;
  guid?: string;
}

interface Ledger {
  id: string;
  name: string;
}

interface LedgerItemSalesEntry {
  id: string;
  description: string;
  date: string;
  reference: string;
  debit: number;
  credit: number;
  balance: number;
  allLedgerEntries?: Array<{
    ledgerName: string;
    debitAmt: number;
    creditAmt: number;
    inventoryAllocations?: InventoryAllocation[];
  }>;
  // Raw data for detail view
  rawData?: any;
}

interface InventoryAllocation {
  STOCKITEMNAME: string;
  BILLEQTY: string;
  RATE: string;
  DISCOUNT: number;
  AMOUNT: number;
}

interface LedgerItemSalesData {
  ledgerName: string;
  entries: LedgerItemSalesEntry[];
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  // New fields for item sales data
  totalSales: {
    quantity: number;
    effectiveRate: number;
    totalValue: number;
  };
  totalPurchases: {
    quantity: number;
    effectiveRate: number;
    totalValue: number;
  };
}

  // Voucher Detail Modal Component
  const VoucherDetailModal: React.FC<{
    visible: boolean;
    voucher: any;
    onClose: () => void;
    companyName?: string;
  }> = ({ visible, voucher, onClose, companyName }) => {
    // Early return if no voucher data
    if (!voucher) {
      return null;
    }
    
    // Get customer data from context
    const { customers } = useMasterData();
    
  // Three dots menu state for voucher modal
  const [showVoucherThreeDotsMenu, setShowVoucherThreeDotsMenu] = useState(false);
  
  // Print state to prevent multiple simultaneous requests
  const [isPrinting, setIsPrinting] = useState(false);
    
    // Handle three dots menu press for voucher modal
    const handleVoucherThreeDotsPress = () => {
      setShowVoucherThreeDotsMenu(!showVoucherThreeDotsMenu);
    };
    
  // Close three dots menu for voucher modal
  const closeVoucherThreeDotsMenu = () => {
    setShowVoucherThreeDotsMenu(false);
  };

  // Print report function
  const handlePrintReport = async () => {
    if (isPrinting) {
      Alert.alert('Please wait', 'A print request is already in progress');
      return;
    }

    setIsPrinting(true);
    try {
      // Create HTML content for the report
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Ledger Item Sales Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { background-color: #2A67B1; color: white; padding: 10px; text-align: center; }
            .item { margin: 10px 0; padding: 10px; border: 1px solid #ddd; }
            .item-name { font-weight: bold; font-size: 14px; }
            .transaction-type { font-size: 11px; text-decoration: underline; }
            .values { display: flex; justify-content: space-between; margin-top: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Ledger Item Sales Report</h2>
            <p>${selectedLedger?.name || 'Selected Ledger'} - ${formatDate(startDate.toISOString())} to ${formatDate(endDate.toISOString())}</p>
          </div>
          ${reportData?.entries?.map(entry => {
            const inventoryItems = [];
            if (entry.allLedgerEntries) {
              entry.allLedgerEntries.forEach(ledgerEntry => {
                if (ledgerEntry.INVENTORYALLOCATIONS || ledgerEntry.inventoryAllocations) {
                  const allocations = ledgerEntry.INVENTORYALLOCATIONS || ledgerEntry.inventoryAllocations;
                  const allocationsArray = Array.isArray(allocations) ? allocations : [allocations];
                  inventoryItems.push(...allocationsArray);
                }
              });
            }
            return inventoryItems.map((allocation, index) => {
              const quantity = parseFloat(allocation.BILLEQTY?.replace(/[^\d.-]/g, '') || '0');
              const rate = parseFloat(allocation.RATE?.replace(/[^\d.-]/g, '') || '0');
              const amount = parseFloat(allocation.AMOUNT || '0');
              return `
                <div class="item">
                  <div class="item-name">${allocation.STOCKITEMNAME}</div>
                  <div class="transaction-type">SALES</div>
                  <div class="values">
                    <span>${quantity.toFixed(2)}</span>
                    <span>${formatAmount(rate)}</span>
                    <span>${formatAmount(amount)}</span>
                  </div>
                </div>
              `;
            }).join('');
          }).join('') || '<p>No data available</p>'}
        </body>
        </html>
      `;

      // Create PDF
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      // Share the PDF
      await shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      console.error('Error printing report:', error);
      Alert.alert('Print Error', 'Failed to print report. Please try again.');
    } finally {
      setIsPrinting(false);
    }
  };

  // Share report function
  const handleShareReport = async () => {
    if (isPrinting) {
      Alert.alert('Please wait', 'A share request is already in progress');
      return;
    }

    setIsPrinting(true);
    try {
      // Create a simple text summary for sharing
      const summaryText = `
Ledger Item Sales Report
Ledger: ${selectedLedger?.name || 'Selected Ledger'}
Period: ${formatDate(startDate.toISOString())} to ${formatDate(endDate.toISOString())}

Total Sales: ${formatAmount(reportData?.totalSales?.totalValue || 0)}
Total Quantity: ${reportData?.totalSales?.quantity || 0}
Effective Rate: ${formatAmount(reportData?.totalSales?.effectiveRate || 0)}
      `.trim();

      // For now, just show an alert with the summary
      // In a real app, you might want to use a different sharing method
      Alert.alert('Report Summary', summaryText);
    } catch (error) {
      console.error('Error sharing report:', error);
      Alert.alert('Share Error', 'Failed to share report. Please try again.');
    } finally {
      setIsPrinting(false);
    }
  };

  // Print voucher function - using same approach as main report
  const handlePrintVoucher = async (voucherData: any) => {
    if (isPrinting) {
      Alert.alert('Please wait', 'A print request is already in progress');
      return;
    }

    setIsPrinting(true);
    try {
      // Create HTML content for the voucher
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Voucher Details</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
            }
            .company-name {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .voucher-title {
              font-size: 20px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .voucher-info {
              font-size: 14px;
              color: #666;
            }
            .voucher-details {
              margin: 20px 0;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 10px;
              padding: 5px 0;
              border-bottom: 1px solid #eee;
            }
            .detail-label {
              font-weight: bold;
              width: 150px;
            }
            .detail-value {
              flex: 1;
              text-align: right;
            }
            .ledger-entries {
              margin-top: 20px;
            }
            .ledger-entry {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
              padding: 8px;
              background-color: #f9f9f9;
              border-radius: 4px;
            }
            .ledger-name {
              font-weight: bold;
            }
            .amount {
              font-weight: bold;
              color: #2c5aa0;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 12px;
              color: #666;
              border-top: 1px solid #eee;
              padding-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">${companyName || 'Company'}</div>
            <div class="voucher-title">Ledger Item Sales Report</div>
            <div class="voucher-info">Generated on: ${new Date().toLocaleDateString()}</div>
          </div>
          
          <div class="voucher-details">
            <div class="detail-row">
              <span class="detail-label">Voucher ID:</span>
              <span class="detail-value">${voucher.id || 'N/A'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Date:</span>
              <span class="detail-value">${voucher.date || 'N/A'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Reference:</span>
              <span class="detail-value">${voucher.reference || 'N/A'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Description:</span>
              <span class="detail-value">${voucher.description || 'N/A'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Debit Amount:</span>
              <span class="detail-value">₹${voucher.debit?.toFixed(2) || '0.00'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Credit Amount:</span>
              <span class="detail-value">₹${voucher.credit?.toFixed(2) || '0.00'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Balance:</span>
              <span class="detail-value">₹${voucher.balance?.toFixed(2) || '0.00'}</span>
            </div>
          </div>
          
          ${voucher.allLedgerEntries && voucher.allLedgerEntries.length > 0 ? `
            <div class="ledger-entries">
              <h3>Ledger Entries:</h3>
              ${voucher.allLedgerEntries.map((entry: any) => `
                <div class="ledger-entry">
                  <span class="ledger-name">${entry.ledgerName}</span>
                  <span class="amount">
                    ${entry.debitAmt > 0 ? `Dr: ₹${entry.debitAmt.toFixed(2)}` : ''}
                    ${entry.creditAmt > 0 ? `Cr: ₹${entry.creditAmt.toFixed(2)}` : ''}
                  </span>
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          <div class="footer">
            <p>This report was generated by DataLynk on ${new Date().toLocaleString()}</p>
          </div>
        </body>
        </html>
      `;

      // Create PDF
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      // Share the PDF
      await shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      console.error('Error printing voucher:', error);
      Alert.alert('Print Error', 'Failed to print voucher. Please try again.');
    } finally {
      setIsPrinting(false);
    }
  };

    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Voucher Details</Text>
            <TouchableOpacity 
              onPress={handleVoucherThreeDotsPress} 
              style={styles.threeDotsButton}
            >
              <Text style={styles.threeDotsText}>⋯</Text>
            </TouchableOpacity>
          </View>

          {/* Three dots menu */}
          {showVoucherThreeDotsMenu && (
            <View style={styles.threeDotsMenu}>
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => {
                  closeVoucherThreeDotsMenu();
                  handlePrintVoucher(voucher);
                }}
                disabled={isPrinting}
              >
                <Text style={styles.menuItemText}>
                  {isPrinting ? 'Printing...' : 'Print Voucher'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <ScrollView style={styles.modalContent}>
            <View style={styles.voucherDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Voucher ID:</Text>
                <Text style={styles.detailValue}>{voucher.id || 'N/A'}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date:</Text>
                <Text style={styles.detailValue}>{voucher.date || 'N/A'}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Reference:</Text>
                <Text style={styles.detailValue}>{voucher.reference || 'N/A'}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Description:</Text>
                <Text style={styles.detailValue}>{voucher.description || 'N/A'}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Debit Amount:</Text>
                <Text style={styles.detailValue}>₹{voucher.debit?.toFixed(2) || '0.00'}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Credit Amount:</Text>
                <Text style={styles.detailValue}>₹{voucher.credit?.toFixed(2) || '0.00'}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Balance:</Text>
                <Text style={styles.detailValue}>₹{voucher.balance?.toFixed(2) || '0.00'}</Text>
              </View>
            </View>

            {voucher.allLedgerEntries && voucher.allLedgerEntries.length > 0 && (
              <View style={styles.ledgerEntriesSection}>
                <Text style={styles.sectionTitle}>Ledger Entries:</Text>
                {voucher.allLedgerEntries.map((entry: any, index: number) => (
                  <View key={index} style={styles.ledgerEntry}>
                    <Text style={styles.ledgerName}>{entry.ledgerName}</Text>
                    <View style={styles.amountContainer}>
                      {entry.debitAmt > 0 && (
                        <Text style={styles.debitAmount}>Dr: ₹{entry.debitAmt.toFixed(2)}</Text>
                      )}
                      {entry.creditAmt > 0 && (
                        <Text style={styles.creditAmount}>Cr: ₹{entry.creditAmt.toFixed(2)}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

export const LedgerItemSalesReport: React.FC<LedgerItemSalesReportProps> = ({ 
  companyName, 
  tallylocId, 
  guid 
}) => {
  // Period selector state
  const [startDate, setStartDate] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() - 1, 1);
  });
  const [endDate, setEndDate] = useState<Date>(new Date());
  
  // Ledger selection state
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [selectedLedger, setSelectedLedger] = useState<Ledger | null>(null);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [loadingLedgers, setLoadingLedgers] = useState(false);
  
  // Report data state
  const [reportData, setReportData] = useState<LedgerItemSalesData | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  
  // Grand total collapse state
  const [isGrandTotalCollapsed, setIsGrandTotalCollapsed] = useState(false);
  
  // Voucher detail modal state
  const [selectedVoucher, setSelectedVoucher] = useState<any>(null);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  
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
              // downloadLedgerVouchersExcel();
            }}
          >
            <Text style={styles.dropdownItemText}>Download as Excel</Text>
            <Text style={styles.dropdownItemIcon}>📊</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.dropdownItem, isPrinting && styles.dropdownItemDisabled]}
            onPress={() => {
              closeThreeDotsMenu();
              handlePrintReport();
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
              handleShareReport();
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

  // Get master data context
  const masterDataContext = useMasterData();

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
      
      if (customers.length === 0) {
        // If no customers in context, fetch ledgers directly from API
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
  const parseLedgersResponse = (jsonResponse: string): Ledger[] => {
    try {
      const responseData = JSON.parse(jsonResponse);
      
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

  // Load ledger item sales report data
  const loadLedgerItemSalesReport = useCallback(async () => {
    if (!selectedLedger || !companyName || !tallylocId || !guid) {
      return;
    }

    setLoadingReport(true);
    setError(null);
    
    try {
      console.log('🚀 Calling getLedgerItemSalesReport API with params:', {
        tallylocId,
        companyName,
        guid,
        ledgerName: selectedLedger.name,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      
      const response = await apiService.getLedgerItemSalesReport(
        tallylocId,
        companyName,
        guid,
        selectedLedger.name,
        startDate,
        endDate
      );
      
      console.log('📡 API Response:', {
        success: response.success,
        message: response.message,
        dataType: typeof response.data,
        dataLength: response.data ? response.data.length : 0,
        dataPreview: response.data ? response.data.substring(0, 500) : 'No data'
      });
      
      if (response.success && response.data) {
        const report = parseLedgerItemSalesResponse(response.data);
        setReportData(report);
      } else {
        setError(`Failed to load report: ${response.message}`);
      }
    } catch (err) {
      setError('Failed to load report. Please try again.');
      console.error('Error loading ledger item sales report:', err);
    } finally {
      setLoadingReport(false);
    }
  }, [selectedLedger, companyName, tallylocId, guid, startDate, endDate]);

  // Parse ledger item sales response and extract INVENTORYALLOCATIONS data
  const parseLedgerItemSalesResponse = (jsonResponse: string): LedgerItemSalesData => {
    try {
      const responseData = JSON.parse(jsonResponse);
      
      // Handle different possible response structures
      let entriesData: any[] = [];
      let summaryData: any = {};
      
      console.log('🔍 Parsing response structure:', {
        hasSuccess: 'success' in responseData,
        hasData: 'data' in responseData,
        dataType: typeof responseData.data,
        isDataArray: Array.isArray(responseData.data),
        dataKeys: responseData.data ? Object.keys(responseData.data) : 'No data'
      });
      
      // The response structure is: { reporttype, ledgername, data: [...], opening, closing }
      if (responseData.data && Array.isArray(responseData.data)) {
        entriesData = responseData.data;
        summaryData = {
          opening: responseData.opening,
          closing: responseData.closing
        };
        console.log('📊 Using responseData.data as array, entries count:', entriesData.length);
      } else if (responseData.success && responseData.data) {
        if (Array.isArray(responseData.data)) {
          entriesData = responseData.data;
          console.log('📊 Using data as array, entries count:', entriesData.length);
        } else if (responseData.data.data && Array.isArray(responseData.data.data)) {
          entriesData = responseData.data.data;
          summaryData = {
            opening: responseData.data.opening,
            closing: responseData.data.closing
          };
          console.log('📊 Using data.data as array, entries count:', entriesData.length);
        } else if (responseData.data.entries) {
          entriesData = responseData.data.entries;
          summaryData = responseData.data.summary || {};
          console.log('📊 Using data.entries, entries count:', entriesData.length);
        }
      } else if (Array.isArray(responseData)) {
        entriesData = responseData;
        console.log('📊 Using responseData as array, entries count:', entriesData.length);
      } else if (responseData.entries) {
        entriesData = responseData.entries;
        summaryData = responseData.summary || {};
        console.log('📊 Using responseData.entries, entries count:', entriesData.length);
      }
      
      // Extract and summarize INVENTORYALLOCATIONS data
      const inventorySummary = new Map<string, {
        stockItemName: string;
        totalQuantity: number;
        totalAmount: number;
        transactions: number;
      }>();
      
      console.log('🔍 Starting inventory data extraction...');
      console.log('📊 Raw entries data length:', entriesData.length);
      if (entriesData.length > 0) {
        console.log('📊 First entry sample:', JSON.stringify(entriesData[0], null, 2));
        console.log('📊 First entry ALLLEDGERENTRIES:', entriesData[0].ALLLEDGERENTRIES);
      }
      
      // Process entries and extract inventory data
      const entries: LedgerItemSalesEntry[] = entriesData.map((item, index) => {
        const entry: LedgerItemSalesEntry = {
          id: item.MASTERID || item.id || item.voucher_id || index.toString(),
          description: item.PARTICULARS || item.description || item.particulars || item.narration || 'No description',
          date: item.DATE || item.date || item.voucher_date || new Date().toISOString().split('T')[0],
          reference: item.VCHNO || item.reference || item.voucher_no || item.vch_no || '',
          debit: parseFloat(item.DEBITAMT || item.debit || item.debit_amt || '0'),
          credit: parseFloat(item.CREDITAMT || item.credit || item.credit_amt || '0'),
          balance: parseFloat(item.balance || item.running_balance || '0'),
          allLedgerEntries: item.ALLLEDGERENTRIES || item.all_ledger_entries || [],
          rawData: item,
        };
        
        console.log(`📝 Processing entry ${index}:`, {
          id: entry.id,
          description: entry.description,
          allLedgerEntriesCount: entry.allLedgerEntries?.length || 0,
          hasAllLedgerEntries: !!entry.allLedgerEntries,
          firstLedgerEntry: entry.allLedgerEntries?.[0] ? {
            ledgerName: entry.allLedgerEntries[0].LEDGERNAME,
            hasInventoryAllocations: !!(entry.allLedgerEntries[0].INVENTORYALLOCATIONS),
            inventoryAllocationsCount: entry.allLedgerEntries[0].INVENTORYALLOCATIONS?.length || 0
          } : 'No ledger entries'
        });
        
        // Extract inventory allocations from all ledger entries
        if (entry.allLedgerEntries) {
          entry.allLedgerEntries.forEach((ledgerEntry, ledgerIndex) => {
            console.log(`🔍 Processing ledger entry ${ledgerIndex}:`, {
              ledgerName: ledgerEntry.LEDGERNAME || ledgerEntry.ledgerName,
              hasInventoryAllocations: !!(ledgerEntry.INVENTORYALLOCATIONS || ledgerEntry.inventoryAllocations),
              inventoryAllocations: ledgerEntry.INVENTORYALLOCATIONS || ledgerEntry.inventoryAllocations
            });
            
            if (ledgerEntry.INVENTORYALLOCATIONS || ledgerEntry.inventoryAllocations) {
              const allocations = ledgerEntry.INVENTORYALLOCATIONS || ledgerEntry.inventoryAllocations;
              
              // Handle both array and single object cases
              const allocationsArray = Array.isArray(allocations) ? allocations : [allocations];
              console.log(`📦 Found ${allocationsArray.length} inventory allocations:`, allocationsArray);
              
              allocationsArray.forEach((allocation: any, allocIndex: number) => {
                const stockItemName = allocation.STOCKITEMNAME || allocation.stockItemName || '';
                const quantity = parseFloat(allocation.BILLEQTY?.replace(/[^\d.-]/g, '') || '0');
                const amount = parseFloat(allocation.AMOUNT || allocation.amount || '0');
                
                console.log(`📦 Allocation ${allocIndex}:`, {
                  stockItemName,
                  billEqty: allocation.BILLEQTY,
                  parsedQuantity: quantity,
                  amount: allocation.AMOUNT,
                  parsedAmount: amount,
                  rate: allocation.RATE
                });
                
                if (stockItemName && quantity > 0) {
                  if (inventorySummary.has(stockItemName)) {
                    const existing = inventorySummary.get(stockItemName)!;
                    existing.totalQuantity += quantity;
                    existing.totalAmount += amount;
                    existing.transactions += 1;
                    console.log(`➕ Updated existing item ${stockItemName}:`, {
                      newQuantity: quantity,
                      newAmount: amount,
                      totalQuantity: existing.totalQuantity,
                      totalAmount: existing.totalAmount,
                      transactions: existing.transactions
                    });
                  } else {
                    inventorySummary.set(stockItemName, {
                      stockItemName,
                      totalQuantity: quantity,
                      totalAmount: amount,
                      transactions: 1,
                    });
                    console.log(`🆕 Added new item ${stockItemName}:`, {
                      quantity,
                      amount,
                      transactions: 1
                    });
                  }
                } else {
                  console.log(`❌ Skipping allocation - invalid data:`, {
                    stockItemName,
                    quantity,
                    reason: !stockItemName ? 'No stock item name' : 'Quantity <= 0'
                  });
                }
              });
            }
          });
        }
        
        return entry;
      });
      
      console.log('📊 Final inventory summary:');
      inventorySummary.forEach((item, key) => {
        console.log(`  ${key}:`, item);
      });
      console.log(`📊 Total unique items: ${inventorySummary.size}`);
      
      // Summary of what we processed
      console.log('📊 Processing Summary:');
      console.log(`  - Total entries processed: ${entries.length}`);
      console.log(`  - Entries with ALLLEDGERENTRIES: ${entries.filter(e => e.allLedgerEntries && e.allLedgerEntries.length > 0).length}`);
      console.log(`  - Total ledger entries scanned: ${entries.reduce((sum, e) => sum + (e.allLedgerEntries?.length || 0), 0)}`);
      console.log(`  - Ledger entries with INVENTORYALLOCATIONS: ${entries.reduce((sum, e) => 
        sum + (e.allLedgerEntries?.filter(le => le.INVENTORYALLOCATIONS && le.INVENTORYALLOCATIONS.length > 0).length || 0), 0)}`);
      console.log(`  - Total inventory allocations found: ${entries.reduce((sum, e) => 
        sum + (e.allLedgerEntries?.reduce((leSum, le) => leSum + (le.INVENTORYALLOCATIONS?.length || 0), 0) || 0), 0)}`);
      
      // Calculate running balance
      let runningBalance = 0;
      const entriesWithRunningBalance = entries.map(entry => {
        runningBalance += entry.debit - entry.credit;
        return {
          ...entry,
          balance: runningBalance,
        };
      });
      
      // Calculate totals
      const totalDebit = entries.reduce((sum, entry) => sum + entry.debit, 0);
      const totalCredit = entries.reduce((sum, entry) => sum + entry.credit, 0);
      
      // Calculate inventory totals
      let totalSalesQuantity = 0;
      let totalSalesAmount = 0;
      let totalPurchasesQuantity = 0;
      let totalPurchasesAmount = 0;
      
      console.log('🧮 Calculating inventory totals...');
      inventorySummary.forEach(item => {
        console.log(`📊 Processing item for totals:`, {
          stockItemName: item.stockItemName,
          totalQuantity: item.totalQuantity,
          totalAmount: item.totalAmount,
          isSales: item.totalAmount > 0
        });
        
        if (item.totalAmount > 0) {
          // Positive amounts are sales
          totalSalesQuantity += item.totalQuantity;
          totalSalesAmount += item.totalAmount;
          console.log(`💰 Added to sales:`, {
            quantity: item.totalQuantity,
            amount: item.totalAmount,
            runningSalesQuantity: totalSalesQuantity,
            runningSalesAmount: totalSalesAmount
          });
        } else {
          // Negative amounts are purchases
          totalPurchasesQuantity += item.totalQuantity;
          totalPurchasesAmount += Math.abs(item.totalAmount);
          console.log(`🛒 Added to purchases:`, {
            quantity: item.totalQuantity,
            amount: Math.abs(item.totalAmount),
            runningPurchasesQuantity: totalPurchasesQuantity,
            runningPurchasesAmount: totalPurchasesAmount
          });
        }
      });
      
      // Calculate effective rates
      const salesEffectiveRate = totalSalesQuantity > 0 ? totalSalesAmount / totalSalesQuantity : 0;
      const purchasesEffectiveRate = totalPurchasesQuantity > 0 ? totalPurchasesAmount / totalPurchasesQuantity : 0;
      
      console.log('📊 Final calculated totals:');
      console.log('💰 Sales:', {
        quantity: totalSalesQuantity,
        amount: totalSalesAmount,
        effectiveRate: salesEffectiveRate
      });
      console.log('🛒 Purchases:', {
        quantity: totalPurchasesQuantity,
        amount: totalPurchasesAmount,
        effectiveRate: purchasesEffectiveRate
      });
      
      // Handle opening balance
      let openingBalance = 0;
      if (summaryData.opening_balance) {
        if (typeof summaryData.opening_balance === 'object') {
          const debitAmt = parseFloat(summaryData.opening_balance.DEBITAMT || '0');
          const creditAmt = parseFloat(summaryData.opening_balance.CREDITAMT || '0');
          openingBalance = debitAmt - creditAmt;
        } else {
          openingBalance = parseFloat(summaryData.opening_balance || '0');
        }
      }
      
      // Calculate closing balance
      const closingBalance = openingBalance + totalDebit - totalCredit;
      
      const report: LedgerItemSalesData = {
        ledgerName: selectedLedger?.name || '',
        entries: entriesWithRunningBalance,
        openingBalance,
        totalDebit,
        totalCredit,
        closingBalance,
        totalSales: {
          quantity: totalSalesQuantity,
          effectiveRate: salesEffectiveRate,
          totalValue: totalSalesAmount,
        },
        totalPurchases: {
          quantity: totalPurchasesQuantity,
          effectiveRate: purchasesEffectiveRate,
          totalValue: totalPurchasesAmount,
        },
      };
      
      console.log('📋 Final report data structure:');
      console.log('📊 Report summary:', {
        ledgerName: report.ledgerName,
        entriesCount: report.entries.length,
        totalSales: report.totalSales,
        totalPurchases: report.totalPurchases,
        inventorySummarySize: inventorySummary.size
      });
      
      return report;
    } catch (error) {
      console.error('Error parsing ledger item sales response:', error);
      return {
        ledgerName: selectedLedger?.name || '',
        entries: [],
        openingBalance: 0,
        totalDebit: 0,
        totalCredit: 0,
        closingBalance: 0,
        totalSales: {
          quantity: 0,
          effectiveRate: 0,
          totalValue: 0,
        },
        totalPurchases: {
          quantity: 0,
          effectiveRate: 0,
          totalValue: 0,
        },
      };
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const formatAmount = (amount: number): string => {
    if (amount === 0) return '₹0.00';
    return `₹${amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const renderVoucherEntry = ({ item }: { item: LedgerItemSalesEntry }) => (
    <TouchableOpacity 
      style={styles.voucherEntry}
      onPress={() => handleVoucherPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.entryHeader}>
        <Text style={styles.entryDescription}>{item.description}</Text>
        <Text style={styles.entryAmount}>
          {item.debit > 0 ? `${formatAmount(item.debit)} Dr.` : `${formatAmount(item.credit)} Cr.`}
        </Text>
      </View>
      <View style={styles.entryDetails}>
        <Text style={styles.entryDateRef}>{item.date} | {item.reference}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderItemSalesEntry = ({ item }: { item: LedgerItemSalesEntry }) => {
    // Extract inventory allocations from the entry
    const inventoryItems: InventoryAllocation[] = [];
    
    if (item.allLedgerEntries) {
      item.allLedgerEntries.forEach(ledgerEntry => {
        if (ledgerEntry.INVENTORYALLOCATIONS || ledgerEntry.inventoryAllocations) {
          const allocations = ledgerEntry.INVENTORYALLOCATIONS || ledgerEntry.inventoryAllocations;
          // Handle both array and single object cases
          const allocationsArray = Array.isArray(allocations) ? allocations : [allocations];
          inventoryItems.push(...allocationsArray);
        }
      });
    }

    if (inventoryItems.length === 0) {
      return null; // Don't render entries without inventory data
    }

    return (
      <View style={styles.itemSalesContainer}>
        {inventoryItems.map((allocation, index) => {
          const quantity = parseFloat(allocation.BILLEQTY?.replace(/[^\d.-]/g, '') || '0');
          const rate = parseFloat(allocation.RATE?.replace(/[^\d.-]/g, '') || '0');
          const amount = parseFloat(allocation.AMOUNT || '0');

          return (
            <View key={`${item.id}-${index}`} style={styles.itemSalesRow}>
              <View style={styles.itemDetails}>
                <Text style={styles.itemName}>{allocation.STOCKITEMNAME}</Text>
                <Text style={styles.transactionType}>SALES</Text>
                <View style={styles.itemQuantityRateValueRow}>
                  <Text style={styles.itemQuantity}>{quantity.toFixed(2)}</Text>
                  <Text style={styles.itemRate}>{formatAmount(rate)}</Text>
                  <Text style={styles.itemAmount}>{formatAmount(amount)}</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        {selectedLedger 
          ? 'No item sales found for the selected period'
          : 'Please select a ledger to view item sales'
        }
      </Text>
    </View>
  );

  const handleLedgerSelect = useCallback((ledger: Ledger) => {
    setSelectedLedger(ledger);
    setShowLedgerModal(false);
  }, []);

  const handleVoucherPress = useCallback((voucher: LedgerItemSalesEntry) => {
    setSelectedVoucher(voucher);
    setShowVoucherModal(true);
  }, []);

  const closeVoucherModal = useCallback(() => {
    setShowVoucherModal(false);
    setSelectedVoucher(null);
  }, []);

  const handlePeriodChange = useCallback(async (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  }, []);

  // Load ledgers on component mount
  useEffect(() => {
    loadLedgers();
  }, [loadLedgers]);

  // Auto-open ledger modal when ledgers are loaded
  useEffect(() => {
    if (ledgers.length > 0 && !selectedLedger) {
      console.log('🔍 Auto-opening ledger modal...');
      setShowLedgerModal(true);
    }
  }, [ledgers, selectedLedger]);

  // Load report when ledger is selected or period changes
  useEffect(() => {
    if (selectedLedger) {
      loadLedgerItemSalesReport();
    }
  }, [selectedLedger, startDate, endDate, loadLedgerItemSalesReport]);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Set loading to false after initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <StandardHeader
          title="Ledger Item Sales"
          showMenuButton={true}
          onMenuPress={handleMenuPress}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
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
        title="Ledger Item Sales"
        showMenuButton={true}
        onMenuPress={handleMenuPress}
        rightComponent={<ThreeDotsMenu />}
      />

      {/* Ledger Selection */}
      <View style={styles.ledgerSelectionContainer}>
        <TouchableOpacity
          style={styles.ledgerSelector}
          onPress={() => {
            console.log('🔍 Ledger selector pressed, opening modal...');
            console.log('📊 Ledgers available:', ledgers.length);
            setShowLedgerModal(true);
          }}
        >
         <Text style={styles.ledgerSelectorIcon}>🔍</Text>
         <Text style={styles.ledgerSelectorText}>
           {selectedLedger ? selectedLedger.name : 'Select Ledger'}
         </Text>
         <Text style={styles.ledgerSelectorArrow}>▼</Text>
       </TouchableOpacity>
      </View>

      {/* Period Selector */}
      <PeriodSelector
        onPeriodChange={handlePeriodChange}
        initialStartDate={startDate}
        initialEndDate={endDate}
      />

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => {
            loadLedgers();
            if (selectedLedger) {
              loadLedgerItemSalesReport();
            }
          }}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Report Content */}
      {selectedLedger && (
        <View style={styles.reportContainer}>
          {loadingReport ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading report...</Text>
            </View>
          ) : reportData ? (
            <>

              {/* Column Headers */}
              <View style={styles.columnHeaders}>
                <Text style={styles.columnHeaderLeft}>PARTICULARS & QTY</Text>
                <Text style={styles.columnHeaderCenter}>EFF RATE</Text>
                <Text style={styles.columnHeaderRight}>TOTAL VALUE</Text>
              </View>

              {/* Item Sales List */}
              <FlatList
                data={reportData.entries}
                renderItem={renderItemSalesEntry}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={renderEmptyComponent}
                showsVerticalScrollIndicator={false}
              />

              {/* Fixed Grand Total Section */}
              <View style={styles.fixedGrandTotalContainer}>
                <TouchableOpacity 
                  style={styles.grandTotalHeader}
                  onPress={() => {
                    setIsGrandTotalCollapsed(!isGrandTotalCollapsed);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.grandTotalTitle}>GRAND TOTAL</Text>
                  <View style={styles.grandTotalArrow}>
                    <Text style={styles.arrowText}>▼</Text>
                  </View>
                </TouchableOpacity>
                
                {!isGrandTotalCollapsed && (
                  <View style={styles.grandTotalDetails}>
                    <View style={styles.totalSection}>
                      <Text style={styles.totalSectionTitle}>PURCHASES</Text>
                      <View style={styles.totalRow}>
                        <Text style={styles.totalQuantity}>-</Text>
                        <Text style={styles.totalRate}>-</Text>
                        <Text style={styles.totalValue}>-</Text>
                      </View>
                    </View>
                    <View style={styles.totalSection}>
                      <Text style={styles.totalSectionTitle}>SALES</Text>
                      <View style={styles.totalRow}>
                        <Text style={styles.totalQuantity}>{reportData.totalSales.quantity}</Text>
                        <Text style={styles.totalRate}>{formatAmount(reportData.totalSales.effectiveRate)}</Text>
                        <Text style={styles.totalValue}>{formatAmount(reportData.totalSales.totalValue)}</Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            </>
          ) : null}
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
        animationType="fade"
        onRequestClose={() => {
          // Prevent closing modal until ledger is selected
          console.log('🔍 Modal close request ignored - must select a ledger');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Ledger</Text>
              <Text style={styles.modalSubtitle}>Please select a ledger to view item sales report</Text>
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

      {/* Voucher Detail Modal */}
      <VoucherDetailModal
        visible={showVoucherModal}
        voucher={selectedVoucher}
        onClose={closeVoucherModal}
        companyName={companyName}
      />
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
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  printButton: {
    backgroundColor: '#007AFF',
  },
  whatsappButton: {
    backgroundColor: '#25D366',
  },
  saveButton: {
    backgroundColor: '#28a745',
  },
  actionButtonIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  ledgerSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderWidth: 0,
  },
  ledgerSelectorIcon: {
    fontSize: 14,
    marginRight: 10,
  },
  ledgerSelectorText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  ledgerSelectorArrow: {
    fontSize: 10,
    color: '#666',
  },
  errorContainer: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    margin: 20,
  },
  errorText: {
    color: '#721c24',
    fontSize: 12,
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  reportContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
  },
  listContainer: {
    padding: 0,
    paddingBottom: 120, // Add bottom padding to account for fixed grand total
    flexGrow: 1, // Allow content to expand
  },
  voucherEntry: {
    backgroundColor: 'white',
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
    marginBottom: 5,
  },
  entryDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  entryAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  entryDetails: {
    marginTop: 5,
  },
  entryDateRef: {
    fontSize: 12,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  grandTotalContainer: {
    backgroundColor: '#ffffff',
    marginTop: 0,
    marginBottom: 0,
    borderRadius: 0,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    // Ensure it doesn't overlap with navigation bar
    position: 'relative',
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
    elevation: 8,
    zIndex: 1000,
  },
  grandTotalHeader: {
    backgroundColor: '#2A67B1',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  grandTotalTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    paddingLeft: 8,
  },
  grandTotalArrow: {
    margin: 12,
  },
  arrowText: {
    color: 'white',
    fontSize: 8,
  },
  grandTotalDetails: {
    backgroundColor: '#EBF6FF',
    paddingHorizontal: 0,
    paddingVertical: 4,
  },
  totalSection: {
    marginBottom: 0,
  },
  totalSectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    paddingLeft: 8,
    textDecorationLine: 'underline',
    letterSpacing: 0.06,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 8,
  },
  totalQuantity: {
    flex: 1,
    fontSize: 13,
    color: '#333',
    fontWeight: 'bold',
    paddingLeft: 8,
    paddingRight: 4,
  },
  totalRate: {
    flex: 1,
    fontSize: 13,
    color: '#333',
    fontWeight: 'bold',
    textAlign: 'right',
    paddingLeft: 4,
    paddingRight: 4,
  },
  totalValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
    paddingLeft: 4,
    paddingRight: 8,
  },
  // Three dots menu styles
  threeDotsMenuContainer: {
    position: 'relative',
  },
  threeDotsButton: {
    padding: 8,
    borderRadius: 4,
  },
  threeDotsIcon: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 40,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
    minWidth: 180,
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
    fontSize: 12,
    color: '#333',
    flex: 1,
  },
  dropdownItemIcon: {
    fontSize: 14,
    marginLeft: 8,
  },
  dropdownItemDisabled: {
    opacity: 0.5,
  },
  dropdownItemTextDisabled: {
    color: '#999',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 999,
  },
  // Modal styles - exact copy from LedgerVoucherReport
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
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 22,
    color: '#666',
    fontWeight: 'bold',
  },
  // Voucher detail modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  threeDotsButton: {
    padding: 8,
  },
  threeDotsText: {
    fontSize: 16,
    color: '#666',
  },
  threeDotsMenu: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 1000,
  },
  menuItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  menuItemText: {
    fontSize: 14,
    color: '#333',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  voucherDetails: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    width: 120,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  ledgerEntriesSection: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  ledgerEntry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
    marginBottom: 8,
  },
  amountContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  // Item Sales Report Styles
  columnHeaders: {
    flexDirection: 'row',
    backgroundColor: '#2A67B1',
    height: 30,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  columnHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'left',
  },
  columnHeaderLeft: {
    flex: 5,
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'left',
    paddingLeft: 8,
  },
  columnHeaderCenter: {
    flex: 3,
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'right',
    paddingRight: 8,
  },
  columnHeaderRight: {
    flex: 4,
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'right',
    paddingRight: 8,
  },
  itemSalesContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  itemSalesRow: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  transactionType: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
    textDecorationLine: 'underline',
    letterSpacing: 0.06,
  },
  itemQuantityRateValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 8,
  },
  itemQuantity: {
    flex: 5,
    fontSize: 13,
    fontWeight: 'normal',
    color: '#333',
    paddingLeft: 8,
    paddingRight: 4,
  },
  itemRate: {
    flex: 3,
    fontSize: 13,
    fontWeight: 'normal',
    color: '#333',
    textAlign: 'right',
    paddingLeft: 4,
    paddingRight: 4,
  },
  itemAmount: {
    flex: 4,
    fontSize: 13,
    fontWeight: 'normal',
    color: '#333',
    textAlign: 'right',
    paddingLeft: 4,
    paddingRight: 8,
  },
});

export default LedgerItemSalesReport;
