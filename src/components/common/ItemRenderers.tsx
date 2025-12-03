import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { StockItem, Customer } from '../../types/order';
import { useBackendPermissions } from '../../hooks/useBackendPermissions';

// Generic item renderer interface
interface ItemRendererProps<T> {
  item: T;
  onPress: () => void;
}

// Stock Item Renderer
export const StockItemRenderer: React.FC<ItemRendererProps<StockItem>> = ({ item, onPress }) => {
  const permissions = useBackendPermissions();
  
  return (
    <TouchableOpacity style={styles.itemRow} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.itemName} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={styles.itemDetails}>
        {permissions.showClsStckColumn 
          ? (permissions.showClsStckYesno 
              ? `Stock avlb: ${item.availableQty > 0 ? 'Yes' : 'No'}`
              : `Qty: ${item.availableQty}`)
          : ''
        } {permissions.showClsStckColumn ? '| ' : ''}Rate: ₹{item.rate}
      </Text>
    </TouchableOpacity>
  );
};

// Customer Renderer
export const CustomerRenderer: React.FC<ItemRendererProps<Customer>> = ({ item, onPress }) => (
  <TouchableOpacity style={styles.itemRow} onPress={onPress} activeOpacity={0.7}>
    <Text style={styles.itemName} numberOfLines={1}>
      {item.name}
    </Text>
    <Text style={styles.itemDetails} numberOfLines={1}>
      {item.phone} | {item.mobile}
    </Text>
  </TouchableOpacity>
);

// Ledger Renderer (for ledger selection)
export const LedgerRenderer: React.FC<ItemRendererProps<{ id: string; name: string }>> = ({ item, onPress }) => (
  <TouchableOpacity style={styles.itemRow} onPress={onPress} activeOpacity={0.7}>
    <Text style={styles.itemName} numberOfLines={1}>
      {item.name}
    </Text>
  </TouchableOpacity>
);

// Company Renderer (for company selection)
export const CompanyRenderer: React.FC<ItemRendererProps<any>> = ({ item, onPress }) => (
  <TouchableOpacity style={styles.itemRow} onPress={onPress} activeOpacity={0.7}>
    <Text style={styles.itemName} numberOfLines={1}>
      {item.company || item.name}
    </Text>
    <Text style={styles.itemDetails} numberOfLines={1}>
      {item.shared_email || item.email || ''}
    </Text>
  </TouchableOpacity>
);

// Generic Text Renderer (for simple text lists)
export const TextItemRenderer: React.FC<ItemRendererProps<{ id: string; text: string }>> = ({ item, onPress }) => (
  <TouchableOpacity style={styles.itemRow} onPress={onPress} activeOpacity={0.7}>
    <Text style={styles.itemName} numberOfLines={1}>
      {item.text}
    </Text>
  </TouchableOpacity>
);

// Generic Key-Value Renderer (for structured data)
export const KeyValueRenderer: React.FC<ItemRendererProps<{ id: string; key: string; value: string }>> = ({ item, onPress }) => (
  <TouchableOpacity style={styles.itemRow} onPress={onPress} activeOpacity={0.7}>
    <Text style={styles.itemName} numberOfLines={1}>
      {item.key}
    </Text>
    <Text style={styles.itemDetails} numberOfLines={1}>
      {item.value}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  itemRow: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 14,
    color: '#666',
  },
});


