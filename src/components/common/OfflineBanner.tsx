import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface OfflineBannerProps {
  lastSyncDate?: string;
  showLastSync?: boolean;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ 
  lastSyncDate, 
  showLastSync = true 
}) => {
  const formatLastSync = (dateString?: string): string => {
    if (!dateString) return 'Unknown';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffDays > 0) {
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      } else if (diffHours > 0) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      } else {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return diffMinutes > 0 ? `${diffMinutes} minutes ago` : 'Just now';
      }
    } catch (error) {
      return 'Unknown';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>📱</Text>
        <View style={styles.textContainer}>
          <Text style={styles.title}>You're offline</Text>
          <Text style={styles.subtitle}>
            Using cached data{showLastSync && lastSyncDate ? ` from ${formatLastSync(lastSyncDate)}` : ''}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 16,
    marginRight: 8,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#6c757d',
  },
});