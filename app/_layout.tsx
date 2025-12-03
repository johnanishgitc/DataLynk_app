

import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { UserProvider } from '../src/context/UserContext';
import { MasterDataProvider } from '../src/context/MasterDataContext';
import { ConfigurationProvider } from '../src/context/ConfigurationContext';
import { ConnectionProvider } from '../src/context/ConnectionContext';
import { RolesProvider } from '../src/context/RolesContext';
import { salesDataService } from '../src/services/salesDataService';
import { voucherDataService } from '../src/services/voucherDataService';
import { companyDataService } from '../src/services/companyDataService';
import { permissionsDataService } from '../src/services/permissionsDataService';
import { BackgroundServiceProvider } from '../src/contexts/BackgroundServiceContext';
import { useNotificationHandler } from '../src/hooks/useNotificationHandler';

function AppNavigator() {
  useNotificationHandler();

  // Initialize SQLite services
  React.useEffect(() => {
    const initializeSQLite = async () => {
      try {
        await salesDataService.initialize();
        console.log('✅ SalesDataService initialized for offline data storage');
        
        await voucherDataService.initialize();
        console.log('✅ VoucherDataService initialized for offline data storage');
        
        await companyDataService.initialize();
        console.log('✅ CompanyDataService initialized for offline data storage');
        
        await permissionsDataService.initialize();
        console.log('✅ PermissionsDataService initialized for offline data storage');
      } catch (error) {
        console.error('❌ Failed to initialize SQLite services:', error);
      }
    };

    initializeSQLite();
  }, []);

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="signup" options={{ headerShown: false }} />
      <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
      <Stack.Screen name="reset-password" options={{ headerShown: false }} />
      <Stack.Screen name="company-selection" options={{ headerShown: false }} />
      <Stack.Screen name="dashboard" options={{ headerShown: false }} />
      <Stack.Screen name="create-customer" options={{ headerShown: false }} />
      <Stack.Screen name="salesperson-routes" options={{ headerShown: false }} />
      <Stack.Screen name="order-entry" options={{ headerShown: false }} />
      <Stack.Screen name="customer-details" options={{ headerShown: false }} />
      <Stack.Screen name="item-details" options={{ headerShown: false }} />
      <Stack.Screen name="configuration" options={{ headerShown: false }} />
      <Stack.Screen name="reports" options={{ headerShown: false }} />
      <Stack.Screen name="voucher-report" options={{ headerShown: false }} />
      <Stack.Screen name="voucher-drilldown" options={{ headerShown: false }} />
      <Stack.Screen name="ledger-receivables" options={{ headerShown: false }} />
      <Stack.Screen name="reports/ledger-outstandings-detail" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <UserProvider>
      <ConnectionProvider>
        <MasterDataProvider>
          <ConfigurationProvider>
            <RolesProvider>
              <BackgroundServiceProvider>
                <AppNavigator />
                <StatusBar style="auto" />
              </BackgroundServiceProvider>
            </RolesProvider>
          </ConfigurationProvider>
        </MasterDataProvider>
      </ConnectionProvider>
    </UserProvider>
  );
}
