import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';

interface SubmitButtonProps {
  isLoading: boolean;
  onPress: () => void;
  style?: any;
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({
  isLoading,
  onPress,
  style,
}) => {
  return (
    <TouchableOpacity 
      style={[styles.submitButton, isLoading && styles.submitButtonDisabled, style]} 
      onPress={onPress}
      disabled={isLoading}
    >
      {isLoading ? (
        <ActivityIndicator color="#ffffff" size="small" />
      ) : (
        <Text style={styles.submitButtonText}>Create Order</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  submitButton: {
    backgroundColor: '#5D8277',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minHeight: 36,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    }),
  },
  submitButtonDisabled: {
    backgroundColor: '#6c757d',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
});


