import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
  ScrollView,
} from 'react-native';

export interface DashboardMenuProps {
  showMenu: boolean;
  onClose: () => void;
  onNavigation: (route: string) => void;
}

interface MenuEntry {
  route: string;
  label: string;
  description: string;
  icon: string;
  destructive?: boolean;
}

const dashboardMenuItems: MenuEntry[] = [
  {
    route: 'dashboard',
    label: 'Dashboard',
    description: 'Jump back to the main overview and quick actions.',
    icon: '📊',
  },
  {
    route: 'company-selection',
    label: 'Companies',
    description: 'Switch between authorised Tally companies.',
    icon: '🏢',
  },
  {
    route: 'configuration',
    label: 'Configuration',
    description: 'Adjust automation rules and device preferences.',
    icon: '⚙️',
  },
  {
    route: 'create-customer',
    label: 'Create Customer',
    description: 'Add a new customer with address, tax and bank details.',
    icon: '➕',
  },
  {
    route: 'salesperson-routes',
    label: 'Sales Person Routes',
    description: 'Review assigned customer routes and capture visit proof.',
    icon: '🗺️',
  },
  {
    route: 'logout',
    label: 'Logoff',
    description: 'Sign out from TallyCatalyst on this device.',
    icon: '🚪',
    destructive: true,
  },
];

const DashboardMenu: React.FC<DashboardMenuProps> = memo(
  ({ showMenu, onClose, onNavigation }) => (
    <Modal
      visible={showMenu}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.menuBackdrop}>
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={onClose}
        />
      </View>

      <View style={styles.menuOverlay}>
        <View style={styles.menuHeader}>
          <View>
            <Text style={styles.menuTitle}>Quick Navigation</Text>
            <Text style={styles.menuSubtitle}>
              Choose a destination to move around the dashboard.
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.menuList}
          showsVerticalScrollIndicator={false}
        >
          {dashboardMenuItems.map((item) => (
            <TouchableOpacity
              key={item.route}
              style={[
                styles.menuItem,
                item.destructive && styles.menuItemDestructive,
              ]}
              onPress={() => onNavigation(item.route)}
              activeOpacity={0.85}
            >
              <View style={styles.menuIconWrap}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
              </View>
              <View style={styles.menuTextBlock}>
                <Text
                  style={[
                    styles.menuLabel,
                    item.destructive && styles.menuLabelDestructive,
                  ]}
                >
                  {item.label}
                </Text>
                <Text style={styles.menuDescription}>{item.description}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  )
);

const styles = StyleSheet.create({
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  backdropTouchable: {
    flex: 1,
  },
  menuOverlay: {
    marginTop: Platform.OS === 'ios' ? 90 : 70,
    marginHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 16px 32px rgba(15, 23, 42, 0.24)',
        }
      : {
          shadowColor: '#0f172a',
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.14,
          shadowRadius: 16,
          elevation: 12,
        }),
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  menuSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#475569',
    maxWidth: 260,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#0f172a',
    fontWeight: '600',
  },
  menuList: {
    paddingBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
    marginBottom: 8,
  },
  menuItemDestructive: {
    backgroundColor: '#fef2f2',
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuIcon: {
    fontSize: 20,
  },
  menuTextBlock: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  menuLabelDestructive: {
    color: '#b91c1c',
  },
  menuDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: '#475569',
  },
});

DashboardMenu.displayName = 'DashboardMenu';

export default DashboardMenu;

