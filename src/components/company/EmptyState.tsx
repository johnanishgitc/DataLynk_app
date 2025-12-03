import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

export interface EmptyStateProps {
  searchText: string;
  onRetry: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = memo(({
  searchText,
  onRetry,
}) => {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>
        {searchText.trim() ? 'No matching companies found' : 'No companies found'}
      </Text>
      <Text style={styles.emptyStateSubtext}>
        {searchText.trim() 
          ? 'Try adjusting your search terms'
          : 'You don\'t have access to any companies yet.'
        }
      </Text>
      {!searchText.trim() && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

EmptyState.displayName = 'EmptyState';

export default EmptyState;


