import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';

export interface ReportsMenuProps {
  showMenu: boolean;
  onClose: () => void;
  onNavigation: (route: string) => void;
}

const ReportsMenu: React.FC<ReportsMenuProps> = memo(({
  showMenu,
  onClose,
  onNavigation,
}) => {
  if (!showMenu) return null;

  const menuItems = [
    { route: 'dashboard', text: '📊 Dashboard', icon: '📊' },
    { route: 'order-entry', text: '📋 Order Entry', icon: '📋' },
    { route: 'reports', text: '📈 Reports', icon: '📈' },
    { route: 'configuration', text: '⚙️ Configuration', icon: '⚙️' },
    { route: 'company-selection', text: '🏢 Companies', icon: '🏢' },
    { route: 'logout', text: '🚪 Logoff', icon: '🚪' },
  ];

  return (
    <>
      {/* Backdrop to close menu when touching outside */}
      <TouchableOpacity 
        style={styles.menuBackdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={styles.menuOverlay}>
        {menuItems.map((item) => (
          <TouchableOpacity 
            key={item.route}
            style={styles.menuItem}
            onPress={() => onNavigation(item.route)}
          >
            <Text style={styles.menuItemText}>{item.text}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );
});

const styles = StyleSheet.create({
  menuBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 999,
  },
  menuOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 80,
    left: 0,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    zIndex: 1000,
    minWidth: 200,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 5,
    }),
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
  },
});

ReportsMenu.displayName = 'ReportsMenu';

export default ReportsMenu;

