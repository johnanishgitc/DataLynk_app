import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import { VoucherType } from '../../types/order';

interface VoucherTypeListProps {
  voucherTypes: VoucherType[];
  selectedVoucherType: VoucherType | null;
  onVoucherTypeSelect: (voucherType: VoucherType) => void;
  onClose: () => void;
}

export const VoucherTypeList: React.FC<VoucherTypeListProps> = ({
  voucherTypes,
  selectedVoucherType,
  onVoucherTypeSelect,
  onClose,
}) => {
  const handleVoucherTypeSelect = (voucherType: VoucherType) => {
    onVoucherTypeSelect(voucherType);
    onClose();
  };

  const renderVoucherType = ({ item }: { item: VoucherType }) => (
    <TouchableOpacity
      style={[
        styles.voucherTypeItem,
        selectedVoucherType?.id === item.id && styles.selectedVoucherTypeItem,
      ]}
      onPress={() => handleVoucherTypeSelect(item)}
    >
      <Text
        style={[
          styles.voucherTypeText,
          selectedVoucherType?.id === item.id && styles.selectedVoucherTypeText,
        ]}
      >
        {item.name}
      </Text>
      {selectedVoucherType?.id === item.id && (
        <Text style={styles.checkmark}>✓</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Select Voucher Type</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={voucherTypes}
        keyExtractor={(item) => item.id}
        renderItem={renderVoucherType}
        style={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
    fontWeight: '600',
  },
  list: {
    maxHeight: 400,
  },
  voucherTypeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  selectedVoucherTypeItem: {
    backgroundColor: '#E3F2FD',
  },
  voucherTypeText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  selectedVoucherTypeText: {
    color: '#1976D2',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 16,
    color: '#1976D2',
    fontWeight: '600',
  },
});
