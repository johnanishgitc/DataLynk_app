import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  SafeAreaView,
} from 'react-native';

export interface StandardHeaderProps {
  title: string;
  onBackPress?: () => void;
  onMenuPress?: () => void;
  showBackButton?: boolean;
  showMenuButton?: boolean;
  rightComponent?: React.ReactNode;
}

export const StandardHeader: React.FC<StandardHeaderProps> = ({
  title,
  onBackPress,
  onMenuPress,
  showBackButton = false,
  showMenuButton = false,
  rightComponent,
}) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        {/* Left Button (Back or Menu) */}
        <View style={styles.leftSection}>
          {showBackButton && onBackPress && (
            <TouchableOpacity
              style={styles.button}
              onPress={onBackPress}
            >
              <Text style={styles.buttonText}>← Back</Text>
            </TouchableOpacity>
          )}
          {showMenuButton && onMenuPress && (
            <TouchableOpacity
              style={[
                styles.menuButton,
                showBackButton && styles.menuButtonWithBack,
              ]}
              onPress={onMenuPress}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.menuIcon}>☰</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
        </View>

        {/* Right Component or Spacer */}
        <View style={styles.rightSection}>
          {rightComponent ? (
            rightComponent
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#5D8277',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#5D8277',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 6 : 4,
    borderBottomWidth: 1,
    borderBottomColor: '#4a6a61',
    minHeight: Platform.OS === 'ios' ? 60 : 56,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 76,
    justifyContent: 'flex-start',
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 44, // Minimum touch target size for accessibility
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  menuButton: {
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    minHeight: 44, // Slightly larger touch target
    paddingHorizontal: 12,
    borderRadius: 22,
  },
  menuButtonWithBack: {
    marginLeft: 8,
  },
  menuIcon: {
    fontSize: 22,
    color: '#ffffff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  rightSection: {
    minWidth: 76,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 44,
  },
});

export default StandardHeader;

