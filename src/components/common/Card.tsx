import React, { memo } from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  Platform,
} from 'react-native';

export interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: 'none' | 'small' | 'medium' | 'large';
  shadow?: boolean;
  border?: boolean;
}

const Card: React.FC<CardProps> = memo(({
  children,
  style,
  padding = 'medium',
  shadow = true,
  border = false,
}) => {
  const cardStyle = [
    styles.base,
    styles[padding],
    shadow && styles.shadow,
    border && styles.border,
    style,
  ];

  return (
    <View style={cardStyle}>
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  base: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
  
  // Padding variants
  none: {
    padding: 0,
  },
  small: {
    padding: 12,
  },
  medium: {
    padding: 16,
  },
  large: {
    padding: 20,
  },
  
  // Shadow styles
  shadow: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    android: {
      elevation: 3,
    },
    web: {
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    },
  }),
  
  // Border styles
  border: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
});

Card.displayName = 'Card';

export default Card;


