import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  DashboardMenu,
  CreateCustomerForm,
  CreateCustomerFormValues,
  CreateCustomerSubmitResult,
} from '../src/components/dashboard';
import { StandardHeader } from '../src/components/common';
import { Colors } from '../src/constants/colors';
import { useUser } from '../src/context/UserContext';
import { useDashboard } from '../src/hooks/useDashboard';
import { apiService, CreateCustomerRequest } from '../src/services/api';

export default function CreateCustomerPage() {
  const { selectedCompany } = useUser();
  const {
    showMenu,
    handleMenuPress,
    handleNavigation,
    closeMenu,
  } = useDashboard();

  const handleCreateCustomer = useCallback(
    async (formValues: CreateCustomerFormValues): Promise<CreateCustomerSubmitResult> => {
      if (!selectedCompany) {
        return {
          success: false,
          message: 'Select a company before creating a customer.',
        };
      }

      if (!selectedCompany.tallyloc_id || !selectedCompany.GUID) {
        return {
          success: false,
          message: 'Company context is missing required identifiers.',
        };
      }

      const payload: CreateCustomerRequest = {
        tallyloc_id: selectedCompany.tallyloc_id,
        company: selectedCompany.company,
        guid: selectedCompany.GUID,
        customer_name: formValues.name,
        contact_person: formValues.contactPerson,
        mobile_number: formValues.mobileNumber,
        gst_number: formValues.gstNumber || undefined,
        pan_number: formValues.panNumber || undefined,
        address: formValues.address || undefined,
        state: formValues.state || undefined,
        country: formValues.country || undefined,
        pincode: formValues.pincode || undefined,
        bank_name: formValues.bankName || undefined,
        bank_account_number: formValues.bankAccountNumber || undefined,
        ifsc_code: formValues.ifscCode || undefined,
        latitude: formValues.latitude,
        longitude: formValues.longitude,
      };

      try {
        const response = await apiService.createCustomer(payload);
        if (response.success) {
          return {
            success: true,
            message: response.message || 'Customer created successfully.',
          };
        }
        return {
          success: false,
          message: response.message || 'Failed to create customer.',
        };
      } catch (error: any) {
        console.error('❌ Error creating customer:', error);
        return {
          success: false,
          message:
            typeof error?.message === 'string'
              ? error.message
              : 'Unable to create customer. Please try again.',
        };
      }
    },
    [selectedCompany]
  );

  if (!selectedCompany) {
    return (
      <SafeAreaView style={styles.container}>
        <StandardHeader
          title="Create Customer"
          onMenuPress={handleMenuPress}
          showMenuButton={true}
        />
        <DashboardMenu showMenu={showMenu} onClose={closeMenu} onNavigation={handleNavigation} />
        <View style={styles.placeholder} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StandardHeader
        title="Create Customer"
        onMenuPress={handleMenuPress}
        showMenuButton={true}
      />

      <DashboardMenu showMenu={showMenu} onClose={closeMenu} onNavigation={handleNavigation} />

      <View style={styles.formWrapper}>
        <CreateCustomerForm onSubmit={handleCreateCustomer} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  placeholder: {
    flex: 1,
  },
  formWrapper: {
    flex: 1,
  },
});


