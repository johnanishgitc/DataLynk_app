import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';

interface OrderHeaderProps {
  showMenu: boolean;
  onMenuPress: () => void;
  onNavigation: (route: string) => void;
  selectedCompany: any;
}

export const OrderHeader: React.FC<OrderHeaderProps> = ({
  showMenu,
  onMenuPress,
  onNavigation,
  selectedCompany,
}) => {
  return (
    <>
      {/* Header with Hamburger and Title */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.menuButton} 
          onPress={onMenuPress}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Entry</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Options Menu */}
      {showMenu && (
        <>
          {/* Backdrop to close menu when touching outside */}
          <TouchableOpacity 
            style={styles.menuBackdrop}
            activeOpacity={1}
            onPress={() => onNavigation('')}
          />
          <View style={styles.menuOverlay}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => onNavigation('company-selection')}
            >
              <Text style={styles.menuItemText}>🏢 Companies</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => onNavigation('dashboard')}
            >
              <Text style={styles.menuItemText}>📊 Dashboard</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => onNavigation('configuration')}
            >
              <Text style={styles.menuItemText}>⚙️ Configuration</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => onNavigation('logout')}
            >
              <Text style={styles.menuItemText}>🚪 Logoff</Text>
            </TouchableOpacity>
          </View>
        </>
      )}


    </>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5D8277',
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#4a6a61',
    paddingTop: Platform.OS === 'ios' ? 20 : 10,
    height: Platform.OS === 'ios' ? 60 : 50,
  },
  menuButton: {
    height: '100%',
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    minHeight: 44,
  },
  menuIcon: {
    fontSize: 22,
    color: '#ffffff',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginLeft: -60,
  },
  headerSpacer: {
    width: 60,
  },

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
    top: Platform.OS === 'ios' ? 70 : 60,
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


