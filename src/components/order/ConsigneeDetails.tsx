import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
} from 'react-native';

interface ConsigneeDetailsProps {
  consigneeName: string;
  consigneeAddress: string;
  consigneeState: string;
  consigneeCountry: string;
  consigneePincode: string;
  onConsigneeNameChange: (text: string) => void;
  onConsigneeAddressChange: (text: string) => void;
  onConsigneeStateChange: (text: string) => void;
  onConsigneeCountryChange: (text: string) => void;
  onConsigneePincodeChange: (text: string) => void;
}

export const ConsigneeDetails: React.FC<ConsigneeDetailsProps> = ({
  consigneeName,
  consigneeAddress,
  consigneeState,
  consigneeCountry,
  consigneePincode,
  onConsigneeNameChange,
  onConsigneeAddressChange,
  onConsigneeStateChange,
  onConsigneeCountryChange,
  onConsigneePincodeChange,
}) => {
  return (
    <View style={styles.section}>
      <View style={styles.consigneeInfo}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Name:</Text>
          <TextInput
            style={styles.input}
            value={consigneeName}
            onChangeText={onConsigneeNameChange}
            placeholder="Consignee name"
            placeholderTextColor="#999"
            autoComplete="off"
            autoCorrect={false}
            autoCapitalize="words"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Address:</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={consigneeAddress}
            onChangeText={onConsigneeAddressChange}
            placeholder="Consignee address"
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
            autoComplete="off"
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>State:</Text>
          <TextInput
            style={styles.input}
            value={consigneeState}
            onChangeText={onConsigneeStateChange}
            placeholder="State"
            placeholderTextColor="#999"
            autoComplete="off"
            autoCorrect={false}
            autoCapitalize="words"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Country:</Text>
          <TextInput
            style={styles.input}
            value={consigneeCountry}
            onChangeText={onConsigneeCountryChange}
            placeholder="Country"
            placeholderTextColor="#999"
            autoComplete="off"
            autoCorrect={false}
            autoCapitalize="words"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Pincode:</Text>
          <TextInput
            style={styles.input}
            value={consigneePincode}
            onChangeText={onConsigneePincodeChange}
            placeholder="Pincode"
            placeholderTextColor="#999"
            keyboardType="number-pad"
            autoComplete="off"
            autoCorrect={false}
            autoCapitalize="none"
            maxLength={10}
          />
        </View>
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
  consigneeInfo: {
    marginTop: 12,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginRight: 8,
    color: '#666',
    minWidth: 70,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 6,
    fontSize: 13,
    backgroundColor: 'white',
    color: '#333',
    textAlign: 'left',
  },
  textArea: {
    textAlignVertical: 'top',
    textAlign: 'left',
    height: 80,
  },
});

