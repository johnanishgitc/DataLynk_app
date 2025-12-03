import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useMasterData } from '../../context/MasterDataContext';

interface MasterDataLoaderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const MasterDataLoader: React.FC<MasterDataLoaderProps> = ({ 
  children, 
  fallback 
}) => {
  const { isMasterDataLoading, isMasterDataReady, masterDataProgress } = useMasterData();

  // If master data is ready, render children
  if (isMasterDataReady) {
    return <>{children}</>;
  }

  // If master data is loading, show loading screen
  if (isMasterDataLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.title}>Loading Master Data</Text>
          <Text style={styles.subtitle}>Please wait while we prepare your data...</Text>
          
          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${masterDataProgress.totalProgress}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {masterDataProgress.totalProgress}% Complete
            </Text>
          </View>

          {/* Status Indicators */}
          <View style={styles.statusContainer}>
            <View style={styles.statusItem}>
              <View style={[
                styles.statusDot, 
                { backgroundColor: masterDataProgress.itemsLoaded ? '#4CAF50' : '#FF9800' }
              ]} />
              <Text style={styles.statusText}>
                {masterDataProgress.itemsLoaded ? 'Items Loaded' : 'Loading Items...'}
              </Text>
            </View>
            
            <View style={styles.statusItem}>
              <View style={[
                styles.statusDot, 
                { backgroundColor: masterDataProgress.customersLoaded ? '#4CAF50' : '#FF9800' }
              ]} />
              <Text style={styles.statusText}>
                {masterDataProgress.customersLoaded ? 'Customers Loaded' : 'Loading Customers...'}
              </Text>
            </View>
          </View>

          <Text style={styles.note}>
            This may take a few moments for large datasets
          </Text>
        </View>
      </View>
    );
  }

  // If not loading and not ready, show fallback or default message
  return fallback ? (
    <>{fallback}</>
  ) : (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>No Data Available</Text>
        <Text style={styles.subtitle}>Please select a company to continue</Text>
      </View>
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: width * 0.8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 30,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  statusContainer: {
    width: '100%',
    marginBottom: 20,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  statusText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  note: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
