import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Customer } from '../../types/order';

interface LightweightCustomerListProps {
  customers: Customer[];
  onCustomerSelect: (customer: Customer) => void;
  loading?: boolean;
}

export const LightweightCustomerList: React.FC<LightweightCustomerListProps> = React.memo(({
  customers,
  onCustomerSelect,
  loading = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);

  // Focus the search input when the component mounts
  useEffect(() => {
    // Small delay to ensure the modal is fully rendered
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Simple, fast search filter
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    
    const query = searchQuery.toLowerCase().trim();
    return customers.filter(customer => 
      customer.name.toLowerCase().includes(query) ||
      customer.phone.toLowerCase().includes(query) ||
      customer.mobile.toLowerCase().includes(query)
    );
  }, [customers, searchQuery]);

  // Ultra-lightweight render item - minimal JSX, no complex styling
  const renderItem = useCallback(({ item }: { item: Customer }) => (
    <TouchableOpacity
      style={styles.customerRow}
      onPress={() => onCustomerSelect(item)}
      activeOpacity={0.7}
    >
      <Text style={styles.customerName} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={styles.customerDetails} numberOfLines={1}>
        {item.phone} | {item.mobile}
      </Text>
    </TouchableOpacity>
  ), [onCustomerSelect]);

  // Key extractor for optimal FlatList performance
  const keyExtractor = useCallback((item: Customer) => item.id, []);

  // Empty state
  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        {loading ? 'Loading customers...' : 'No customers found'}
      </Text>
    </View>
  ), [loading]);

  return (
    <View style={styles.container}>
      {/* Simple search input */}
      <TextInput
        ref={searchInputRef}
        style={styles.searchInput}
        placeholder="Search customers..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
      
      {/* Loading indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}

      {/* Ultra-optimized FlatList */}
      <FlatList
        data={filteredCustomers}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListEmptyComponent={renderEmpty}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={20}
        getItemLayout={(data, index) => ({
          length: 60, // Fixed height for each item
          offset: 60 * index,
          index,
        })}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={styles.list}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  list: {
    flex: 1,
  },
  customerRow: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  customerDetails: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
});


