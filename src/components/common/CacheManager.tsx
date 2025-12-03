import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useEnhancedSalesDataCache } from '../../context/EnhancedSalesDataCacheContext';

interface CacheManagerProps {
  companyGuid: string;
}

export const CacheManager: React.FC<CacheManagerProps> = ({ companyGuid }) => {
  const { 
    getCacheStats, 
    clearCache, 
    clearAllCache, 
    isDataStale,
    isLoading,
    cacheError 
  } = useEnhancedSalesDataCache();
  
  const [stats, setStats] = useState<{
    totalCompanies: number;
    totalSize: number;
    oldestCache: number | null;
    newestCache: number | null;
  } | null>(null);
  
  const [isStale, setIsStale] = useState<boolean>(false);

  useEffect(() => {
    loadStats();
    checkStaleData();
  }, [companyGuid]);

  const loadStats = async () => {
    try {
      const cacheStats = await getCacheStats();
      setStats(cacheStats);
    } catch (error) {
      console.error('❌ Failed to load cache stats:', error);
    }
  };

  const checkStaleData = async () => {
    try {
      const stale = await isDataStale(companyGuid, 24); // 24 hours
      setIsStale(stale);
    } catch (error) {
      console.error('❌ Failed to check if data is stale:', error);
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'Are you sure you want to clear the cache for this company? This will require re-downloading data.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: async () => {
            try {
              await clearCache(companyGuid);
              await loadStats();
              Alert.alert('Success', 'Cache cleared successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cache');
            }
          }
        }
      ]
    );
  };

  const handleClearAllCache = () => {
    Alert.alert(
      'Clear All Cache',
      'Are you sure you want to clear all cached data? This will require re-downloading data for all companies.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllCache();
              await loadStats();
              Alert.alert('Success', 'All cache cleared successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear all cache');
            }
          }
        }
      ]
    );
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number | null): string => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading cache information...</Text>
      </View>
    );
  }

  if (cacheError) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Cache Error: {cacheError}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cache Manager</Text>
      
      {isStale && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>⚠️ Data is stale (older than 24 hours)</Text>
        </View>
      )}
      
      {stats && (
        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>Cache Statistics</Text>
          <Text style={styles.statsText}>Companies: {stats.totalCompanies}</Text>
          <Text style={styles.statsText}>Total Size: {formatBytes(stats.totalSize)}</Text>
          <Text style={styles.statsText}>Oldest: {formatDate(stats.oldestCache)}</Text>
          <Text style={styles.statsText}>Newest: {formatDate(stats.newestCache)}</Text>
        </View>
      )}
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.clearButton]} 
          onPress={handleClearCache}
        >
          <Text style={styles.buttonText}>Clear This Company</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.clearAllButton]} 
          onPress={handleClearAllCache}
        >
          <Text style={styles.buttonText}>Clear All Cache</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    margin: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#dc3545',
    textAlign: 'center',
  },
  warningContainer: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  warningText: {
    color: '#856404',
    fontWeight: '500',
  },
  statsContainer: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  statsText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#ffc107',
  },
  clearAllButton: {
    backgroundColor: '#dc3545',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});






