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

// Generic interface for any list item
interface ListItem {
  id?: string; // Make id optional
  [key: string]: any; // Allow any additional properties
}

// Props for the reusable lightweight list
interface LightweightListProps<T extends ListItem> {
  data: T[];
  onItemSelect: (item: T) => void;
  loading?: boolean;
  searchPlaceholder?: string;
  searchFields?: (keyof T)[];
  renderItem: (item: T, onPress: () => void) => React.ReactElement;
  emptyMessage?: string;
  loadingMessage?: string;
  itemHeight?: number;
  maxToRenderPerBatch?: number;
  windowSize?: number;
  initialNumToRender?: number;
}

export function LightweightList<T extends ListItem>({
  data,
  onItemSelect,
  loading = false,
  searchPlaceholder = "Search...",
  searchFields = [],
  renderItem,
  emptyMessage = "No items found",
  loadingMessage = "Loading...",
  itemHeight = 60,
  maxToRenderPerBatch = 10,
  windowSize = 10,
  initialNumToRender = 20,
}: LightweightListProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);

  // Auto-focus search input when component mounts
  useEffect(() => {
    if (searchFields.length > 0) {
      // Small delay to ensure the modal is fully rendered
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [searchFields.length]);



  // Smart search filter that works with any search fields
  const filteredData = useMemo(() => {
    if (!searchQuery.trim() || searchFields.length === 0) return data;
    
    const query = searchQuery.toLowerCase().trim();
    return data.filter(item => 
      searchFields.some(field => {
        const value = item[field];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(query);
        }
        if (typeof value === 'number') {
          return value.toString().includes(query);
        }
        return false;
      })
    );
  }, [data, searchQuery, searchFields]);

  // Handle item selection
  const handleItemPress = useCallback((item: T) => {
    if (typeof onItemSelect === 'function') {
      onItemSelect(item);
    }
  }, [onItemSelect]);

  // Render item with custom renderer
  const renderListItem = useCallback(({ item, index }: { item: T; index: number }) => {
    // Use the same key generation logic as keyExtractor
    let key: string;
    if (item.id) key = `${item.id}-${index}`;
    else if ('tallyloc_id' in item && 'company' in item && 'guid' in item) {
      key = `tally-${item.tallyloc_id}-${item.company}-${item.guid}-${index}`;
    }
    else if ('tallyloc_id' in item && 'company' in item) {
      key = `tally-${item.tallyloc_id}-${item.company}-${index}`;
    }
    else if ('tallyloc_id' in item) key = `tally-${item.tallyloc_id}-${index}`;
    else if ('guid' in item) key = `guid-${item.guid}-${index}`;
    else if ('company' in item) key = `company-${item.company}-${index}`;
    else if ('name' in item) key = `name-${item.name}-${index}`;
    else key = `item-${index}`;
    
    return (
      <View key={key}>
        {renderItem(item, () => handleItemPress(item))}
      </View>
    );
  }, [renderItem, handleItemPress]);

  // Key extractor for optimal FlatList performance
  const keyExtractor = useCallback((item: T, index: number) => {
    // Try to find a unique identifier from common fields
    if (item.id) return `${item.id}-${index}`;
    
    // For UserConnection items, combine multiple fields for maximum uniqueness
    if ('tallyloc_id' in item && 'company' in item && 'guid' in item) {
      return `tally-${item.tallyloc_id}-${item.company}-${item.guid}-${index}`;
    }
    if ('tallyloc_id' in item && 'company' in item) {
      return `tally-${item.tallyloc_id}-${item.company}-${index}`;
    }
    if ('tallyloc_id' in item) return `tally-${item.tallyloc_id}-${index}`;
    
    if ('guid' in item) return `guid-${item.guid}-${index}`;
    if ('company' in item) return `company-${item.company}-${index}`;
    if ('name' in item) return `name-${item.name}-${index}`;
    
    // Fallback to index if no unique identifier found
    return `item-${index}`;
  }, []);

  // Empty state
  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        {loading ? loadingMessage : emptyMessage}
      </Text>
    </View>
  ), [loading, loadingMessage, emptyMessage]);

  // Get item layout for fixed height optimization
  const getItemLayout = useCallback((data: ArrayLike<T> | null | undefined, index: number) => ({
    length: itemHeight,
    offset: itemHeight * index,
    index,
  }), [itemHeight]);

  return (
    <View style={styles.container}>
      {/* Search input - only show if search fields are provided */}
      {searchFields.length > 0 && (
        <TextInput
          ref={searchInputRef}
          style={styles.searchInput}
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      )}
      
      {/* Loading indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingText}>{loadingMessage}</Text>
        </View>
      )}

      {/* Ultra-optimized FlatList */}
      <FlatList
        data={filteredData}
        renderItem={renderListItem}
        keyExtractor={keyExtractor}
        ListEmptyComponent={renderEmpty}
        removeClippedSubviews={true}
        maxToRenderPerBatch={maxToRenderPerBatch}
        windowSize={windowSize}
        initialNumToRender={initialNumToRender}
        getItemLayout={getItemLayout}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={styles.list}
      />
    </View>
  );
}

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
