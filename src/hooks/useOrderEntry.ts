import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import { useUser } from '../context/UserContext';
import { useSafeNavigation } from './useSafeNavigation';
import { useMasterData } from '../context/MasterDataContext';
import { useConfiguration } from '../context/ConfigurationContext';
import { useEffectiveConfig } from './useEffectiveConfig';
import { useBackendPermissionValues } from './useBackendPermissions';
import { StockItem, Customer, OrderItem } from '../types/order';
import { VoucherType } from '../context/MasterDataContext';
import { apiService } from '../services/api';
import { 
  parseTallyItemsResponse, 
  parseTallyItemsWithPriceLevelsResponse, 
  convertTallyItemsToStockItems, 
  convertTallyItemsWithPriceLevelsToStockItems,
  parseTallyStockItemsResponse,
  parseTallyCustomersResponse,
  parseTallyCustomersWithAddressesResponse,
  convertTallyCustomersToCustomers
} from '../utils/tallyHelpers';
import { getCustomerPriceForItem } from '../utils/priceListManager';
import { router } from 'expo-router';

export const useOrderEntry = () => {
  // User context
  const { userData, selectedCompany, clearUserData } = useUser();
  const { items: itemList, customers, voucherTypes, isLoadingItems: loadingItems, isLoadingCustomers: loadingCustomers, isLoadingVoucherTypes: loadingVoucherTypes, setItems, setCustomers, updateMasterDataProgress } = useMasterData();
  const { orderConfig } = useConfiguration();
  const effectiveConfig = useEffectiveConfig();
  const { safePush } = useSafeNavigation();
  // Remove direct permission values - use effectiveConfig instead
  


  // Form state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPincode, setCustomerPincode] = useState('');
  const [customerState, setCustomerState] = useState('');
  const [customerCountry, setCustomerCountry] = useState('');
  const [customerGSTIN, setCustomerGSTIN] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [customerPaymentTerms, setCustomerPaymentTerms] = useState('');
  const [customerDeliveryTerms, setCustomerDeliveryTerms] = useState('');
  const [customerNarration, setCustomerNarration] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  
  // Consignee state
  const [consigneeName, setConsigneeName] = useState('');
  const [consigneeAddress, setConsigneeAddress] = useState('');
  const [consigneeState, setConsigneeState] = useState('');
  const [consigneeCountry, setConsigneeCountry] = useState('');
  const [consigneePincode, setConsigneePincode] = useState('');
  

  // Voucher type state
  const [selectedVoucherType, setSelectedVoucherType] = useState<VoucherType | null>(null);
  const [showVoucherTypeDropdown, setShowVoucherTypeDropdown] = useState(false);

  // Item selection state
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const [itemQuantity, setItemQuantity] = useState('');
  const [itemRate, setItemRate] = useState('');
  const [itemDiscountPercent, setItemDiscountPercent] = useState('');
  const [itemTaxPercent, setItemTaxPercent] = useState('');
  const [itemValue, setItemValue] = useState('');
  const [itemBatch, setItemBatch] = useState('');

  // Order state
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [orderDueDate, setOrderDueDate] = useState(() => {
    const today = new Date();
    today.setDate(today.getDate() + effectiveConfig.defaultOrderDueDays);
    return today.toISOString().split('T')[0];
  });

  // UI state
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Refs for input focus
  const quantityInputRef = useRef<any>(null);
  const amountInputRef = useRef<any>(null);

  // Reload master data with new configuration
  const reloadMasterDataWithNewConfig = useCallback(async () => {
    if (!selectedCompany) return;
    
    console.log('🔄 reloadMasterDataWithNewConfig called');
    
    try {
      
      // Reload items - try new JSON API first, fallback to old XML API
      let itemsResponse = await apiService.getStockItemsFromTally(
        selectedCompany.tallyloc_id,
        selectedCompany.company,
        selectedCompany.GUID
      );
      
      if (itemsResponse.success && itemsResponse.data) {
        // Use new JSON format
        const stockItems = parseTallyStockItemsResponse(itemsResponse.data);
        setItems(stockItems);
      } else {
        // Fallback to old XML format
        itemsResponse = await apiService.getItemsFromTally(
          selectedCompany.tallyloc_id,
          selectedCompany.company,
          selectedCompany.GUID,
          effectiveConfig.usePriceLevels
        );
        
        if (itemsResponse.success && itemsResponse.data) {
          let stockItems;
          if (effectiveConfig.usePriceLevels) {
            const tallyItemsWithPriceLevels = parseTallyItemsWithPriceLevelsResponse(itemsResponse.data);
            stockItems = convertTallyItemsWithPriceLevelsToStockItems(tallyItemsWithPriceLevels);
          } else {
            const tallyItems = parseTallyItemsResponse(itemsResponse.data);
            stockItems = convertTallyItemsToStockItems(tallyItems);
          }
          setItems(stockItems);
        } else {
          setItems([]);
        }
      }
      
      // Reload customers - try new API first, fallback to old one
      let customersResponse = await apiService.getCustomersWithAddressesFromTally(
        selectedCompany.tallyloc_id,
        selectedCompany.company,
        selectedCompany.GUID
      );
      
      if (customersResponse.success && customersResponse.data) {
        // Use new JSON format
        const tallyCustomers = parseTallyCustomersWithAddressesResponse(customersResponse.data);
        const customers = convertTallyCustomersToCustomers(tallyCustomers);
        setCustomers(customers);
        
        // Auto-select customer if only one is available and no customer is currently selected
        if (customers.length === 1 && !selectedCustomer) {
          const singleCustomer = customers[0];
          setSelectedCustomer(singleCustomer);
          setCustomerName(singleCustomer.name);
          setCustomerPhone(singleCustomer.phone);
          setCustomerMobile(singleCustomer.mobile);
          setCustomerEmail(singleCustomer.email);
          setCustomerAddress(singleCustomer.address);
          setCustomerState(singleCustomer.stateName || '');
          setCustomerCountry(singleCustomer.country || '');
          setCustomerGSTIN(singleCustomer.gstin);
          setCustomerContact(singleCustomer.contact || '');
        }
      } else {
        // Fallback to old XML format
        customersResponse = await apiService.getCustomersFromTally(
          selectedCompany.tallyloc_id,
          selectedCompany.company,
          selectedCompany.GUID
        );
        
        if (customersResponse.success && customersResponse.data) {
          const tallyCustomers = parseTallyCustomersResponse(customersResponse.data);
          const customers = convertTallyCustomersToCustomers(tallyCustomers);
          setCustomers(customers);
          
          // Auto-select customer if only one is available and no customer is currently selected (fallback case)
          if (customers.length === 1 && !selectedCustomer) {
            const singleCustomer = customers[0];
            setSelectedCustomer(singleCustomer);
            setCustomerName(singleCustomer.name);
            setCustomerPhone(singleCustomer.phone);
            setCustomerMobile(singleCustomer.mobile);
            setCustomerEmail(singleCustomer.email);
            setCustomerAddress(singleCustomer.address);
            setCustomerGSTIN(singleCustomer.gstin);
            setCustomerContact(singleCustomer.contact || '');
          }
        } else {
          setCustomers([]);
        }
      }
    } catch (error) {
      console.warn('Failed to reload master data with new configuration:', error);
    }
  }, [selectedCompany, effectiveConfig.usePriceLevels, setItems, setCustomers]);

  // Load master data when component mounts or company changes (only if not already loaded)
  useEffect(() => {
    console.log('🔍 Order Entry - Master data check on mount:', {
      hasSelectedCompany: !!selectedCompany,
      itemListLength: itemList.length,
      customersLength: customers.length,
      willReload: !!selectedCompany && (!itemList.length && !customers.length)
    });
    
    if (selectedCompany && (!itemList.length && !customers.length)) {
      console.log('🔄 Loading master data (not loaded yet)...');
      reloadMasterDataWithNewConfig();
    }
  }, [selectedCompany, effectiveConfig.usePriceLevels, itemList.length, customers.length, reloadMasterDataWithNewConfig]);

  // Set default voucher type when voucher types are loaded
  useEffect(() => {
    if (voucherTypes.length > 0 && !selectedVoucherType) {
      // First try to use the permission-based default voucher type (by name)
      if (effectiveConfig.voucherTypeName) {
        const permissionVoucherType = voucherTypes.find(vt => vt.name === effectiveConfig.voucherTypeName);
        if (permissionVoucherType) {
          console.log('🎯 Setting default voucher type from permissions:', effectiveConfig.voucherTypeName);
          setSelectedVoucherType(permissionVoucherType);
          return;
        }
      }
      
      // Second try to use the configured default voucher type (by ID)
      if (effectiveConfig.defaultVoucherTypeId) {
        const configuredVoucherType = voucherTypes.find(vt => vt.id === effectiveConfig.defaultVoucherTypeId);
        if (configuredVoucherType) {
          console.log('🎯 Setting default voucher type from config:', effectiveConfig.defaultVoucherTypeId);
          setSelectedVoucherType(configuredVoucherType);
          return;
        }
      }
      
      // Fallback to first voucher type if no configured default or configured one not found
      setSelectedVoucherType(voucherTypes[0]);
    }
  }, [voucherTypes, selectedVoucherType, effectiveConfig.voucherTypeName, effectiveConfig.defaultVoucherTypeId]);

  // Monitor selectedVoucherType changes
  useEffect(() => {
    // Voucher type changed
  }, [selectedVoucherType]);

  // Note: Default quantity is now set in handleItemSelect when an item is selected
  // This prevents the quantity from being reset while the user is editing it

  // Update order due date when config value changes
  useEffect(() => {
    if (effectiveConfig.defaultOrderDueDays > 0) {
      const today = new Date();
      today.setDate(today.getDate() + effectiveConfig.defaultOrderDueDays);
      const newDueDate = today.toISOString().split('T')[0];
      console.log('🎯 Setting order due date from config:', effectiveConfig.defaultOrderDueDays, 'days from today =', newDueDate);
      setOrderDueDate(newDueDate);
    }
  }, [effectiveConfig.defaultOrderDueDays]);

  // Update selected voucher type when configuration changes
  useEffect(() => {
    if (voucherTypes.length > 0) {
      // First priority: permission-based default voucher type (by name)
      if (effectiveConfig.voucherTypeName) {
        const permissionVoucherType = voucherTypes.find(vt => vt.name === effectiveConfig.voucherTypeName);
        if (permissionVoucherType && (!selectedVoucherType || selectedVoucherType.name !== effectiveConfig.voucherTypeName)) {
          console.log('🎯 Updating voucher type from permissions:', effectiveConfig.voucherTypeName);
          setSelectedVoucherType(permissionVoucherType);
          return;
        }
      }
      
      // Second priority: configured default voucher type (by ID)
      if (effectiveConfig.defaultVoucherTypeId) {
        const configuredVoucherType = voucherTypes.find(vt => vt.id === effectiveConfig.defaultVoucherTypeId);
        if (configuredVoucherType && (!selectedVoucherType || selectedVoucherType.id !== configuredVoucherType.id)) {
          console.log('🎯 Updating voucher type from config:', effectiveConfig.defaultVoucherTypeId);
          setSelectedVoucherType(configuredVoucherType);
        }
      }
    }
  }, [effectiveConfig.voucherTypeName, effectiveConfig.defaultVoucherTypeId, voucherTypes]);

  // Auto-select customer when customers are loaded and there's only one
  useEffect(() => {
    if (customers.length === 1 && !selectedCustomer) {
      const singleCustomer = customers[0];
      setSelectedCustomer(singleCustomer);
      setCustomerName(singleCustomer.name);
      setCustomerPhone(singleCustomer.phone);
      setCustomerMobile(singleCustomer.mobile);
      setCustomerEmail(singleCustomer.email);
      setCustomerAddress(singleCustomer.address);
      setCustomerGSTIN(singleCustomer.gstin);
      setCustomerContact(singleCustomer.contact || '');

    }
  }, [customers, selectedCustomer]);

  // Reload master data when configuration changes (only if data already exists)
  useEffect(() => {
    console.log('🔍 Order Entry - Config change check:', {
      hasSelectedCompany: !!selectedCompany,
      itemListLength: itemList.length,
      customersLength: customers.length,
      usePriceLevels: effectiveConfig.usePriceLevels,
      willReload: !!selectedCompany && (itemList.length > 0 || customers.length > 0)
    });
    
    if (selectedCompany && (itemList.length > 0 || customers.length > 0)) {
      console.log('🔄 Reloading master data (config changed)...');
      reloadMasterDataWithNewConfig();
    }
  }, [effectiveConfig.usePriceLevels, reloadMasterDataWithNewConfig, selectedCompany, itemList.length, customers.length]);

  // Update order due date when configuration changes
  useEffect(() => {
    const today = new Date();
    today.setDate(today.getDate() + effectiveConfig.defaultOrderDueDays);
    setOrderDueDate(today.toISOString().split('T')[0]);
  }, [effectiveConfig.defaultOrderDueDays]);

  // Calculate item value when quantity, rate, discount, or tax changes
  useEffect(() => {
    if (itemQuantity) {
      const qty = parseFloat(itemQuantity) || 0;
      // Set discount to 0 if discount is disabled in configuration
      const discountPercent = (orderConfig && orderConfig.showDiscount === false) ? 0 : (parseFloat(itemDiscountPercent) || 0);
      const taxPercent = parseFloat(itemTaxPercent) || 0;
      
      if (qty > 0) {
        // Use entered rate if user has modified it, otherwise use price list rate
        let rate = 0;
        if (itemRate.trim() !== '') {
          rate = parseFloat(itemRate) || 0;
        } else {
          // When rate field is empty, treat as 0 rate
          rate = 0;
        }
        
        // Value = Qty * Rate * (1 - Discount%) - Tax% is display only
        const discountMultiplier = 1 - (discountPercent / 100);
        const calculatedValue = (qty * rate * discountMultiplier).toFixed(2);
        setItemValue(calculatedValue);
      }
    }
  }, [itemQuantity, itemRate, itemDiscountPercent, selectedItemIndex, selectedCustomer, itemList, effectiveConfig.usePriceLevels, orderConfig.showDiscount]);


  // Handle item selection
  const handleItemSelect = useCallback((item: StockItem) => {
    const index = itemList.findIndex(i => i.id === item.id);
    
    // Only clear description if selecting a different item
    if (selectedItemIndex !== index) {
      setItemDescription('');
    }
    
    setSelectedItemIndex(index);
    
    // Use the price list manager to get the appropriate rate
    const priceResult = getCustomerPriceForItem(item, selectedCustomer, effectiveConfig.usePriceLevels);
    
    setItemRate(priceResult.finalPrice > 0 ? priceResult.finalPrice.toString() : '');
    
    // Auto-populate Tax% from IGST value
    if (item.igst && item.igst > 0) {
      setItemTaxPercent(item.igst.toString());
    } else {
      setItemTaxPercent('0');
    }
    
    // Auto-populate quantity with default value (only if defined)
    if (effectiveConfig.defaultQuantity !== undefined && effectiveConfig.defaultQuantity > 0) {
      setItemQuantity(effectiveConfig.defaultQuantity.toString());
    } else {
      setItemQuantity('');
    }
    
    setShowItemDropdown(false);
    
    // Auto-focus on quantity field after item selection
    setTimeout(() => {
      quantityInputRef.current?.focus();
    }, Platform.OS === 'web' ? 100 : 300);
  }, [itemList, effectiveConfig.usePriceLevels, selectedCustomer, selectedItemIndex]);

  // Handle customer selection
  const handleCustomerSelect = useCallback((customer: Customer) => {
    // Check if there are items in the cart and prevent customer change
    // This restriction only applies when price levels are enabled
    if (effectiveConfig.usePriceLevels && orderItems.length > 0) {
      Alert.alert(
        'Customer Change Not Allowed',
        'You have items in your cart. Changing the customer now would affect pricing. Would you like to clear all items and select a new customer?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear Items & Change Customer',
            style: 'destructive',
            onPress: () => {
              setOrderItems([]);
              setSelectedCustomer(customer);
              setCustomerName(customer.name);
              setCustomerPhone(customer.phone);
              setCustomerMobile(customer.mobile);
              setCustomerEmail(customer.email);
              setCustomerAddress(customer.address);
              setCustomerPincode(customer.pincode || '');
              setCustomerState(customer.stateName || '');
              setCustomerCountry(customer.country || '');
              setCustomerGSTIN(customer.gstin);
              setCustomerContact(customer.contact || '');
              setSelectedItemIndex(null);
              setItemQuantity('');
              setItemRate('');
              setItemValue('');
              setShowCustomerDropdown(false);
            }
          }
        ]
      );
      return;
    }
    
    setSelectedCustomer(customer);
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone);
    setCustomerMobile(customer.mobile);
    setCustomerEmail(customer.email);
    setCustomerAddress(customer.address);
    setCustomerPincode(customer.pincode || '');
    setCustomerState(customer.stateName || '');
    setCustomerCountry(customer.country || '');
    setCustomerGSTIN(customer.gstin);
    setCustomerContact(customer.contact || '');
    setShowCustomerDropdown(false);
  }, [orderItems.length, effectiveConfig.usePriceLevels]);

  // Add item to order
  const addItemToOrder = useCallback(() => {
    if (selectedItemIndex === null) {
      Alert.alert('Error', 'Please select an item');
      return;
    }
    
    const selectedItem = itemList[selectedItemIndex];
    const quantity = parseFloat(itemQuantity) || 0;
    // Set discount to 0 if discount is disabled in configuration
    const discountPercent = (orderConfig && orderConfig.showDiscount === false) ? 0 : (parseFloat(itemDiscountPercent) || 0);
    const taxPercent = parseFloat(itemTaxPercent) || 0;
    
    // Get the final price using the price list manager
    const priceResult = getCustomerPriceForItem(selectedItem, selectedCustomer, effectiveConfig.usePriceLevels);
    // Use entered rate if user has modified it, otherwise use 0
    const rate = itemRate.trim() !== '' ? parseFloat(itemRate) : 0;
    const value = parseFloat(itemValue) || (quantity * rate);
    
    if (!itemQuantity.trim() || quantity <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    
    const orderItem: OrderItem = {
      id: Date.now().toString(),
      name: selectedItem.name,
      quantity,
      rate,
      discountPercent,
      taxPercent,
      value,
      availableQty: selectedItem.availableQty,
      batch: itemBatch.trim() || undefined,
      description: itemDescription.trim() || undefined,
    };

    setOrderItems(prev => [...prev, orderItem]);
    
    // Clear form
    setSelectedItemIndex(null);
    setItemQuantity('');
    setItemRate('');
    // Don't clear itemDescription here - it should be cleared when a different item is selected
    setItemDiscountPercent('');
    setItemTaxPercent('');
    setItemValue('');
    setItemBatch('');
  }, [selectedItemIndex, itemQuantity, itemRate, itemValue, itemBatch, itemList, itemDescription]);

  // Remove item from order
  const removeItemFromOrder = useCallback((itemId: string) => {
    setOrderItems(prev => prev.filter(item => item.id !== itemId));
  }, []);

  // Edit item in order - copy details back to form
  const editItemInOrder = useCallback((itemId: string) => {
    const itemToEdit = orderItems.find(item => item.id === itemId);
    if (!itemToEdit) return;

    // Find the item in the itemList by name
    const itemIndex = itemList.findIndex(item => item.name === itemToEdit.name);
    if (itemIndex === -1) {
      Alert.alert('Error', 'Item not found in master data');
      return;
    }

    // Set the form fields with the item details
    setSelectedItemIndex(itemIndex);
    setItemQuantity(itemToEdit.quantity.toString());
    setItemRate(itemToEdit.rate.toString());
    setItemDiscountPercent(itemToEdit.discountPercent.toString());
    setItemTaxPercent(itemToEdit.taxPercent.toString());
    setItemValue(itemToEdit.value.toString());
    setItemBatch(itemToEdit.batch || '');
    setItemDescription(itemToEdit.description || '');

    // Remove the item from the order (user will re-add it after editing)
    removeItemFromOrder(itemId);

    // Focus on quantity input for better UX
    setTimeout(() => {
      if (quantityInputRef.current) {
        quantityInputRef.current.focus();
      }
    }, 100);
  }, [orderItems, itemList, removeItemFromOrder, quantityInputRef]);

  // Get total amount
  const getTotalAmount = useCallback(() => {
    return orderItems.reduce((total, item) => total + item.value, 0).toFixed(2);
  }, [orderItems]);

  // Validate form
  const validateForm = useCallback(() => {
    if (orderItems.length === 0) {
      if (selectedItemIndex === null) {
        if (Platform.OS === 'web') {
          const confirmed = confirm('Item is mandatory! Please select an item to continue.\n\nClick OK to open item selection.');
          if (confirmed) {
            setShowItemDropdown(true);
          }
        } else {
          Alert.alert('Item is mandatory!', 'Please select an item to continue.', [
            {
              text: 'OK',
              onPress: () => setShowItemDropdown(true),
            },
          ]);
        }
        return false;
      }
      
      const hasQuantity = itemQuantity.trim() && parseFloat(itemQuantity) > 0;
      if (!hasQuantity) {
        if (Platform.OS === 'web') {
          const confirmed = confirm('Quantity is mandatory! Please enter a valid quantity.\n\nClick OK to focus on quantity field.');
          if (confirmed) {
            focusOnField('quantity');
          }
        } else {
          Alert.alert('Validation Error', 'Quantity is mandatory! Please enter a valid quantity.', [
            {
              text: 'OK',
              onPress: () => focusOnField('quantity'),
            },
          ]);
        }
        return false;
      }
      
      Alert.alert('Error', 'Please add the selected item to the order');
      return false;
    }
    
    if (!customerName.trim()) {
      if (Platform.OS === 'web') {
        const confirmed = confirm('Customer is mandatory! Please select a customer to continue.\n\nClick OK to open customer selection.');
        if (confirmed) {
          setShowCustomerDropdown(true);
        }
      } else {
        Alert.alert('Customer is mandatory!', 'Please select a customer to continue.', [
          {
            text: 'OK',
            onPress: () => setShowCustomerDropdown(true),
          },
        ]);
      }
      return false;
    }
    
    return true;
  }, [orderItems.length, customerName, selectedItemIndex, itemQuantity]);

  // Focus on input field
  const focusOnField = useCallback((field: 'quantity' | 'amount') => {
    setTimeout(() => {
      if (field === 'quantity') {
        quantityInputRef.current?.focus();
      } else if (field === 'amount') {
        amountInputRef.current?.focus();
      }
    }, Platform.OS === 'web' ? 300 : 500);
  }, []);

  // Clear form
  const clearForm = useCallback(() => {
    setOrderItems([]);
    setSelectedCustomer(null);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerMobile('');
    setCustomerEmail('');
    setCustomerAddress('');
    setCustomerGSTIN('');
    setCustomerContact('');
    setSelectedItemIndex(null);
    setItemQuantity('');
    setItemRate('');
    setItemDiscountPercent('');
    setItemTaxPercent('');
    setItemValue('');
    setItemDescription('');
    
    const today = new Date();
    today.setDate(today.getDate() + effectiveConfig.defaultOrderDueDays);
    setOrderDueDate(today.toISOString().split('T')[0]);
  }, [effectiveConfig.defaultOrderDueDays]);

  // Reset form
  const resetForm = useCallback(() => {
    setSelectedCustomer(null);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerMobile('');
    setCustomerEmail('');
    setCustomerAddress('');
    setCustomerGSTIN('');
    setCustomerContact('');
    setCustomerPaymentTerms('');
    setCustomerDeliveryTerms('');
    setCustomerNarration('');
    // Don't clear itemDescription here - it should be cleared when starting a new order
    setSelectedItemIndex(null);
    setItemQuantity('');
    setItemRate('');
    setItemDiscountPercent('');
    setItemTaxPercent('');
    setItemValue('');
    setOrderItems([]);
    setIsLoading(false);
    
    const today = new Date();
    today.setDate(today.getDate() + effectiveConfig.defaultOrderDueDays);
    setOrderDueDate(today.toISOString().split('T')[0]);
  }, [effectiveConfig.defaultOrderDueDays]);

  // Navigation handlers
  const handleBack = useCallback(() => {
    safePush('/dashboard');
  }, [safePush]);

  // Check if there's any data entered in the form
  const hasFormData = useCallback(() => {
    return (
      selectedCustomer !== null ||
      orderItems.length > 0 ||
      (selectedItemIndex !== null && (itemQuantity.trim() !== '' || itemRate.trim() !== '')) ||
      customerName.trim() !== '' ||
      customerPhone.trim() !== '' ||
      customerMobile.trim() !== '' ||
      customerEmail.trim() !== '' ||
      customerAddress.trim() !== '' ||
      customerGSTIN.trim() !== '' ||
      customerContact.trim() !== '' ||
      customerPaymentTerms.trim() !== '' ||
      customerDeliveryTerms.trim() !== '' ||
      customerNarration.trim() !== '' ||
      itemDescription.trim() !== ''
    );
  }, [
    selectedCustomer,
    orderItems,
    selectedItemIndex,
    itemQuantity,
    itemRate,
    customerName,
    customerPhone,
    customerMobile,
    customerEmail,
    customerAddress,
    customerGSTIN,
    customerContact,
    customerPaymentTerms,
    customerDeliveryTerms,
    customerNarration,
    itemDescription
  ]);

  const handleNavigation = useCallback((route: string) => {
    // Check if there's form data and show confirmation
    if (hasFormData()) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to leave without saving?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Leave',
            style: 'destructive',
            onPress: () => {
              if (route === 'logout') {
                clearUserData();
                router.replace('/');
              } else if (route === 'company-selection') {
                safePush('/company-selection');
              } else if (route === 'dashboard') {
                safePush('/dashboard');
              } else if (route === 'configuration') {
                safePush('/configuration');
              }
            },
          },
        ]
      );
    } else {
      // No form data, proceed with navigation
      if (route === 'logout') {
        clearUserData();
        router.replace('/');
      } else if (route === 'company-selection') {
        safePush('/company-selection');
      } else if (route === 'dashboard') {
        safePush('/dashboard');
      } else if (route === 'configuration') {
        safePush('/configuration');
      }
    }
  }, [hasFormData, clearUserData, safePush]);

  return {
    // State
    selectedCustomer,
    customerName,
    customerPhone,
    customerMobile,
    customerEmail,
    customerAddress,
    customerPincode,
    customerState,
    customerCountry,
    customerGSTIN,
    customerContact,
    customerPaymentTerms,
    customerDeliveryTerms,
    customerNarration,
    itemDescription,
    consigneeName,
    consigneeAddress,
    consigneeState,
    consigneeCountry,
    consigneePincode,
    selectedItemIndex,
    itemQuantity,
    itemRate,
    itemDiscountPercent,
    itemTaxPercent,
    itemValue,
    itemBatch,
    orderItems,
    orderDueDate,
    showItemDropdown,
    showCustomerDropdown,
    isLoading,
    loadingItems,
    loadingCustomers,
    itemList,
    customers,
    orderConfig,
    selectedCompany,
    voucherTypes,
    selectedVoucherType,
    isLoadingVoucherTypes: loadingVoucherTypes,
    showVoucherTypeDropdown,
    
    // Refs
    quantityInputRef,
    amountInputRef,
    
    // Actions
    setCustomerName,
    setCustomerPhone,
    setCustomerMobile,
    setCustomerEmail,
    setCustomerAddress,
    setCustomerPincode,
    setCustomerState,
    setCustomerCountry,
    setCustomerGSTIN,
    setCustomerContact,
    setCustomerPaymentTerms,
    setCustomerDeliveryTerms,
    setCustomerNarration,
    setItemDescription,
    setConsigneeName,
    setConsigneeAddress,
    setConsigneeState,
    setConsigneeCountry,
    setConsigneePincode,
    setItemQuantity,
    setItemRate,
    setItemDiscountPercent,
    setItemTaxPercent,
    setItemValue,
    setItemBatch,
    setOrderItems,
    setShowItemDropdown,
    setShowCustomerDropdown,
    setIsLoading,
    setOrderDueDate,
    setSelectedVoucherType,
    setShowVoucherTypeDropdown,
    
    // Handlers
    handleItemSelect,
    handleCustomerSelect,
    addItemToOrder,
    removeItemFromOrder,
    editItemInOrder,
    getTotalAmount,
    validateForm,
    focusOnField,
    clearForm,
    resetForm,
    handleBack,
    handleNavigation,
    hasFormData,
    
    // Utilities
    reloadMasterDataWithNewConfig,
  };
};
