import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
} from 'react-native';
import { StockItem, Customer, OrderItem } from '../../types/order';
import { LightweightItemList } from './LightweightItemList';
import { LightweightCustomerList } from './LightweightCustomerList';
import { getCustomerPriceForItem } from '../../utils/priceListManager';
import { useBackendPermissions } from '../../hooks/useBackendPermissions';

interface LightweightOrderFormProps {
  // State from useOrderEntry
  selectedCustomer: Customer | null;
  customerName: string;
  itemQuantity: string;
  itemRate: string;
  itemValue: string;
  orderItems: OrderItem[];
  loadingItems: boolean;
  loadingCustomers: boolean;
  itemList: StockItem[];
  customers: Customer[];
  selectedItemIndex: number | null;
  orderConfig: any;
  
  // Actions from useOrderEntry
  setCustomerName: (name: string) => void;
  setItemQuantity: (qty: string) => void;
  setItemRate: (rate: string) => void;
  setItemValue: (value: string) => void;
  
  // Handlers from useOrderEntry
  handleItemSelect: (item: StockItem) => void;
  handleCustomerSelect: (customer: Customer) => void;
  addItemToOrder: () => void;
  removeItemFromOrder: (itemId: string) => void;
  getTotalAmount: () => string;
}

export const LightweightOrderForm: React.FC<LightweightOrderFormProps> = React.memo(({
  selectedCustomer,
  customerName,
  itemQuantity,
  itemRate,
  itemValue,
  orderItems,
  loadingItems,
  loadingCustomers,
  itemList,
  customers,
  selectedItemIndex,
  orderConfig,
  setCustomerName,
  setItemQuantity,
  setItemRate,
  setItemValue,
  handleItemSelect,
  handleCustomerSelect,
  addItemToOrder,
  removeItemFromOrder,
  getTotalAmount,
}) => {
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const permissions = useBackendPermissions();

  // Calculate value when quantity or rate changes
  const handleQuantityChange = useCallback((qty: string) => {
    setItemQuantity(qty);
    const quantity = parseFloat(qty) || 0;
    
    if (quantity > 0) {
      // Use entered rate if user has modified it, otherwise use 0
      let rate = 0;
      if (itemRate.trim() !== '') {
        rate = parseFloat(itemRate) || 0;
      } else {
        // When rate field is empty, treat as 0 rate
        rate = 0;
      }
      
      setItemValue((quantity * rate).toFixed(2));
    }
  }, [itemRate, selectedItemIndex, selectedCustomer, itemList, orderConfig, setItemQuantity, setItemValue]);

  const handleRateChange = useCallback((rate: string) => {
    setItemRate(rate);
    const quantity = parseFloat(itemQuantity) || 0;
    
    if (quantity > 0) {
      // Use entered rate if user has modified it, otherwise use 0
      let rateValue = 0;
      if (rate.trim() !== '') {
        rateValue = parseFloat(rate) || 0;
      } else {
        // When rate field is empty, treat as 0 rate
        rateValue = 0;
      }
      
      setItemValue((quantity * rateValue).toFixed(2));
    }
  }, [itemQuantity, selectedItemIndex, selectedCustomer, itemList, orderConfig, setItemRate, setItemValue]);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Customer Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Customer</Text>
        <TouchableOpacity
          style={styles.selectionButton}
          onPress={() => setShowCustomerModal(true)}
        >
          <Text style={styles.selectionButtonText}>
            {customerName || 'Select Customer'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Item Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Item</Text>
        <TouchableOpacity
          style={styles.selectionButton}
          onPress={() => setShowItemModal(true)}
        >
          <Text style={styles.selectionButtonText}>
            Select Item
          </Text>
        </TouchableOpacity>
      </View>

      {/* Quantity and Rate */}
      <View style={styles.row}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Quantity</Text>
          <TextInput
            style={styles.input}
            value={itemQuantity}
            onChangeText={handleQuantityChange}
            keyboardType="numeric"
            placeholder="0"
          />
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Rate</Text>
          <TextInput
            style={styles.input}
            value={itemRate}
            onChangeText={handleRateChange}
            keyboardType="numeric"
            placeholder="0.00"
          />
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Value</Text>
          <Text style={styles.valueText}>₹{itemValue || '0.00'}</Text>
        </View>
      </View>

      {/* Add Item Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={addItemToOrder}
      >
        <Text style={styles.addButtonText}>Add Item</Text>
      </TouchableOpacity>

      {/* Order Items */}
      {orderItems.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items ({orderItems.length})</Text>
          {orderItems.map((item, index) => (
            <View key={item.id} style={styles.orderItem}>
              <View style={styles.orderItemInfo}>
                <Text style={styles.orderItemName}>{item.name}</Text>
                {permissions.showRateAmtColumn ? (
                  <Text style={styles.orderItemDetails}>
                    Qty: {item.quantity} × ₹{item.rate} = ₹{item.value}
                  </Text>
                ) : (
                  <Text style={styles.orderItemDetails}>
                    Qty: {item.quantity}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeItemFromOrder(item.id)}
              >
                <Text style={styles.removeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
          {permissions.showRateAmtColumn && (
            <View style={styles.totalContainer}>
              <Text style={styles.totalText}>Total: ₹{getTotalAmount()}</Text>
            </View>
          )}
        </View>
      )}

      {/* Customer Modal */}
      <Modal
        visible={showCustomerModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Customer</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowCustomerModal(false)}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
          <LightweightCustomerList
            customers={customers}
            onCustomerSelect={(customer) => {
              handleCustomerSelect(customer);
              setShowCustomerModal(false);
            }}
            loading={loadingCustomers}
          />
        </View>
      </Modal>

      {/* Item Modal */}
      <Modal
        visible={showItemModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Item</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowItemModal(false)}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
          <LightweightItemList
            items={itemList}
            onItemSelect={(item) => {
              handleItemSelect(item);
              setShowItemModal(false);
            }}
            loading={loadingItems}
          />
        </View>
      </Modal>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  selectionButton: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  selectionButtonText: {
    fontSize: 16,
    color: '#666',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  inputContainer: {
    flex: 1,
    marginRight: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  valueText: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F8F8F8',
    textAlign: 'center',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  orderItemInfo: {
    flex: 1,
  },
  orderItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  orderItemDetails: {
    fontSize: 14,
    color: '#666',
  },
  removeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  totalContainer: {
    alignItems: 'flex-end',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  totalText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
});


