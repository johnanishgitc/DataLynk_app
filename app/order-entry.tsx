import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
  BackHandler,
  Platform,
} from 'react-native';
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOrderEntry } from '../src/hooks/useOrderEntry';
import { useUser } from '../src/context/UserContext';
import { useEffectiveConfig } from '../src/hooks/useEffectiveConfig';
import { 
  OrderHeader,
  OrderForm,
  CustomerDetails,
  SubmitButton,
  VoucherTypeList,
} from '../src/components/order';

import { LightweightCustomerList } from '../src/components/order/LightweightCustomerList';
import { LightweightItemList } from '../src/components/order/LightweightItemList';
// TEMPORARILY DISABLED FOR PERFORMANCE TESTING
// import { MasterDataLoader } from '../src/components/common/MasterDataLoader';
import { createOrderXmlRequest, escapeXmlValue, generateOrderNumber, generateOrderNumberWithPrefixSuffix } from '../src/utils/tallyXmlRequests';
import { validateCreditConditions } from '../src/utils/creditValidation';
import { useBackendPermissions } from '../src/hooks/useBackendPermissions';
import { API_CONFIG, getApiUrl } from '../src/config/api';
import { apiService } from '../src/services/api';
import { secureStorage } from '../src/utils/secureStorage';
import BarcodeScanner from '@/components/BarcodeScanner';
import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';
import RazorpayWebCheckout from '../src/components/payment/RazorpayWebCheckout';

export default function OrderEntryPage() {
  const { userData } = useUser();
  const router = useRouter();
  const params = useLocalSearchParams();
  // Backend permissions (for batch, etc.)
  const permissions = useBackendPermissions();
  
  const {
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
    isLoadingVoucherTypes,
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
  } = useOrderEntry();

  // Get effective configuration (including backend permissions)
  const effectiveConfig = useEffectiveConfig();

  // Monitor itemDescription state changes
  React.useEffect(() => {
    // Item description changed
  }, [itemDescription]);

  // Handle hardware back button
  useEffect(() => {
    const backAction = () => {
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
                router.back();
              },
            },
          ]
        );
        return true; // Prevent default back action
      }
      return false; // Allow default back action
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, [hasFormData, router]);

  // Voucher type state monitoring

  // Menu state
  const [showMenu, setShowMenu] = useState(false);
  // Barcode scanner
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  // Godown stock modal
  const [showGodownStock, setShowGodownStock] = useState(false);
  const [godownStockData, setGodownStockData] = useState<any>(null);
  const [companyStockData, setCompanyStockData] = useState<any>(null);
  const [loadingGodownStock, setLoadingGodownStock] = useState(false);
  const [loadingCompanyStock, setLoadingCompanyStock] = useState(false);
  const [selectedItemForStock, setSelectedItemForStock] = useState<any>(null);
  // Payment status
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<any>(null);
    
  // Payment handlers
  const handlePaymentSuccess = async (data: any) => {
    console.log('✅ Payment successful:', data);
    setPaymentStatus('success');
    setShowPaymentModal(false);
    
    try {
      // Create receipt voucher in Tally
      await createReceiptVoucher(data);
      
      // Show success message with payment details
      Alert.alert(
        'Order Created & Payment Successful!',
        `Order Number: ${currentOrder?.receipt?.replace('receipt_', '')}\nTotal Amount: ₹${getTotalAmount()}\nPayment ID: ${data.paymentId}\nRazorpay Order ID: ${data.orderId}\n\nPayment completed and receipt created in Tally!`,
        [
          {
            text: 'OK',
            onPress: () => {
              clearForm();
              setPaymentStatus('idle');
              setPaymentError(null);
              setCurrentOrder(null);
            }
          }
        ]
      );
    } catch (receiptError) {
      // Show success message but mention receipt creation failed with specific error
      Alert.alert(
        'Order Created & Payment Successful - Receipt Failed',
        `Order Number: ${currentOrder?.receipt?.replace('receipt_', '')}\nTotal Amount: ₹${getTotalAmount()}\nPayment ID: ${data.paymentId}\nRazorpay Order ID: ${data.orderId}\n\n${receiptError.message}\n\nPlease create receipt manually in Tally.`,
        [
          {
            text: 'OK',
            onPress: () => {
              clearForm();
              setPaymentStatus('idle');
              setPaymentError(null);
              setCurrentOrder(null);
            }
          }
        ]
      );
    }
  };

  const handlePaymentError = (error: string) => {
    console.log('❌ Payment error:', error);
    setPaymentStatus('failed');
    setPaymentError(error);
    setShowPaymentModal(false);
    setCurrentOrder(null);
    
    // Show error message but don't fail the order creation
    Alert.alert(
      'Order Created - Payment Failed',
      `Order Number: ${currentOrder?.receipt?.replace('receipt_', '')}\nTotal Amount: ₹${getTotalAmount()}\n\nPayment failed: ${error}\n\nYou can collect payment later.`,
      [
        {
          text: 'OK',
          onPress: () => {
            clearForm();
            setPaymentStatus('idle');
            setPaymentError(null);
          }
        }
      ]
    );
  };

  const handleClosePayment = () => {
    setShowPaymentModal(false);
    setCurrentOrder(null);
    setPaymentStatus('idle');
    setPaymentError(null);
  };

  // Create receipt voucher in Tally
  const createReceiptVoucher = async (paymentData: any) => {
    if (!selectedCompany || !userData?.token) {
      throw new Error('Missing company or user data');
    }

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD format
    const timestamp = now.toISOString().slice(0, 19).replace(/[-:T]/g, ''); // YYYYMMDDHHMMSS format
    const orderNumber = currentOrder?.receipt?.replace('receipt_', '') || 'Unknown';
    // Use amount from current order (in paise) and convert back to rupees
    const amount = currentOrder?.amount ? currentOrder.amount / 100 : getTotalAmount();
    const bankLedgerName = orderConfig.razorpayLedgerName || 'Bank'; // Use configurable ledger name
    
    // Extract payment details for narration
    const paymentId = paymentData?.paymentId || 'N/A';
    const razorpayOrderId = paymentData?.orderId || 'N/A';
    const paymentDate = now.toLocaleDateString('en-GB'); // DD/MM/YYYY format
    const paymentTime = now.toLocaleTimeString('en-GB', { hour12: false }); // 24-hour format

    console.log('🧾 Receipt creation debug info:', {
      selectedCompany: selectedCompany?.company,
      userData: userData?.name,
      orderNumber,
      amount,
      amountType: typeof amount,
      customerName,
      paymentData,
      currentOrderAmount: currentOrder?.amount,
      getTotalAmountResult: getTotalAmount(),
      paymentId,
      razorpayOrderId,
      paymentDate,
      paymentTime
    });

    if (!amount || isNaN(amount)) {
      throw new Error(`Invalid amount: ${amount}. Order total calculation failed.`);
    }

    // Create receipt XML
    const receiptXml = `<ENVELOPE>
 <HEADER>
  <TALLYREQUEST>Import Data</TALLYREQUEST>
 </HEADER>
 <BODY>
  <IMPORTDATA>
   <REQUESTDESC>
    <REPORTNAME>Vouchers</REPORTNAME>
    <STATICVARIABLES>
     <SVCURRENTCOMPANY>${escapeXmlValue(selectedCompany.company)}</SVCURRENTCOMPANY>
    </STATICVARIABLES>
   </REQUESTDESC>
   <REQUESTDATA>
    <TALLYMESSAGE xmlns:UDF="TallyUDF">
     <VOUCHER>
      <DATE>${dateStr}</DATE>
      <NARRATION>Payment received for Order ${orderNumber} via Razorpay - Payment ID: ${paymentId} | Order ID: ${razorpayOrderId} | Date: ${paymentDate} ${paymentTime}</NARRATION>
      <VOUCHERTYPENAME>Receipt</VOUCHERTYPENAME>
      <PARTYLEDGERNAME>${escapeXmlValue(customerName)}</PARTYLEDGERNAME>
      <ISOPTIONAL>No</ISOPTIONAL>
      <EFFECTIVEDATE>${dateStr}</EFFECTIVEDATE>
      <ALLLEDGERENTRIES.LIST>
       <LEDGERNAME>${escapeXmlValue(customerName)}</LEDGERNAME>
       <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
       <AMOUNT>${amount.toFixed(2)}</AMOUNT>
       <BILLALLOCATIONS.LIST>
        <NAME>${orderNumber}/${userData.name} | Razorpay: ${paymentId}</NAME>
        <BILLTYPE>New Ref</BILLTYPE>
        <AMOUNT>${amount.toFixed(2)}</AMOUNT>
       </BILLALLOCATIONS.LIST>
      </ALLLEDGERENTRIES.LIST>
      <ALLLEDGERENTRIES.LIST>
       <LEDGERNAME>${escapeXmlValue(bankLedgerName)}</LEDGERNAME>
       <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
       <AMOUNT>-${amount.toFixed(2)}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>
     </VOUCHER>
    </TALLYMESSAGE>
   </REQUESTDATA>
  </IMPORTDATA>
 </BODY>
</ENVELOPE>`;

    console.log('🧾 Creating receipt voucher in Tally...');
    console.log('📄 Receipt XML (formatted):');
    console.log(receiptXml);
    console.log('📄 Receipt XML (raw):', receiptXml);

    // Use the same API endpoint as order creation
    const isWeb = typeof window !== 'undefined';
    const isLocalhost = isWeb && (window?.location?.hostname === 'localhost' || window?.location?.hostname === '127.0.0.1');
    
    const apiUrl = getApiUrl('/api/tally/tallydata');

    const authToken = apiService.getAuthToken() || userData?.token;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        'Authorization': `Bearer ${authToken}`,
        'x-tallyloc-id': selectedCompany.tallyloc_id,
        'x-company': selectedCompany.company,
        'x-guid': selectedCompany.GUID,
      },
      body: receiptXml
    });

    console.log('📥 Receipt Response Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create receipt: ${response.status} - ${errorText}`);
    }

    const responseText = await response.text();
    console.log('✅ Receipt created successfully:', responseText);

    // Check if Tally actually created the receipt
    const createdMatch = responseText.match(/<CREATED>(\d+)<\/CREATED>/);
    const errorsMatch = responseText.match(/<ERRORS>(\d+)<\/ERRORS>/);
    const exceptionsMatch = responseText.match(/<EXCEPTIONS>(\d+)<\/EXCEPTIONS>/);
    const lineErrorMatch = responseText.match(/<LINEERROR>(.*?)<\/LINEERROR>/);
    
    const created = createdMatch ? parseInt(createdMatch[1]) : 0;
    const errors = errorsMatch ? parseInt(errorsMatch[1]) : 0;
    const exceptions = exceptionsMatch ? parseInt(exceptionsMatch[1]) : 0;
    const lineError = lineErrorMatch ? lineErrorMatch[1] : null;
    
    console.log('📊 Receipt Response Analysis:', {
      created,
      errors,
      exceptions,
      lineError,
      createdMatch: createdMatch?.[0],
      errorsMatch: errorsMatch?.[0],
      exceptionsMatch: exceptionsMatch?.[0],
      lineErrorMatch: lineErrorMatch?.[0]
    });
    
    if (created === 0 || errors > 0 || exceptions > 0) {
      const errorMessage = lineError 
        ? lineError.replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
        : `Receipt creation failed. Created: ${created}, Errors: ${errors}, Exceptions: ${exceptions}`;
      throw new Error(errorMessage);
    }

    console.log('✅ Receipt voucher created successfully in Tally');
  };
    
  // Handle barcode scan
  const handleBarcodeScan = (barcode: string) => {
    if (!barcode) return;
    
    // Extract item name and batch from barcode if it contains "|" delimiter
    // Format: "itemname|batch" -> extract "itemname" and "batch"
    let itemNameToSearch = barcode;
    let batchToSet = '';
    
    if (barcode.includes('|')) {
      const parts = barcode.split('|');
      itemNameToSearch = parts[0].trim();
      batchToSet = parts[1] ? parts[1].trim() : '';
    }
    
    // Search for item by name (case-insensitive)
    const foundItem = itemList.find(item => 
      item.name.toLowerCase().includes(itemNameToSearch.toLowerCase())
    );
    
    if (foundItem) {
      handleItemSelect(foundItem);
      // Set the batch if it was extracted from the barcode and batch tracking is enabled
      if (batchToSet && (permissions.showBatches || orderConfig.enableBatchTracking)) {
        setItemBatch(batchToSet);
      }
    } else {
      Alert.alert('Error', `Item not found for: ${itemNameToSearch}`);
    }
  };
  const handleMenuPress = () => {
    setShowMenu(!showMenu);
  };

  const handleNavigationWithMenu = (route: string) => {
    setShowMenu(false);
    handleNavigation(route);
  };

  // Handle check stock for an item
  const handleCheckItemStock = async (itemId: string) => {
    try {
      // Find the item in orderItems
      const item = orderItems.find((i: any) => i.id === itemId);
      if (!item) {
        Alert.alert('Error', 'Item not found');
        return;
      }

      if (!selectedCompany) {
        Alert.alert('Error', 'No company selected');
        return;
      }

      setSelectedItemForStock(item);
      setShowGodownStock(true);
      setLoadingGodownStock(true);
      setLoadingCompanyStock(true);
      setGodownStockData(null);
      setCompanyStockData(null);

      console.log('📦 Fetching stock for item:', item.name);

      // Fetch both godown and company stock in parallel
      const [godownResponse, companyResponse] = await Promise.all([
        apiService.getGodownStock(
          Number(selectedCompany.tallyloc_id),
          selectedCompany.company,
          selectedCompany.GUID,
          item.name
        ),
        apiService.getCompanyStock(
          Number(selectedCompany.tallyloc_id),
          selectedCompany.company,
          selectedCompany.GUID,
          item.name
        )
      ]);

      console.log('📦 Full godown stock response:', JSON.stringify(godownResponse, null, 2));
      console.log('🏢 Full company stock response:', JSON.stringify(companyResponse, null, 2));

      // Handle godown stock response
      if (godownResponse.success) {
        console.log('✅ Godown stock data received:', godownResponse.data);
        setGodownStockData(godownResponse.data);
      } else {
        console.error('❌ Failed to fetch godown stock:', godownResponse.message);
      }
      setLoadingGodownStock(false);

      // Handle company stock response
      if (companyResponse.success) {
        console.log('✅ Company stock data received:', companyResponse.data);
        setCompanyStockData(companyResponse.data);
      } else {
        console.error('❌ Failed to fetch company stock:', companyResponse.message);
      }
      setLoadingCompanyStock(false);

      // If both failed, close the modal
      if (!godownResponse.success && !companyResponse.success) {
        Alert.alert('Error', 'Failed to fetch stock information');
        setShowGodownStock(false);
      }
    } catch (error) {
      console.error('❌ Error fetching stock:', error);
      Alert.alert('Error', 'Failed to fetch stock information. Please try again.');
      setShowGodownStock(false);
      setLoadingGodownStock(false);
      setLoadingCompanyStock(false);
    }
  };

  // Note: Removed automatic form reset on focus to preserve data when returning from customer details

  // Handle data returned from customer details screen
  useFocusEffect(
    React.useCallback(() => {
      const handleCustomerDetailsReturn = async () => {
        try {
          // Check for stored customer details from customer details screen
          const storedDetails = await AsyncStorage.getItem('temp_customer_details');
          if (storedDetails) {
            const customerDetails = JSON.parse(storedDetails);
            
            // Check if the data is recent (within last 30 seconds)
            const now = Date.now();
            if (now - customerDetails.timestamp < 30000) {
              // Update customer details from the stored data
              if (customerDetails.contact) setCustomerContact(customerDetails.contact);
              if (customerDetails.phone) setCustomerPhone(customerDetails.phone);
              if (customerDetails.mobile) setCustomerMobile(customerDetails.mobile);
              if (customerDetails.email) setCustomerEmail(customerDetails.email);
              if (customerDetails.address) setCustomerAddress(customerDetails.address);
              if (customerDetails.pincode) setCustomerPincode(customerDetails.pincode);
              if (customerDetails.state) setCustomerState(customerDetails.state);
              if (customerDetails.country) setCustomerCountry(customerDetails.country);
              if (customerDetails.gstin) setCustomerGSTIN(customerDetails.gstin);
              if (customerDetails.paymentTerms) setCustomerPaymentTerms(customerDetails.paymentTerms);
              if (customerDetails.deliveryTerms) setCustomerDeliveryTerms(customerDetails.deliveryTerms);
              if (customerDetails.narration) setCustomerNarration(customerDetails.narration);
              if (customerDetails.orderDueDate) setOrderDueDate(customerDetails.orderDueDate);
              if (customerDetails.consigneeName) setConsigneeName(customerDetails.consigneeName);
              if (customerDetails.consigneeAddress) setConsigneeAddress(customerDetails.consigneeAddress);
              if (customerDetails.consigneeState) setConsigneeState(customerDetails.consigneeState);
              if (customerDetails.consigneeCountry) setConsigneeCountry(customerDetails.consigneeCountry);
              if (customerDetails.consigneePincode) setConsigneePincode(customerDetails.consigneePincode);
              
              // Clear the stored data to prevent re-processing
              await AsyncStorage.removeItem('temp_customer_details');
            }
          }
        } catch (error) {
          console.error('Error loading customer details:', error);
        }
      };
      
      handleCustomerDetailsReturn();
      return () => {
        // Cleanup
      };
    }, [])
  );

  // Handle data returned from item details screen
  useFocusEffect(
    React.useCallback(() => {
      const handleItemDetailsReturn = async () => {
        try {
          // Check for stored item description from item details screen
          const storedItemDetails = await AsyncStorage.getItem('temp_item_description');
          if (storedItemDetails) {
            const itemDetails = JSON.parse(storedItemDetails);
            
            // Check if the data is recent (within last 30 seconds)
            const now = Date.now();
            if (now - itemDetails.timestamp < 30000) {
              // Update the item description state
              setItemDescription(itemDetails.itemDescription);
              
              // Also update the description in the order item if it exists
              if (itemDetails.itemName) {
                setOrderItems(prevItems => 
                  prevItems.map(item => 
                    item.name === itemDetails.itemName 
                      ? { ...item, description: itemDetails.itemDescription }
                      : item
                  )
                );
              }
              
              // Clear the stored data to prevent re-processing
              await AsyncStorage.removeItem('temp_item_description');
            }
          }
        } catch (error) {
          console.error('Error loading item details:', error);
        }
      };
      
      handleItemDetailsReturn();
      return () => {
        // Cleanup
      };
    }, [setItemDescription])
  );

  // Generate HTML for order PDF
  const generateOrderHTML = (orderData: any) => {
    const { orderNumber, customerName, customerAddress, customerGSTIN, customerContact, orderItems, totalAmount, dueDate, voucherType } = orderData;
    
    const itemsHtml = orderItems.map((item: any) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.name}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">₹${item.rate.toFixed(2)}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">₹${item.value.toFixed(2)}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order - ${orderNumber}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              background-color: #fff;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
            }
            .company-name {
              font-size: 24px;
              font-weight: bold;
              color: #333;
              margin-bottom: 10px;
            }
            .order-title {
              font-size: 20px;
              color: #666;
              margin-bottom: 5px;
            }
            .order-number {
              font-size: 18px;
              font-weight: bold;
              color: #007AFF;
            }
            .order-details {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
            }
            .customer-info, .order-info {
              flex: 1;
              margin: 0 10px;
            }
            .section-title {
              font-size: 16px;
              font-weight: bold;
              color: #333;
              margin-bottom: 10px;
              border-bottom: 1px solid #ddd;
              padding-bottom: 5px;
            }
            .info-row {
              margin-bottom: 5px;
              font-size: 14px;
            }
            .label {
              font-weight: bold;
              color: #555;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            .items-table th {
              background-color: #f5f5f5;
              padding: 12px 8px;
              border: 1px solid #ddd;
              text-align: left;
              font-weight: bold;
              color: #333;
            }
            .items-table td {
              padding: 8px;
              border: 1px solid #ddd;
            }
            .total-section {
              text-align: right;
              margin-top: 20px;
            }
            .total-row {
              font-size: 16px;
              margin-bottom: 5px;
            }
            .total-amount {
              font-size: 20px;
              font-weight: bold;
              color: #333;
              border-top: 2px solid #333;
              padding-top: 10px;
              margin-top: 10px;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              font-size: 12px;
              color: #666;
              border-top: 1px solid #ddd;
              padding-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">${selectedCompany?.company || 'Company Name'}</div>
            <div class="order-title">${voucherType}</div>
            <div class="order-number">Order #${orderNumber}</div>
          </div>

          <div class="order-details">
            <div class="customer-info">
              <div class="section-title">Customer Details</div>
              <div class="info-row"><span class="label">Name:</span> ${customerName}</div>
              <div class="info-row"><span class="label">Address:</span> ${customerAddress || 'N/A'}</div>
              <div class="info-row"><span class="label">GSTIN:</span> ${customerGSTIN || 'N/A'}</div>
              <div class="info-row"><span class="label">Contact:</span> ${customerContact || 'N/A'}</div>
            </div>
            
            <div class="order-info">
              <div class="section-title">Order Information</div>
              <div class="info-row"><span class="label">Order Date:</span> ${new Date().toLocaleDateString('en-GB')}</div>
              <div class="info-row"><span class="label">Due Date:</span> ${dueDate}</div>
              <div class="info-row"><span class="label">Order Type:</span> ${voucherType}</div>
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>Item Description</th>
                <th style="text-align: center;">Quantity</th>
                <th style="text-align: right;">Rate</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="total-section">
            <div class="total-amount">Total Amount: ₹${parseFloat(totalAmount).toFixed(2)}</div>
          </div>

          <div class="footer">
            <p>Thank you for your business!</p>
            <p>Generated on ${new Date().toLocaleString('en-GB')}</p>
          </div>
        </body>
      </html>
    `;
  };

  // Generate and share order PDF
  const generateAndShareOrderPDF = async (orderData: any) => {
    try {
      const html = generateOrderHTML(orderData);
      const { uri } = await Print.printToFileAsync({ html });
      await shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf'
      });
    } catch (error) {
      Alert.alert('PDF Error', `Failed to generate PDF: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Handle order submission
  const handleAddItemDetails = () => {
    if (selectedItemIndex !== null) {
      const selectedItem = itemList[selectedItemIndex];
      router.push({
        pathname: '/item-details',
        params: {
          itemName: selectedItem.name,
          itemDescription: itemDescription || '', // Use current description if available
        }
      });
    }
  };

  const handleSubmitOrder = async () => {
    // Prevent multiple submissions
    if (isLoading) {
      console.log('⏸️ Order submission already in progress, ignoring duplicate call');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      if (!selectedCompany) {
        throw new Error('No company selected. Please select a company first.');
      }

      // Validate user session before proceeding
      console.log('🔍 Validating user session...');
      console.log('👤 User Data:', {
        hasUserData: !!userData,
        hasToken: !!userData?.token,
        tokenLength: userData?.token?.length,
        userId: userData?.id,
        userName: userData?.name
      });
      
      if (!userData || !userData.token) {
        throw new Error('No valid user session. Please login again.');
      }

      // Validate that the stored session matches the current user
      try {
        const storedToken = await secureStorage.getToken();
        const storedUserData = await secureStorage.getUserData();
        
        console.log('🔍 Session validation:', {
          currentUserToken: userData.token?.substring(0, 20) + '...',
          storedToken: storedToken?.substring(0, 20) + '...',
          currentUserName: userData.name,
          storedUserName: storedUserData?.name,
          tokensMatch: userData.token === storedToken,
          usersMatch: userData.name === storedUserData?.name
        });
        
        if (userData.token !== storedToken || userData.name !== storedUserData?.name) {
          console.log('⚠️ Session mismatch detected! Clearing session and redirecting to login...');
          await clearUserData();
          throw new Error('Session mismatch detected. Please login again.');
        }
        
        console.log('✅ Session validation passed');
      } catch (validationError) {
        console.log('❌ Session validation failed:', validationError);
        throw new Error('Session validation failed. Please login again.');
      }

      // Skip unnecessary API pre-checks to improve performance
      // The actual order creation will handle any connection or permission issues

      // Use voucher types loaded during company selection to get prefix and suffix for order number generation
      console.log('🚀 Starting order number generation with prefix/suffix...');
      let orderNumber = generateOrderNumber(); // Default fallback
      
      try {
        console.log('🔍 Using voucher types from company selection...');
        console.log('📋 Available Voucher Types from Config:', orderConfig.voucherTypes);
        console.log('📋 Voucher Types Loaded:', orderConfig.voucherTypesLoaded);
        
        if (orderConfig.voucherTypesLoaded && orderConfig.voucherTypes && orderConfig.voucherTypes.length > 0) {
          const voucherTypes = orderConfig.voucherTypes;
          const selectedVoucherTypeName = selectedVoucherType?.name || orderConfig.voucherTypeName;
          
          console.log('🎯 Selected Voucher Type Name:', selectedVoucherTypeName);
          
          // Find the matching voucher type
          const matchingVoucherType = voucherTypes.find((vt: any) => vt.NAME === selectedVoucherTypeName);
          
          console.log('🔍 Matching Voucher Type:', matchingVoucherType);
          
          if (matchingVoucherType) {
            const prefix = matchingVoucherType.PREFIX || '';
            const suffix = matchingVoucherType.SUFFIX || '';
            orderNumber = generateOrderNumberWithPrefixSuffix(prefix, suffix);
            console.log(`✅ Generated order number with prefix/suffix: ${prefix}[YYMMDDHHMMSS]${suffix} = ${orderNumber}`);
          } else {
            console.log(`⚠️ Voucher type '${selectedVoucherTypeName}' not found in loaded voucher types, using default format`);
            console.log('📋 Available voucher type names:', voucherTypes.map((vt: any) => vt.NAME));
          }
        } else {
          console.log('⚠️ Voucher types not loaded during company selection, using default order number format');
        }
      } catch (error) {
        console.log('⚠️ Error processing voucher types, using default order number format:', error);
      }
      
      // Use the order due date from the form - format as DD-MM-YYYY for Tally
      const dueDate = new Date(orderDueDate);
      const day = dueDate.getDate().toString().padStart(2, '0');
      const month = (dueDate.getMonth() + 1).toString().padStart(2, '0');
      const dueYear = dueDate.getFullYear();
      const formattedDueDate = `${day}-${month}-${dueYear}`;
      
      // Create order data
      const orderData = {
        companyName: selectedCompany.company,
        orderNumber,
        customerName,
        customerGSTIN,
        customerAddress,
        customerContact,
        customerPhone,
        customerMobile,
        customerEmail,
        customerPaymentTerms,
        customerDeliveryTerms,
        customerNarration,
        // GST and Address related fields from selected customer
        customerStateName: customerState || selectedCustomer?.stateName || '',
        customerCountry: customerCountry || selectedCustomer?.country || '',
        customerGSTType: selectedCustomer?.gstType,
        customerMailingName: selectedCustomer?.mailingName,
        customerPincode: customerPincode || selectedCustomer?.pincode || '',
        consigneeName: consigneeName || '',
        consigneeAddress: consigneeAddress || '',
        consigneeState: consigneeState || '',
        consigneeCountry: consigneeCountry || '',
        consigneePincode: consigneePincode || '',
        orderItems,
        totalAmount: getTotalAmount(),
        dueDate: formattedDueDate,
        voucherType: selectedVoucherType?.name || orderConfig.voucherTypeName,
        saveAsOptional: effectiveConfig.saveAsOptional
      };

      // Determine if order should be posted as optional
      let shouldPostAsOptional = effectiveConfig.saveAsOptional;
      let creditValidationReason = '';
      let creditValidationFailed = false;
      
      // Check credit conditions if permission is enabled (check BEFORE save_optional)
      // This allows restrictNewOrderGen to block orders even if save_optional is true
      if (effectiveConfig.showCreditDaysLimit && customerName) {
        const creditCheckStart = Date.now();
        console.log('🔍 Checking credit conditions for customer:', customerName);
        try {
          const creditValidation = await validateCreditConditions(
            selectedCompany.tallyloc_id.toString(),
            selectedCompany.company,
            selectedCompany.GUID,
            customerName,
            parseFloat(getTotalAmount())
          );
          
          const creditCheckEnd = Date.now();
          console.log(`⏱️ Credit validation took ${creditCheckEnd - creditCheckStart}ms`);
          
          if (creditValidation.shouldPostAsOptional) {
            shouldPostAsOptional = true;
            creditValidationFailed = true;
            creditValidationReason = creditValidation.reason || 'Credit conditions not met';
            console.log('⚠️ Credit validation failed:', creditValidationReason);

            // If ctrl_creditdayslimit is enabled, prevent order creation
            if (permissions.ctrlCreditDaysLimit) {
              console.log('🚫 Order creation restricted due to credit conditions');
              setIsLoading(false);
              
              // Build detailed error message
              let errorMessage = 'Order cannot be created:\n\n';
              if (creditValidation.creditLimitExceeded) {
                const creditInfo = creditValidation.creditLimitInfo;
                if (creditInfo) {
                  const creditLimit = Math.abs(creditInfo.CREDITLIMIT);
                  const currentBalance = Math.abs(creditInfo.CLOSINGBALANCE);
                  const availableCredit = creditLimit - currentBalance;
                  errorMessage += `• Credit Limit Exceeded\n`;
                  errorMessage += `  Credit Limit: ₹${creditLimit.toFixed(2)}\n`;
                  errorMessage += `  Current Balance: ₹${currentBalance.toFixed(2)}\n`;
                  errorMessage += `  Available Credit: ₹${availableCredit.toFixed(2)}\n`;
                  errorMessage += `  Order Value: ₹${parseFloat(getTotalAmount()).toFixed(2)}\n\n`;
                }
              }
              if (creditValidation.hasOverdueBills) {
                const overdueBills = creditValidation.overdueBills || [];
                errorMessage += `• Customer has ${overdueBills.length} overdue bill(s)\n`;
                if (overdueBills.length > 0) {
                  errorMessage += '\nOverdue Bills:\n';
                  overdueBills.slice(0, 3).forEach((bill, idx) => {
                    errorMessage += `  ${idx + 1}. Invoice: ${bill.REFNO}\n`;
                    errorMessage += `     Due: ${bill.DUEON} (${bill.OVERDUEDAYS} days overdue)\n`;
                    errorMessage += `     Amount: ₹${Math.abs(bill.CLOSINGBALANCE).toFixed(2)}\n`;
                  });
                  if (overdueBills.length > 3) {
                    errorMessage += `  ... and ${overdueBills.length - 3} more\n`;
                  }
                }
              }
              
              Alert.alert(
                '🚫 Order Restricted',
                errorMessage,
                [{ text: 'OK', style: 'default' }]
              );
              return;
            }
          } else {
            console.log('✅ Credit validation passed');
          }
        } catch (error) {
          console.error('❌ Error during credit validation:', error);
          // Continue with order creation even if credit validation fails
        }
      }
      
      // If credit validation didn't fail, check if save_optional is enabled
      if (!creditValidationFailed && effectiveConfig.saveAsOptional) {
        console.log('📌 Order will be posted as optional (save_optional is enabled)');
        shouldPostAsOptional = true;
      }

      // Update order data with credit validation result
      const finalOrderData = {
        ...orderData,
        saveAsOptional: shouldPostAsOptional
      };

      // Create Tally XML for order creation
      const tallyXml = createOrderXmlRequest(finalOrderData, orderConfig.showCustomerAddresses);
      
      // Log the order number being used
      console.log('🔢 Order Number with Prefix/Suffix:', orderNumber);
      
      // Log the complete XML being sent to Tally for debugging
      console.log('📄 Complete Tally XML Request:');
      console.log('='.repeat(80));
      console.log(tallyXml);
      console.log('='.repeat(80));

      // Send order to Tally via API
      console.log('🚀 Starting order creation process...');
      console.log('📊 Order Data:', {
        companyName: selectedCompany.company,
        orderNumber,
        customerName,
        totalAmount: getTotalAmount(),
        itemCount: orderItems.length
      });
        console.log('🔑 Auth Token (first 20 chars):', userData?.token?.substring(0, 20) + '...');
        console.log('🔑 API Service Token (first 20 chars):', apiService.getAuthToken()?.substring(0, 20) + '...');
        console.log('🔍 Token Match:', userData?.token === apiService.getAuthToken());
        console.log('🏢 Company Details:', {
          tallylocId: selectedCompany.tallyloc_id,
          company: selectedCompany.company,
          guid: selectedCompany.GUID
        });
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      try {
        // Use proxy for web development, direct connection for mobile
        const apiUrl = getApiUrl('/api/tally/tallydata');
        
        console.log('🌐 API URL:', apiUrl);
        console.log('📤 Request Headers:', {
          'Content-Type': 'application/xml',
          'Authorization': `Bearer ${userData?.token?.substring(0, 20)}...`,
          'x-tallyloc-id': selectedCompany.tallyloc_id,
          'x-company': selectedCompany.company,
          'x-guid': selectedCompany.GUID,
        });
        console.log('📄 XML Body Length:', tallyXml.length);
        console.log('📄 XML Body Preview:', tallyXml.substring(0, 200) + '...');
        
        // Use API service token instead of userData token for consistency
        const authToken = apiService.getAuthToken() || userData?.token;
        console.log('🔑 Using Auth Token:', authToken?.substring(0, 20) + '...');
        
        const tallyRequestStart = Date.now();
        console.log('🚀 Sending order to Tally...');
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/xml',
            'Authorization': `Bearer ${authToken}`,
            'x-tallyloc-id': selectedCompany.tallyloc_id,
            'x-company': selectedCompany.company,
            'x-guid': selectedCompany.GUID,
          },
          body: tallyXml,
          signal: controller.signal
        });
        
        const tallyRequestEnd = Date.now();
        console.log(`⏱️ Tally request took ${tallyRequestEnd - tallyRequestStart}ms`);
        console.log('📥 Response Status:', response.status);
        console.log('📥 Response Headers:', Object.fromEntries(response.headers.entries()));
        
        clearTimeout(timeoutId);

        if (response.ok) {
          const responseText = await response.text();
          console.log('✅ Response OK - Processing Tally response...');
          console.log('📄 Response Text Length:', responseText.length);
          console.log('📄 Response Text Preview:', responseText.substring(0, 300) + '...');
          
          // Process Tally response
          
          // Check if Tally actually created the order
          const createdMatch = responseText.match(/<CREATED>(\d+)<\/CREATED>/);
          const errorsMatch = responseText.match(/<ERRORS>(\d+)<\/ERRORS>/);
          const exceptionsMatch = responseText.match(/<EXCEPTIONS>(\d+)<\/EXCEPTIONS>/);
          
          const created = createdMatch ? parseInt(createdMatch[1]) : 0;
          const errors = errorsMatch ? parseInt(errorsMatch[1]) : 0;
          const exceptions = exceptionsMatch ? parseInt(exceptionsMatch[1]) : 0;
          
          console.log('📊 Tally Response Analysis:', {
            created,
            errors,
            exceptions,
            createdMatch: createdMatch?.[0],
            errorsMatch: errorsMatch?.[0],
            exceptionsMatch: exceptionsMatch?.[0]
          });
          
          if (created > 0) {
            // Success - Process payment if enabled
            if (orderConfig.promptForOnlinePayment) {
              // Check if we're in a web environment
              if (typeof window !== 'undefined' && window.confirm && window.alert) {
                // Web environment - use window.confirm
                const shouldPayNow = window.confirm(
                  `Order created successfully!\n\nOrder Number: ${orderNumber}\nTotal Amount: ₹${getTotalAmount()}\n\nWould you like to make an online payment now?`
                );
                
                if (shouldPayNow) {
                  // Proceed with payment
                  console.log('💳 User chose to pay now - Initiating Razorpay payment...');
                  
                  // Create order data for payment
                  const orderData = {
                    id: `order_${Date.now()}`,
                    amount: Math.round(getTotalAmount() * 100), // Convert to paise
                    currency: 'INR',
                    status: 'created',
                    receipt: `receipt_${orderNumber}`,
                    created_at: Date.now()
                  };
                  
                  // Set current order and show payment modal
                  setCurrentOrder(orderData);
                  setShowPaymentModal(true);
                  setPaymentStatus('processing');
                  setPaymentError(null);
                } else {
                  // User chose to pay later
                  window.alert(
                    `Order Created Successfully!\n\nOrder Number: ${orderNumber}\nTotal Amount: ₹${getTotalAmount()}\n\nYou can collect payment later.`
                  );
                  clearForm();
                }
              } else {
                // React Native environment - use Alert with buttons
                Alert.alert(
                  'Online Payment Available',
                  `Order created successfully!\n\nOrder Number: ${orderNumber}\nTotal Amount: ₹${getTotalAmount()}\n\nWould you like to make an online payment now?`,
                  [
                    {
                      text: 'Pay Later',
                      style: 'cancel',
                      onPress: () => {
                        // Clear form and show success message
                        Alert.alert(
                          'Order Created Successfully!',
                          `Order Number: ${orderNumber}\nTotal Amount: ₹${getTotalAmount()}\n\nYou can collect payment later.`
                        );
                        clearForm();
                      }
                    },
                    {
                      text: 'Pay Now',
                      onPress: () => {
                        // Proceed with payment
                        console.log('💳 User chose to pay now - Initiating Razorpay payment...');
                        
                        // Create order data for payment
                        const orderData = {
                          id: `order_${Date.now()}`,
                          amount: Math.round(getTotalAmount() * 100), // Convert to paise
                          currency: 'INR',
                          status: 'created',
                          receipt: `receipt_${orderNumber}`,
                          created_at: Date.now()
                        };
                        
                        // Set current order and show payment modal
                        setCurrentOrder(orderData);
                        setShowPaymentModal(true);
                        setPaymentStatus('processing');
                        setPaymentError(null);
                      }
                    }
                  ]
                );
              }
              return; // Exit early to show payment prompt
            }

            // Success - show alert and conditionally prompt for PDF generation (when payment is disabled)
            if (orderConfig.showOrderPdfShareOption) {
      const orderData = {
        companyName: selectedCompany?.company || '',
        orderNumber,
        customerName,
        customerGSTIN,
        customerAddress,
        customerContact,
        customerPhone,
        customerMobile,
        customerEmail,
        // GST and Address related fields from selected customer
        customerStateName: customerState || selectedCustomer?.stateName || '',
        customerCountry: customerCountry || selectedCustomer?.country || '',
        customerGSTType: selectedCustomer?.gstType,
        customerMailingName: selectedCustomer?.mailingName,
        customerPincode: customerPincode || selectedCustomer?.pincode || '',
        consigneeName: consigneeName || '',
        consigneeAddress: consigneeAddress || '',
        consigneeState: consigneeState || '',
        consigneeCountry: consigneeCountry || '',
        consigneePincode: consigneePincode || '',
        orderItems,
        totalAmount: getTotalAmount(),
        dueDate: formattedDueDate,
        voucherType: selectedVoucherType?.name || orderConfig.voucherTypeName,
        saveAsOptional: effectiveConfig.saveAsOptional
      };

      // Create order data

              // Process order data

              // Check if we're in a web environment with window.confirm available
              if (typeof window !== 'undefined' && window.confirm && window.alert) {
                // Web environment - use window.confirm
                const shouldGeneratePDF = window.confirm(
                  `Order created successfully in Tally!\n\nOrder Number: ${orderNumber}\nTotal Amount: ₹${getTotalAmount()}\n\nWould you like to generate and share a PDF of this order?`
                );
                
                if (shouldGeneratePDF) {
                  // Generate and share PDF
                  await generateAndShareOrderPDF(orderData);
                }
                
                // Clear form after PDF generation or if user cancels
                clearForm();
              } else {
                // React Native environment - use Alert with buttons
                Alert.alert(
                  'Order Created Successfully!',
                  `Order Number: ${orderNumber}\nTotal Amount: ₹${getTotalAmount()}\n\nWould you like to generate and share a PDF of this order?`,
                  [
                    {
                      text: 'No',
                      style: 'cancel',
                      onPress: () => clearForm()
                    },
                    {
                      text: 'Yes',
                      onPress: async () => {
                        await generateAndShareOrderPDF(orderData);
                        clearForm();
                      }
                    }
                  ]
                );
              }
            } else {
              // PDF sharing option is disabled - just show success message and clear form
            if (typeof window !== 'undefined' && window.alert) {
              window.alert(`Order created successfully in Tally!\n\nOrder Number: ${orderNumber}\nTotal Amount: ₹${getTotalAmount()}`);
              } else {
                Alert.alert(
                  'Order Created Successfully!',
                  `Order Number: ${orderNumber}\nTotal Amount: ₹${getTotalAmount()}`
                );
            }
            clearForm();
            }
          } else {
            // Extract LINEERROR messages for better error reporting
            const lineErrors = responseText.match(/<LINEERROR>(.*?)<\/LINEERROR>/g);
            const errorMessages = lineErrors ? lineErrors.map(error => 
              error.replace(/<LINEERROR>|<\/LINEERROR>/g, '').trim()
            ) : [];
            
            let errorMessage = `Tally could not create the order.\n\nCreated: ${created}\nErrors: ${errors}\nExceptions: ${exceptions}`;
            
            if (errorMessages.length > 0) {
              errorMessage += '\n\nSpecific Errors:\n' + errorMessages.join('\n');
            }
            
            if (typeof window !== 'undefined' && window.alert) {
              window.alert('Order Creation Failed\n\n' + errorMessage);
            }
          }
        } else {
          const errorText = await response.text();
          console.log('❌ Response NOT OK - Error Details:');
          console.log('📊 Error Status:', response.status);
          console.log('📄 Error Text:', errorText);
          console.log('🔍 Error Headers:', Object.fromEntries(response.headers.entries()));
          
          // Try to parse JSON error if possible
          try {
            const errorJson = JSON.parse(errorText);
            console.log('📄 Parsed Error JSON:', errorJson);
          } catch (e) {
            console.log('📄 Error text is not JSON, raw text:', errorText);
          }
          
          // Provide more specific error message for 403 errors
          let errorMessage = `Failed to create order in Tally. Status: ${response.status}\nError: ${errorText}`;
          
          if (response.status === 403) {
            errorMessage = `Access Denied: You don't have permission to create orders for "${selectedCompany.company}".\n\nThis could be because:\n• You're not authorized for this company\n• Your session has expired\n• The company access has been revoked\n\nPlease try:\n• Selecting a different company\n• Logging out and logging back in\n• Contacting support if the issue persists`;
          }
          
          if (typeof window !== 'undefined' && window.alert) {
            window.alert(errorMessage);
          }
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        console.log('🚨 Fetch Error Details:');
        console.log('📊 Error Name:', fetchError.name);
        console.log('📄 Error Message:', fetchError.message);
        console.log('📄 Error Stack:', fetchError.stack);
        
        if (fetchError.name === 'AbortError') {
          console.log('⏰ Request timed out');
          if (typeof window !== 'undefined' && window.alert) {
            window.alert('Request timed out. Please try again.');
          }
        } else {
          console.log('🚨 Re-throwing fetch error');
          throw fetchError;
        }
      }
    } catch (error: any) {
      console.log('🚨 General Error Details:');
      console.log('📄 Error Message:', error?.message);
      console.log('📄 Error Stack:', error?.stack);
      console.log('📄 Full Error Object:', error);
      
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(`Failed to create order: ${error?.message || 'Unknown error'}\n\nPlease check your connection and try again.`);
      }
    } finally {
      console.log('🏁 Order creation process completed');
      setIsLoading(false);
    }
  };

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

  return (
    // TEMPORARILY DISABLED FOR PERFORMANCE TESTING
    // <MasterDataLoader>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        {/* Header */}
        <OrderHeader
          showMenu={showMenu}
          onMenuPress={handleMenuPress}
          onNavigation={handleNavigationWithMenu}
          selectedCompany={selectedCompany}
        />

        <View style={styles.contentContainer}>
        <ScrollView style={styles.scrollContent}>
          <View style={styles.content}>
            {/* Order Form */}
            <OrderForm
              selectedCustomer={selectedCustomer}
              selectedItemIndex={selectedItemIndex}
              itemQuantity={itemQuantity}
              itemRate={itemRate}
              itemDiscountPercent={itemDiscountPercent}
              itemTaxPercent={itemTaxPercent}
              itemValue={itemValue}
              itemBatch={itemBatch}
              orderItems={orderItems}
              orderConfig={orderConfig}
              itemList={itemList}
              customers={customers}
              voucherTypes={voucherTypes}
              selectedVoucherType={selectedVoucherType}
              isLoadingVoucherTypes={isLoadingVoucherTypes}
              onItemQuantityChange={setItemQuantity}
              onItemRateChange={setItemRate}
              onItemDiscountPercentChange={setItemDiscountPercent}
              onItemValueChange={setItemValue}
              onItemBatchChange={setItemBatch}
              onAddItemToOrder={addItemToOrder}
              onAddItemDetails={(itemId?: string) => {
                if (itemId) {
                  // Called from 3-dots menu - find the item in orderItems
                  const item = orderItems.find(i => i.id === itemId);
                  if (item) {
                    router.push({
                      pathname: '/item-details',
                      params: {
                        itemName: item.name,
                        itemDescription: item.description || '',
                      }
                    });
                  }
                } else {
                  // Called from "Add Item Details" button - use currently selected item
                  if (selectedItemIndex !== null && itemList[selectedItemIndex]) {
                    const selectedItem = itemList[selectedItemIndex];
                    router.push({
                      pathname: '/item-details',
                      params: {
                        itemName: selectedItem.name,
                        itemDescription: itemDescription || '',
                      }
                    });
                  }
                }
              }}
              onRemoveItemFromOrder={removeItemFromOrder}
              onEditItemInOrder={editItemInOrder}
              onCheckItemStock={handleCheckItemStock}
              onOpenItemDropdown={() => setShowItemDropdown(true)}
              onOpenCustomerDropdown={() => setShowCustomerDropdown(true)}
              onOpenVoucherTypeDropdown={() => setShowVoucherTypeDropdown(true)}
              onVoucherTypeSelect={(voucherType) => {
                setSelectedVoucherType(voucherType);
              }}
              quantityInputRef={quantityInputRef}
              amountInputRef={amountInputRef}
              setIsScannerVisible={setIsScannerVisible}
            />



          </View>
          </ScrollView>

          {/* Fixed Action Buttons at Bottom */}
          <View style={styles.fixedActionContainer}>
          {orderConfig.showCustomerAddresses && (
            <TouchableOpacity 
              style={styles.addDetailsButton}
              onPress={() => {
                router.push({
                  pathname: '/customer-details',
                  params: {
                    contact: customerContact,
                    phone: customerPhone,
                    mobile: customerMobile,
                    email: customerEmail,
                    address: customerAddress,
                    pincode: customerPincode,
                    state: customerState,
                    country: customerCountry,
                    gstin: customerGSTIN,
                    paymentTerms: customerPaymentTerms,
                    deliveryTerms: customerDeliveryTerms,
                    narration: customerNarration,
                    orderDueDate: orderDueDate,
                    consigneeName: consigneeName,
                    consigneeAddress: consigneeAddress,
                    consigneeState: consigneeState,
                    consigneeCountry: consigneeCountry,
                    consigneePincode: consigneePincode,
                  }
                });
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.addDetailsButtonText}>📝 Add details</Text>
            </TouchableOpacity>
          )}
          
            {/* Payment Status Indicator */}
            {orderConfig.promptForOnlinePayment && paymentStatus !== 'idle' && (
              <View style={styles.paymentStatusContainer}>
                {paymentStatus === 'processing' && (
                  <Text style={styles.paymentStatusText}>
                    💳 Processing payment...
                  </Text>
                )}
                {paymentStatus === 'success' && (
                  <Text style={[styles.paymentStatusText, styles.paymentSuccess]}>
                    ✅ Payment successful!
                  </Text>
                )}
                {paymentStatus === 'failed' && (
                  <Text style={[styles.paymentStatusText, styles.paymentFailed]}>
                    ❌ Payment failed: {paymentError}
                  </Text>
                )}
              </View>
            )}
            
            <SubmitButton
              isLoading={isLoading || paymentStatus === 'processing'}
              onPress={handleSubmitOrder}
            />
          </View>
        </View>

      {/* Item Dropdown Modal */}
      <Modal
        visible={showItemDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowItemDropdown(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Item</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowItemDropdown(false)}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            <LightweightItemList
              items={itemList}
              selectedCustomer={selectedCustomer}
              orderConfig={orderConfig}
              onItemSelect={handleItemSelect}
              loading={loadingItems}
            />
          </View>
        </View>
      </Modal>

      {/* Customer Dropdown Modal */}
      <Modal
        visible={showCustomerDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCustomerDropdown(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Customer</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowCustomerDropdown(false)}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            <LightweightCustomerList
              customers={customers}
              onCustomerSelect={handleCustomerSelect}
              loading={loadingCustomers}
            />
          </View>
        </View>
      </Modal>

      {/* Voucher Type Dropdown Modal */}
      <Modal
        visible={showVoucherTypeDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowVoucherTypeDropdown(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <VoucherTypeList
              voucherTypes={voucherTypes}
              selectedVoucherType={selectedVoucherType}
              onVoucherTypeSelect={setSelectedVoucherType}
              onClose={() => setShowVoucherTypeDropdown(false)}
            />
          </View>
        </View>
      </Modal>

      {/* Barcode Scanner */}
      {isScannerVisible && (
        <BarcodeScanner
          isVisible={isScannerVisible}
          onClose={() => {
            setIsScannerVisible(false)
            setShowItemDropdown(false)
          }}
          onScan={handleBarcodeScan}
        />
      )}

      {/* Razorpay Payment Modal */}
      <RazorpayWebCheckout
        visible={showPaymentModal}
        onClose={handleClosePayment}
        amount={currentOrder?.amount || 0}
        orderId={currentOrder?.id || ''}
        rzpKey={orderConfig.razorpayKeyId}
        customerName={customerName}
        description={orderConfig.razorpayDescription}
        companyName={orderConfig.razorpayCompanyName}
        onSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
      />

      {/* Godown Stock Modal */}
      <Modal
        visible={showGodownStock}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowGodownStock(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.godownStockModal}>
            <View style={styles.godownStockHeader}>
              <Text style={styles.godownStockTitle}>
                Godown Stock - {selectedItemForStock?.name}
              </Text>
              <TouchableOpacity
                onPress={() => setShowGodownStock(false)}
                style={styles.godownStockCloseButton}
              >
                <Text style={styles.godownStockCloseText}>✕</Text>
              </TouchableOpacity>
        </View>

            <ScrollView style={styles.godownStockContent}>
              {/* Godown Stock Section */}
              {permissions.showGodownBrkup && (
              <View style={styles.stockSection}>
                <Text style={styles.stockSectionTitle}>📦 Godown Stock</Text>
                {loadingGodownStock ? (
                  <View style={styles.godownStockLoadingContainer}>
                    <Text style={styles.godownStockLoadingText}>Loading godown stock...</Text>
                  </View>
                ) : godownStockData ? (
                  <View>
                    {godownStockData.godownStocks && godownStockData.godownStocks.length > 0 ? (
                      <>
                        <View style={styles.godownStockSummary}>
                          <Text style={styles.godownStockSummaryText}>
                            Total Godowns: {godownStockData.totalGodowns || godownStockData.godownStocks.length}
                          </Text>
                          {godownStockData.currentDate && (
                            <Text style={styles.godownStockDate}>
                              As on: {godownStockData.currentDate}
                            </Text>
                          )}
                        </View>
                        {godownStockData.godownStocks.map((godown: any, index: number) => (
                          <View key={index} style={styles.godownStockItem}>
                            <View style={styles.godownStockItemHeader}>
                              <Text style={styles.godownStockName}>
                                {godown.NAME || godown.name || 'Main Godown'}
                              </Text>
                              <Text style={[
                                styles.godownStockQty,
                                godown.CLOSINGSTOCK < 0 && styles.godownStockQtyNegative
                              ]}>
                                {permissions.showClsStckYesno 
                                  ? (godown.CLOSINGSTOCK > 0 ? 'Yes' : 'No')
                                  : (godown.CLOSINGSTOCK || godown.closingStock || 0)
                                }
                              </Text>
                            </View>
                          </View>
                        ))}
                      </>
                    ) : (
                      <View style={styles.godownStockEmptyContainer}>
                        <Text style={styles.godownStockEmptyText}>
                          No godown stock data available
                        </Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.godownStockEmptyContainer}>
                    <Text style={styles.godownStockEmptyText}>
                      No godown stock information available
                    </Text>
                  </View>
                )}
              </View>
              )}

              {/* Company Stock Section */}
              {permissions.showMultiCoBrkup && (
              <View style={styles.stockSection}>
                <Text style={styles.stockSectionTitle}>🏢 Company Stock</Text>
                {loadingCompanyStock ? (
                  <View style={styles.godownStockLoadingContainer}>
                    <Text style={styles.godownStockLoadingText}>Loading company stock...</Text>
                  </View>
                ) : companyStockData ? (
                  <View>
                    {companyStockData.companyStocks && companyStockData.companyStocks.length > 0 ? (
                      <>
                        <View style={styles.godownStockSummary}>
                          <Text style={styles.godownStockSummaryText}>
                            Total Companies: {companyStockData.totalCompanies || companyStockData.companyStocks.length}
                          </Text>
                          <View style={styles.companyLegend}>
                            <View style={styles.legendItem}>
                              <View style={[styles.legendColor, styles.legendColorOwned]} />
                              <Text style={styles.legendText}>Owned ({companyStockData.ownedCount || 0})</Text>
                            </View>
                            <View style={styles.legendItem}>
                              <View style={[styles.legendColor, styles.legendColorShared]} />
                              <Text style={styles.legendText}>Shared ({companyStockData.sharedCount || 0})</Text>
                            </View>
                          </View>
                          {companyStockData.currentDate && (
                            <Text style={styles.godownStockDate}>
                              As on: {companyStockData.currentDate}
                            </Text>
                          )}
                        </View>
                        {companyStockData.companyStocks.map((company: any, index: number) => (
                          <View key={index} style={[
                            styles.companyStockItem,
                            company.ACCESS_TYPE === 'OWNED' ? styles.companyStockOwned : styles.companyStockShared
                          ]}>
                            <View style={styles.godownStockItemHeader}>
                              <Text style={styles.godownStockName}>
                                {company.NAME || company.name || 'Unknown Company'}
                              </Text>
                              <Text style={[
                                styles.godownStockQty,
                                company.CLOSINGSTOCK < 0 && styles.godownStockQtyNegative
                              ]}>
                                {permissions.showClsStckYesno 
                                  ? (company.CLOSINGSTOCK > 0 ? 'Yes' : 'No')
                                  : (company.CLOSINGSTOCK || company.closingStock || 0)
                                }
                              </Text>
                            </View>
                          </View>
                        ))}
                      </>
                    ) : (
                      <View style={styles.godownStockEmptyContainer}>
                        <Text style={styles.godownStockEmptyText}>
                          No company stock data available
                        </Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.godownStockEmptyContainer}>
                    <Text style={styles.godownStockEmptyText}>
                      No company stock information available
                    </Text>
                  </View>
                )}
              </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      </SafeAreaView>
      // TEMPORARILY DISABLED FOR PERFORMANCE TESTING
      // </MasterDataLoader>
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
  scrollContent: {
    flex: 1,
    paddingBottom: 120, // Space for fixed action container
  },
  fixedActionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingBottom: 20, // Extra padding for safe area
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 1000,
    flexDirection: 'row',
    gap: 12,
  },
  addDetailsButton: {
    flex: 1,
    backgroundColor: '#5D8277',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  addDetailsButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  content: {
    flex: 1,
    paddingTop: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '100%',
    height: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  paymentStatusContainer: {
    marginBottom: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  paymentStatusText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  paymentSuccess: {
    color: '#28a745',
  },
  paymentFailed: {
    color: '#dc3545',
  },
  godownStockModal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    marginTop: 60,
    flex: 1,
    maxHeight: '80%',
  },
  godownStockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  godownStockTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  godownStockCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  godownStockCloseText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
  },
  godownStockContent: {
    flex: 1,
    padding: 12,
  },
  stockSection: {
    marginBottom: 16,
  },
  stockSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  godownStockSummary: {
    backgroundColor: '#e3f2fd',
    borderRadius: 6,
    padding: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#bbdefb',
  },
  godownStockSummaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 2,
  },
  godownStockDate: {
    fontSize: 11,
    color: '#1976d2',
    fontStyle: 'italic',
  },
  godownStockLoadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  godownStockLoadingText: {
    fontSize: 16,
    color: '#666',
  },
  godownStockItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    padding: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  godownStockItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  godownStockName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  godownStockQty: {
    fontSize: 14,
    fontWeight: '600',
    color: '#28a745',
  },
  godownStockQtyNegative: {
    color: '#dc3545',
  },
  godownStockBatch: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  godownStockEmptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  godownStockEmptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  companyStockItem: {
    borderRadius: 6,
    padding: 8,
    marginBottom: 6,
    borderWidth: 1,
  },
  companyStockOwned: {
    backgroundColor: '#e8f5e9',
    borderColor: '#a5d6a7',
  },
  companyStockShared: {
    backgroundColor: '#fff3e0',
    borderColor: '#ffcc80',
  },
  companyNameContainer: {
    flex: 1,
    marginRight: 8,
  },
  companyAccessType: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
    fontStyle: 'italic',
  },
  companyLegend: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
    borderWidth: 1,
  },
  legendColorOwned: {
    backgroundColor: '#e8f5e9',
    borderColor: '#a5d6a7',
  },
  legendColorShared: {
    backgroundColor: '#fff3e0',
    borderColor: '#ffcc80',
  },
  legendText: {
    fontSize: 10,
    color: '#666',
  },
});
