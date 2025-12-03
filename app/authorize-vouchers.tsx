import React, { useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, TouchableOpacity, Text } from 'react-native';
import { StandardHeader } from '../src/components/common';
import { AuthorizeVouchers } from '../src/components/reports/AuthorizeVouchers';
import { ReportsMenu } from '../src/components/reports';
import { PeriodSelector } from '../src/components/analytics/PeriodSelector';
import { useSafeNavigation } from '../src/hooks/useSafeNavigation';
import { Stack } from 'expo-router';

export default function AuthorizeVouchersPage() {
  const { safePush } = useSafeNavigation();
  const [showMenu, setShowMenu] = useState(false);
  
  // Period state
  const getToday = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  };
  const [startDate, setStartDate] = useState(getToday());
  const [endDate, setEndDate] = useState(new Date());
  const [showPeriodModal, setShowPeriodModal] = useState(false);

  const handleMenuToggle = useCallback(() => {
    setShowMenu(!showMenu);
  }, [showMenu]);

  const handleNavigation = useCallback((route: string) => {
    setShowMenu(false);
    if (route === 'dashboard') {
      safePush('/dashboard');
    } else if (route === 'reports') {
      safePush('/reports');
    } else if (route === 'order-entry') {
      safePush('/order-entry');
    } else if (route === 'configuration') {
      safePush('/configuration');
    }
  }, [safePush]);

  const handlePeriodChange = useCallback(() => {
    console.log('📅 [AuthVouchers] Period change requested');
    setShowPeriodModal(true);
  }, []);


  const handlePeriodApply = useCallback((startDateStr: string, endDateStr: string) => {
    const newStartDate = new Date(startDateStr);
    const newEndDate = new Date(endDateStr);
    
    setStartDate(newStartDate);
    setEndDate(newEndDate);
    setShowPeriodModal(false);
  }, []);

  const formatDateForPeriodSelector = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: false 
        }} 
      />
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StandardHeader 
          title="Authorize Vouchers" 
          onMenuPress={handleMenuToggle}
          showMenuButton={true}
        />
        
        <ReportsMenu
          showMenu={showMenu}
          onClose={() => setShowMenu(false)}
          onNavigation={handleNavigation}
        />
        
        <AuthorizeVouchers 
          startDate={startDate}
          endDate={endDate}
          onPeriodChange={handlePeriodChange}
        />
      </SafeAreaView>

      {/* Period Selection Modal */}
      <PeriodSelector
        visible={showPeriodModal}
        onClose={() => setShowPeriodModal(false)}
        onApplyPeriod={handlePeriodApply}
        currentStartDate={formatDateForPeriodSelector(startDate)}
        currentEndDate={formatDateForPeriodSelector(endDate)}
      />

    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
});

