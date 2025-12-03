import React, { useCallback, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Customer } from '../../types/order';
import { useDebounce } from '../../hooks/useDebounce';

interface CustomerListProps {
  customers: Customer[];
  onCustomerSelect: (customer: Customer) => void;
  onClose: () => void;
  isLoading?: boolean;
}

// Memoized customer row component for optimal performance
const CustomerRow = React.memo(({ 
  customer, 
  onSelect,
  searchQuery
}: { 
  customer: Customer; 
  onSelect: (customer: Customer) => void;
  searchQuery: string;
}) => {
  // Highlight search query in customer name
  const highlightedName = useMemo(() => {
    if (!searchQuery.trim()) return customer.name;
    
    const regex = new RegExp(`(${searchQuery})`, 'gi');
    const parts = customer.name.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <Text key={index} style={styles.highlightedText}>
          {part}
        </Text>
      ) : (
        <Text key={index}>{part}</Text>
      )
    );
  }, [customer.name, searchQuery]);

  // Get primary contact info
  const primaryContact = useMemo(() => {
    return customer.mobile || customer.phone || customer.email || 'No contact info';
  }, [customer.mobile, customer.phone, customer.email]);

  // Get contact type for icon
  const contactType = useMemo(() => {
    if (customer.mobile || customer.phone) return '📱';
    if (customer.email) return '✉️';
    return 'ℹ️';
  }, [customer.mobile, customer.phone, customer.email]);

  return (
    <TouchableOpacity
      style={styles.dropdownItem}
      onPress={() => onSelect(customer)}
      activeOpacity={0.7}
    >
      <View style={styles.dropdownItemContent}>
        <View style={styles.customerInfoContainer}>
          <Text style={styles.customerName} numberOfLines={2}>
            {highlightedName}
          </Text>
          <View style={styles.contactRow}>
            <Text style={styles.contactIcon}>{contactType}</Text>
            <Text style={styles.contactInfo} numberOfLines={1}>
              {primaryContact}
            </Text>
          </View>
          {customer.priceLevel && (
            <View style={styles.priceLevelContainer}>
              <Text style={styles.priceLevelLabel}>Price Level:</Text>
              <Text style={styles.priceLevelValue}>{customer.priceLevel}</Text>
            </View>
          )}
        </View>
        <View style={styles.customerActions}>
          <Text style={styles.selectText}>Select</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

export const CustomerList: React.FC<CustomerListProps> = ({
  customers,
  onCustomerSelect,
  onClose,
  isLoading = false
}) => {
  const [searchText, setSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const searchInputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);
  
  // Debounced search for better performance
  const debouncedSearchText = useDebounce(searchText, 300);
  
  // Enhanced filtering with fuzzy search and multiple criteria
  const filteredCustomers = useMemo(() => {
    if (!debouncedSearchText.trim()) return customers;
    
    const query = debouncedSearchText.toLowerCase().trim();
    const words = query.split(' ').filter(word => word.length > 0);
    
    return customers.filter(customer => {
      const customerName = customer.name.toLowerCase();
      const customerPhone = (customer.phone || '').toLowerCase();
      const customerMobile = (customer.mobile || '').toLowerCase();
      const customerEmail = (customer.email || '').toLowerCase();
      const customerAddress = (customer.address || '').toLowerCase();
      const customerGSTIN = (customer.gstin || '').toLowerCase();
      const customerContact = (customer.contact || '').toLowerCase();
      const customerPriceLevel = (customer.priceLevel || '').toLowerCase();
      
      // Check if all search words are found in any of the searchable fields
      return words.every(word => 
        customerName.includes(word) || 
        customerPhone.includes(word) || 
        customerMobile.includes(word) || 
        customerEmail.includes(word) || 
        customerAddress.includes(word) || 
        customerGSTIN.includes(word) || 
        customerContact.includes(word) || 
        customerPriceLevel.includes(word)
      );
    });
  }, [customers, debouncedSearchText]);

  // Pagination with optimized batch size
  const CUSTOMERS_PER_PAGE = 80; // Optimized for customer lists
  const { displayedCustomers, hasMoreCustomers } = useMemo(() => {
    const startIndex = (currentPage - 1) * CUSTOMERS_PER_PAGE;
    const endIndex = startIndex + CUSTOMERS_PER_PAGE;
    const customersToShow = filteredCustomers.slice(startIndex, endIndex);
    
    return {
      displayedCustomers: customersToShow,
      hasMoreCustomers: endIndex < filteredCustomers.length
    };
  }, [filteredCustomers, currentPage, CUSTOMERS_PER_PAGE]);

  // Load more customers with performance optimization
  const loadMoreCustomers = useCallback(() => {
    if (hasMoreCustomers && !loadingMore) {
      setLoadingMore(true);
      // Use requestAnimationFrame for smoother performance
      requestAnimationFrame(() => {
        setCurrentPage(prev => prev + 1);
        setLoadingMore(false);
      });
    }
  }, [hasMoreCustomers, loadingMore]);

  // Optimized scroll handler
  const handleScroll = useCallback((event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 80; // Optimized padding for customer lists
    
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
      loadMoreCustomers();
    }
  }, [loadMoreCustomers]);

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

  // Optimized customer selection
  const handleCustomerSelect = useCallback((customer: Customer) => {
    onCustomerSelect(customer);
  }, [onCustomerSelect]);

  // Memoized key extractor for better performance
  const keyExtractor = useCallback((customer: Customer) => customer.id, []);

  // Memoized render item for better performance
  const renderItem = useCallback(({ item: customer }: { item: Customer }) => (
    <CustomerRow
      customer={customer}
      onSelect={handleCustomerSelect}
      searchQuery={debouncedSearchText}
    />
  ), [handleCustomerSelect, debouncedSearchText]);

  // Memoized footer component
  const ListFooterComponent = useCallback(() => (
    <>
      {loadingMore && (
        <View style={styles.loadingMoreContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingMoreText}>Loading more customers...</Text>
        </View>
      )}
      
      {!hasMoreCustomers && displayedCustomers.length > 0 && (
        <View style={styles.endOfList}>
          <Text style={styles.endOfListText}>
            Showing {displayedCustomers.length} of {filteredCustomers.length} customers
          </Text>
        </View>
      )}
    </>
  ), [loadingMore, hasMoreCustomers, displayedCustomers.length, filteredCustomers.length]);

  // Memoized empty component
  const ListEmptyComponent = useCallback(() => (
    <View style={styles.emptyContainer}>
      {isLoading ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : searchText.trim() ? (
        <Text style={styles.emptyText}>
          No customers found matching "{searchText}"
        </Text>
      ) : (
        <Text style={styles.emptyText}>No customers available</Text>
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
          placeholder="Search customers by name, phone, email, address, GSTIN..."
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
            Found {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''} 
            {filteredCustomers.length !== customers.length && ` out of ${customers.length} total`}
          </Text>
        </View>
      )}

      {/* Customers List */}
      <FlatList
        ref={flatListRef}
        data={displayedCustomers}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        onEndReached={loadMoreCustomers}
        onEndReachedThreshold={0.2}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        removeClippedSubviews={true}
        maxToRenderPerBatch={12}
        windowSize={6}
        initialNumToRender={25}
        updateCellsBatchingPeriod={50}
        getItemLayout={(data, index) => ({
          length: 90, // Optimized height for customer items
          offset: 90 * index,
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
    backgroundColor: '#e8f5e8',
    borderBottomWidth: 1,
    borderBottomColor: '#c8e6c9',
  },
  searchInfoText: {
    fontSize: 12,
    color: '#2e7d32',
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
  customerInfoContainer: {
    flex: 1,
    marginRight: 12,
  },
  customerName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 4,
  },
  highlightedText: {
    backgroundColor: '#fff3cd',
    fontWeight: 'bold',
    color: '#856404',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  contactInfo: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  priceLevelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceLevelLabel: {
    fontSize: 11,
    color: '#888',
    marginRight: 4,
  },
  priceLevelValue: {
    fontSize: 11,
    color: '#007AFF',
    fontWeight: '500',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  customerActions: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  selectText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
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


