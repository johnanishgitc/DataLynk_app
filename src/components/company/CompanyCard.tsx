import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { UserConnection } from '../../config/api';
import { useConnection } from '../../context/ConnectionContext';

export interface CompanyCardProps {
  company: UserConnection;
  isSelecting: boolean;
  onPress: (company: UserConnection) => void;
  onPressIn: () => void;
}

const CompanyCard: React.FC<CompanyCardProps> = memo(({
  company,
  isSelecting,
  onPress,
  onPressIn,
}) => {
  const { isOffline } = useConnection();
  
  // Check both global offline status and individual company status
  const isCompanyOffline = isOffline || company.status === 'offline' || company.status === 'Offline';
  
  console.log('🔍 CompanyCard status check:', {
    company: company.company,
    globalOffline: isOffline,
    companyStatus: company.status,
    isCompanyOffline
  });
  
  return (
    <TouchableOpacity
      style={[styles.companyCard, isSelecting && styles.companyCardDisabled]}
      onPressIn={onPressIn}
      onPress={() => onPress(company)}
      disabled={isSelecting}
      activeOpacity={0.7}
    >
      <View style={styles.companyInfo}>
        <Text style={styles.companyName}>{company.company || company.conn_name || 'Unknown Company'}</Text>
        {company.company && company.conn_name && company.company !== company.conn_name && (
          <Text style={styles.connectionName}>{company.conn_name}</Text>
        )}
        <Text style={styles.companyEmail}>{company.shared_email}</Text>
        <View style={styles.accessTypeContainer}>
          <Text style={styles.accessTypeLabel}>Access:</Text>
          <Text style={styles.accessTypeValue}>{company.access_type}</Text>
        </View>
        
        {/* Status Indicator */}
        <View style={styles.statusContainer}>
          <View style={[styles.statusIndicator, isCompanyOffline ? styles.statusOffline : styles.statusOnline]}>
            <Text style={styles.statusText}>
              {isCompanyOffline ? '🔴 Offline' : '🟢 Online'}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.selectButton}>
        <Text style={styles.selectButtonText}>Select</Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  companyCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  companyCardDisabled: {
    opacity: 0.6,
    backgroundColor: '#f0f0f0',
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  connectionName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  companyEmail: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 8,
  },
  accessTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accessTypeLabel: {
    fontSize: 12,
    color: '#999',
    marginRight: 5,
  },
  accessTypeValue: {
    fontSize: 12,
    color: '#28a745',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  selectButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  selectButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  statusContainer: {
    marginTop: 8,
    alignItems: 'flex-start',
  },
  statusIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusOnline: {
    backgroundColor: '#d4edda',
  },
  statusOffline: {
    backgroundColor: '#f8d7da',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

CompanyCard.displayName = 'CompanyCard';

export default CompanyCard;


