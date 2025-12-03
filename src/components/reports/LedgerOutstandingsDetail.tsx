import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StandardHeader } from '../common';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';

// Types for the voucher data
interface VoucherDetail {
  MASTERID: number;
  DATE: string;
  VOUCHERTYPE: string;
  VOUCHERNUMBER: string;
  DEBITAMT: number;
  CREDITAMT: number;
}

interface LedgerOutstandingsDetailProps {
  ledgerName: string;
  refNo: string;
  vouchers: VoucherDetail[];
  onBack: () => void;
}

const LedgerOutstandingsDetail: React.FC<LedgerOutstandingsDetailProps> = ({
  ledgerName,
  refNo,
  vouchers,
  onBack,
}) => {
  const [loading, setLoading] = useState(false);

  // Calculate totals
  const totalDebit = vouchers.reduce((sum, voucher) => sum + voucher.DEBITAMT, 0);
  const totalCredit = vouchers.reduce((sum, voucher) => sum + voucher.CREDITAMT, 0);
  const netAmount = totalDebit - totalCredit;
  const isDebit = netAmount > 0;
  const totalAmount = Math.abs(netAmount);
  const totalType = isDebit ? 'Dr.' : 'Cr.';

  // Format amount with comma separators and 2 decimal places
  const formatAmount = (amount: number): string => {
    return amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Format date from DD-MMM-YY to DD-MMM-YY format
  const formatDate = (dateString: string): string => {
    try {
      // If already in correct format, return as is
      if (dateString.includes('-') && dateString.length <= 10) {
        return dateString;
      }
      
      // Try to parse and format the date
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString; // Return original if parsing fails
      }
      
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  // Render voucher entry
  const renderVoucherEntry = ({ item, index }: { item: VoucherDetail; index: number }) => {
    const isDebit = item.DEBITAMT > 0;
    const amount = isDebit ? item.DEBITAMT : item.CREDITAMT;
    const amountType = isDebit ? 'Dr.' : 'Cr.';
    
    return (
      <View style={styles.voucherEntry}>
        <View style={styles.voucherDate}>
          <Text style={styles.dateText}>{formatDate(item.DATE)}</Text>
        </View>
        <View style={styles.voucherDescription}>
          <Text style={styles.descriptionText}>
            <Text style={styles.voucherType}>{item.VOUCHERTYPE}</Text> #{item.VOUCHERNUMBER}
          </Text>
        </View>
        <View style={styles.voucherAmount}>
          <Text style={styles.amountText}>
            {formatAmount(amount)} {amountType}
          </Text>
        </View>
      </View>
    );
  };

  // Render empty component
  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No voucher entries found</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StandardHeader
        title="Ledger Outstandings"
        showMenuButton={true}
        onMenuPress={onBack}
      />
      

      {/* Voucher List */}
      <View style={styles.listContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading vouchers...</Text>
          </View>
        ) : (
          <FlatList
            data={vouchers}
            renderItem={renderVoucherEntry}
            keyExtractor={(item, index) => `${item.MASTERID}-${index}`}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmptyComponent}
            contentContainerStyle={styles.flatListContent}
          />
        )}
      </View>

      {/* Fixed Grand Total */}
      <View style={styles.fixedGrandTotalContainer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>
            Total ({isDebit ? 'Debit' : 'Credit'})
          </Text>
          <Text style={styles.totalValue}>
            {formatAmount(totalAmount)} {totalType}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  listContainer: {
    flex: 1,
    backgroundColor: '#fff',
    paddingBottom: 80, // Increased padding to account for fixed grand total + navigation bar
  },
  flatListContent: {
    padding: 0,
  },
  voucherEntry: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    alignItems: 'center',
  },
  voucherDate: {
    width: 80,
    alignItems: 'flex-start',
  },
  dateText: {
    fontSize: 14,
    color: '#333',
  },
  voucherDescription: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  voucherType: {
    fontWeight: 'bold',
  },
  voucherAmount: {
    width: 120,
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  fixedGrandTotalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#007AFF',
    paddingVertical: 0,
    paddingHorizontal: 0,
    paddingBottom: 20, // Keep only bottom padding for navigation bar
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
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 0,
    minHeight: 20,
    width: '100%',
    backgroundColor: 'transparent',
  },
  totalLabel: {
    fontSize: 15,
    color: 'white',
    fontWeight: '500',
    flex: 1,
    textAlign: 'left',
    lineHeight: 15,
  },
  totalValue: {
    fontSize: 15,
    color: 'white',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    lineHeight: 15,
  },
});

export default LedgerOutstandingsDetail;
