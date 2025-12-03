import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

export interface TallyListItem {
  id: string;
  name: string;
  [key: string]: any; // Allow additional properties
}

interface TallyDataListProps {
  data: TallyListItem[];
  loading?: boolean;
  onItemPress: (item: TallyListItem) => void;
  renderItem?: (item: TallyListItem) => React.ReactElement;
  keyExtractor?: (item: TallyListItem, index: number) => string;
  emptyMessage?: string;
  loadingMessage?: string;
  style?: any;
  contentContainerStyle?: any;
  showsVerticalScrollIndicator?: boolean;
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
  ListFooterComponent?: React.ComponentType<any> | React.ReactElement | null;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export const TallyDataList: React.FC<TallyDataListProps> = ({
  data,
  loading = false,
  onItemPress,
  renderItem,
  keyExtractor = (item) => item.id,
  emptyMessage = 'No data available',
  loadingMessage = 'Loading...',
  style,
  contentContainerStyle,
  showsVerticalScrollIndicator = false,
  ListHeaderComponent,
  ListFooterComponent,
  onRefresh,
  refreshing = false,
}) => {
  // Default render function for list items
  const defaultRenderItem = ({ item }: { item: TallyListItem }) => (
    <TouchableOpacity
      style={styles.defaultItem}
      onPress={() => onItemPress(item)}
      activeOpacity={0.7}
    >
      <Text style={styles.defaultItemText}>{item.name}</Text>
    </TouchableOpacity>
  );

  // Loading state
  if (loading) {
    return (
      <View style={[styles.loadingContainer, style]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>{loadingMessage}</Text>
      </View>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <View style={[styles.emptyContainer, style]}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={data}
      renderItem={renderItem || defaultRenderItem}
      keyExtractor={keyExtractor}
      style={[styles.list, style]}
      contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
      onRefresh={onRefresh}
      refreshing={refreshing}
      removeClippedSubviews={false}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={10}
    />
  );
};

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  defaultItem: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: 'white',
  },
  defaultItemText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
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
  },
});

