import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Switch,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { backgroundCheckService, BackgroundCheckConfig } from '../../services/backgroundService';

interface BackgroundCheckConfigModalProps {
  visible: boolean;
  onClose: () => void;
  companyData?: any;
  currentVouchers?: any[];
}

const FREQUENCY_OPTIONS = [
  { label: '1 minute', value: 1 },
  { label: '5 minutes', value: 5 },
  { label: '10 minutes', value: 10 },
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '1 hour', value: 60 },
];

export const BackgroundCheckConfigModal: React.FC<BackgroundCheckConfigModalProps> = ({
  visible,
  onClose,
  companyData,
  currentVouchers = [],
}) => {
  const [config, setConfig] = useState<BackgroundCheckConfig>({
    enabled: false,
    frequencyMinutes: 5,
    lastMasterId: 0,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<string>('Never');

  useEffect(() => {
    if (visible) {
      loadConfiguration();
    }
  }, [visible]);

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      const currentConfig = backgroundCheckService.getConfiguration();
      setConfig(currentConfig);
      
      if (currentConfig.lastCheckTime) {
        setLastCheckTime(currentConfig.lastCheckTime.toLocaleString());
      }
    } catch (error) {
      console.error('❌ [BackgroundConfig] Failed to load configuration:', error);
      Alert.alert('Error', 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Save configuration along with company data for background tasks
      await backgroundCheckService.updateConfiguration(config, companyData);
      
      Alert.alert('Success', 'Background check configuration updated successfully');
      onClose();
    } catch (error) {
      console.error('❌ [BackgroundConfig] Failed to save configuration:', error);
      Alert.alert('Error', 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTestCheck = async () => {
    try {
      setLoading(true);
      
      // Check if company data is available
      if (!companyData) {
        Alert.alert(
          'Company Data Missing',
          'Company information is not available. Please ensure you are logged in and have selected a company.'
        );
        setLoading(false);
        return;
      }
      
      // Calculate the highest MasterID from current vouchers
      const currentHighestMasterId = currentVouchers.length > 0
        ? Math.max(...currentVouchers.map((v: any) => v.MasterID || 0))
        : 0;
      
      console.log('🔍 [BackgroundConfig] Test check starting', {
        currentVouchersCount: currentVouchers.length,
        currentHighestMasterId,
        hasCompanyData: !!companyData,
        companyName: companyData?.company,
      });
      
      const result = await backgroundCheckService.manualCheck(companyData, currentHighestMasterId);
      
      if (result.newVouchersFound > 0) {
        Alert.alert(
          'Test Check Complete',
          `Found ${result.newVouchersFound} new voucher(s)!\n\nPrevious highest MasterID: ${currentHighestMasterId}\nCurrent highest MasterID: ${result.latestMasterId}`
        );
      } else {
        Alert.alert(
          'Test Check Complete',
          `No new vouchers found.\n\nHighest MasterID checked: ${currentHighestMasterId}\nCurrent highest MasterID: ${result.latestMasterId}`
        );
      }
      
      // Reload configuration to get updated last check time
      await loadConfiguration();
    } catch (error) {
      console.error('❌ [BackgroundConfig] Test check failed:', error);
      Alert.alert('Error', 'Test check failed. Please check your connection and ensure you have selected a company.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetMasterId = () => {
    Alert.alert(
      'Reset Master ID',
      'This will reset the last checked Master ID to 0, causing all vouchers to be considered as "new" on the next check. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setConfig(prev => ({ ...prev, lastMasterId: 0 }));
          },
        },
      ]
    );
  };

  const handleSimulateBackgroundTask = async () => {
    try {
      setLoading(true);
      
      console.log('🧪 [BackgroundConfig] Simulating background task...');
      
      // This simulates EXACTLY what the background task does
      // It will try to get company data from AsyncStorage (not from props)
      const result = await backgroundCheckService.manualCheck(undefined, undefined);
      
      console.log('🧪 [BackgroundConfig] Background task simulation complete:', result);
      
      if (result.newVouchersFound > 0) {
        Alert.alert(
          '🧪 Background Task Simulation',
          `SUCCESS! Background task would find ${result.newVouchersFound} new voucher(s)!\n\nThis means automatic background checking will work in development build.\n\nNew MasterID: ${result.latestMasterId}`,
          [{ text: 'Great!', style: 'default' }]
        );
      } else {
        Alert.alert(
          '🧪 Background Task Simulation',
          `Background task simulation completed.\n\nNo new vouchers found.\nLast MasterID: ${result.latestMasterId}\n\nThis simulates exactly what the automatic background task does - it retrieved company data from storage and checked Tally.`,
          [{ text: 'OK', style: 'default' }]
        );
      }
      
      await loadConfiguration();
    } catch (error) {
      console.error('❌ [BackgroundConfig] Background task simulation failed:', error);
      Alert.alert(
        '🧪 Simulation Failed',
        `The background task simulation failed. This means automatic background checking won't work yet.\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nMake sure to:\n1. Toggle "Auto Check" ON\n2. Save settings\n3. Try simulation again`,
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading configuration...</Text>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Background Check Settings</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Enable/Disable Toggle */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Auto Check for New Vouchers</Text>
              <Switch
                value={config.enabled}
                onValueChange={(value) => setConfig(prev => ({ ...prev, enabled: value }))}
                trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
                thumbColor={config.enabled ? '#FFFFFF' : '#FFFFFF'}
              />
            </View>
            <Text style={styles.sectionDescription}>
              Automatically check Tally for new vouchers in the background and notify you when found.
            </Text>
          </View>

          {/* Frequency Selection */}
          {config.enabled && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Check Frequency</Text>
              <Text style={styles.sectionDescription}>
                How often to check for new vouchers
              </Text>
              <View style={styles.frequencyGrid}>
                {FREQUENCY_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.frequencyOption,
                      config.frequencyMinutes === option.value && styles.frequencyOptionSelected,
                    ]}
                    onPress={() => setConfig(prev => ({ ...prev, frequencyMinutes: option.value }))}
                  >
                    <Text
                      style={[
                        styles.frequencyOptionText,
                        config.frequencyMinutes === option.value && styles.frequencyOptionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Current Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Status</Text>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Last Check:</Text>
              <Text style={styles.statusValue}>{lastCheckTime}</Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Last Master ID:</Text>
              <Text style={styles.statusValue}>{config.lastMasterId}</Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Status:</Text>
              <Text style={[
                styles.statusValue,
                config.enabled ? styles.statusEnabled : styles.statusDisabled
              ]}>
                {config.enabled ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actions</Text>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.testButton]}
              onPress={handleTestCheck}
              disabled={loading}
            >
              <Text style={styles.actionButtonText}>Test Check Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.resetButton]}
              onPress={handleResetMasterId}
            >
              <Text style={styles.actionButtonText}>Reset Master ID</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.simulateButton]}
              onPress={handleSimulateBackgroundTask}
              disabled={loading}
            >
              <Text style={styles.actionButtonText}>🧪 Simulate Background Task</Text>
            </TouchableOpacity>
          </View>

          {/* Expo Go Limitation Warning */}
          <View style={[styles.section, styles.warningSection]}>
            <Text style={styles.sectionTitle}>⚠️ Important Note</Text>
            <Text style={styles.warningText}>
              <Text style={styles.boldText}>Automatic background checks do NOT work in Expo Go.</Text>{'\n\n'}
              To test automatic background checking, you need to create a development build.{'\n\n'}
              For now, use the "Test Check Now" button above to manually check for new vouchers - it works perfectly!
            </Text>
          </View>

          {/* Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How it Works</Text>
            <Text style={styles.infoText}>
              • The app checks Tally for new vouchers with MasterID greater than the last checked ID{'\n'}
              • Only optional vouchers are monitored{'\n'}
              • You'll receive a notification when new vouchers are found{'\n'}
              • Background checking requires a development or production build (not Expo Go)
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save Settings</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
  frequencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  frequencyOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  frequencyOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  frequencyOptionText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
  },
  frequencyOptionTextSelected: {
    color: '#FFFFFF',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  statusLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  statusValue: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
  },
  statusEnabled: {
    color: '#34C759',
  },
  statusDisabled: {
    color: '#FF3B30',
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  testButton: {
    backgroundColor: '#007AFF',
  },
  resetButton: {
    backgroundColor: '#FF9500',
  },
  simulateButton: {
    backgroundColor: '#34C759',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoText: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
  warningSection: {
    backgroundColor: '#FFF3CD',
    borderWidth: 1,
    borderColor: '#FF9500',
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  boldText: {
    fontWeight: '700',
    color: '#856404',
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#8E8E93',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
