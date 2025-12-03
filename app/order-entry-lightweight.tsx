import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useOrderEntry } from '../src/hooks/useOrderEntry';
import { useUser } from '../src/context/UserContext';
import { useConfiguration } from '../src/context/ConfigurationContext';
import { useEffectiveConfig } from '../src/hooks/useEffectiveConfig';
import { LightweightOrderForm } from '../src/components/order/LightweightOrderForm';
import { createOrderXmlRequest, escapeXmlValue, generateOrderNumber, generateOrderNumberWithPrefixSuffix } from '../src/utils/tallyXmlRequests';
import { validateCreditConditions } from '../src/utils/creditValidation';
import { API_CONFIG } from '../src/config/api';
import { apiService } from '../src/services/api';
import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';

export default function OrderEntryLightweightPage() {
  const { userData } = useUser();
  const { orderConfig } = useConfiguration();
  const effectiveConfig = useEffectiveConfig();
  const {
    // State
    selectedCustomer,
    customerName,
    itemQuantity,
    itemRate,
    itemValue,
    orderItems,
    orderDueDate,
    isLoading,
    loadingItems,
    loadingCustomers,
    itemList,
    customers,
    selectedCompany,
    
    // Actions
    setCustomerName,
    setItemQuantity,
    setItemRate,
    setItemValue,
    setIsLoading,
    
    // Handlers
    handleItemSelect,
    handleCustomerSelect,
    addItemToOrder,
    removeItemFromOrder,
    getTotalAmount,
    validateForm,
    clearForm,
    resetForm,
    handleBack,
    handleNavigation,
  } = useOrderEntry();

  // Menu state
  const [showMenu, setShowMenu] = useState(false);

  const handleMenuPress = () => {
    setShowMenu(!showMenu);
  };

  const handleNavigationWithMenu = (route: string) => {
    setShowMenu(false);
    handleNavigation(route);
  };

  // Reset form when page comes into focus
  useFocusEffect(
    React.useCallback(() => {
      resetForm();
      return () => {
        // Additional cleanup when page loses focus
      };
    }, [resetForm])
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
  const handleSubmitOrder = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      if (!selectedCompany) {
        throw new Error('No company selected. Please select a company first.');
      }

      if (!userData?.token) {
        throw new Error('Authentication token not found. Please login again.');
      }

      // Use voucher types loaded during company selection to get prefix and suffix for order number generation
      console.log('🚀 Starting order number generation with prefix/suffix...');
      let orderNumber = generateOrderNumber(); // Default fallback
      
      try {
        console.log('🔍 Using voucher types from company selection...');
        console.log('📋 Available Voucher Types from Config:', orderConfig.voucherTypes);
        console.log('📋 Voucher Types Loaded:', orderConfig.voucherTypesLoaded);
        
        if (orderConfig.voucherTypesLoaded && orderConfig.voucherTypes && orderConfig.voucherTypes.length > 0) {
          const voucherTypes = orderConfig.voucherTypes;
          const selectedVoucherTypeName = selectedVoucherType?.name || 'Sales Order'; // Default voucher type
          
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
      
      // Create order data
      const orderData = {
        companyName: selectedCompany.company,
        orderNumber,
        customerName,
        customerGSTIN: selectedCustomer?.gstin || '',
        customerAddress: selectedCustomer?.address || '',
        customerContact: selectedCustomer?.contact || '',
        customerPhone: selectedCustomer?.phone || '',
        customerMobile: selectedCustomer?.mobile || '',
        customerEmail: selectedCustomer?.email || '',
        orderItems,
        totalAmount: getTotalAmount(),
        dueDate: orderDueDate,
        voucherType: 'Sales Order',
        saveAsOptional: orderConfig.saveAsOptional
      };

      // Check credit conditions if permission is enabled
      let shouldPostAsOptional = orderConfig.saveAsOptional;
      let creditValidationReason = '';
      
      if (effectiveConfig.showCreditDaysLimit && customerName) {
        console.log('🔍 Checking credit conditions for customer (Lightweight):', customerName);
        try {
          const creditValidation = await validateCreditConditions(
            selectedCompany.tallyloc_id.toString(),
            selectedCompany.company,
            selectedCompany.GUID,
            customerName,
            getTotalAmount()
          );
          
          if (creditValidation.shouldPostAsOptional) {
            shouldPostAsOptional = true;
            creditValidationReason = creditValidation.reason || 'Credit conditions not met';
            console.log('⚠️ Credit validation failed (Lightweight):', creditValidationReason);
          } else {
            console.log('✅ Credit validation passed (Lightweight)');
          }
        } catch (error) {
          console.error('❌ Error during credit validation (Lightweight):', error);
          // Continue with order creation even if credit validation fails
        }
      }

      // Update order data with credit validation result
      const finalOrderData = {
        ...orderData,
        saveAsOptional: shouldPostAsOptional
      };

      // Create Tally XML request
      const tallyXml = createOrderXmlRequest(finalOrderData);
      
      // Log the order number being used
      console.log('🔢 Order Number with Prefix/Suffix (Lightweight):', orderNumber);
      
      // Log the complete XML being sent to Tally for debugging
      console.log('📄 Complete Tally XML Request (Lightweight):');
      console.log('='.repeat(80));
      console.log(tallyXml);
      console.log('='.repeat(80));
      
      // Set up timeout for the request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        // Determine API URL based on platform
        const isWeb = Platform.OS === 'web';
        const isLocalhost = typeof window !== 'undefined' && 
          (window?.location?.hostname === 'localhost' || window?.location?.hostname === '127.0.0.1');
        
        const apiUrl = isWeb && isLocalhost 
          ? 'http://localhost:3000/api/tally/tallydata'
          : `${API_CONFIG.BASE_URL}/api/tally/tallydata`;
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/xml',
            'Authorization': `Bearer ${userData.token}`,
            'x-tallyloc-id': selectedCompany.tallyloc_id,
            'x-company': selectedCompany.company,
            'x-guid': selectedCompany.GUID,
          },
          body: tallyXml,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (response.ok) {
          const responseText = await response.text();
          
          // Check if Tally actually created the order
          const createdMatch = responseText.match(/<CREATED>(\d+)<\/CREATED>/);
          const errorsMatch = responseText.match(/<ERRORS>(\d+)<\/ERRORS>/);
          const exceptionsMatch = responseText.match(/<EXCEPTIONS>(\d+)<\/EXCEPTIONS>/);
          
          const created = createdMatch ? parseInt(createdMatch[1]) : 0;
          const errors = errorsMatch ? parseInt(errorsMatch[1]) : 0;
          const exceptions = exceptionsMatch ? parseInt(exceptionsMatch[1]) : 0;
          
          if (created > 0) {
            // Success - conditionally prompt for PDF generation based on configuration
            if (orderConfig.showOrderPdfShareOption) {
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
          if (typeof window !== 'undefined' && window.alert) {
            window.alert(`Failed to create order in Tally. Status: ${response.status}\nError: ${errorText}`);
          }
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          if (typeof window !== 'undefined' && window.alert) {
            window.alert('Request timed out. Please try again.');
          }
        } else {
          throw fetchError;
        }
      }
    } catch (error: any) {
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(`Failed to create order: ${error?.message || 'Unknown error'}\n\nPlease check your connection and try again.`);
      }
    } finally {
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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Entry</Text>
        <TouchableOpacity style={styles.menuButton} onPress={handleMenuPress}>
          <Text style={styles.menuButtonText}>☰</Text>
        </TouchableOpacity>
      </View>

      

      {/* Menu */}
      {showMenu && (
        <View style={styles.menu}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleNavigationWithMenu('dashboard')}
          >
            <Text style={styles.menuItemText}>Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleNavigationWithMenu('company-selection')}
          >
            <Text style={styles.menuItemText}>Change Company</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleNavigationWithMenu('configuration')}
          >
            <Text style={styles.menuItemText}>Configuration</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleNavigationWithMenu('logout')}
          >
            <Text style={styles.menuItemText}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Order Form */}
      <LightweightOrderForm
        selectedCustomer={selectedCustomer}
        customerName={customerName}
        itemQuantity={itemQuantity}
        itemRate={itemRate}
        itemValue={itemValue}
        orderItems={orderItems}
        loadingItems={loadingItems}
        loadingCustomers={loadingCustomers}
        itemList={itemList}
        customers={customers}
        selectedItemIndex={selectedItemIndex}
        orderConfig={orderConfig}
        setCustomerName={setCustomerName}
        setItemQuantity={setItemQuantity}
        setItemRate={setItemRate}
        setItemValue={setItemValue}
        handleItemSelect={handleItemSelect}
        handleCustomerSelect={handleCustomerSelect}
        addItemToOrder={addItemToOrder}
        removeItemFromOrder={removeItemFromOrder}
        getTotalAmount={getTotalAmount}
      />

      {/* Submit Button */}
      {orderItems.length > 0 && (
        <View style={styles.submitContainer}>
          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmitOrder}
            disabled={isLoading}
          >
            <Text style={styles.submitButtonText}>
              {isLoading ? 'Creating Order...' : 'Create Order'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 20,
    color: '#333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuButtonText: {
    fontSize: 20,
    color: '#333',
  },

  menu: {
    position: 'absolute',
    top: 80,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000,
  },
  menuItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
  },
  submitContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
});


