import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { apiService } from '../../services/api';
import { useUser } from '../../context/UserContext';
import { useMasterData } from '../../context/MasterDataContext';

interface OptionalVoucher {
  MasterID: string;
  Dates: string;
  InvNo: string;
  VoucherType: string;
  Customer: string;
  Amount: number;
  Narration: string;
}

interface AuthorizeVouchersProps {
  onClose?: () => void;
  startDate?: Date;
  endDate?: Date;
  onPeriodChange?: () => void;
  onVouchersLoaded?: (vouchers: any[]) => void;
}

export const AuthorizeVouchers: React.FC<AuthorizeVouchersProps> = ({ 
  onClose, 
  startDate: propStartDate, 
  endDate: propEndDate, 
  onPeriodChange,
  onVouchersLoaded 
}) => {
  const { selectedCompany, userData } = useUser();
  const { items } = useMasterData();
  const [vouchers, setVouchers] = useState<OptionalVoucher[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [approvingVoucherId, setApprovingVoucherId] = useState<string | null>(null);
  const [selectedVoucherTypeFilter, setSelectedVoucherTypeFilter] = useState<string>('All Voucher Types');
  
  // Voucher detail modal state
  const [selectedVoucher, setSelectedVoucher] = useState<any>(null); // Full voucher data from XML
  const [selectedVoucherBasic, setSelectedVoucherBasic] = useState<OptionalVoucher | null>(null); // Basic voucher info for approval
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  // Set default date range to today only
  const getToday = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of day
    return now;
  };

  const [startDate] = useState(propStartDate || getToday());
  const [endDate] = useState(propEndDate || new Date());

  // Get unique voucher types for filter - memoized for performance
  const voucherTypes = useMemo(() => {
    const types = Array.from(new Set(vouchers.map(v => v.VoucherType).filter(Boolean)));
    return ['All Voucher Types', ...types];
  }, [vouchers]);

  // Filter vouchers - memoized for instant filtering on large lists
  const filteredVouchers = useMemo(() => {
    if (selectedVoucherTypeFilter === 'All Voucher Types') {
      return vouchers;
    } else {
      return vouchers.filter(v => v.VoucherType === selectedVoucherTypeFilter);
    }
  }, [selectedVoucherTypeFilter, vouchers]);

  const loadVouchers = useCallback(async (isRefresh: boolean = false) => {
    if (!selectedCompany) {
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      // Use prop dates if available, otherwise fall back to local state
      const effectiveStartDate = propStartDate || startDate;
      const effectiveEndDate = propEndDate || endDate;
      
      const startTime = Date.now();
      const response = await apiService.getOptionalVouchers(
        selectedCompany.tallyloc_id.toString(),
        selectedCompany.company,
        selectedCompany.GUID,
        effectiveStartDate,
        effectiveEndDate
      );

      const apiElapsed = Date.now() - startTime;
      
      if (response.success && response.data) {
        const dataStr = typeof response.data === 'string' 
          ? response.data 
          : JSON.stringify(response.data);
        
        // Parse the XML response
        const parseStartTime = Date.now();
        const voucherData = parseVoucherResponse(dataStr);
        const parseElapsed = Date.now() - parseStartTime;
        
        setVouchers(voucherData);
        setSelectedVoucherTypeFilter('All Voucher Types'); // Reset filter to show all
        onVouchersLoaded?.(voucherData);
        
        // Only log if operations are slow
        if (apiElapsed > 2000 || parseElapsed > 500) {
          console.log(`⏱️ [AuthVouchers] Performance - API: ${apiElapsed}ms, Parse: ${parseElapsed}ms, Vouchers: ${voucherData.length}`);
        }
      } else {
        console.error('❌ [AuthVouchers] Failed to load vouchers:', response.message);
        const emptyVouchers: any[] = [];
        setVouchers(emptyVouchers);
        onVouchersLoaded?.(emptyVouchers);
      }
    } catch (error) {
      console.error('❌ [AuthVouchers] Error loading vouchers:', error);
      const emptyVouchers: any[] = [];
      setVouchers(emptyVouchers);
      onVouchersLoaded?.(emptyVouchers);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCompany, propStartDate, propEndDate, startDate, endDate, onVouchersLoaded]);

  const decodeXmlEntities = (text: string): string => {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&#x([0-9A-Fa-f]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(parseInt(dec, 10)));
  };

  const parseVoucherResponse = (xmlData: string): OptionalVoucher[] => {
    try {
      const vouchers: OptionalVoucher[] = [];
      
      // Optimized: Parse ODBC result set format using single regex pass
      // Format: <ROW><COL>value1</COL><COL>value2</COL>...</ROW>
      const rowRegex = /<ROW>(.*?)<\/ROW>/gs;
      const colRegex = /<COL>(.*?)<\/COL>/g;
      
      // Month names lookup (moved outside loop for performance)
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      // Convert YYYYMMDD to DD-Mmm-YY format (optimized)
      const formatDisplayDate = (yyyymmdd: string) => {
        if (yyyymmdd.length === 8) {
          const year = yyyymmdd.substring(0, 4);
          const month = parseInt(yyyymmdd.substring(4, 6), 10);
          const day = yyyymmdd.substring(6, 8);
          return `${day}-${monthNames[month - 1]}-${year.slice(-2)}`;
        }
        return yyyymmdd;
      };
      
      let match;
      while ((match = rowRegex.exec(xmlData)) !== null) {
        const rowXml = match[1];
        const colMatches = rowXml.match(colRegex);
        
        if (colMatches && colMatches.length >= 7) {
          // Extract values more efficiently
          const extractColValue = (colMatch: string) => {
            const match = colMatch.match(/<COL>(.*?)<\/COL>/);
            return match ? match[1].trim() : '';
          };
          
          const masterId = extractColValue(colMatches[0]);
          const dateStr = extractColValue(colMatches[1]);
          const invNo = decodeXmlEntities(extractColValue(colMatches[2]));
          const voucherType = decodeXmlEntities(extractColValue(colMatches[3]));
          const customer = decodeXmlEntities(extractColValue(colMatches[4]));
          const amount = parseFloat(extractColValue(colMatches[5])) || 0;
          const narration = decodeXmlEntities(extractColValue(colMatches[6]));
          
          vouchers.push({
            MasterID: masterId,
            Dates: formatDisplayDate(dateStr),
            InvNo: invNo,
            VoucherType: voucherType,
            Customer: customer,
            Amount: amount,
            Narration: narration,
          });
        }
      }

      return vouchers;
    } catch (error) {
      console.error('❌ [AuthVouchers] Error parsing voucher response:', error);
      return [];
    }
  };

  useEffect(() => {
    loadVouchers();
  }, []);

  // Reload vouchers when date range changes
  useEffect(() => {
    if (propStartDate && propEndDate) {
      loadVouchers();
    }
  }, [propStartDate, propEndDate]);

  const handleRefresh = () => {
    loadVouchers(true);
  };

  // Handle voucher selection - fetch full voucher details
  const handleVoucherPress = async (voucher: OptionalVoucher) => {
    setShowVoucherModal(true);
    setSelectedVoucher(null); // Clear previous voucher while loading
    setSelectedVoucherBasic(voucher); // Store basic voucher info for approval

    try {
      const response = await apiService.getVoucherDetailByMasterID(
        selectedCompany.tallyloc_id.toString(),
        selectedCompany.company,
        selectedCompany.GUID,
        voucher.MasterID
      );

      if (response.success && response.data) {
        // Parse the XML response to extract voucher data
        const voucherData = parseVoucherDetailXML(response.data);
        if (voucherData) {
          setSelectedVoucher(voucherData);
        } else {
          Alert.alert('Error', 'Failed to parse voucher details');
          setShowVoucherModal(false);
        }
      } else {
        Alert.alert('Error', response.message || 'Failed to fetch voucher details');
        setShowVoucherModal(false);
      }
    } catch (error) {
      console.error('❌ [AuthVouchers] Error fetching voucher details:', error);
      Alert.alert('Error', 'Failed to fetch voucher details');
      setShowVoucherModal(false);
    }
  };

  // Helper function to get closing balance from items list
  const getItemClosingBalance = (stockItemName: string): string => {
    const item = items.find(i => i.name === stockItemName);
    return item?.closingStock ? item.closingStock.toString() : '';
  };

  // Parse voucher detail XML to extract structure compatible with LedgerVoucherReport modal
  const parseVoucherDetailXML = (xmlData: string): any | null => {
    try {
      // Look for VOUCHER tag in the BODY > DATA > TALLYMESSAGE section
      const voucherMatch = xmlData.match(/<DATA>[\s\S]*?<VOUCHER[^>]*>([\s\S]*?)<\/VOUCHER>/i);
      if (!voucherMatch) {
        console.error('❌ [AuthVouchers] No <VOUCHER> tag found in XML response');
        return null;
      }

      const extractValue = (tag: string, xml: string): string => {
        const match = xml.match(new RegExp(`<${tag}>([^<]*)<\/${tag}>`, 'i'));
        return match ? match[1].trim() : '';
      };

      const voucherXml = voucherMatch[1];
      
      // Extract ledger entries from LEDGERENTRIES.LIST (not ALLLEDGERENTRIES.LIST)
      const ledgerEntries: any[] = [];
      const ledgerMatches = voucherXml.matchAll(/<LEDGERENTRIES\.LIST>([\s\S]*?)<\/LEDGERENTRIES\.LIST>/gi);
      
      for (const match of ledgerMatches) {
        const entryXml = match[1];
        const ledgerName = extractValue('LEDGERNAME', entryXml);
        const amount = parseFloat(extractValue('AMOUNT', entryXml)) || 0;
        const isDeemedPositive = extractValue('ISDEEMEDPOSITIVE', entryXml);
        
        const entry: any = {
          LEDGERNAME: ledgerName,
          DEBITAMT: 0,
          CREDITAMT: 0,
        };
        
        // Determine if debit or credit based on ISDEEMEDPOSITIVE
        if (isDeemedPositive === 'Yes') {
          entry.CREDITAMT = Math.abs(amount);
        } else {
          entry.DEBITAMT = Math.abs(amount);
        }
        
        ledgerEntries.push(entry);
      }
      
      // Extract inventory entries from ALLINVENTORYENTRIES.LIST
      const inventoryEntries: any[] = [];
      
      if (voucherXml.includes('<ALLINVENTORYENTRIES.LIST>')) {
        const invMatches = voucherXml.matchAll(/<ALLINVENTORYENTRIES\.LIST>([\s\S]*?)<\/ALLINVENTORYENTRIES\.LIST>/gi);
        
        for (const invMatch of invMatches) {
          const invXml = invMatch[1];
          const stockItemName = extractValue('STOCKITEMNAME', invXml);
          const actualQty = extractValue('ACTUALQTY', invXml);
          const rate = extractValue('RATE', invXml);
          const amount = parseFloat(extractValue('AMOUNT', invXml)) || 0;
          
          // Get closing balance from the master items list
          const closingBalance = getItemClosingBalance(stockItemName);
          
          if (stockItemName) {
            inventoryEntries.push({
              STOCKITEMNAME: stockItemName,
              ACTUALQTY: actualQty,
              RATE: rate,
              AMOUNT: amount,
              CLOSINGBALANCE: closingBalance,
            });
          }
        }
      }
      
      // Format date from YYYYMMDD to DD-MMM-YY
      const formatTallyDate = (dateStr: string): string => {
        if (!dateStr || dateStr.length !== 8) return dateStr;
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthName = monthNames[parseInt(month) - 1] || month;
        return `${day}-${monthName}-${year.substring(2)}`;
      };

      // Decode HTML entities in narration
      const decodeHtmlEntities = (text: string): string => {
        if (!text) return text;
        return text
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&#39;/g, "'")
          .replace(/&apos;/g, "'");
      };

      // Extract voucher fields using the correct field names from the XML
      const voucherData = {
        MASTERID: extractValue('MASTERID', voucherXml),
        VCHNO: extractValue('VOUCHERNUMBER', voucherXml) || extractValue('REFERENCE', voucherXml), // Use REFERENCE if VOUCHERNUMBER is empty
        DATE: formatTallyDate(extractValue('DATE', voucherXml)),
        VCHTYPE: extractValue('VOUCHERTYPENAME', voucherXml),
        PARTICULARS: extractValue('PARTYLEDGERNAME', voucherXml),
        DEBITAMT: 0,
        CREDITAMT: 0,
        NARRATION: decodeHtmlEntities(extractValue('NARRATION', voucherXml)),
        REFERENCE: extractValue('REFERENCE', voucherXml),
        ALLLEDGERENTRIES: ledgerEntries,
        ALLINVENTORYENTRIES: inventoryEntries,
      };
      
      // Calculate total debit/credit amounts
      voucherData.ALLLEDGERENTRIES.forEach((entry: any) => {
        voucherData.DEBITAMT += entry.DEBITAMT;
        voucherData.CREDITAMT += entry.CREDITAMT;
      });

      return voucherData;
    } catch (error) {
      console.error('❌ [AuthVouchers] Error parsing voucher XML:', error);
      return null;
    }
  };

  // Close voucher modal
  const closeVoucherModal = () => {
    setShowVoucherModal(false);
    setSelectedVoucher(null);
    setSelectedVoucherBasic(null);
  };

  // Handle approve from modal
  const handleApproveFromModal = () => {
    if (selectedVoucherBasic) {
      closeVoucherModal();
      handleApprove(selectedVoucherBasic);
    }
  };

  const formatPeriodDisplay = () => {
    const formatDate = (date: Date) => {
      const day = date.getDate();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[date.getMonth()];
      const year = date.getFullYear().toString().slice(-2);
      return `${day}-${month}-${year}`;
    };

    // Use prop dates if available, otherwise fall back to local state
    const effectiveStartDate = propStartDate || startDate;
    const effectiveEndDate = propEndDate || endDate;
    
    const startStr = formatDate(effectiveStartDate);
    const endStr = formatDate(effectiveEndDate);
    
    // Check if same date
    if (effectiveStartDate.toDateString() === effectiveEndDate.toDateString()) {
      return `for ${startStr}`;
    } else {
      return `${startStr} to ${endStr}`;
    }
  };

  const handleApprove = async (voucher: OptionalVoucher) => {
    if (!selectedCompany || !userData) {
      Alert.alert('Error', 'Company or user information not available');
      return;
    }

    // Confirm before approving
    Alert.alert(
      'Approve Voucher',
      `Are you sure you want to approve voucher ${voucher.InvNo}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Approve',
          onPress: async () => {
            setApprovingVoucherId(voucher.MasterID);
            
            try {
              const response = await apiService.approveVoucher(
                selectedCompany.tallyloc_id.toString(),
                selectedCompany.company,
                selectedCompany.GUID,
                voucher.MasterID,
                voucher.Dates,
                voucher.Narration,
                userData.name
              );

              setApprovingVoucherId(null);

              if (response.success) {
                Alert.alert('Success', 'Voucher approved successfully');
                // Refresh the list to remove the approved voucher
                loadVouchers(true);
              } else {
                Alert.alert('Error', response.message || 'Failed to approve voucher');
              }
            } catch (error) {
              setApprovingVoucherId(null);
              console.error('❌ [AuthVouchers] Error approving voucher:', error);
              Alert.alert('Error', 'Failed to approve voucher. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderVoucherItem = useCallback(({ item }: { item: OptionalVoucher }) => (
    <TouchableOpacity 
      style={styles.voucherCard}
      onPress={() => handleVoucherPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.voucherHeader}>
        <Text style={styles.voucherNumber}>{item.InvNo}</Text>
        <Text style={styles.voucherDate}>{item.Dates}</Text>
      </View>
      <View style={styles.voucherTypeRow}>
        <Text style={styles.voucherType}>{item.VoucherType}</Text>
      </View>
      <Text style={styles.voucherCustomer}>{item.Customer}</Text>
      {item.Narration && item.Narration.trim() !== '' && (
        <Text style={styles.voucherNarration} numberOfLines={2}>{item.Narration}</Text>
      )}
      <View style={styles.voucherFooter}>
        <Text style={styles.voucherAmount}>
          ₹{Math.abs(item.Amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
        <TouchableOpacity 
          style={[
            styles.authorizeButton, 
            approvingVoucherId === item.MasterID && styles.authorizeButtonDisabled
          ]}
          onPress={(e) => {
            e.stopPropagation(); // Prevent triggering the parent TouchableOpacity
            handleApprove(item);
          }}
          disabled={approvingVoucherId === item.MasterID}
        >
          {approvingVoucherId === item.MasterID ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.authorizeButtonText}>Authorize</Text>
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  ), [approvingVoucherId]);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>✓</Text>
      <Text style={styles.emptyText}>No pending vouchers</Text>
      <Text style={styles.emptySubtext}>All vouchers have been authorized</Text>
    </View>
  ), []);

  // Voucher Detail Modal Component - using full voucher data like LedgerVoucherReport
  const VoucherDetailModal: React.FC<{
    visible: boolean;
    voucher: any;
    onClose: () => void;
    onApprove: () => void;
    isApproving: boolean;
  }> = ({ visible, voucher, onClose, onApprove, isApproving }) => {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Voucher Details</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          {!voucher ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading voucher details...</Text>
            </View>
          ) : (
            <>
              {(() => {
                const hasInventoryItems = voucher.ALLINVENTORYENTRIES && Array.isArray(voucher.ALLINVENTORYENTRIES) && voucher.ALLINVENTORYENTRIES.length > 0;
                const inventoryItems = voucher.ALLINVENTORYENTRIES || [];
                const subtotal = inventoryItems.reduce((sum: number, item: any) => sum + (item.AMOUNT || 0), 0);
                const total = voucher.DEBITAMT || voucher.CREDITAMT || 0;

                return (
                  <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Invoice Header */}
            <View style={styles.invoiceHeader}>
              <Text style={styles.invoiceTitle}>{voucher.VCHTYPE || 'VOUCHER'}</Text>
              <View style={styles.invoiceInfo}>
                <Text style={styles.invoiceLabel}>Voucher No.: {voucher.VCHNO}</Text>
                <Text style={styles.invoiceLabel}>Dated: {voucher.DATE}</Text>
                <Text style={styles.invoiceLabel}>Party: {voucher.PARTICULARS}</Text>
              </View>
            </View>

            {/* Company Details */}
            <View style={styles.companySection}>
              <Text style={styles.companyName}>{selectedCompany.company}</Text>
            </View>

            {/* Inventory Items (if available) */}
            {hasInventoryItems && inventoryItems.length > 0 && (
              <View style={styles.itemsSection}>
                <Text style={styles.sectionTitle}>Items</Text>
                {inventoryItems.map((item: any, index: number) => (
                  <View key={index} style={styles.itemRow}>
                    <View style={styles.itemDetails}>
                      <Text style={styles.itemName}>{item.STOCKITEMNAME}</Text>
                      <Text style={styles.itemQty}>
                        Qty: {item.ACTUALQTY} @ ₹{item.RATE}
                      </Text>
                      {item.CLOSINGBALANCE && (
                        <Text style={styles.itemClosingQty}>
                          Closing: {item.CLOSINGBALANCE}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.itemAmount}>
                      ₹{item.AMOUNT.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                ))}
                <View style={styles.subtotalRow}>
                  <Text style={styles.subtotalLabel}>Subtotal:</Text>
                  <Text style={styles.subtotalAmount}>
                    ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              </View>
            )}

            {/* Ledger Entries */}
            <View style={styles.ledgerSection}>
              <Text style={styles.sectionTitle}>Ledger Entries</Text>
              {voucher.ALLLEDGERENTRIES?.map((ledger: any, index: number) => (
                <View key={index} style={styles.ledgerRow}>
                  <Text style={styles.ledgerName}>{ledger.LEDGERNAME}</Text>
                  <Text style={styles.ledgerAmount}>
                    ₹{(ledger.DEBITAMT || ledger.CREDITAMT).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {ledger.DEBITAMT > 0 ? 'Dr' : 'Cr'}
                  </Text>
                </View>
              ))}
            </View>

            {/* Total Amount */}
            <View style={styles.totalSection}>
              <Text style={styles.totalLabel}>Total Amount:</Text>
              <Text style={styles.totalAmount}>
                ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </View>

            {/* Narration */}
            {voucher.NARRATION && voucher.NARRATION.trim() !== '' && (
              <View style={styles.narrationSection}>
                <Text style={styles.narrationLabel}>Narration:</Text>
                <Text style={styles.narrationText}>{voucher.NARRATION}</Text>
              </View>
            )}
                  </ScrollView>
                );
              })()}
            </>
          )}
        </SafeAreaView>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading vouchers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Period Display Line */}
      <TouchableOpacity 
        style={styles.periodDisplay}
        onPress={onPeriodChange}
        activeOpacity={0.7}
      >
        <Text style={styles.periodText}>{formatPeriodDisplay()}</Text>
        <Text style={styles.periodIcon}>📅</Text>
      </TouchableOpacity>

      {/* Voucher Type Filter Dropdown */}
      {voucherTypes.length > 1 && (
        <View style={styles.filterContainer}>
          <View style={styles.pickerWrapper}>
            <Text style={styles.pickerText}>{selectedVoucherTypeFilter}</Text>
            <Text style={styles.pickerIcon}>▼</Text>
          </View>
          <Picker
            selectedValue={selectedVoucherTypeFilter}
            onValueChange={(itemValue) => {
              setSelectedVoucherTypeFilter(itemValue);
            }}
            style={styles.picker}
            mode="dropdown"
          >
            {voucherTypes.map((type) => (
              <Picker.Item 
                key={type} 
                label={type} 
                value={type}
              />
            ))}
          </Picker>
        </View>
      )}

      <FlatList
        data={filteredVouchers}
        keyExtractor={(item) => item.MasterID}
        renderItem={renderVoucherItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={10}
        windowSize={5}
        getItemLayout={(data, index) => ({
          length: 140,
          offset: 140 * index,
          index,
        })}
      />

      {/* Voucher Detail Modal */}
      <VoucherDetailModal
        visible={showVoucherModal}
        voucher={selectedVoucher}
        onClose={closeVoucherModal}
        onApprove={handleApproveFromModal}
        isApproving={approvingVoucherId === selectedVoucherBasic?.MasterID}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  periodDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    height: 36,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  periodText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  periodIcon: {
    fontSize: 14,
    color: '#007AFF',
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    height: 36,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    position: 'relative',
  },
  pickerWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    pointerEvents: 'none',
  },
  pickerText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  pickerIcon: {
    fontSize: 12,
    color: '#666',
  },
  picker: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    height: 36,
    width: '100%',
    opacity: 0,
    backgroundColor: 'transparent',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  voucherCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  voucherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  voucherNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  voucherDate: {
    fontSize: 13,
    color: '#666',
  },
  voucherTypeRow: {
    marginBottom: 4,
  },
  voucherType: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  voucherCustomer: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
  },
  voucherNarration: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  voucherFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  voucherAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#28a745',
  },
  authorizeButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 90,
    alignItems: 'center',
  },
  authorizeButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.7,
  },
  authorizeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
    color: '#28a745',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  voucherDetailCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    width: 100,
    marginRight: 12,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  detailAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#28a745',
    flex: 1,
  },
  detailNarration: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    lineHeight: 20,
  },
  modalFooter: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  modalAuthorizeButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  modalAuthorizeButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.7,
  },
  modalAuthorizeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Detailed voucher view styles
  invoiceHeader: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  invoiceTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  invoiceInfo: {
    gap: 4,
  },
  invoiceLabel: {
    fontSize: 14,
    color: '#666',
  },
  companySection: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  itemsSection: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    paddingBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
  },
  itemDetails: {
    flex: 1,
    marginRight: 8,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  itemQty: {
    fontSize: 12,
    color: '#666',
  },
  itemClosingQty: {
    fontSize: 11,
    color: '#28a745',
    marginTop: 2,
    fontWeight: '500',
  },
  itemAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#28a745',
    textAlign: 'right',
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
  },
  subtotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  subtotalAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  ledgerSection: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
  },
  ledgerName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  ledgerAmount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    textAlign: 'right',
  },
  totalSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  narrationSection: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  narrationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  narrationText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
});

