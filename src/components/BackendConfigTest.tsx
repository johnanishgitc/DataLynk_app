import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useConfiguration } from '../context/ConfigurationContext';
import { useEffectiveConfig } from '../hooks/useEffectiveConfig';

export const BackendConfigTest: React.FC = () => {
  const { loadBackendConfig, isBackendConfigLoaded, backendConfigError } = useConfiguration();
  const effectiveConfig = useEffectiveConfig();

  const handleLoadBackendConfig = async () => {
    try {
      await loadBackendConfig();
      Alert.alert('Success', 'Backend configuration loaded successfully!');
    } catch (error) {
      Alert.alert('Error', `Failed to load backend configuration: ${error}`);
    }
  };

  const handleToggleBackendConfig = () => {
    // This would be called from configuration screen
    Alert.alert('Info', 'Use the configuration screen to enable/disable backend configuration');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Backend Configuration Test</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configuration Status</Text>
        <Text style={styles.statusText}>
          Backend Config Loaded: {isBackendConfigLoaded ? 'Yes' : 'No'}
        </Text>
        <Text style={styles.statusText}>
          Using Backend Config: {effectiveConfig.isUsingBackendConfig ? 'Yes' : 'No'}
        </Text>
        {backendConfigError && (
          <Text style={styles.errorText}>Error: {backendConfigError}</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Backend Permissions</Text>
        <Text style={styles.permissionText}>
          Show Payment Terms: {effectiveConfig.showPayTerms ? 'Yes' : 'No'}
        </Text>
        <Text style={styles.permissionText}>
          Show Delivery Terms: {effectiveConfig.showDelvTerms ? 'Yes' : 'No'}
        </Text>
        <Text style={styles.permissionText}>
          Show Rate/Amount Column: {effectiveConfig.showRateAmtColumn ? 'Yes' : 'No'}
        </Text>
        <Text style={styles.permissionText}>
          Allow Rate Modification: {effectiveConfig.editRate ? 'Yes' : 'No'}
        </Text>
        <Text style={styles.permissionText}>
          Show Discount Column: {effectiveConfig.showDiscColumn ? 'Yes' : 'No'}
        </Text>
        <Text style={styles.permissionText}>
          Allow Discount Modification: {effectiveConfig.editDiscount ? 'Yes' : 'No'}
        </Text>
        <Text style={styles.permissionText}>
          Show Stock Availability: {effectiveConfig.showClsStckColumn ? 'Yes' : 'No'}
        </Text>
        <Text style={styles.permissionText}>
          Show Godown Breakdown: {effectiveConfig.showGodownBrkup ? 'Yes' : 'No'}
        </Text>
        <Text style={styles.permissionText}>
          Show Multi-Company Stock: {effectiveConfig.showMultiCoBrkup ? 'Yes' : 'No'}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleLoadBackendConfig}
          disabled={isBackendConfigLoaded}
        >
          <Text style={styles.buttonText}>
            {isBackendConfigLoaded ? 'Config Loaded' : 'Load Backend Config'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]} 
          onPress={handleToggleBackendConfig}
        >
          <Text style={styles.buttonText}>Toggle Backend Config</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  statusText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#666',
  },
  errorText: {
    fontSize: 14,
    color: 'red',
    marginTop: 5,
  },
  permissionText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
  },
  secondaryButton: {
    backgroundColor: '#6C757D',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});





