import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

export interface CompanyHeaderProps {
  userName: string;
  onBack: () => void;
  onRefresh?: () => void;
}

const CompanyHeader: React.FC<CompanyHeaderProps> = memo(({
  userName,
  onBack,
  onRefresh,
}) => {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={[styles.iconButton, styles.backButton]} onPress={onBack} activeOpacity={0.8}>
        <Text style={[styles.buttonLabel, styles.backButtonLabel]}>≡</Text>
      </TouchableOpacity>
      <View style={styles.titleContainer}>
        <Text style={styles.userName}>{userName || 'User'}</Text>
      </View>
      {onRefresh && (
        <TouchableOpacity
          style={[styles.iconButton, styles.refreshButton]}
          onPress={onRefresh}
          activeOpacity={0.8}
        >
          <Text style={[styles.buttonLabel, styles.refreshButtonLabel]}>⟳</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    justifyContent: 'space-between',
  },
  titleContainer: {
    flex: 1,
    marginHorizontal: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  buttonLabel: {
    fontSize: 20,
    fontWeight: '600',
  },
  backButton: {
    borderColor: '#bfdbfe',
    backgroundColor: '#eef2ff',
  },
  backButtonLabel: {
    color: '#1d4ed8',
  },
  refreshButton: {
    borderColor: '#bbf7d0',
    backgroundColor: '#ecfdf5',
  },
  refreshButtonLabel: {
    color: '#0f9d58',
  },
});

CompanyHeader.displayName = 'CompanyHeader';

export default CompanyHeader;


