import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useUser } from '../src/context/UserContext';
import { useDashboard } from '../src/hooks/useDashboard';
import { DashboardMenu } from '../src/components/dashboard';
import { StandardHeader } from '../src/components/common';
import { Button, Card } from '../src/components/common';
import { Colors } from '../src/constants/colors';
import { Spacing } from '../src/constants/spacing';

export default function DashboardPage() {
  const { selectedCompany } = useUser();
  const {
    showMenu,
    handleLogout,
    handleOrderEntry,
    handleMenuPress,
    handleNavigation,
    closeMenu,
    isLoggingOut,
  } = useDashboard();
  
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

  // Memoized action buttons to prevent recreation
  const actionButtons = useMemo(() => [
    { 
      text: '📊 View Reports', 
      onPress: () => router.push('/reports'),
      variant: 'secondary' as const
    },
    { 
      text: '⚙️ Configuration', 
      onPress: () => router.push('/configuration'),
      variant: 'secondary' as const
    },
  ], []);

  return (
    <View style={styles.container}>
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
          {/* Dashboard Content */}
          <View style={styles.dashboardContent}>
            
            {/* Order Entry - Primary Action */}
            <Card style={styles.primaryActionCard} padding="large">
              <Button
                title="📋 Order Entry"
                onPress={handleOrderEntry}
                variant="primary"
                size="large"
                fullWidth
                style={styles.primaryActionButton}
              />
            </Card>
            
            {/* Action Buttons */}
            {actionButtons.map((button, index) => (
              <Card key={index} style={styles.actionCard} padding="medium">
                <Button
                  title={button.text}
                  onPress={button.onPress}
                  variant={button.variant}
                  size="medium"
                  fullWidth
                />
              </Card>
            ))}
          </View>

          {/* Logout Button */}
          <Card style={styles.logoutCard} padding="medium">
            <Button
              title={isLoggingOut ? 'Logging out...' : 'Logout'}
              onPress={handleLogout}
              variant="danger"
              size="medium"
              fullWidth
              disabled={isLoggingOut}
              loading={isLoggingOut}
            />
          </Card>
        </View>
      </ScrollView>
    </View>
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
  content: {
    padding: Spacing.screenPadding,
  },
  dashboardContent: {
    marginBottom: Spacing.xl,
  },
  primaryActionCard: {
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  primaryActionButton: {
    marginBottom: Spacing.sm,
  },
  primaryActionSubtext: {
    color: Colors.text.secondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  actionCard: {
    marginBottom: Spacing.md,
  },
  logoutCard: {
    marginTop: Spacing.lg,
  },
});

