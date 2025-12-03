import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
} from 'react-native';
import { useBackendPermissions } from '../../hooks/useBackendPermissions';

interface CustomerDetailsProps {
  customerContact: string;
  customerPhone: string;
  customerMobile: string;
  customerEmail: string;
  customerAddress: string;
  customerPincode: string;
  customerState: string;
  customerCountry: string;
  customerGSTIN: string;
  customerPaymentTerms: string;
  customerDeliveryTerms: string;
  customerNarration: string;
  orderDueDate: string;
  onCustomerContactChange: (text: string) => void;
  onCustomerPhoneChange: (text: string) => void;
  onCustomerMobileChange: (text: string) => void;
  onCustomerEmailChange: (text: string) => void;
  onCustomerAddressChange: (text: string) => void;
  onCustomerPincodeChange: (text: string) => void;
  onCustomerStateChange: (text: string) => void;
  onCustomerCountryChange: (text: string) => void;
  onCustomerGSTINChange: (text: string) => void;
  onCustomerPaymentTermsChange: (text: string) => void;
  onCustomerDeliveryTermsChange: (text: string) => void;
  onCustomerNarrationChange: (text: string) => void;
  onOrderDueDateChange: (text: string) => void;
}

export const CustomerDetails: React.FC<CustomerDetailsProps> = ({
  customerContact,
  customerPhone,
  customerMobile,
  customerEmail,
  customerAddress,
  customerPincode,
  customerState,
  customerCountry,
  customerGSTIN,
  customerPaymentTerms,
  customerDeliveryTerms,
  customerNarration,
  orderDueDate,
  onCustomerContactChange,
  onCustomerPhoneChange,
  onCustomerMobileChange,
  onCustomerEmailChange,
  onCustomerAddressChange,
  onCustomerPincodeChange,
  onCustomerStateChange,
  onCustomerCountryChange,
  onCustomerGSTINChange,
  onCustomerPaymentTermsChange,
  onCustomerDeliveryTermsChange,
  onCustomerNarrationChange,
  onOrderDueDateChange,
}) => {
  // Get backend permissions
  const permissions = useBackendPermissions();
  return (
    <View style={styles.section}>
      <View style={styles.customerInfo}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Contact:</Text>
          <TextInput
            style={styles.input}
            value={customerContact}
            onChangeText={onCustomerContactChange}
            placeholder="Contact person"
            placeholderTextColor="#999"
            autoComplete="off"
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Phone:</Text>
          <TextInput
            style={styles.input}
            value={customerPhone}
            onChangeText={onCustomerPhoneChange}
            placeholder="Phone number"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
            autoComplete="off"
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Mobile:</Text>
          <TextInput
            style={styles.input}
            value={customerMobile}
            onChangeText={onCustomerMobileChange}
            placeholder="Mobile number"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
            autoComplete="off"
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Email:</Text>
          <TextInput
            style={styles.input}
            value={customerEmail}
            onChangeText={onCustomerEmailChange}
            placeholder="Email address"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoComplete="off"
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>GSTIN:</Text>
          <TextInput
            style={styles.input}
            value={customerGSTIN}
            onChangeText={onCustomerGSTINChange}
            placeholder="GSTIN number"
            placeholderTextColor="#999"
            autoComplete="off"
            autoCorrect={false}
            autoCapitalize="characters"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Address:</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={customerAddress}
            onChangeText={onCustomerAddressChange}
            placeholder="Customer address"
            placeholderTextColor="#999"
            multiline
            numberOfLines={2}
            autoComplete="off"
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Pincode:</Text>
          <TextInput
            style={styles.input}
            value={customerPincode}
            onChangeText={onCustomerPincodeChange}
            placeholder="Pincode"
            placeholderTextColor="#999"
            keyboardType="number-pad"
            autoComplete="off"
            autoCorrect={false}
            autoCapitalize="none"
            maxLength={10}
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>State:</Text>
          <TextInput
            style={styles.input}
            value={customerState}
            onChangeText={onCustomerStateChange}
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
            value={customerCountry}
            onChangeText={onCustomerCountryChange}
            placeholder="Country"
            placeholderTextColor="#999"
            autoComplete="off"
            autoCorrect={false}
            autoCapitalize="words"
          />
        </View>
        
        {permissions.showPayTerms && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Pymt terms:</Text>
            <TextInput
              style={styles.input}
              value={customerPaymentTerms}
              onChangeText={onCustomerPaymentTermsChange}
              placeholder="Mode/Terms of payment"
              placeholderTextColor="#999"
              autoComplete="off"
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>
        )}
        
        {permissions.showDelvTerms && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Delivery:</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={customerDeliveryTerms}
              onChangeText={onCustomerDeliveryTermsChange}
              placeholder="Terms of delivery (max 100 chars)"
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
              maxLength={100}
              autoComplete="off"
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>
        )}
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Narration:</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={customerNarration}
            onChangeText={onCustomerNarrationChange}
            placeholder="Additional notes or narration"
            placeholderTextColor="#999"
            multiline
            numberOfLines={2}
            autoComplete="off"
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
        
        {permissions.showOrdDueDate && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Order Due Date:</Text>
            <TextInput
              style={styles.input}
              value={orderDueDate}
              onChangeText={onOrderDueDateChange}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#999"
              autoComplete="off"
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>
        )}
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
  customerInfo: {
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
    minWidth: 50,
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
    height: 60,
  },
});


