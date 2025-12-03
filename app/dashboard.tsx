import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
// Removed direct router import - using useDashboard hook instead
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '../src/context/UserContext';
import { useMasterData } from '../src/context/MasterDataContext';
// useMasterDataLoader is only used in company-selection.tsx
import { useDashboard } from '../src/hooks/useDashboard';
import { DashboardMenu } from '../src/components/dashboard';
import { StandardHeader } from '../src/components/common';
import { Colors } from '../src/constants/colors';
import { Spacing } from '../src/constants/spacing';
import { apiService } from '../src/services/api';



export default function DashboardPage() {
  const { selectedCompany } = useUser();
  const { isMasterDataLoading, isMasterDataReady, items } = useMasterData();
  // Master data loading is handled in company-selection.tsx
  const {
    showMenu,
    handleLogout,
    handleOrderEntry,
    handleMenuPress,
    handleNavigation,
    closeMenu,
    isLoggingOut,
  } = useDashboard();
  
  // State for permissions
  const [hasVoucherAuthorization, setHasVoucherAuthorization] = useState(false);
  const [hasOrderEntry, setHasOrderEntry] = useState(false);
  const [hasReports, setHasReports] = useState(false);
  const [isCheckingPermission, setIsCheckingPermission] = useState(true);
  
  // Check for permissions when company is selected
  useEffect(() => {
    const checkPermissions = async () => {
      if (!selectedCompany?.tallyloc_id || !selectedCompany?.GUID) {
        setHasVoucherAuthorization(false);
        setHasOrderEntry(false);
        setHasReports(false);
        setIsCheckingPermission(false);
        return;
      }
      
      try {
        setIsCheckingPermission(true);
        console.log('🔍 Checking user permissions...');
        const response = await apiService.getUserWiseCoWiseRoles(
          selectedCompany.tallyloc_id.toString(),
          selectedCompany.GUID
        );
        
        if (response.success && response.data) {
          // The API service returns: { success: true, data: <full JSON response> }
          // The full JSON response is: { success: true, data: { modules: [...] } }
          // So we need: response.data.data.modules
          let modules: any[] = [];
          
          console.log('📋 API Response data type:', typeof response.data);
          console.log('📋 Checking response.data structure:', {
            hasData: !!(response.data && response.data.data),
            hasModules: !!(response.data?.data && response.data.data.modules),
            modulesIsArray: Array.isArray(response.data?.data?.modules),
            modulesLength: response.data?.data?.modules?.length || 0
          });
          
          // Extract modules from response.data.data.modules (nested data structure)
          if (response.data && typeof response.data === 'object') {
            // Check nested data structure first
            if (response.data.data && typeof response.data.data === 'object' && response.data.data.modules) {
              if (Array.isArray(response.data.data.modules)) {
                modules = response.data.data.modules;
              }
            } 
            // Fallback: check if modules is directly in response.data
            else if (response.data.modules && Array.isArray(response.data.modules)) {
              modules = response.data.modules;
            }
            // Fallback: check if response.data itself is an array
            else if (Array.isArray(response.data)) {
              modules = response.data;
            }
          }
          
          // Ensure modules is always an array
          if (!Array.isArray(modules)) {
            console.log('⚠️ Modules is not an array, defaulting to empty array');
            modules = [];
          }
          
          // Check if any module has module_name === "voucher_authorization"
          const hasVoucherAuthModule = modules.some((module: any) => {
            const hasModule = module && typeof module === 'object' && module.module_name === 'voucher_authorization';
            if (hasModule) {
              console.log('✅ Found voucher_authorization module:', module);
            }
            return hasModule;
          });
          
          // Check if any module has module_name === "order_entry" or "place_order"
          // Note: The API uses "place_order" but we check for both for compatibility
          const hasOrderEntryModule = modules.some((module: any) => {
            if (module && typeof module === 'object' && module.module_name) {
              const hasModule = module.module_name === 'order_entry' || module.module_name === 'place_order';
              if (hasModule) {
                console.log('✅ Found order entry module:', module.module_name, module);
              }
              return hasModule;
            }
            return false;
          });
          
          // Check if any report-related module exists
          // Reports are available if any of these modules exist:
          // - place_order (for Order List report)
          // - ledger_voucher (for Ledger Voucher, Ledger Item Sales, Sales Data, Voucher Report)
          // - bill_wise_report (for Ledger Receivables)
          const reportModuleNames = ['place_order', 'ledger_voucher', 'bill_wise_report'];
          const hasReportsModule = modules.some((module: any) => {
            if (module && typeof module === 'object' && module.module_name) {
              const hasReportModule = reportModuleNames.includes(module.module_name);
              if (hasReportModule) {
                console.log('✅ Found report module:', module.module_name);
              }
              return hasReportModule;
            }
            return false;
          });
          
          console.log('📋 Permission check results:', {
            hasVoucherAuth: hasVoucherAuthModule,
            hasOrderEntry: hasOrderEntryModule,
            hasReports: hasReportsModule,
            modulesCount: modules.length,
            moduleNames: modules.map((m: any) => {
              if (m && typeof m === 'object') {
                return m.module_name || 'no-module-name';
              }
              return 'invalid-module';
            })
          });
          
          setHasVoucherAuthorization(hasVoucherAuthModule);
          setHasOrderEntry(hasOrderEntryModule);
          setHasReports(hasReportsModule);
        } else {
          console.log('⚠️ Failed to get user access permissions:', {
            success: response.success,
            hasData: !!response.data
          });
          setHasVoucherAuthorization(false);
          setHasOrderEntry(false);
          setHasReports(false);
        }
      } catch (error) {
        console.error('❌ Error checking permissions:', error);
        setHasVoucherAuthorization(false);
        setHasOrderEntry(false);
        setHasReports(false);
      } finally {
        setIsCheckingPermission(false);
      }
    };
    
    checkPermissions();
  }, [selectedCompany?.tallyloc_id, selectedCompany?.GUID]);
  
  // Show loading if no company is selected
  if (!selectedCompany) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  // Check if company is offline (no GUID or status is offline)
  const isOfflineCompany = !selectedCompany.GUID || selectedCompany.GUID.trim() === '' || selectedCompany.status === 'offline' || selectedCompany.status === 'Offline';

  // Only show dashboard when master data is completely ready
  // EXCEPTION: Allow offline companies to render even without master data
  // The loading screen is handled in company-selection.tsx
  if (!isMasterDataReady && !isOfflineCompany) {
    return null; // Don't show anything, let company-selection handle the loading
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      {/* Header */}
      <StandardHeader 
        title="Dashboard" 
        onMenuPress={handleMenuPress} 
        showMenuButton={true} 
      />

      {/* Options Menu */}
      <DashboardMenu 
        showMenu={showMenu}
        onClose={closeMenu}
        onNavigation={handleNavigation}
      />

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.buttonContainer}>
            {hasOrderEntry && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleOrderEntry}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>Order Entry</Text>
              </TouchableOpacity>
            )}

            {hasReports && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleNavigation('reports')}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>Reports</Text>
              </TouchableOpacity>
            )}

            {hasVoucherAuthorization && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  console.log('📋 [Dashboard] Navigating to authorize-vouchers');
                  handleNavigation('authorize-vouchers');
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>Authorize Vouchers</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleNavigation('configuration')}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Configuration</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleNavigation('create-customer')}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Create Customer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleNavigation('salesperson-routes')}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Sales Person Routes</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
            disabled={isLoggingOut}
          >
            <Text style={styles.logoutButtonText}>
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </Text>
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
  loadingSubtext: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 8,
  },
  scrollContent: {
    flex: 1,
  },
  content: {
    padding: Spacing.screenPadding,
    flex: 1,
    justifyContent: 'center',
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
  
  logoutButton: {
    backgroundColor: '#e2e8f0',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e0',
  },
  
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4a5568',
  },
});
