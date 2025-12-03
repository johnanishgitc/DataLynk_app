import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '../src/context/UserContext';
import { useConfiguration } from '../src/context/ConfigurationContext';
import { useSafeNavigation } from '../src/hooks/useSafeNavigation';
import { StandardHeader } from '../src/components/common';
import { OrderListReport, LedgerVoucherReport, LedgerItemSalesReport, LedgerReceivablesReport, SalesDataReport, ReportsMenu } from '../src/components/reports';
import { Colors } from '../src/constants/colors';
import { Spacing } from '../src/constants/spacing';

export default function ReportsPage() {
  const { selectedCompany } = useUser();
  const { hasModule, hasModuleFromRoles, backendConfig, rolesData } = useConfiguration();
  const { safePush } = useSafeNavigation();
  const [currentReport, setCurrentReport] = useState<'main' | 'orderList' | 'ledgerVoucher' | 'ledgerItemSales' | 'ledgerReceivables' | 'salesData'>('main');
  const [showMenu, setShowMenu] = useState(false);

  // Status bar is shown by default (like dashboard)
  
  // Debug log for modules from both sources
  console.log('📋 Reports Page - Backend Config:', {
    hasBackendConfig: !!backendConfig,
    modulesCount: backendConfig?.data?.modules?.length || 0,
    modules: backendConfig?.data?.modules?.map(m => ({
      module_name: m.module_name,
      is_enabled: m.is_enabled,
      display_name: m.module_display_name
    })) || [],
  });
  
  console.log('📋 Reports Page - Roles Data:', {
    hasRolesData: !!rolesData,
    modulesCount: rolesData?.data?.modules?.length || 0,
    modules: rolesData?.data?.modules?.map((m: any) => ({
      module_name: m.module_name,
      is_enabled: m.is_enabled,
      display_name: m.module_display_name
    })) || [],
  });
  
  // Debug log for specific module checks (using roles data)
  console.log('📋 Reports Page - Module Checks (from roles):', {
    place_order: hasModuleFromRoles('place_order'),
    ledger_voucher: hasModuleFromRoles('ledger_voucher'),
    bill_wise_report: hasModuleFromRoles('bill_wise_report'),
    ecommerce_place_order: hasModuleFromRoles('ecommerce_place_order')
  });
  
  // Debug: Check if we have stale cached data
  if (backendConfig?.data?.modules?.find((m: any) => m.module_name === 'bill_wise_report')) {
    console.log('⚠️ WARNING: bill_wise_report module found in backend config cache but should be disabled!');
    console.log('💡 This indicates cached data. The module should not be in the API response.');
  }
  
  if (rolesData?.data?.modules?.find((m: any) => m.module_name === 'bill_wise_report')) {
    console.log('⚠️ WARNING: bill_wise_report module found in roles data but should be disabled!');
    console.log('💡 This indicates the module is still enabled in the backend.');
  }

  // Show loading if no company is selected
  if (!selectedCompany) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleBack = useCallback(() => {
    if (currentReport !== 'main') {
      setCurrentReport('main');
    } else {
      safePush('/dashboard');
    }
  }, [currentReport, safePush]);

  const handleOrderList = useCallback(() => {
    setCurrentReport('orderList');
  }, []);

  const handleLedgerVoucher = useCallback(() => {
    setCurrentReport('ledgerVoucher');
  }, []);

  const handleLedgerItemSales = useCallback(() => {
    setCurrentReport('ledgerItemSales');
  }, []);

  const handleLedgerReceivables = useCallback(() => {
    setCurrentReport('ledgerReceivables');
  }, []);

  const handleSalesData = useCallback(() => {
    setCurrentReport('salesData');
  }, []);

  const handleVoucherReport = useCallback(() => {
    safePush('/voucher-report');
  }, [safePush]);


  // Handle menu toggle
  const handleMenuToggle = useCallback(() => {
    setShowMenu(!showMenu);
  }, [showMenu]);

  // Handle navigation
  const handleNavigation = useCallback((route: string) => {
    setShowMenu(false);
    if (route === 'dashboard') {
      safePush('/dashboard');
    } else if (route === 'order-entry') {
      safePush('/order-entry');
    } else if (route === 'reports') {
      // Already on reports page
      setShowMenu(false);
    } else if (route === 'configuration') {
      safePush('/configuration');
    } else if (route === 'company-selection') {
      safePush('/company-selection');
    } else if (route === 'logout') {
      // Handle logout - you may want to implement this
      safePush('/');
    }
  }, [safePush]);

  // Render different reports based on current state
  if (currentReport === 'orderList') {
    return <OrderListReport 
      onBack={handleBack} 
      companyName={selectedCompany?.company}
      tallylocId={selectedCompany?.tallyloc_id}
      guid={selectedCompany?.GUID}
    />;
  }

  if (currentReport === 'ledgerVoucher') {
    return <LedgerVoucherReport 
      companyName={selectedCompany?.company}
      tallylocId={selectedCompany?.tallyloc_id}
      guid={selectedCompany?.GUID}
    />;
  }

  if (currentReport === 'ledgerItemSales') {
    return <LedgerItemSalesReport 
      companyName={selectedCompany?.company}
      tallylocId={selectedCompany?.tallyloc_id}
      guid={selectedCompany?.GUID}
    />;
  }

  if (currentReport === 'ledgerReceivables') {
    return <LedgerReceivablesReport 
      companyName={selectedCompany?.company}
      tallylocId={selectedCompany?.tallyloc_id}
      guid={selectedCompany?.GUID}
    />;
  }

  if (currentReport === 'salesData') {
    return <SalesDataReport 
      companyName={selectedCompany?.company}
      tallylocId={selectedCompany?.tallyloc_id}
      guid={selectedCompany?.GUID}
    />;
  }


  // Main reports page
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {/* Header */}
        <StandardHeader 
          title="Reports" 
          onMenuPress={handleMenuToggle} 
          showMenuButton={true} 
        />

        {/* Reports Menu */}
        <ReportsMenu
          showMenu={showMenu}
          onClose={() => setShowMenu(false)}
          onNavigation={handleNavigation}
        />

        <ScrollView 
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Simple Action Buttons */}
            <View style={styles.buttonContainer}>
              {/* Order List - enabled if place_order module is present */}
              {hasModuleFromRoles('place_order') && (
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={handleOrderList}
                  activeOpacity={0.8}
                >
                  <Text style={styles.buttonText}>Order List</Text>
                </TouchableOpacity>
              )}

              {/* Ledger Voucher - enabled if ledger_voucher module is present */}
              {hasModuleFromRoles('ledger_voucher') && (
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={handleLedgerVoucher}
                  activeOpacity={0.8}
                >
                  <Text style={styles.buttonText}>Ledger Voucher</Text>
                </TouchableOpacity>
              )}

              {/* Ledger Item Sales - enabled if ledger_voucher module is present */}
              {hasModuleFromRoles('ledger_voucher') && (
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={handleLedgerItemSales}
                  activeOpacity={0.8}
                >
                  <Text style={styles.buttonText}>Ledger Item Sales</Text>
                </TouchableOpacity>
              )}

              {/* Ledger Receivables - enabled if bill_wise_report module is present */}
              {hasModuleFromRoles('bill_wise_report') && (
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={handleLedgerReceivables}
                  activeOpacity={0.8}
                >
                  <Text style={styles.buttonText}>Ledger Receivables</Text>
                </TouchableOpacity>
              )}

              {/* Sales Data - enabled if ledger_voucher module is present */}
              {hasModuleFromRoles('ledger_voucher') && (
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={handleSalesData}
                  activeOpacity={0.8}
                >
                  <Text style={styles.buttonText}>Sales Data</Text>
                </TouchableOpacity>
              )}

              {/* Voucher Report - enabled if ledger_voucher module is present */}
              {hasModuleFromRoles('ledger_voucher') && (
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={handleVoucherReport}
                  activeOpacity={0.8}
                >
                  <Text style={styles.buttonText}>Voucher Report</Text>
                </TouchableOpacity>
              )}

            </View>

            {/* Back Button */}
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={handleBack}
              activeOpacity={0.8}
            >
              <Text style={styles.backButtonText}>Back to Dashboard</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: Colors.text.secondary,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 0, // No bottom padding - content ends exactly at navigation bar
    flexGrow: 1, // Allow content to expand
  },
  content: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 20, // Only top padding for content spacing
    flex: 1,
    justifyContent: 'flex-start', // Align to top instead of center
    // NO paddingBottom - content should end exactly at navigation bar
  },
  
  buttonContainer: {
    marginBottom: 40,
  },
  
  actionButton: {
    backgroundColor: '#355F51',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  
  backButton: {
    backgroundColor: '#e2e8f0',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e0',
    marginBottom: 0, // No bottom margin - button ends exactly at navigation bar
  },
  
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4a5568',
  },
});
