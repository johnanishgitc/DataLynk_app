import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OrderHeader } from '../src/components/order/OrderHeader';
import { CustomerDetails } from '../src/components/order/CustomerDetails';
import { ConsigneeDetails } from '../src/components/order/ConsigneeDetails';

export default function CustomerDetailsPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Get initial values from params
  const initialContact = (params.contact as string) || '';
  const initialPhone = (params.phone as string) || '';
  const initialMobile = (params.mobile as string) || '';
  const initialEmail = (params.email as string) || '';
  const initialAddress = (params.address as string) || '';
  const initialPincode = (params.pincode as string) || '';
  const initialState = (params.state as string) || '';
  const initialCountry = (params.country as string) || '';
  const initialGSTIN = (params.gstin as string) || '';
  const initialPaymentTerms = (params.paymentTerms as string) || '';
  const initialDeliveryTerms = (params.deliveryTerms as string) || '';
  const initialNarration = (params.narration as string) || '';
  const initialOrderDueDate = (params.orderDueDate as string) || '';
  
  // Consignee initial values
  const initialConsigneeName = (params.consigneeName as string) || '';
  const initialConsigneeAddress = (params.consigneeAddress as string) || '';
  const initialConsigneeState = (params.consigneeState as string) || '';
  const initialConsigneeCountry = (params.consigneeCountry as string) || '';
  const initialConsigneePincode = (params.consigneePincode as string) || '';
  
  // State for form data
  const [customerContact, setCustomerContact] = useState(initialContact);
  const [customerPhone, setCustomerPhone] = useState(initialPhone);
  const [customerMobile, setCustomerMobile] = useState(initialMobile);
  const [customerEmail, setCustomerEmail] = useState(initialEmail);
  const [customerAddress, setCustomerAddress] = useState(initialAddress);
  const [customerPincode, setCustomerPincode] = useState(initialPincode);
  const [customerState, setCustomerState] = useState(initialState);
  const [customerCountry, setCustomerCountry] = useState(initialCountry);
  const [customerGSTIN, setCustomerGSTIN] = useState(initialGSTIN);
  const [customerPaymentTerms, setCustomerPaymentTerms] = useState(initialPaymentTerms);
  const [customerDeliveryTerms, setCustomerDeliveryTerms] = useState(initialDeliveryTerms);
  const [customerNarration, setCustomerNarration] = useState(initialNarration);
  const [orderDueDate, setOrderDueDate] = useState(initialOrderDueDate);
  
  // Consignee state
  const [consigneeName, setConsigneeName] = useState(initialConsigneeName);
  const [consigneeAddress, setConsigneeAddress] = useState(initialConsigneeAddress);
  const [consigneeState, setConsigneeState] = useState(initialConsigneeState);
  const [consigneeCountry, setConsigneeCountry] = useState(initialConsigneeCountry);
  const [consigneePincode, setConsigneePincode] = useState(initialConsigneePincode);
  
  // State for hamburger menu
  const [showMenu, setShowMenu] = useState(false);
  
  // State for active tab
  const [activeTab, setActiveTab] = useState<'customer' | 'consignee'>('customer');
  
  // Check if there are any changes
  const hasChanges = 
    customerContact !== initialContact ||
    customerPhone !== initialPhone ||
    customerMobile !== initialMobile ||
    customerEmail !== initialEmail ||
    customerAddress !== initialAddress ||
    customerPincode !== initialPincode ||
    customerState !== initialState ||
    customerCountry !== initialCountry ||
    customerGSTIN !== initialGSTIN ||
    customerPaymentTerms !== initialPaymentTerms ||
    customerDeliveryTerms !== initialDeliveryTerms ||
    customerNarration !== initialNarration ||
    orderDueDate !== initialOrderDueDate ||
    consigneeName !== initialConsigneeName ||
    consigneeAddress !== initialConsigneeAddress ||
    consigneeState !== initialConsigneeState ||
    consigneeCountry !== initialConsigneeCountry ||
    consigneePincode !== initialConsigneePincode;

  // Handle hamburger menu
  const handleMenuPress = () => {
    setShowMenu(!showMenu);
  };

  const handleNavigationWithMenu = (route: string) => {
    setShowMenu(false);
    if (route === 'logout') {
      // Use proper logout function instead of direct navigation
      clearUserData();
    } else if (route) {
      router.push(`/${route}`);
    }
  };

  const handleSave = () => {
    // Store the updated customer details in a temporary location
    // We'll use AsyncStorage to pass data between screens
    const storeCustomerDetails = async () => {
      try {
        const customerDetails = {
          contact: customerContact,
          phone: customerPhone,
          mobile: customerMobile,
          email: customerEmail,
          address: customerAddress,
          pincode: customerPincode,
          state: customerState,
          country: customerCountry,
          gstin: customerGSTIN,
          paymentTerms: customerPaymentTerms,
          deliveryTerms: customerDeliveryTerms,
          narration: customerNarration,
          orderDueDate: orderDueDate,
          consigneeName: consigneeName,
          consigneeAddress: consigneeAddress,
          consigneeState: consigneeState,
          consigneeCountry: consigneeCountry,
          consigneePincode: consigneePincode,
          timestamp: Date.now()
        };
        
        await AsyncStorage.setItem('temp_customer_details', JSON.stringify(customerDetails));
        
        // Navigate back to the existing order entry screen
        router.back();
      } catch (error) {
        console.error('Error storing customer details:', error);
        router.back();
      }
    };
    
    storeCustomerDetails();
  };

  const handleCancel = () => {
    if (hasChanges) {
      Alert.alert(
        'Discard Changes',
        'You have unsaved changes. Are you sure you want to go back?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => router.back() }
        ]
      );
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <OrderHeader
        showMenu={showMenu}
        onMenuPress={handleMenuPress}
        onNavigation={handleNavigationWithMenu}
        selectedCompany={null}
      />
      
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'customer' && styles.activeTab]}
          onPress={() => setActiveTab('customer')}
        >
          <Text style={[styles.tabText, activeTab === 'customer' && styles.activeTabText]}>
            Customer Details
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'consignee' && styles.activeTab]}
          onPress={() => setActiveTab('consignee')}
        >
          <Text style={[styles.tabText, activeTab === 'consignee' && styles.activeTabText]}>
            Consignee Details
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'customer' ? (
          <CustomerDetails
            customerContact={customerContact}
            customerPhone={customerPhone}
            customerMobile={customerMobile}
            customerEmail={customerEmail}
            customerAddress={customerAddress}
            customerPincode={customerPincode}
            customerState={customerState}
            customerCountry={customerCountry}
            customerGSTIN={customerGSTIN}
            customerPaymentTerms={customerPaymentTerms}
            customerDeliveryTerms={customerDeliveryTerms}
            customerNarration={customerNarration}
            orderDueDate={orderDueDate}
            onCustomerContactChange={setCustomerContact}
            onCustomerPhoneChange={setCustomerPhone}
            onCustomerMobileChange={setCustomerMobile}
            onCustomerEmailChange={setCustomerEmail}
            onCustomerAddressChange={setCustomerAddress}
            onCustomerPincodeChange={setCustomerPincode}
            onCustomerStateChange={setCustomerState}
            onCustomerCountryChange={setCustomerCountry}
            onCustomerGSTINChange={setCustomerGSTIN}
            onCustomerPaymentTermsChange={setCustomerPaymentTerms}
            onCustomerDeliveryTermsChange={setCustomerDeliveryTerms}
            onCustomerNarrationChange={setCustomerNarration}
            onOrderDueDateChange={setOrderDueDate}
          />
        ) : (
          <ConsigneeDetails
            consigneeName={consigneeName}
            consigneeAddress={consigneeAddress}
            consigneeState={consigneeState}
            consigneeCountry={consigneeCountry}
            consigneePincode={consigneePincode}
            onConsigneeNameChange={setConsigneeName}
            onConsigneeAddressChange={setConsigneeAddress}
            onConsigneeStateChange={setConsigneeState}
            onConsigneeCountryChange={setConsigneeCountry}
            onConsigneePincodeChange={setConsigneePincode}
          />
        )}
      </ScrollView>

      {/* Fixed Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={handleCancel}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.saveButton, !hasChanges && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!hasChanges}
        >
          <Text style={[styles.saveButtonText, !hasChanges && styles.saveButtonTextDisabled]}>
            Save Changes
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  actionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  saveButtonTextDisabled: {
    color: '#999',
  },
});
