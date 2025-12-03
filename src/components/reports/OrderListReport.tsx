import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tallyService, OrderListItem, OrderDetails, OrderDataWithItems } from '../../services/tallyService';
import { PeriodSelector, StandardHeader } from '../common';
import ReportsMenu from './ReportsMenu';
import { useReportsMenu } from '../../hooks';

interface OrderListReportProps {
  onBack: () => void;
  companyName?: string;
  tallylocId?: string;
  guid?: string;
}

export const OrderListReport: React.FC<OrderListReportProps> = ({ onBack, companyName, tallylocId, guid }) => {
  const [orderData, setOrderData] = useState<OrderDataWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  
  // Period selector state - default to current month start to today
  const getCurrentMonthStart = (): Date => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  };
  
  const [startDate, setStartDate] = useState<Date>(getCurrentMonthStart());
  const [endDate, setEndDate] = useState<Date>(new Date());
  


  // Menu management
  const { showMenu, handleMenuPress, handleNavigation, closeMenu } = useReportsMenu();

  const loadOrders = useCallback(async () => {
    try {
      setError(null);
      const data = await tallyService.getOrderList(companyName, tallylocId, guid, startDate, endDate);
      setOrderData(data);
    } catch (err) {
      setError('Failed to load orders. Please try again.');
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
    }
  }, [companyName, tallylocId, guid]);

  const loadOrdersWithPeriod = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await tallyService.getOrderList(companyName, tallylocId, guid, startDate, endDate);
      setOrderData(data);
    } catch (err) {
      setError('Failed to load orders. Please try again.');
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
    }
  }, [companyName, tallylocId, guid, startDate, endDate]);

  const handlePeriodChange = useCallback(async (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
    
    // Load orders with the new period values immediately
    try {
      setError(null);
      setLoading(true);
      const data = await tallyService.getOrderList(companyName, tallylocId, guid, start, end);
      setOrderData(data);
    } catch (err) {
      setError('Failed to load orders. Please try again.');
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [companyName, tallylocId, guid]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);








  const handleOrderPress = useCallback(async (order: OrderListItem) => {
    setSelectedOrder(null); // Clear previous details
    setShowDetails(true);
    setError(null);
    setLoadingDetails(true);
    
    // Fetch order details using the new XML request
    try {
      const orderDetails = await tallyService.getOrderDetails(
        order.partyLedgerName,
        order.reference,
        companyName,
        tallylocId,
        guid
      );
      
      if (orderDetails) {
        setSelectedOrder(orderDetails);
      } else {
        setError('Failed to fetch order details');
      }
    } catch (error) {
      console.error('🔍 Error fetching order details:', error);
      setError('Failed to fetch order details');
    } finally {
      setLoadingDetails(false);
    }
  }, [companyName, tallylocId, guid]);

  const handleBackToOrders = useCallback(() => {
    setShowDetails(false);
    setSelectedOrder(null);
    setError(null);
    setLoadingDetails(false);
  }, []);

  const formatDate = (dateString: string): string => {
    try {
      // Handle Tally date format (YYYYMMDD)
      if (dateString && dateString.length === 8 && /^\d{8}$/.test(dateString)) {
        const year = parseInt(dateString.substring(0, 4));
        const month = parseInt(dateString.substring(4, 6)) - 1; // Month is 0-indexed
        const day = parseInt(dateString.substring(6, 8));
        
        const date = new Date(year, month, day);
        return date.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: '2-digit',
        });
      }
      
      // Fallback for other date formats
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



  const formatAmount = (amount: number): string => {
    if (!amount || amount === 0 || isNaN(amount) || !isFinite(amount)) return '₹0.00';
    return `₹${amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const renderOrderItem = ({ item }: { item: OrderListItem }) => {
    if (!item) return null;
    
    return (
      <TouchableOpacity 
        style={styles.orderItem} 
        onPress={() => handleOrderPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.orderContent}>
          <View style={styles.particularsColumn}>
            <Text style={styles.customerName}>{item.partyLedgerName || 'Unknown Customer'}</Text>
            <View style={styles.orderDetails}>
              <Text style={styles.orderNumber}>Order No : {item.reference || 'N/A'}</Text>
              <Text style={styles.orderSequence}>
                {`${formatDate(item.date || '')} | SALES ORDER #${item.masterId || 0}`}
              </Text>
            </View>
          </View>
          <View style={styles.amountColumn}>
            <Text style={styles.orderAmount}>{formatAmount(item.amount || 0)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No orders found</Text>
      <Text style={styles.emptySubtext}>Pull to refresh or check your connection</Text>
    </View>
  );



  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <StandardHeader
          title="Order List Report"
          onMenuPress={handleMenuPress}
          showMenuButton={true}
        />
        
        {/* Reports Menu */}
        <ReportsMenu 
          showMenu={showMenu}
          onClose={closeMenu}
          onNavigation={handleNavigation}
        />
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show order details if selected
  if (showDetails) {
          return (
      <SafeAreaView key="order-details" style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.detailsContainer}>
          <StandardHeader
            title="Order Details"
            onMenuPress={handleMenuPress}
            showMenuButton={true}
          />

          {/* Reports Menu */}
          <ReportsMenu 
            showMenu={showMenu}
            onClose={closeMenu}
            onNavigation={handleNavigation}
          />

          <View style={styles.detailsContent}>
            {loadingDetails ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading order details...</Text>
              </View>
            ) : selectedOrder ? (
              <>
                <View style={styles.detailsSummary}>
                  <Text style={styles.detailsOrderId}>Order: {selectedOrder.reference || 'N/A'}</Text>
                  <Text style={styles.detailsDate}>{formatDate(selectedOrder.date || '')}</Text>
                  <Text style={styles.detailsCustomer}>Customer: {selectedOrder.partyLedgerName || 'Unknown'}</Text>
                  <Text style={styles.detailsTotal}>Total: {formatAmount(selectedOrder.totalAmount || 0)}</Text>
                </View>

                <Text style={styles.itemsTitle}>Order Items</Text>
                
                <FlatList
                  data={selectedOrder.items || []}
                  renderItem={({ item }) => {
                    // Ensure all values are safe before rendering
                    if (!item) return <View />;
                    
                    // Safely extract and validate all values, ensuring they're always valid
                    const stockItemName = item.stockItemName ? String(item.stockItemName).trim() : 'Unknown Item';
                    
                    let amount = 0;
                    if (typeof item.amount === 'number' && !isNaN(item.amount) && isFinite(item.amount)) {
                      amount = item.amount;
                    } else if (item.amount != null) {
                      const parsed = parseFloat(String(item.amount));
                      amount = isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
                    }
                    
                    let orderedQty = 0;
                    if (typeof item.orderedQty === 'number' && !isNaN(item.orderedQty) && isFinite(item.orderedQty)) {
                      orderedQty = item.orderedQty;
                    } else if (typeof item.quantity === 'number' && !isNaN(item.quantity) && isFinite(item.quantity)) {
                      orderedQty = item.quantity;
                    } else if (item.orderedQty != null || item.quantity != null) {
                      const parsed = parseFloat(String(item.orderedQty || item.quantity || 0));
                      orderedQty = isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
                    }
                    
                    let billedQty = 0;
                    if (typeof item.billedQty === 'number' && !isNaN(item.billedQty) && isFinite(item.billedQty)) {
                      billedQty = item.billedQty;
                    } else if (item.billedQty != null) {
                      const parsed = parseFloat(String(item.billedQty));
                      billedQty = isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
                    }
                    
                    let pendingQty = 0;
                    if (typeof item.pendingQty === 'number' && !isNaN(item.pendingQty) && isFinite(item.pendingQty)) {
                      pendingQty = item.pendingQty;
                    } else if (item.pendingQty != null) {
                      const parsed = parseFloat(String(item.pendingQty));
                      pendingQty = isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
                    }
                    
                    const unit = item.unit ? String(item.unit).trim() : 'Nos';
                    
                    let rate = 0;
                    if (typeof item.rate === 'number' && !isNaN(item.rate) && isFinite(item.rate)) {
                      rate = item.rate;
                    } else if (item.rate != null) {
                      const parsed = parseFloat(String(item.rate));
                      rate = isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
                    }
                    
                    let pendingValue = 0;
                    if (typeof item.pendingValue === 'number' && !isNaN(item.pendingValue) && isFinite(item.pendingValue)) {
                      pendingValue = item.pendingValue;
                    } else if (item.pendingValue != null) {
                      const parsed = parseFloat(String(item.pendingValue));
                      pendingValue = isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
                    }
                    
                    return (
                      <View style={styles.itemRow}>
                        <View style={styles.itemInfo}>
                          <View style={styles.itemHeader}>
                            <Text style={styles.itemName}>{stockItemName}</Text>
                            <Text style={styles.itemAmount}>{formatAmount(amount)}</Text>
                          </View>
                          <View style={styles.quantityDetails}>
                            <View style={styles.quantityRow}>
                              <Text style={styles.quantityLabel}>Ordered:</Text>
                              <Text style={styles.quantityValue}>
                                {`${orderedQty} ${unit}`}
                              </Text>
                            </View>
                            <View style={styles.quantityRow}>
                              <Text style={styles.quantityLabel}>Billed:</Text>
                              <Text style={styles.quantityValue}>
                                {`${billedQty} ${unit}`}
                              </Text>
                            </View>
                            <View style={styles.quantityRow}>
                              <Text style={styles.quantityLabel}>Pending:</Text>
                              <Text style={styles.quantityValue}>
                                {`${pendingQty} ${unit}`}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.itemRate}>
                            {`Rate: ₹${rate.toFixed(2)}`}
                          </Text>
                          {pendingValue > 0 && pendingValue !== amount && (
                            <Text style={styles.pendingValue}>
                              {`Pending: ${formatAmount(pendingValue)}`}
                            </Text>
                          )}
                        </View>
                      </View>
                    );
                  }}
                  keyExtractor={(item, index) => `${item?.stockItemName || 'item'}-${index}`}
                  showsVerticalScrollIndicator={false}
                />
              </>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => setShowDetails(false)}>
                  <Text style={styles.retryButtonText}>Back to Orders</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView key="order-list" style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StandardHeader
        title="Order List Report"
        onMenuPress={handleMenuPress}
        showMenuButton={true}
      />

      {/* Reports Menu */}
      <ReportsMenu 
        showMenu={showMenu}
        onClose={closeMenu}
        onNavigation={handleNavigation}
      />

      {/* Period Selector */}
      <PeriodSelector
        onPeriodChange={handlePeriodChange}
        initialStartDate={startDate}
        initialEndDate={endDate}
      />

      {/* Column Headers */}
      <View style={styles.columnHeaders}>
        <Text style={styles.headerParticulars}>PARTICULARS</Text>
        <Text style={styles.headerAmount}>ORDER AMOUNT</Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadOrders}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.reportContainer}>
        <FlatList
          data={orderData?.summary || []}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.masterId.toString()}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyComponent}
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.fixedSummaryContainer}>
          <Text style={styles.summaryText}>
            Total Orders: {orderData?.summary?.length || 0}
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


  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  errorContainer: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    margin: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#721c24',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  reportContainer: {
    flex: 1,
  },
  listContainer: {
    paddingBottom: 120, // Increased to make space for fixed summary
  },
  orderItem: {
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  orderContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  particularsColumn: {
    flex: 1,
    marginRight: 20,
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  orderDetails: {
    gap: 4,
  },
  orderNumber: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  orderSequence: {
    fontSize: 14,
    color: '#666',
  },
  amountColumn: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 100,
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    textAlign: 'right',
  },
  columnHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#dee2e6',
  },
  headerParticulars: {
    fontSize: 14,
    fontWeight: '700',
    color: '#495057',
    flex: 1,
  },
  headerAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#495057',
    textAlign: 'right',
    minWidth: 100,
  },

  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  summaryContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    alignItems: 'center',
  },
  fixedSummaryContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 2,
    borderTopColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },

  detailsContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },

  detailsContent: {
    flex: 1,
    padding: 20,
  },
  detailsSummary: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailsOrderId: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  detailsOrder: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  detailsDate: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  detailsCustomer: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  detailsTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 8,
  },
  itemsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  itemRow: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemDetails: {
    fontSize: 14,
    color: '#666',
  },
  itemAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  quantityDetails: {
    marginVertical: 4,
  },
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  quantityLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    minWidth: 60,
  },
  quantityValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
  itemRate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },

  pendingValue: {
    fontSize: 12,
    color: '#FF6B35',
    fontWeight: '500',
    marginTop: 2,
  },

});
