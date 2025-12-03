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
import { StockItem } from '../../types/order';
import { getCustomerPriceForItem } from '../../utils/priceListManager';
import { useEffectiveConfig } from '../../hooks/useEffectiveConfig';
import { useBackendPermissions } from '../../hooks/useBackendPermissions';

interface LightweightItemListProps {
  items: StockItem[];
  selectedCustomer?: any;
  orderConfig?: any;
  onItemSelect: (item: StockItem) => void;
  loading?: boolean;
}

export const LightweightItemList: React.FC<LightweightItemListProps> = React.memo(({
  items,
  selectedCustomer,
  orderConfig,
  onItemSelect,
  loading = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);
  const permissions = useBackendPermissions();
  const effectiveConfig = useEffectiveConfig();

  // Focus the search input when the component mounts
  useEffect(() => {
    // Small delay to ensure the modal is fully rendered
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Simple, fast search filter
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    
    const query = searchQuery.toLowerCase().trim();
    return items.filter(item => 
      item.name.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  // Ultra-lightweight render item - minimal JSX, no complex styling
  const renderItem = useCallback(({ item }: { item: StockItem }) => {
    const priceResult = getCustomerPriceForItem(item, selectedCustomer, effectiveConfig?.usePriceLevels);
    
    return (
      <TouchableOpacity
        style={styles.itemRow}
        onPress={() => onItemSelect(item)}
        activeOpacity={0.7}
      >
        <Text style={styles.itemName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.itemDetails}>
          {permissions.showClsStckColumn 
            ? (permissions.showClsStckYesno 
                ? `Stock avlb: ${item.availableQty > 0 ? 'Yes' : 'No'}`
                : `Qty: ${item.availableQty}`)
            : ''
          }{permissions.showClsStckColumn && permissions.showRateAmtColumn ? ' | ' : ''}{permissions.showRateAmtColumn ? `Rate: ₹${priceResult.finalPrice}` : ''}
        </Text>
      </TouchableOpacity>
    );
  }, [onItemSelect, selectedCustomer, orderConfig]);

  // Key extractor for optimal FlatList performance
  const keyExtractor = useCallback((item: StockItem) => item.id, []);

  // Empty state
  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        {loading ? 'Loading items...' : 'No items found'}
      </Text>
    </View>
  ), [loading]);

  return (
    <View style={styles.container}>
      {/* Simple search input */}
      <TextInput
        ref={searchInputRef}
        style={styles.searchInput}
        placeholder="Search items..."
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
        data={filteredItems}
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


