import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useUser } from '../src/context/UserContext';
import { useMasterData, VoucherType } from '../src/context/MasterDataContext';
import { useConfiguration } from '../src/context/ConfigurationContext';
import { apiService } from '../src/services/api';
import { salesDataService } from '../src/services/salesDataService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseTallyItemsResponse, parseTallyItemsWithPriceLevelsResponse, parseTallyStockItemsResponse, parseTallyCustomersResponse, parseTallyCustomersWithAddressesResponse, convertTallyItemsToStockItems, convertTallyItemsWithPriceLevelsToStockItems, convertTallyCustomersToCustomers } from '../src/utils/tallyHelpers';
import { Button, StandardHeader } from '../src/components/common';
import { BackendPermissionsDisplay } from '../src/components/BackendPermissionsDisplay';
import { PermissionsDisplay } from '../src/components/PermissionsDisplay';
import { voucherDataService } from '../src/services/voucherDataService';

export default function ConfigurationPage() {
  const { userData, selectedCompany, clearUserData } = useUser();
  const { setItems, setCustomers, setIsLoadingItems, setIsLoadingCustomers, voucherTypes, isLoadingVoucherTypes } = useMasterData();
  const { 
    orderConfig, 
    masterDataConfig, 
    updateOrderConfig, 
    updateMasterDataConfig,
    allPermissions,
    rolesData,
    loadAllPermissions
  } = useConfiguration();
  
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
  
  // Menu state
  const [showMenu, setShowMenu] = useState(false);
  const [currentSection, setCurrentSection] = useState<'main' | 'master-data' | 'permissions'>('main');
  
  // Configuration is now read-only

  // Configuration is now read-only, controlled by backend permissions

  // UI state
  const [loadingItems, setLoadingItems] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [slicingDays, setSlicingDays] = useState<string>('5');

  useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem('sync_chunk_days');
        if (v && !isNaN(Number(v))) {
          setSlicingDays(String(Math.min(31, Math.max(1, Number(v)))));
        }
      } catch {}
    })();
  }, []);

  const saveSlicingDays = async (val: string) => {
    const n = Math.min(31, Math.max(1, Number(val) || 5));
    setSlicingDays(String(n));
    try {
      await AsyncStorage.setItem('sync_chunk_days', String(n));
    } catch (e) {
      console.log('Failed to save slicing days', e);
    }
  };

  // Configuration is now read-only, no need for back button handling

  const handleMenuPress = () => {
    setShowMenu(!showMenu);
  };

  const handleNavigation = (route: string) => {
    setShowMenu(false);
    if (route === 'logout') {
      clearUserData();
      router.push('/');
    } else if (route === 'company-selection') {
      router.push('/company-selection');
    } else if (route === 'dashboard') {
      router.push('/dashboard');
    } else if (route === 'configuration') {
      router.push('/configuration');
    }
  };
  
  const handleMasterData = () => {
    setCurrentSection('master-data');
  };


  const handlePermissions = () => {
    setCurrentSection('permissions');
  };

  const handleClearCache = async () => {
    if (!selectedCompany) {
      Alert.alert('Error', 'No company selected');
      return;
    }

    Alert.alert(
      'Clear Report Data Cache',
      `This will delete cached sales and voucher data for "${selectedCompany.company}". Other companies' data will be preserved. Continue?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear Cache',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear sales data cache for current company only
              await salesDataService.clearCompanyData(selectedCompany.GUID!, parseInt(selectedCompany.tallyloc_id!));
              
              // Clear voucher data cache for current company only
              await voucherDataService.clearCompanyData(selectedCompany.GUID!, parseInt(selectedCompany.tallyloc_id!));
              
              // Note: Company data is NOT cleared to preserve offline access
              
              // Clear AsyncStorage data for current company
              await AsyncStorage.removeItem('salesReport_startDate');
              await AsyncStorage.removeItem('salesReport_endDate');
              await AsyncStorage.removeItem('voucherReport_startDate');
              await AsyncStorage.removeItem('voucherReport_endDate');
              
              // Clear any other cached data (excluding company data)
              await AsyncStorage.multiRemove([
                'salesDataCache',
                'voucherDataCache',
                'masterDataCache'
              ]);
              
              Alert.alert('Success', `Cached data cleared successfully for "${selectedCompany.company}"!`);
            } catch (error) {
              console.error('Failed to clear cache:', error);
              Alert.alert('Error', 'Failed to clear cache. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Configuration is now read-only, no need for unsaved changes handling

  // Load voucher types on component mount
  useEffect(() => {
    if (selectedCompany && voucherTypes.length === 0) {
      // Voucher types are loaded by the MasterDataContext
    }
  }, [selectedCompany, voucherTypes.length]);

  // Load all permissions when component mounts
  useEffect(() => {
    if (selectedCompany && !allPermissions) {
      loadAllPermissions();
    }
  }, [selectedCompany, allPermissions, loadAllPermissions]);

  // Configuration is now read-only, no need to sync local state
  
  // Configuration is now read-only, no unsaved changes to check

  const loadItems = async () => {
    if (!selectedCompany) return;
    
    setLoadingItems(true);
    try {
      // Try new JSON format first
      let response = await apiService.getStockItemsFromTally(
        selectedCompany.tallyloc_id,
        selectedCompany.company,
        selectedCompany.GUID
      );

      if (response.success && response.data) {
        // Use new JSON format
        const stockItems = parseTallyStockItemsResponse(response.data);
        setItems(stockItems);
        Alert.alert(
          'Success', 
          `Successfully loaded ${stockItems.length} items from new stock items API!`,
          [{ text: 'OK' }]
        );
      } else {
        // Fallback to old XML format
        response = await apiService.getItemsFromTally(
          selectedCompany.tallyloc_id,
          selectedCompany.company,
          selectedCompany.GUID,
          orderConfig.usePriceLevels
        );

        if (response.success && response.data) {
          // Parse the XML response based on price levels setting
        const stockItems = orderConfig.usePriceLevels 
          ? convertTallyItemsWithPriceLevelsToStockItems(parseTallyItemsWithPriceLevelsResponse(response.data))
          : convertTallyItemsToStockItems(parseTallyItemsResponse(response.data));
        
          setItems(stockItems);
          Alert.alert(
            'Success', 
            `Successfully loaded ${stockItems.length} items from fallback XML API!`,
          [{ text: 'OK' }]
          );
        } else {
          console.error('🌐 Failed to get items from Tally:', response.message);
          Alert.alert('Error', response.message || 'Failed to load items from Tally');
        }
      }
    } catch (error) {
      console.error('🌐 Error loading items:', error);
      Alert.alert('Error', 'Failed to load items from Tally');
    } finally {
      setLoadingItems(false);
    }
  };

  const loadCustomers = async () => {
    if (!selectedCompany) return;
    
    setLoadingCustomers(true);
    try {
      // Try new JSON format first
      let response = await apiService.getCustomersWithAddressesFromTally(
        selectedCompany.tallyloc_id,
        selectedCompany.company,
        selectedCompany.GUID
      );
      
      if (response.success && response.data) {
        // Use new JSON format
        const customers = convertTallyCustomersToCustomers(parseTallyCustomersWithAddressesResponse(response.data));
        setCustomers(customers);
        Alert.alert(
          'Success', 
          `Successfully loaded ${customers.length} customers from Tally!`,
          [{ text: 'OK' }]
        );
      } else {
        // Fallback to old XML format
        response = await apiService.getCustomersFromTally(
          selectedCompany.tallyloc_id,
          selectedCompany.company,
          selectedCompany.GUID
        );
        
        if (response.success && response.data) {
          // Parse the XML response
          const customers = convertTallyCustomersToCustomers(parseTallyCustomersResponse(response.data));
          setCustomers(customers);
          Alert.alert(
            'Success', 
            `Successfully loaded ${customers.length} customers from Tally!`,
            [{ text: 'OK' }]
          );
        } else {
          console.error('🌐 Failed to get customers from Tally:', response.message);
          Alert.alert('Error', response.message || 'Failed to load customers from Tally');
        }
      }
    } catch (error) {
      console.error('🌐 Error loading customers:', error);
      Alert.alert('Error', 'Failed to load customers from Tally');
    } finally {
      setLoadingCustomers(false);
    }
  };

  

  const handleSaveMasterDataConfig = () => {
    // No master data configuration to save
    Alert.alert('Info', 'No master data settings to save');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StandardHeader
        title="Configuration"
        onMenuPress={handleMenuPress}
        showMenuButton={true}
      />

      {/* Options Menu */}
      {showMenu && (
        <>
          {/* Backdrop to close menu when touching outside */}
          <TouchableOpacity 
            style={styles.menuBackdrop}
            onPress={() => setShowMenu(false)}
            activeOpacity={1}
          />
          <View style={styles.menuContainer}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => handleNavigation('dashboard')}
            >
              <Text style={styles.menuItemText}>🏠 Dashboard</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => handleNavigation('company-selection')}
            >
              <Text style={styles.menuItemText}>🏢 Company Selection</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => handleNavigation('logout')}
            >
              <Text style={styles.menuItemText}>🚪 Logoff</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Company Name */}
      {selectedCompany && selectedCompany.company && (
        <View style={styles.companyNameContainer}>
          <Text style={styles.companyName}>{selectedCompany.company}</Text>
        </View>
      )}

      <View style={styles.contentContainer}>
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.content}>
            {currentSection === 'main' && (
              <>
                {/* Simple Action Buttons */}
                <View style={styles.buttonContainer}>
                  {/* Slicing Days setting */}
                  <View style={styles.compactRow}>
                    <Text style={styles.compactLabel}>Slicing days (initial sync)</Text>
                    <TextInput
                      value={slicingDays}
                      onChangeText={(t) => setSlicingDays(t.replace(/[^0-9]/g, ''))}
                      onBlur={() => saveSlicingDays(slicingDays)}
                      keyboardType="number-pad"
                      placeholder="5"
                      style={styles.compactInput}
                      maxLength={2}
                    />
                  </View>

                  <TouchableOpacity 
                    style={styles.actionButton} 
                    onPress={handleMasterData}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.buttonText}>📦 Master Data Management</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.actionButton} 
                    onPress={handlePermissions}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.buttonText}>🔐 Permissions</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.actionButton, styles.clearCacheButton]} 
                    onPress={handleClearCache}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.buttonText}>🗑️ Clear Sales Data Cache</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.actionButton, styles.clearAllButton]} 
                    onPress={async () => {
                      Alert.alert(
                        'Clear ALL Voucher Data',
                        'This will delete vouchers, ledgers, inventories, voucher_summary, and aggregate_facts for ALL companies. Continue?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Clear All', style: 'destructive', onPress: async () => {
                            try {
                              await voucherDataService.clearAllVoucherData();
                              await AsyncStorage.multiRemove([
                                'voucherReport_startDate','voucherReport_endDate','salesReport_startDate','salesReport_endDate','voucherDataCache','salesDataCache'
                              ]);
                              Alert.alert('Success','All voucher data cleared. You can sync fresh now.');
                            } catch (e) {
                              console.error('Failed to clear all voucher data:', e);
                              Alert.alert('Error','Failed to clear all voucher data.');
                            }
                          }}
                        ]
                      );
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.buttonText}>🧨 Clear ALL Voucher Data (All Companies)</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {currentSection === 'master-data' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Master Data Management</Text>
          
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={[styles.actionButton, loadingItems && styles.disabledButton]}
            onPress={loadItems}
            disabled={loadingItems}
                    activeOpacity={0.8}
                  >
                    {loadingItems ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#ffffff" />
                        <Text style={styles.buttonText}>Loading Items...</Text>
                      </View>
                    ) : (
                      <Text style={styles.buttonText}>📦 Load Items</Text>
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionButton, loadingCustomers && styles.disabledButton]}
            onPress={loadCustomers}
            disabled={loadingCustomers}
                    activeOpacity={0.8}
                  >
                    {loadingCustomers ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#ffffff" />
                        <Text style={styles.buttonText}>Loading Customers...</Text>
        </View>
                    ) : (
                      <Text style={styles.buttonText}>👥 Load Customers</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {currentSection === 'permissions' && (
              <View style={[styles.section, { marginBottom: 20 }]}>
                <Text style={styles.sectionTitle}>Modules & Permissions</Text>
                <Text style={styles.sectionSubtitle}>All available modules and permissions with your access</Text>
                
                <PermissionsDisplay 
                  allPermissions={allPermissions} 
                  userPermissions={rolesData}
                />
              </View>
            )}
          </View>
        </ScrollView>

        {/* Fixed Action Container for Bottom Buttons */}
        {currentSection === 'master-data' && (
          <View style={styles.fixedActionContainer}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => setCurrentSection('main')}
              activeOpacity={0.8}
            >
              <Text style={styles.backButtonText}>Back to Configuration</Text>
            </TouchableOpacity>
          </View>
        )}

             </View>

    </SafeAreaView>
   );
 }

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 120, // Space for fixed action container
  },
  menuBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1,
  },
  menuContainer: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingVertical: 8,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 2,
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  menuItemText: {
    fontSize: 16,
    color: '#495057',
  },
  companyNameContainer: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  companyName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6c757d',
    textAlign: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 40, // Extra padding for content
  },
  section: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 12,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 5,
    marginTop: 0,
    textAlign: 'center',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  buttonContainer: {
    gap: 12,
  },
  actionButton: {
    backgroundColor: '#5D8277',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  clearCacheButton: {
    backgroundColor: '#dc3545',
  },
  clearAllButton: {
    backgroundColor: '#991b1b',
  },
  disabledButton: {
    backgroundColor: '#6c757d',
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#ffffff',
    color: '#495057',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#495057',
    flex: 1,
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#6c757d',
    marginLeft: 8,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 4,
  },
  compactLabel: {
    flex: 1,
    fontSize: 14,
    color: '#495057',
    marginRight: 12,
  },
  compactInput: {
    width: 80,
    height: 40,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#495057',
    backgroundColor: '#ffffff',
    textAlign: 'right',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#ced4da',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  checkboxActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkboxText: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: 'bold',
  },
  checkboxTextActive: {
    color: '#ffffff',
  },
  fixedActionContainer: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 20,
    paddingVertical: 10,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  saveButton: {
    backgroundColor: '#5D8277',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    maxHeight: '80%',
    minWidth: 300,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#495057',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#6c757d',
  },
  modalList: {
    maxHeight: 300,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalItemText: {
    fontSize: 16,
    color: '#495057',
    flex: 1,
  },
  checkmark: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6c757d',
  },
  indentedLabel: {
    marginLeft: 16, // 2 characters indentation
  },
  italicLabel: {
    fontStyle: 'italic',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#dee2e6',
    marginVertical: 20,
  },
  textInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#495057',
    backgroundColor: '#ffffff',
  },
});