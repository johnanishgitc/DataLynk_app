import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
} from 'react-native';

interface OrderDetailsProps {
  orderDueDate: string;
  showOrderDueDate: boolean;
  onOrderDueDateChange: (text: string) => void;
}

export const OrderDetails: React.FC<OrderDetailsProps> = ({
  orderDueDate,
  showOrderDueDate,
  onOrderDueDateChange,
}) => {
  if (!showOrderDueDate) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Order Details</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Order Due Date:</Text>
        <TextInput
          style={[styles.input, styles.dateInput]}
          value={orderDueDate}
          onChangeText={onOrderDueDateChange}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#999"
          autoComplete="off"
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 12,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 6,
    fontSize: 13,
    backgroundColor: 'white',
    color: '#333',
    textAlign: 'center',
  },
  dateInput: {
    textAlign: 'center',
    fontSize: 14,
  },
});


