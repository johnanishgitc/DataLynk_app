import React, { useCallback, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { StockItem } from '../../types/order';
import { useDebounce } from '../../hooks/useDebounce';
import { getCustomerPriceForItem } from '../../utils/priceListManager';
import { useEffectiveConfig } from '../../hooks/useEffectiveConfig';
import { useBackendPermissions } from '../../hooks/useBackendPermissions';

interface ItemListProps {
  items: StockItem[];
  selectedCustomer: any;
  orderConfig: any;
  onItemSelect: (item: StockItem) => void;
  onClose: () => void;
  isLoading?: boolean;
}

// Memoized item row component for optimal performance
const ItemRow = React.memo(({ 
  item, 
  onSelect, 
  selectedCustomer, 
  orderConfig,
  searchQuery,
  permissions
}: { 
  item: StockItem; 
  onSelect: (item: StockItem) => void;
  selectedCustomer: any;
  orderConfig: any;
  searchQuery: string;
  permissions: any;
}) => {
  // Determine the price to display based on price levels
  const displayPrice = useMemo(() => {
    const priceResult = getCustomerPriceForItem(item, selectedCustomer, effectiveConfig.usePriceLevels);
    return priceResult.finalPrice;
  }, [item, selectedCustomer, effectiveConfig.usePriceLevels]);

  // Highlight search query in item name
  const highlightedName = useMemo(() => {
    if (!searchQuery.trim()) return item.name;
    
    const regex = new RegExp(`(${searchQuery})`, 'gi');
    const parts = item.name.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <Text key={index} style={styles.highlightedText}>
          {part}
        </Text>
      ) : (
        <Text key={index}>{part}</Text>
      )
    );
  }, [item.name, searchQuery]);

  return (
    <TouchableOpacity
      style={styles.dropdownItem}
      onPress={() => onSelect(item)}
      activeOpacity={0.7}
    >
      <View style={styles.dropdownItemContent}>
        <View style={styles.itemNameContainer}>
          <Text style={styles.dropdownItemText} numberOfLines={2}>
            {highlightedName}
          </Text>
        </View>
        <View style={styles.itemDetailsContainer}>
          {permissions.showClsStckColumn && (
            <Text style={styles.dropdownItemQty}>
              {permissions.showClsStckYesno 
                ? `Stock avlb: ${item.availableQty > 0 ? 'Yes' : 'No'}`
                : `Qty: ${item.availableQty}`
              }
            </Text>
          )}
          {permissions.showRateAmtColumn && (
            <View style={styles.priceContainer}>
              <Text style={styles.dropdownItemPrice}>
                ₹{displayPrice.toFixed(2)}
              </Text>
              {effectiveConfig.usePriceLevels && selectedCustomer?.priceLevel && (
                <Text style={styles.priceLevelIndicator}>
                  {selectedCustomer.priceLevel}
                </Text>
              )}
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

export const ItemList: React.FC<ItemListProps> = ({
  items,
  selectedCustomer,
  orderConfig,
  onItemSelect,
  onClose,
  isLoading = false
}) => {
  const [searchText, setSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const effectiveConfig = useEffectiveConfig();
  const permissions = useBackendPermissions();
  
  const searchInputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);
  
  // Debounced search for better performance
  const debouncedSearchText = useDebounce(searchText, 300);
  
  // Enhanced filtering with fuzzy search and multiple criteria
  const filteredItems = useMemo(() => {
    if (!debouncedSearchText.trim()) return items;
    
    const query = debouncedSearchText.toLowerCase().trim();
    const words = query.split(' ').filter(word => word.length > 0);
    
    return items.filter(item => {
      const itemName = item.name.toLowerCase();
      const itemRate = item.rate.toString();
      const itemQty = item.availableQty.toString();
      
      // Check if all search words are found in any of the searchable fields
      return words.every(word => 
        itemName.includes(word) || 
        itemRate.includes(word) || 
        itemQty.includes(word)
      );
    });
  }, [items, debouncedSearchText]);

  // Pagination with optimized batch size
  const ITEMS_PER_PAGE = 100; // Reduced for better performance
  const { displayedItems, hasMoreItems } = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const itemsToShow = filteredItems.slice(startIndex, endIndex);
    
    return {
      displayedItems: itemsToShow,
      hasMoreItems: endIndex < filteredItems.length
    };
  }, [filteredItems, currentPage, ITEMS_PER_PAGE]);

  // Load more items with performance optimization
  const loadMoreItems = useCallback(() => {
    if (hasMoreItems && !loadingMore) {
      setLoadingMore(true);
      // Use requestAnimationFrame for smoother performance
      requestAnimationFrame(() => {
        setCurrentPage(prev => prev + 1);
        setLoadingMore(false);
      });
    }
  }, [hasMoreItems, loadingMore]);

  // Optimized scroll handler
  const handleScroll = useCallback((event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 100; // Increased padding for earlier loading
    
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
      loadMoreItems();
    }
  }, [loadMoreItems]);

  // Reset pagination when search changes
  const handleSearchChange = useCallback((text: string) => {
    setSearchText(text);
    setCurrentPage(1);
    // Scroll to top when search changes
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  // Clear search and reset
  const handleClearSearch = useCallback(() => {
    setSearchText('');
    setCurrentPage(1);
    searchInputRef.current?.focus();
  }, []);

  // Optimized item selection
  const handleItemSelect = useCallback((item: StockItem) => {
    onItemSelect(item);
  }, [onItemSelect]);

  // Memoized key extractor for better performance
  const keyExtractor = useCallback((item: StockItem) => item.id, []);

  // Memoized render item for better performance
  const renderItem = useCallback(({ item }: { item: StockItem }) => (
    <ItemRow
      item={item}
      onSelect={handleItemSelect}
      selectedCustomer={selectedCustomer}
      orderConfig={effectiveConfig}
      searchQuery={debouncedSearchText}
      permissions={permissions}
    />
  ), [handleItemSelect, selectedCustomer, effectiveConfig, debouncedSearchText, permissions]);

  // Memoized footer component
  const ListFooterComponent = useCallback(() => (
    <>
      {loadingMore && (
        <View style={styles.loadingMoreContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingMoreText}>Loading more items...</Text>
        </View>
      )}
      
      {!hasMoreItems && displayedItems.length > 0 && (
        <View style={styles.endOfList}>
          <Text style={styles.endOfListText}>
            Showing {displayedItems.length} of {filteredItems.length} items
          </Text>
        </View>
      )}
    </>
  ), [loadingMore, hasMoreItems, displayedItems.length, filteredItems.length]);

  // Memoized empty component
  const ListEmptyComponent = useCallback(() => (
    <View style={styles.emptyContainer}>
      {isLoading ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : searchText.trim() ? (
        <Text style={styles.emptyText}>
          No items found matching "{searchText}"
        </Text>
      ) : (
        <Text style={styles.emptyText}>No items available</Text>
      )}
    </View>
  ), [isLoading, searchText]);

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <TextInput
          ref={searchInputRef}
          style={styles.searchInput}
          value={searchText}
          onChangeText={handleSearchChange}
          placeholder="Search items by name, rate, or quantity..."
          placeholderTextColor="#999"
          autoFocus={true}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoComplete="off"
          spellCheck={false}
          textContentType="none"
        />
        
        {searchText.length > 0 && (
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={handleClearSearch}
          >
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search Results Info */}
      {searchText.trim() && (
        <View style={styles.searchInfo}>
          <Text style={styles.searchInfoText}>
            Found {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} 
            {filteredItems.length !== items.length && ` out of ${items.length} total`}
          </Text>
        </View>
      )}

      {/* Items List */}
      <FlatList
        ref={flatListRef}
        data={displayedItems}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        onEndReached={loadMoreItems}
        onEndReachedThreshold={0.2}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        removeClippedSubviews={true}
        maxToRenderPerBatch={15}
        windowSize={8}
        initialNumToRender={30}
        updateCellsBatchingPeriod={50}
        getItemLayout={(data, index) => ({
          length: 70, // Optimized height for each item
          offset: 70 * index,
          index,
        })}
        ListFooterComponent={ListFooterComponent}
        ListEmptyComponent={ListEmptyComponent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        alwaysBounceVertical={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: 'white',
    color: '#333',
  },
  clearButton: {
    marginLeft: 8,
    padding: 8,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: 'bold',
  },
  searchInfo: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#e3f2fd',
    borderBottomWidth: 1,
    borderBottomColor: '#bbdefb',
  },
  searchInfoText: {
    fontSize: 12,
    color: '#1976d2',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  listContent: {
    flexGrow: 1,
  },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: 'white',
    backfaceVisibility: 'hidden',
  },
  dropdownItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemNameContainer: {
    flex: 1,
    marginRight: 12,
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    lineHeight: 20,
  },
  highlightedText: {
    backgroundColor: '#fff3cd',
    fontWeight: 'bold',
    color: '#856404',
  },
  itemDetailsContainer: {
    alignItems: 'flex-end',
  },
  dropdownItemQty: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  dropdownItemPrice: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '600',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceLevelIndicator: {
    fontSize: 10,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 2,
  },
  loadingMoreContainer: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingMoreText: {
    marginTop: 8,
    color: '#666',
    fontSize: 14,
  },
  endOfList: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  endOfListText: {
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});


