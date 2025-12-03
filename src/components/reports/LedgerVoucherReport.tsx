import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PeriodSelector } from '../common/PeriodSelector';
import { LightweightList, LedgerRenderer, StandardHeader } from '../common';
import ReportsMenu from './ReportsMenu';
import { useReportsMenu } from '../../hooks';
import { useMasterData } from '../../context/MasterDataContext';
import { apiService } from '../../services/api';
import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { convertNumberToWords } from '../../utils/numberToWords';

interface LedgerVoucherReportProps {
  companyName?: string;
  tallylocId?: string;
  guid?: string;
}

interface Ledger {
  id: string;
  name: string;
}

interface LedgerVoucherEntry {
  id: string;
  description: string;
  date: string;
  reference: string;
  debit: number;
  credit: number;
  balance: number;
  allLedgerEntries?: Array<{
    ledgerName: string;
    debitAmt: number;
    creditAmt: number;
  }>;
  // Raw data for detail view
  rawData?: any;
}

interface LedgerVoucherData {
  ledgerName: string;
  entries: LedgerVoucherEntry[];
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
}

  // Voucher Detail Modal Component
  const VoucherDetailModal: React.FC<{
    visible: boolean;
    voucher: any;
    onClose: () => void;
    companyName?: string;
  }> = ({ visible, voucher, onClose, companyName }) => {
    // Early return if no voucher data
    if (!voucher) {
      return null;
    }
    
    // Get customer data from context
    const { customers } = useMasterData();
    
  // Three dots menu state for voucher modal
  const [showVoucherThreeDotsMenu, setShowVoucherThreeDotsMenu] = useState(false);
  
  // Print state to prevent multiple simultaneous requests
  const [isPrinting, setIsPrinting] = useState(false);
    
    // Handle three dots menu press for voucher modal
    const handleVoucherThreeDotsPress = () => {
      setShowVoucherThreeDotsMenu(!showVoucherThreeDotsMenu);
    };
    
    // Close three dots menu for voucher modal
    const closeVoucherThreeDotsMenu = () => {
      setShowVoucherThreeDotsMenu(false);
    };

  // Print voucher function - using same approach as main report
  const handlePrintVoucher = async (voucherData: any) => {
    if (isPrinting) {
      Alert.alert('Please wait', 'A print request is already in progress');
      return;
    }
    
    setIsPrinting(true);
    try {
      const html = generateVoucherHTML(voucherData);
      await Print.printAsync({ html });
    } catch (error) {
      console.error('Print error:', error);
      Alert.alert('Print Error', `Failed to print voucher: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsPrinting(false);
    }
  };

  // Share voucher as PDF - using same approach as main report
  const handleShareVoucherPDF = async (voucherData: any) => {
    if (isPrinting) {
      Alert.alert('Please wait', 'A print request is already in progress');
      return;
    }
    
    setIsPrinting(true);
    try {
      const html = generateVoucherHTML(voucherData);
      const { uri } = await Print.printToFileAsync({ html });

      await shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf'
      });
    } catch (error) {
      console.error('Share PDF error:', error);
      Alert.alert('Share Error', `Failed to share voucher PDF: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsPrinting(false);
    }
  };
  
  // Download voucher as Excel
  const handleDownloadVoucherExcel = async (voucherData: any) => {
    try {
      // Generate voucher Excel download
      
      // Generate CSV content (Excel-compatible)
      const csvContent = generateVoucherCSV(voucherData);
      
      // Create a simple CSV file content
      const fileName = `voucher-${voucherData.VCHNO || 'details'}-${new Date().toISOString().split('T')[0]}.csv`;
      
      // Create a temporary file first
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      
      // Share the file
      const shareResult = await shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Save Voucher Details'
      });
      
      if (shareResult) {
        console.log('✅ Voucher Excel download successful');
        Alert.alert(
          'Excel Download',
          'The voucher details have been saved as CSV format, which can be opened in Excel.',
          [{ text: 'OK' }]
        );
      } else {
        console.log('⚠️ Share result was falsy for voucher');
      }
      
    } catch (error) {
      console.error('❌ Voucher Excel download error:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error message:', error instanceof Error ? error.message : String(error));
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      Alert.alert('Download Error', `Failed to download Excel file: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Generate CSV content for voucher
  const generateVoucherCSV = (voucherData: any) => {
    
    try {
      const inventoryItems = voucherData.ALLLEDGERENTRIES?.find((entry: any) => 
        entry.INVENTORYALLOCATIONS && entry.INVENTORYALLOCATIONS.length > 0
      )?.INVENTORYALLOCATIONS || [];
      
      const subtotal = inventoryItems.reduce((sum: number, item: any) => sum + (item.AMOUNT || 0), 0);
      const total = voucherData.DEBITAMT || voucherData.CREDITAMT || 0;
      
      
      // Get tax details
      const cgstEntry = voucherData.ALLLEDGERENTRIES?.find((entry: any) => entry.LEDGERNAME === 'CGST');
      const sgstEntry = voucherData.ALLLEDGERENTRIES?.find((entry: any) => entry.LEDGERNAME === 'SGST');
      const discountEntry = voucherData.ALLLEDGERENTRIES?.find((entry: any) => entry.LEDGERNAME === 'DLE Discount');
      
      let csvContent = 'VOUCHER DETAILS\n';
      csvContent += `Invoice No.,${voucherData.VCHNO}\n`;
      csvContent += `Date,${voucherData.DATE}\n`;
      csvContent += `Type,${voucherData.VCHTYPE}\n`;
      csvContent += `Customer,${voucherData.PARTICULARS}\n\n`;
      
      if (inventoryItems.length > 0) {
        csvContent += 'ITEMS\n';
        csvContent += 'Item Name,Quantity,Rate,Amount\n';
        
        inventoryItems.forEach((item: any, index: number) => {
          csvContent += `${item.STOCKITEMNAME},${item.BILLEQTY},${item.RATE},${item.AMOUNT}\n`;
        });
        
        csvContent += `\nSubtotal,${subtotal}\n`;
        
        if (discountEntry?.CREDITAMT) csvContent += `Less: Discount,${discountEntry.CREDITAMT}\n`;
        if (cgstEntry?.CREDITAMT) csvContent += `CGST,${cgstEntry.CREDITAMT}\n`;
        if (sgstEntry?.CREDITAMT) csvContent += `SGST,${sgstEntry.CREDITAMT}\n`;
        
        csvContent += `Total,${total}\n`;
      } else {
        console.log('⚠️ No inventory items found');
      }
      
      console.log('✅ Voucher CSV generation completed successfully');
      return csvContent;
    } catch (error) {
      console.error('❌ Error generating voucher CSV:', error);
      return '';
    }
  };
  
  // Three dots menu component for voucher modal
  const VoucherThreeDotsMenu = () => (
    <View style={styles.threeDotsMenuContainer}>
      <TouchableOpacity 
        style={styles.threeDotsButton}
        onPress={handleVoucherThreeDotsPress}
      >
        <Text style={styles.threeDotsIcon}>⋮</Text>
      </TouchableOpacity>
      
      {showVoucherThreeDotsMenu && (
        <View style={styles.dropdownMenu}>
          <TouchableOpacity 
            style={styles.dropdownItem}
            onPress={() => {
              closeVoucherThreeDotsMenu();
              handleDownloadVoucherExcel(voucher);
            }}
          >
            <Text style={styles.dropdownItemText}>Download as Excel</Text>
            <Text style={styles.dropdownItemIcon}>📊</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.dropdownItem, isPrinting && styles.dropdownItemDisabled]}
            onPress={() => {
              closeVoucherThreeDotsMenu();
              handlePrintVoucher(voucher);
            }}
            disabled={isPrinting}
          >
            <Text style={[styles.dropdownItemText, isPrinting && styles.dropdownItemTextDisabled]}>
              {isPrinting ? 'Printing...' : 'Print'}
            </Text>
            <Text style={styles.dropdownItemIcon}>🖨️</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.dropdownItem, isPrinting && styles.dropdownItemDisabled]}
            onPress={() => {
              closeVoucherThreeDotsMenu();
              handleShareVoucherPDF(voucher);
            }}
            disabled={isPrinting}
          >
            <Text style={[styles.dropdownItemText, isPrinting && styles.dropdownItemTextDisabled]}>
              {isPrinting ? 'Generating...' : 'Share'}
            </Text>
            <Text style={styles.dropdownItemIcon}>📤</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );









  // Get customer details by name from context
  const getCustomerDetails = (customerName: string) => {
    return customers.find((c: any) => c.name === customerName) || null;
  };

  // Check if voucher is a receipt voucher
  const isReceiptVoucher = (vchType: string) => {
    return vchType && vchType.toLowerCase().includes('receipt');
  };

  const isCreditDebitNote = (vchType: string) => {
    return vchType && (
      vchType.toLowerCase().includes('credit note') ||
      vchType.toLowerCase().includes('debit note')
    );
  };

  // Extract receipt voucher data structure
  const getReceiptVoucherData = (voucherData: any) => {
    if (!voucherData.ALLLEDGERENTRIES || voucherData.ALLLEDGERENTRIES.length === 0) {
      return {
        firstLedger: null,
        billAllocations: [],
        otherLedgers: [],
        paymentMethod: 'Cash',
        totalAmount: 0
      };
    }

    const entries = voucherData.ALLLEDGERENTRIES;
    
    // First ledger (the one being credited)
    const firstLedger = entries[0];
    
    // Bill allocations from first ledger
    const billAllocations = firstLedger.BILLALLOCATIONS ? 
      firstLedger.BILLALLOCATIONS.map((allocation: any) => ({
        reference: allocation.BILLNAME || allocation.REFERENCE || 'Unknown',
        amount: parseFloat(allocation.CREDITAMT || allocation.AMOUNT || '0')
      })) : [];
    
    // Other ledgers (middle entries, excluding first and last)
    const otherLedgers = entries.slice(1, -1).map((entry: any) => ({
      name: entry.LEDGERNAME || 'Unknown',
      debitAmount: parseFloat(entry.DEBITAMT || '0'),
      creditAmount: parseFloat(entry.CREDITAMT || '0')
    }));
    
    // Payment method and total amount (last ledger)
    const lastEntry = entries[entries.length - 1];
    const paymentMethod = lastEntry ? lastEntry.LEDGERNAME || 'Cash' : 'Cash';
    const totalAmount = lastEntry ? parseFloat(lastEntry.DEBITAMT || lastEntry.CREDITAMT || '0') : 0;
    
    return {
      firstLedger,
      billAllocations,
      otherLedgers,
      paymentMethod,
      totalAmount
    };
  };

  // Generate HTML content for PDF
  const generateVoucherHTML = (voucherData: any) => {
    console.log('=== GENERATING HTML FOR PDF ===');
    console.log('Voucher data for HTML:', voucherData);
    
    // Check if this is a receipt voucher
    const isReceipt = isReceiptVoucher(voucherData.VCHTYPE);
    const isCreditDebit = isCreditDebitNote(voucherData.VCHTYPE);
    
    if (isReceipt) {
      return generateReceiptVoucherHTML(voucherData);
    }
    
    if (isCreditDebit) {
      return generateCreditDebitNoteHTML(voucherData);
    }
    
    // Determine the title based on voucher type
  const getVoucherTitle = (vchType: string) => {
    if (vchType && vchType.toLowerCase().includes('sales')) {
      return 'INVOICE';
    }
    if (vchType && vchType.toLowerCase().includes('credit note')) {
      return 'CREDIT NOTE';
    }
    if (vchType && vchType.toLowerCase().includes('debit note')) {
      return 'DEBIT NOTE';
    }
    if (vchType && vchType.toLowerCase().includes('receipt')) {
      return 'RECEIPT';
    }
    return vchType || 'VOUCHER';
  };
    
    const voucherTitle = getVoucherTitle(voucherData.VCHTYPE);
    
    // Format amounts with commas for Indian number format, hide 0.00 values
    const formatAmount = (amount: number) => {
      if (amount === 0 || amount === null || amount === undefined) {
        return '';
      }
      return amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };
    
    const inventoryItems = voucherData.ALLLEDGERENTRIES?.find((entry: any) => 
      entry.INVENTORYALLOCATIONS && entry.INVENTORYALLOCATIONS.length > 0
    )?.INVENTORYALLOCATIONS || [];
    
    console.log('Inventory items found:', inventoryItems.length);
    console.log('First item sample:', inventoryItems[0]);
    
    const subtotal = inventoryItems.reduce((sum: number, item: any) => sum + (item.AMOUNT || 0), 0);
    const total = voucherData.DEBITAMT || voucherData.CREDITAMT || 0;
    
    console.log('Subtotal:', subtotal, 'Total:', total);
    
    // Get tax details
    const cgstEntry = voucherData.ALLLEDGERENTRIES?.find((entry: any) => entry.LEDGERNAME === 'CGST');
    const sgstEntry = voucherData.ALLLEDGERENTRIES?.find((entry: any) => entry.LEDGERNAME === 'SGST');
    const discountEntry = voucherData.ALLLEDGERENTRIES?.find((entry: any) => entry.LEDGERNAME === 'DLE Discount');
    
    console.log('Tax entries found:', { cgst: !!cgstEntry, sgst: !!sgstEntry, discount: !!discountEntry });
    
    // Get customer details from context
    const customerDetails = getCustomerDetails(voucherData.PARTICULARS);
    console.log('Customer details found:', customerDetails);
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Tax Invoice - ${voucherData.VCHNO}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px; 
            color: #333; 
            background-color: #fff;
            line-height: 1.4;
          }
          .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            padding: 30px;
          }
          .header { 
            text-align: center; 
            border-bottom: 3px solid #2c3e50; 
            padding-bottom: 20px; 
            margin-bottom: 30px; 
          }
          .invoice-title {
            font-size: 28px;
            font-weight: bold;
            color: #2c3e50;
            margin: 0;
          }
          .invoice-subtitle {
            font-size: 16px;
            color: #7f8c8d;
            margin: 5px 0 0 0;
          }
          .company-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            padding: 20px;
            border-radius: 8px;
          }
          .company-info, .customer-info {
            flex: 1;
            margin: 0 10px;
          }
          .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 10px;
            border-bottom: 1px solid #bdc3c7;
            padding-bottom: 5px;
          }
          .info-row {
            margin-bottom: 5px;
            font-size: 14px;
          }
          .info-label {
            font-weight: bold;
            color: #34495e;
          }
          .items-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 30px; 
            border: 1px solid #bdc3c7;
          }
          .items-table th, .items-table td { 
            border: 1px solid #bdc3c7; 
            padding: 12px; 
            text-align: left; 
          }
          .items-table th { 
            background-color: #34495e; 
            color: white;
            font-weight: bold; 
            text-align: center;
          }
          .items-table td {
            background-color: #fff;
          }
          .items-table tr:nth-child(even) td {
            font-weight: bold;
          }
          .summary { 
            border-top: 2px solid #2c3e50; 
            padding-top: 20px; 
            padding: 20px;
            border-radius: 8px;
          }
          .summary-row { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 8px; 
            padding: 5px 0;
            font-weight: bold;
          }
          .total-row { 
            font-weight: bold; 
            font-size: 18px; 
            border-top: 2px solid #2c3e50; 
            padding-top: 15px; 
            margin-top: 10px;
            color: #2c3e50;
          }
          .amount { 
            text-align: right; 
            font-weight: bold;
          }
          .invoice-number {
            font-size: 20px;
            font-weight: bold;
            color: #e74c3c;
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header">
            <h1 class="invoice-title">${voucherTitle}</h1>
            <p class="invoice-subtitle">${voucherData.VCHTYPE}</p>
          </div>
          
          <div class="company-section">
            <div class="company-info">
              <div class="section-title">From:</div>
              <div class="info-row"><span class="info-label">Company:</span> ${companyName || 'Company Name'}</div>
              <div class="info-row"><span class="info-label">Address:</span> Company Address</div>
              <div class="info-row"><span class="info-label">GSTIN:</span> Company GSTIN</div>
            </div>
            
            <div class="customer-info">
              <div class="section-title">Bill To:</div>
              <div class="info-row"><span class="info-label">Mailing Name:</span> ${customerDetails?.mailingName || voucherData.PARTICULARS}</div>
              <div class="info-row"><span class="info-label">Address:</span> ${customerDetails?.address || 'Address not available'}</div>
              <div class="info-row"><span class="info-label">State:</span> ${customerDetails?.stateName || 'State not available'}</div>
              <div class="info-row"><span class="info-label">Pincode:</span> ${customerDetails?.pincode || 'Pincode not available'}</div>
              <div class="info-row"><span class="info-label">GST No:</span> ${customerDetails?.gstin || 'GST not available'}</div>
            </div>
          </div>
          
          <div class="info-row" style="text-align: center; margin-bottom: 20px;">
            <span class="info-label">Invoice No:</span> <span class="invoice-number">${voucherData.VCHNO}</span> | 
            <span class="info-label">Date:</span> ${voucherData.DATE}
          </div>
        
        <table class="items-table">
          <thead>
            <tr>
              <th>Item Description</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${inventoryItems.map((item: any, index: number) => `
              <tr>
                <td>${item.STOCKITEMNAME}</td>
                <td>${item.BILLEQTY}</td>
                <td>₹${item.RATE}</td>
                <td class="amount">₹${formatAmount(item.AMOUNT || 0)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="summary">
          <div class="summary-row">
            <span>Subtotal:</span>
            <span class="amount">₹${formatAmount(subtotal)}</span>
          </div>
          ${discountEntry?.CREDITAMT ? `
            <div class="summary-row">
              <span>Less: Discount:</span>
              <span class="amount">₹${formatAmount(discountEntry.CREDITAMT)}</span>
            </div>
          ` : ''}
          ${cgstEntry?.CREDITAMT ? `
            <div class="summary-row">
              <span>CGST:</span>
              <span class="amount">₹${formatAmount(cgstEntry.CREDITAMT)}</span>
            </div>
          ` : ''}
          ${sgstEntry?.CREDITAMT ? `
            <div class="summary-row">
              <span>SGST:</span>
              <span class="amount">₹${formatAmount(sgstEntry.CREDITAMT)}</span>
            </div>
          ` : ''}
          <div class="summary-row total-row">
            <span>Total:</span>
            <span class="amount">₹${formatAmount(total)}</span>
          </div>
        </div>
        </div>
      </body>
      </html>
    `;
    
    return html;
  };

  // Generate HTML for Credit/Debit Note
  const generateCreditDebitNoteHTML = (voucherData: any) => {
    console.log('=== GENERATING CREDIT/DEBIT NOTE HTML ===');
    console.log('Voucher data for HTML:', voucherData);
    
    const getVoucherTitle = (vchType: string) => {
      if (vchType && vchType.toLowerCase().includes('credit note')) {
        return 'CREDIT NOTE';
      }
      if (vchType && vchType.toLowerCase().includes('debit note')) {
        return 'DEBIT NOTE';
      }
      return vchType || 'VOUCHER';
    };
    
    const voucherTitle = getVoucherTitle(voucherData.VCHTYPE);
    
    // Format amounts with commas for Indian number format, hide 0.00 values
    const formatAmount = (amount: number) => {
      if (amount === 0 || amount === null || amount === undefined) {
        return '';
      }
      return amount.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    };

    // Get all ledgers except the first one
    const otherLedgers = voucherData.ALLLEDGERENTRIES?.slice(1) || [];
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${voucherTitle}</title>
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
          .voucher-title {
            font-size: 20px;
            font-weight: bold;
            color: #007AFF;
            margin: 20px 0;
          }
          .voucher-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            flex-wrap: wrap;
          }
          .voucher-details {
            display: flex;
            flex-direction: column;
            gap: 5px;
          }
          .voucher-details span {
            font-size: 14px;
            color: #666;
          }
          .ledger-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          .ledger-table th {
            background-color: #f8f9fa;
            padding: 12px;
            text-align: left;
            border: 1px solid #ddd;
            font-weight: bold;
          }
          .ledger-table td {
            padding: 12px;
            border: 1px solid #ddd;
            background-color: #fff;
          }
          .amount-column {
            text-align: right;
            font-weight: bold;
          }
          .total-section {
            margin-top: 20px;
            text-align: right;
          }
          .total-amount {
            font-size: 18px;
            font-weight: bold;
            color: #007AFF;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">${companyName || 'Company Name'}</div>
          <div class="voucher-title">${voucherTitle}</div>
        </div>
        
        <div class="voucher-info">
          <div class="voucher-details">
            <span><strong>Voucher No:</strong> ${voucherData.VCHNO}</span>
            <span><strong>Date:</strong> ${voucherData.DATE}</span>
            <span><strong>Party:</strong> ${voucherData.PARTICULARS}</span>
          </div>
        </div>
        
        <table class="ledger-table">
          <thead>
            <tr>
              <th style="width: 60%;">Particulars</th>
              <th style="width: 40%;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${otherLedgers.map(ledger => `
              <tr>
                <td>${ledger.LEDGERNAME}</td>
                <td class="amount-column">${formatAmount(ledger.DEBITAMT || ledger.CREDITAMT)} ${ledger.DEBITAMT > 0 ? 'Dr' : 'Cr'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="total-section">
          <div class="total-amount">
            Total: ₹ ${formatAmount(voucherData.CREDITAMT || voucherData.DEBITAMT)}
          </div>
        </div>
      </body>
      </html>
    `;
    
    return html;
  };

  // Generate HTML for Receipt Voucher
  const generateReceiptVoucherHTML = (voucherData: any) => {
    const receiptData = getReceiptVoucherData(voucherData);
    console.log('=== RECEIPT VOUCHER DATA ===');
    console.log('First Ledger:', receiptData.firstLedger);
    console.log('Bill Allocations:', receiptData.billAllocations);
    console.log('Other Ledgers:', receiptData.otherLedgers);
    console.log('Payment Method:', receiptData.paymentMethod);
    console.log('Total Amount (from last ledger):', receiptData.totalAmount);
    
    const totalAmount = receiptData.totalAmount;
    const amountInWords = convertNumberToWords(totalAmount);
    
    // Format amounts with commas for Indian number format, hide 0.00 values
    const formatAmount = (amount: number) => {
      if (amount === 0 || amount === null || amount === undefined) {
        return '';
      }
      return amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Receipt Voucher - ${voucherData.VCHNO}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px; 
            color: #333; 
            background-color: #fff;
            line-height: 1.4;
          }
          .receipt-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            padding: 30px;
          }
          .company-header { 
            text-align: center; 
            border-bottom: 3px solid #2c3e50; 
            padding-bottom: 20px; 
            margin-bottom: 30px; 
          }
          .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #2c3e50;
            margin: 0;
          }
          .company-address {
            font-size: 14px;
            color: #7f8c8d;
            margin: 5px 0;
            line-height: 1.3;
          }
          .receipt-title {
            font-size: 28px;
            font-weight: bold;
            color: #2c3e50;
            text-align: center;
            margin: 30px 0;
          }
          .voucher-details {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            padding: 15px;
            background-color: #f8f9fa;
            border-radius: 8px;
          }
          .voucher-info {
            font-size: 14px;
            color: #333;
          }
          .voucher-info strong {
            color: #2c3e50;
          }
          .receipt-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            border: 1px solid #bdc3c7;
          }
          .receipt-table th, .receipt-table td {
            border: 1px solid #bdc3c7;
            padding: 12px;
            text-align: left;
          }
          .receipt-table th {
            background-color: #34495e;
            color: white;
            font-weight: bold;
            text-align: center;
          }
          .receipt-table td {
            background-color: #fff;
          }
          .amount-column {
            text-align: right;
            font-weight: bold;
          }
          .ref-amount {
            text-align: right;
            font-weight: 500;
            min-width: 100px;
          }
          .against-ref {
            padding-left: 20px;
            font-size: 12px;
            color: #666;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 4px;
          }
          .ref-text {
            flex: 1;
          }
          .ref-amount {
            text-align: right;
            font-weight: 500;
            min-width: 100px;
          }
          .payment-method {
            margin: 20px 0;
            font-size: 14px;
          }
          .amount-in-words {
            margin: 20px 0;
            font-size: 14px;
            font-weight: bold;
            color: #2c3e50;
          }
          .total-amount {
            text-align: right;
            font-size: 18px;
            font-weight: bold;
            color: #2c3e50;
            margin: 20px 0;
          }
          .signature {
            text-align: right;
            margin-top: 40px;
            font-size: 14px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="company-header">
            <h1 class="company-name">${companyName || 'Company Name'}</h1>
            <div class="company-address">
              278, MKP Road<br>
              Padmanabhanagar<br>
              Bangalore<br>
              State Name: Karnataka, Code: 29<br>
              E-Mail: itcatalystindia@gmail.com
            </div>
          </div>
          
          <h2 class="receipt-title">Receipt Voucher</h2>
          
          <div class="voucher-details">
            <div class="voucher-info">
              <strong>No.:</strong> ${voucherData.VCHNO}
            </div>
            <div class="voucher-info">
              <strong>Dated:</strong> ${voucherData.DATE}
            </div>
          </div>
        
          <table class="receipt-table">
            <thead>
              <tr>
                <th style="width: 60%;">Particulars</th>
                <th style="width: 40%;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>${receiptData.firstLedger?.LEDGERNAME || voucherData.PARTICULARS}</strong>
                  ${receiptData.billAllocations.map(allocation => `
                    <div class="against-ref">
                      <span class="ref-text">Agst Ref ${allocation.reference}:</span>
                      <span class="ref-amount">${formatAmount(allocation.amount)} Cr</span>
                    </div>
                  `).join('')}
                </td>
                <td class="amount-column">${formatAmount(receiptData.firstLedger?.CREDITAMT || receiptData.firstLedger?.DEBITAMT || 0)}</td>
              </tr>
              ${receiptData.otherLedgers.map(ledger => `
                <tr>
                  <td>${ledger.name}</td>
                  <td class="amount-column">${formatAmount(ledger.debitAmount || ledger.creditAmount)} ${ledger.debitAmount > 0 ? 'Dr' : 'Cr'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="payment-method">
            <strong>Through:</strong> ${receiptData.paymentMethod}
          </div>
          
          <div class="amount-in-words">
            <strong>Amount (in words):</strong> ${amountInWords}
          </div>
          
          <div class="total-amount">
            ₹ ${formatAmount(totalAmount)}
          </div>
          
          <div class="signature">
            Authorised Signatory
          </div>
        </div>
      </body>
      </html>
    `;
    
    return html;
  };

  const isSalesVoucher = voucher.VCHTYPE?.toLowerCase().includes('sale');
  const isReceipt = isReceiptVoucher(voucher.VCHTYPE);
  const isCreditDebit = isCreditDebitNote(voucher.VCHTYPE);
  const getVoucherTitle = (vchType: string) => {
    if (vchType && vchType.toLowerCase().includes('sales')) {
      return 'INVOICE';
    }
    if (vchType && vchType.toLowerCase().includes('credit note')) {
      return 'CREDIT NOTE';
    }
    if (vchType && vchType.toLowerCase().includes('debit note')) {
      return 'DEBIT NOTE';
    }
    if (vchType && vchType.toLowerCase().includes('receipt')) {
      return 'RECEIPT';
    }
    return vchType || 'VOUCHER';
  };
  const hasInventoryItems = voucher.ALLLEDGERENTRIES?.some((entry: any) => 
    entry.INVENTORYALLOCATIONS && Array.isArray(entry.INVENTORYALLOCATIONS) && entry.INVENTORYALLOCATIONS.length > 0
  );

  const getInventoryItems = () => {
    // Look for any ledger entry that has INVENTORYALLOCATIONS
    const entryWithItems = voucher.ALLLEDGERENTRIES?.find((entry: any) => 
      entry.INVENTORYALLOCATIONS && entry.INVENTORYALLOCATIONS.length > 0
    );
    return entryWithItems?.INVENTORYALLOCATIONS || [];
  };

  const getTaxDetails = () => {
    const cgstEntry = voucher.ALLLEDGERENTRIES?.find((entry: any) => 
      entry.LEDGERNAME === 'CGST'
    );
    const sgstEntry = voucher.ALLLEDGERENTRIES?.find((entry: any) => 
      entry.LEDGERNAME === 'SGST'
    );
    const discountEntry = voucher.ALLLEDGERENTRIES?.find((entry: any) => 
      entry.LEDGERNAME === 'DLE Discount'
    );
    
    return {
      cgst: cgstEntry?.CREDITAMT || 0,
      sgst: sgstEntry?.CREDITAMT || 0,
      discount: discountEntry?.CREDITAMT || 0,
    };
  };

  const taxDetails = getTaxDetails();
  const inventoryItems = getInventoryItems();
  const subtotal = inventoryItems.reduce((sum, item) => sum + (item.AMOUNT || 0), 0);
  const total = voucher.DEBITAMT || voucher.CREDITAMT || 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      {/* Overlay to close dropdown when tapping outside */}
      {showVoucherThreeDotsMenu && (
        <TouchableOpacity 
          style={styles.overlay}
          activeOpacity={1}
          onPress={closeVoucherThreeDotsMenu}
        />
      )}
      
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Voucher Details</Text>
          <View style={styles.modalHeaderActions}>
            <VoucherThreeDotsMenu />
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
        </View>

        
        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {isReceipt ? (() => {
            const receiptData = getReceiptVoucherData(voucher);
            console.log('=== MOBILE RECEIPT VOUCHER DATA ===');
            console.log('First Ledger:', receiptData.firstLedger);
            console.log('Bill Allocations:', receiptData.billAllocations);
            console.log('Other Ledgers:', receiptData.otherLedgers);
            console.log('Payment Method:', receiptData.paymentMethod);
            console.log('Total Amount (from last ledger):', receiptData.totalAmount);
            
            return (
            // Receipt Voucher Format
            <>
              
              {/* Company Header */}
              <View style={styles.companyHeader}>
                <Text style={styles.companyName}>{companyName || 'Company Name'}</Text>
                <Text style={styles.companyAddress}>278, MKP Road</Text>
                <Text style={styles.companyAddress}>Padmanabhanagar</Text>
                <Text style={styles.companyAddress}>Bangalore</Text>
                <Text style={styles.companyAddress}>State Name: Karnataka, Code: 29</Text>
                <Text style={styles.companyAddress}>E-Mail: itcatalystindia@gmail.com</Text>
              </View>

              {/* Receipt Title */}
              <View style={styles.receiptTitleContainer}>
                <Text style={styles.receiptTitle}>Receipt Voucher</Text>
              </View>

              {/* Voucher Details */}
              <View style={styles.voucherDetailsContainer}>
                <Text style={styles.voucherDetailText}>No.: {voucher.VCHNO}</Text>
                <Text style={styles.voucherDetailText}>Dated: {voucher.DATE}</Text>
              </View>

              {/* Receipt Table */}
              <View style={styles.receiptTableContainer}>
                <View style={styles.receiptTableHeader}>
                  <Text style={styles.receiptTableHeaderText}>Particulars</Text>
                  <Text style={styles.receiptTableHeaderText}>Amount</Text>
                </View>
                <View style={styles.receiptTableRow}>
                  <View style={styles.receiptTableParticulars}>
                    <Text style={styles.receiptTableAccountName}>
                      {receiptData.firstLedger?.LEDGERNAME || voucher.PARTICULARS}
                    </Text>
                    {receiptData.billAllocations.map((allocation, index) => (
                      <View key={index} style={styles.againstRefRow}>
                        <Text style={styles.againstRefText}>
                          Agst Ref {allocation.reference}:
                        </Text>
                        <Text style={styles.againstRefAmount}>
                          {allocation.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} Cr
                        </Text>
                      </View>
                    ))}
                  </View>
                  <Text style={styles.receiptTableAmount}>
                    {(receiptData.firstLedger?.CREDITAMT || receiptData.firstLedger?.DEBITAMT || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
                
                {receiptData.otherLedgers.map((ledger, index) => (
                  <View key={`other-${index}`} style={styles.receiptTableRow}>
                    <View style={styles.receiptTableParticulars}>
                      <Text style={styles.receiptTableAccountName}>
                        {ledger.name}
                      </Text>
                    </View>
                    <Text style={styles.receiptTableAmount}>
                      {(ledger.debitAmount || ledger.creditAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {ledger.debitAmount > 0 ? 'Dr' : 'Cr'}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Payment Method */}
              <View style={styles.paymentMethodContainer}>
                <Text style={styles.paymentMethodText}>
                  Through: {receiptData.paymentMethod}
                </Text>
              </View>

              {/* Amount in Words */}
              <View style={styles.amountInWordsContainer}>
                <Text style={styles.amountInWordsText}>
                  Amount (in words): {convertNumberToWords(receiptData.totalAmount)}
                </Text>
              </View>

              {/* Total Amount */}
              <View style={styles.totalAmountContainer}>
                <Text style={styles.totalAmountText}>
                  ₹ {receiptData.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </View>

              {/* Signature */}
              <View style={styles.signatureContainer}>
                <Text style={styles.signatureText}>Authorised Signatory</Text>
              </View>
            </>
            );
          })() : isCreditDebit ? (
            // Credit/Debit Note Format
            <>
              {/* Credit/Debit Note Header */}
              <View style={styles.invoiceHeader}>
                <Text style={styles.invoiceTitle}>
                  {getVoucherTitle(voucher.VCHTYPE)}
                </Text>
                <View style={styles.invoiceInfo}>
                  <Text style={styles.invoiceLabel}>Voucher No.: {voucher.VCHNO}</Text>
                  <Text style={styles.invoiceLabel}>Dated: {voucher.DATE}</Text>
                  <Text style={styles.invoiceLabel}>Party: {voucher.PARTICULARS}</Text>
                </View>
              </View>

              {/* Company Details */}
              <View style={styles.companySection}>
                <Text style={styles.companyName}>{companyName || 'Company Name'}</Text>
              </View>

              {/* Ledger Table */}
              <View style={styles.ledgerTableContainer}>
                <View style={styles.ledgerTableHeader}>
                  <Text style={styles.ledgerTableHeaderText}>Particulars</Text>
                  <Text style={styles.ledgerTableHeaderText}>Amount</Text>
                </View>
                
                {voucher.ALLLEDGERENTRIES?.slice(1).map((ledger: any, index: number) => (
                  <View key={index} style={styles.ledgerTableRow}>
                    <View style={styles.ledgerTableParticulars}>
                      <Text style={styles.ledgerTableAccountName}>
                        {ledger.LEDGERNAME}
                      </Text>
                    </View>
                    <Text style={styles.ledgerTableAmount}>
                      {(ledger.DEBITAMT || ledger.CREDITAMT).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {ledger.DEBITAMT > 0 ? 'Dr' : 'Cr'}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Total Amount */}
              <View style={styles.totalAmountContainer}>
                <Text style={styles.totalAmountText}>
                  Total: ₹ {(voucher.CREDITAMT || voucher.DEBITAMT).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            </>
          ) : (
            // Regular Voucher Format
            <>
              {/* Invoice Header */}
              <View style={styles.invoiceHeader}>
                <Text style={styles.invoiceTitle}>
                  {getVoucherTitle(voucher.VCHTYPE)}
                </Text>
                <View style={styles.invoiceInfo}>
                  <Text style={styles.invoiceLabel}>Invoice No.: {voucher.VCHNO}</Text>
                  <Text style={styles.invoiceLabel}>Dated: {voucher.DATE}</Text>
                  <Text style={styles.invoiceLabel}>Voucher Type: {voucher.VCHTYPE}</Text>
                </View>
              </View>

              {/* Company Details */}
              <View style={styles.companySection}>
                <Text style={styles.companyName}>{companyName || 'Company Name'}</Text>
                <Text style={styles.companyAddress}>Company Address</Text>
                <Text style={styles.companyGstin}>GSTIN: Company GSTIN</Text>
              </View>

              {/* Customer Details */}
              <View style={styles.customerSection}>
                <Text style={styles.sectionTitle}>Bill To:</Text>
                <Text style={styles.customerName}>{voucher.PARTICULARS}</Text>
                <Text style={styles.customerAddress}>Customer Address</Text>
                <Text style={styles.customerGstin}>GSTIN: Customer GSTIN</Text>
              </View>

              {/* Items Table */}
              {hasInventoryItems && (
                <View style={styles.itemsSection}>
                  <Text style={styles.sectionTitle}>Item Details</Text>
                  
                  {/* Table Header */}
                  <View style={styles.tableHeaderContainer}>
                    {/* First line - Item name header */}
                    <View style={styles.headerItemNameRow}>
                      <Text style={styles.headerItemName}>Item Name</Text>
                    </View>
                    
                    {/* Second line - Qty, Rate & Value headers */}
                    <View style={styles.headerDetailsRow}>
                      <View style={styles.headerDetailsLeft}>
                        <Text style={styles.headerDetailLabel}>Qty</Text>
                        <Text style={styles.headerDetailLabel}>Rate</Text>
                      </View>
                      <Text style={styles.headerDetailValue}>Value</Text>
                    </View>
                  </View>

                  {/* Items */}
                  {inventoryItems.map((item: any, index: number) => (
                    <View key={index} style={styles.itemContainer}>
                      {/* First line - Item name */}
                      <View style={styles.itemNameRow}>
                        <Text style={styles.itemName} numberOfLines={2}>
                          {item.STOCKITEMNAME}
                        </Text>
                      </View>
                      
                      {/* Second line - Qty, Rate & Value aligned right */}
                      <View style={styles.itemDetailsRow}>
                        <View style={styles.itemDetailsLeft}>
                          <Text style={styles.itemDetailLabel}>{item.BILLEQTY}</Text>
                          <Text style={styles.itemDetailLabel}>₹{item.RATE}</Text>
                        </View>
                        <Text style={styles.itemDetailValue}>
                          ₹{item.AMOUNT === 0 || item.AMOUNT === null || item.AMOUNT === undefined ? '' : item.AMOUNT.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Summary */}
              <View style={styles.summarySection}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal:</Text>
                  <Text style={styles.summaryValue}>
                    ₹{subtotal === 0 ? '' : subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
                
                {taxDetails.discount > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Less: Discount:</Text>
                    <Text style={styles.summaryValue}>
                      ₹{taxDetails.discount === 0 ? '' : taxDetails.discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                )}
                
                {taxDetails.cgst > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>CGST:</Text>
                    <Text style={styles.summaryValue}>
                      ₹{taxDetails.cgst === 0 ? '' : taxDetails.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                )}
                
                {taxDetails.sgst > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>SGST:</Text>
                    <Text style={styles.summaryValue}>
                      ₹{taxDetails.sgst === 0 ? '' : taxDetails.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                )}
                
                <View style={[styles.summaryRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total:</Text>
                  <Text style={styles.totalValue}>
                    ₹{total === 0 ? '' : total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              </View>

              {/* Additional Details */}
              <View style={styles.additionalSection}>
                <Text style={styles.sectionTitle}>Additional Information</Text>
                <Text style={styles.additionalText}>Voucher ID: {voucher.MASTERID}</Text>
                <Text style={styles.additionalText}>Date: {voucher.DATE}</Text>
                <Text style={styles.additionalText}>Type: {voucher.VCHTYPE}</Text>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

export const LedgerVoucherReport: React.FC<LedgerVoucherReportProps> = ({ 
  companyName, 
  tallylocId, 
  guid 
}) => {
  const insets = useSafeAreaInsets();
  const masterDataContext = useMasterData();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedPrinter, setSelectedPrinter] = useState();
  
  // Period selector state
  const [startDate, setStartDate] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() - 1, 1);
  });
  const [endDate, setEndDate] = useState<Date>(new Date());
  
  // Ledger selection state
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [selectedLedger, setSelectedLedger] = useState<Ledger | null>(null);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [loadingLedgers, setLoadingLedgers] = useState(false);
  
  // Report data state
  const [reportData, setReportData] = useState<LedgerVoucherData | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  
  // Grand total collapse state
  const [isGrandTotalCollapsed, setIsGrandTotalCollapsed] = useState(false);
  
  // Voucher detail modal state
  const [selectedVoucher, setSelectedVoucher] = useState<any>(null);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  
  // Print state to prevent multiple simultaneous requests
  const [isPrinting, setIsPrinting] = useState(false);
  
  // Menu management
  const { showMenu, handleMenuPress, handleNavigation, closeMenu } = useReportsMenu();
  
  // Three dots menu state
  const [showThreeDotsMenu, setShowThreeDotsMenu] = useState(false);
  
  // Handle three dots menu press
  const handleThreeDotsPress = () => {
    setShowThreeDotsMenu(!showThreeDotsMenu);
  };
  
  // Close three dots menu
  const closeThreeDotsMenu = () => {
    setShowThreeDotsMenu(false);
  };
  
  // Three dots menu component
  const ThreeDotsMenu = () => (
    <View style={styles.threeDotsMenuContainer}>
      <TouchableOpacity 
        style={styles.threeDotsButton}
        onPress={handleThreeDotsPress}
      >
        <Text style={styles.threeDotsIcon}>⋮</Text>
      </TouchableOpacity>
      
      {showThreeDotsMenu && (
        <View style={styles.dropdownMenu}>
          <TouchableOpacity 
            style={styles.dropdownItem}
            onPress={() => {
              closeThreeDotsMenu();
              downloadLedgerVouchersExcel();
            }}
          >
            <Text style={styles.dropdownItemText}>Download as Excel</Text>
            <Text style={styles.dropdownItemIcon}>📊</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.dropdownItem, isPrinting && styles.dropdownItemDisabled]}
            onPress={() => {
              closeThreeDotsMenu();
              print();
            }}
            disabled={isPrinting}
          >
            <Text style={[styles.dropdownItemText, isPrinting && styles.dropdownItemTextDisabled]}>
              {isPrinting ? 'Printing...' : 'Print'}
            </Text>
            <Text style={styles.dropdownItemIcon}>🖨️</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.dropdownItem, isPrinting && styles.dropdownItemDisabled]}
            onPress={() => {
              closeThreeDotsMenu();
              printAndSharePDF();
            }}
            disabled={isPrinting}
          >
            <Text style={[styles.dropdownItemText, isPrinting && styles.dropdownItemTextDisabled]}>
              {isPrinting ? 'Generating...' : 'Share'}
            </Text>
            <Text style={styles.dropdownItemIcon}>📤</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

const objectToHtml = (data, startDate, endDate, companyName) => {
  const { openingBalance, totalDebit, totalCredit, closingBalance, entries } = data;

  // Format amounts with commas for Indian number format, hide 0.00 values
  const formatAmount = (amount) => {
    if (amount === 0 || amount === null || amount === undefined) {
      return '';
    }
    return amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Calculate running balance for each entry
  let runningBalance = openingBalance;
  const rows = entries.map(
    (entry) => {
      runningBalance += (entry.debit || 0) - (entry.credit || 0);
      return `
        <tr>
          <td>${entry.date}</td>
          <td>${entry.description}</td>
          <td style="text-align:right;">${formatAmount(entry.debit)}</td>
          <td style="text-align:right;">${formatAmount(entry.credit)}</td>
          <td style="text-align:right;">${formatAmount(runningBalance)}</td>
        </tr>
      `;
    }
  ).join('');

  // Determine which column to show opening balance in
  const openingBalanceDisplay = openingBalance >= 0 
    ? `<td style="text-align:right;">${formatAmount(openingBalance)}</td><td style="text-align:right;">-</td>`
    : `<td style="text-align:right;">-</td><td style="text-align:right;">${formatAmount(Math.abs(openingBalance))}</td>`;

  // Determine which column to show closing balance in
  const closingBalanceDisplay = closingBalance >= 0 
    ? `<td style="text-align:right;">${formatAmount(closingBalance)}</td><td style="text-align:right;">-</td>`
    : `<td style="text-align:right;">-</td><td style="text-align:right;">${formatAmount(Math.abs(closingBalance))}</td>`;

  return `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
          }
          h1 {
            text-align: center;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th, td {
            border: 1px solid #ccc;
            padding: 8px;
          }
          th {
            font-weight: bold;
          }
          .summary-row {
            font-weight: bold;
          }
          .opening-balance {
            font-weight: bold;
          }
          .current-total {
            font-weight: bold;
          }
          .closing-balance {
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <h1>Ledger Statement</h1>
        <h2 style="text-align: center; margin-top: 10px; margin-bottom: 5px; color: #333;">${companyName || 'Company'}</h2>
        <h3 style="text-align: center; margin-top: 5px; margin-bottom: 10px; color: #666; font-size: 18px;">${data.ledgerName}</h3>
        <p style="text-align: center; margin-bottom: 20px; color: #666; font-size: 14px;">
          Period: ${startDate.toLocaleDateString('en-IN')} - ${endDate.toLocaleDateString('en-IN')}
        </p>
        <table>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Debit</th>
            <th>Credit</th>
            <th>Running Balance</th>
          </tr>
          ${rows}
          <!-- Opening Balance Row -->
          <tr class="summary-row">
            <td>-</td>
            <td class="opening-balance">Opening Balance :</td>
            ${openingBalanceDisplay}
            <td style="text-align:right;">${formatAmount(openingBalance)}</td>
          </tr>
          <!-- Current Total Row -->
          <tr class="summary-row">
            <td>-</td>
            <td class="current-total">Current Total :</td>
            <td style="text-align:right;">${formatAmount(totalDebit)}</td>
            <td style="text-align:right;">${formatAmount(totalCredit)}</td>
            <td style="text-align:right;">-</td>
          </tr>
          <!-- Closing Balance Row -->
          <tr class="summary-row">
            <td>-</td>
            <td class="closing-balance">Closing Balance :</td>
            ${closingBalanceDisplay}
            <td style="text-align:right;">${formatAmount(closingBalance)}</td>
          </tr>
        </table>
      </body>
    </html>
  `;
};


const print = async () => {
  if (isPrinting) {
    Alert.alert('Please wait', 'A print request is already in progress');
    return;
  }
  
  if (!reportData || reportData.entries.length === 0) {
    Alert.alert('No Data', 'Please load a report first before sharing.');
    return;
  }
  
  setIsPrinting(true);
  try {
    const htmlContent = objectToHtml(reportData, startDate, endDate, companyName);
    await Print.printAsync({ html: htmlContent });
  } catch (error) {
    console.error('Print error:', error);
    Alert.alert('Print Error', `Failed to print report: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    setIsPrinting(false);
  }
};

const printAndSharePDF = async () => {
  if (isPrinting) {
    Alert.alert('Please wait', 'A print request is already in progress');
    return;
  }
  
  if (!reportData || reportData.entries.length === 0) {
    Alert.alert('No Data', 'Please load a report first before sharing.');
    return;
  }
  
  setIsPrinting(true);
  try {
    const html = objectToHtml(reportData, startDate, endDate, companyName);
    const { uri } = await Print.printToFileAsync({ html });
    console.log("PDF saved at:", uri);

    await shareAsync(uri, {
      UTI: '.pdf',
      mimeType: 'application/pdf'
    });
  } catch (error) {
    console.error('Share PDF error:', error);
    Alert.alert('Share Error', `Failed to share report PDF: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    setIsPrinting(false);
  }
};
  
  // Download ledger vouchers as Excel
  const downloadLedgerVouchersExcel = async () => {
    try {
      
      if (!reportData || reportData.entries.length === 0) {
        console.log('❌ No report data available for Excel download');
        Alert.alert('No Data', 'Please load a report first before downloading.');
        return;
      }
      
      // Generate CSV content (Excel-compatible)
      const csvContent = generateLedgerVouchersCSV();
      
      // Create a simple CSV file content
      const fileName = `ledger-vouchers-${selectedLedger?.name || 'report'}-${new Date().toISOString().split('T')[0]}.csv`;
      
      // Create a temporary file first
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      
      // Share the file
      const shareResult = await shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Save Ledger Vouchers Report'
      });
      
      if (shareResult) {
        console.log('✅ Excel download successful');
        Alert.alert(
          'Excel Download',
          'The ledger vouchers report has been saved as CSV format, which can be opened in Excel.',
          [{ text: 'OK' }]
        );
      } else {
        console.log('⚠️ Share result was falsy');
      }
      
    } catch (error) {
      console.error('❌ Excel download error:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error message:', error instanceof Error ? error.message : String(error));
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      Alert.alert('Download Error', `Failed to download Excel file: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Generate CSV content for ledger vouchers
  const generateLedgerVouchersCSV = () => {
    
    if (!reportData || !selectedLedger) {
      console.log('❌ Missing report data or selected ledger');
      return '';
    }
    
    try {
      let csvContent = 'LEDGER VOUCHERS REPORT\n';
      csvContent += `Ledger,${selectedLedger.name}\n`;
      csvContent += `Period,${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}\n\n`;
      
      csvContent += 'VOUCHER ENTRIES\n';
      csvContent += 'Date,Description,Reference,Debit,Credit,Balance\n';
      
      reportData.entries.forEach((entry, index) => {
        csvContent += `${entry.date},${entry.description},${entry.reference},${entry.debit},${entry.credit},${entry.balance}\n`;
      });
      
      csvContent += '\nSUMMARY\n';
      csvContent += `Opening Balance,${reportData.openingBalance}\n`;
      csvContent += `Total Debit,${reportData.totalDebit}\n`;
      csvContent += `Total Credit,${reportData.totalCredit}\n`;
      csvContent += `Closing Balance,${reportData.closingBalance}\n`;
      
      console.log('✅ CSV generation completed successfully');
      return csvContent;
    } catch (error) {
      console.error('❌ Error generating CSV:', error);
      return '';
    }
  };

  // Handle voucher selection
  const handleVoucherPress = (voucher: LedgerVoucherEntry) => {
    if (voucher.rawData) {
      setSelectedVoucher(voucher.rawData);
      setShowVoucherModal(true);
    } else {
      console.warn('No rawData found in voucher, cannot show modal');
    }
  };

  // Close voucher modal
  const closeVoucherModal = () => {
    setShowVoucherModal(false);
    setSelectedVoucher(null);
  };

  // Generate text representation of the report for sharing
  const generateReportText = () => {
    if (!reportData) return '';

    let reportText = `LEDGER VOUCHERS REPORT\n`;
    reportText += `Ledger: ${selectedLedger?.name}\n`;
    reportText += `Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}\n`;
    reportText += `\nVOUCHER ENTRIES:\n`;
    reportText += `\n`;

    reportData.entries.forEach((entry, index) => {
      reportText += `${index + 1}. ${entry.description}\n`;
      reportText += `   Date: ${entry.date} | Ref: ${entry.reference}\n`;
      reportText += `   Amount: ${entry.debit > 0 ? `₹${entry.debit} Dr.` : `₹${entry.credit} Cr.`}\n`;
      reportText += `\n`;
    });

    reportText += `\nSUMMARY:\n`;
    reportText += `Opening Balance: ₹${reportData.openingBalance === 0 ? '' : reportData.openingBalance.toFixed(2)}\n`;
    reportText += `Total Debit: ₹${reportData.totalDebit === 0 ? '' : reportData.totalDebit.toFixed(2)}\n`;
    reportText += `Total Credit: ₹${reportData.totalCredit === 0 ? '' : reportData.totalCredit.toFixed(2)}\n`;
    reportText += `Closing Balance: ₹${reportData.closingBalance === 0 ? '' : reportData.closingBalance.toFixed(2)}\n`;

    return reportText;
  };

  // Load ledgers from MasterDataContext (loaded during company selection)
  const loadLedgers = useCallback(async () => {
    if (!companyName || !tallylocId || !guid) {
      return;
    }
    
    setLoadingLedgers(true);
    setError(null);
    
    try {
      // Use customers from MasterDataContext as they are the same as ledgers
      // (both use /api/tally/ledgerlist-w-addrs endpoint)
      const customers = masterDataContext?.customers || [];
      
      // If no customers from context, fallback to API call
      if (customers.length === 0) {
        console.log('No customers in MasterDataContext, falling back to API call');
        const response = await apiService.getLedgersFromTally(tallylocId, companyName, guid);
        
        if (response.success && response.data) {
          // Parse the ledgers from the response
          const ledgersList = parseLedgersResponse(response.data);
          setLedgers(ledgersList);
        } else {
          setError(`Failed to load ledgers: ${response.message}`);
        }
      } else {
        // Convert customers to ledger format
        const ledgersList: Ledger[] = customers.map((customer, index) => ({
          name: customer.name,
          id: customer.id || index.toString(),
        }));
        
        setLedgers(ledgersList);
      }
    } catch (err) {
      setError('Failed to load ledgers. Please try again.');
    } finally {
      setLoadingLedgers(false);
    }
  }, [companyName, tallylocId, guid, masterDataContext?.customers]);

  // Parse ledgers from API response (using ledgerlist-w-addrs endpoint)
  const parseLedgersResponse = (jsonResponse: string): Ledger[] => {
    try {
      const responseData = JSON.parse(jsonResponse);
      
      // Handle different possible response structures
      let ledgersData: any[] = [];
      
      if (responseData.success && responseData.data) {
        ledgersData = responseData.data;
      } else if (Array.isArray(responseData)) {
        ledgersData = responseData;
      } else if (responseData.data && Array.isArray(responseData.data)) {
        ledgersData = responseData.data;
      } else if (responseData.ledgers && Array.isArray(responseData.ledgers)) {
        // Handle the ledgerlist-w-addrs response structure
        ledgersData = responseData.ledgers;
      } else {
        return [];
      }
      
      // Convert the data to our Ledger interface
      const ledgers: Ledger[] = ledgersData.map((item, index) => ({
        name: item.name || item.NAME || item.ledger_name || item.description || `Ledger ${index + 1}`,
        id: item.id || item.ledger_id || item.guid || index.toString(),
      }));
      
      return ledgers;
    } catch (error) {
      // Return empty array instead of sample data
      return [];
    }
  };

  // Load ledger voucher report
  const loadLedgerVoucherReport = useCallback(async () => {
    if (!companyName || !tallylocId || !guid || !selectedLedger) return;
    
    setLoadingReport(true);
    setError(null);
    
    try {
      const response = await apiService.getLedgerVoucherReport(
        tallylocId, 
        companyName, 
        guid, 
        selectedLedger.name,
        startDate,
        endDate
      );
      
      if (response.success && response.data) {
        const report = parseLedgerVoucherResponse(response.data);
        setReportData(report);
      } else {
        setError('Failed to load ledger voucher report. Please try again.');
      }
    } catch (err) {
      setError('Failed to load ledger voucher report. Please try again.');
      console.error('Error loading ledger voucher report:', err);
    } finally {
      setLoadingReport(false);
    }
  }, [companyName, tallylocId, guid, selectedLedger, startDate, endDate]);

  // Handle period change
  const handlePeriodChange = useCallback((start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
    if (selectedLedger) {
      loadLedgerVoucherReport();
    }
  }, [selectedLedger, loadLedgerVoucherReport]);

  // Handle ledger selection
  const handleLedgerSelect = useCallback((ledger: Ledger) => {
    setSelectedLedger(ledger);
    setShowLedgerModal(false);
    
    // Clear any existing report data when selecting a new ledger
    setReportData(null);
  }, []);


  // Load ledgers on component mount
  useEffect(() => {
    loadLedgers().finally(() => {
      setLoading(false);
      // Auto-open ledger selection modal after loading
      setShowLedgerModal(true);
    });
  }, [loadLedgers]);

  // Auto-load report when selectedLedger changes
  useEffect(() => {
    if (selectedLedger && companyName && tallylocId && guid) {
      loadLedgerVoucherReport();
    }
  }, [selectedLedger, companyName, tallylocId, guid, loadLedgerVoucherReport]);


  // Parse ledger voucher report from API response
  const parseLedgerVoucherResponse = (jsonResponse: string): LedgerVoucherData => {
    try {
      const responseData = JSON.parse(jsonResponse);
      
      // Handle different possible response structures
      let entriesData: any[] = [];
      let summaryData: any = {};
      
      if (responseData.success && responseData.data) {
        if (Array.isArray(responseData.data)) {
          entriesData = responseData.data;
        } else if (responseData.data.entries) {
          entriesData = responseData.data.entries;
          summaryData = responseData.data;
        } else if (responseData.data.vouchers && Array.isArray(responseData.data.vouchers)) {
          // Handle the actual response structure from the API
          entriesData = responseData.data.vouchers;
          summaryData = {
            opening_balance: responseData.data.opening,
            fromdate: responseData.data.fromdate,
            todate: responseData.data.todate,
            ledgername: responseData.data.ledgername
          };
        }
      } else if (Array.isArray(responseData)) {
        entriesData = responseData;
      } else if (responseData.entries) {
        entriesData = responseData.entries;
        summaryData = responseData;
      } else if (responseData.vouchers && Array.isArray(responseData.vouchers)) {
        // Handle direct vouchers structure
        entriesData = responseData.vouchers;
        summaryData = {
          opening_balance: responseData.opening,
          fromdate: responseData.fromdate,
          todate: responseData.todate,
          ledgername: responseData.ledgername
        };
      } else if (responseData.data && Array.isArray(responseData.data)) {
        // Handle the actual response structure from the API
        entriesData = responseData.data;
        summaryData = {
          opening_balance: responseData.opening,
          closing_balance: responseData.closing,
          fromdate: responseData.fromdate,
          todate: responseData.todate,
          ledgername: responseData.ledgername
        };
      } else {
        return {
          ledgerName: selectedLedger?.name || '',
          entries: [],
          openingBalance: 0,
          totalDebit: 0,
          totalCredit: 0,
          closingBalance: 0,
        };
      }
      
      // Debug: Log the structure of the first entry to understand the data format

      // Convert entries data to our interface
      const entries: LedgerVoucherEntry[] = entriesData.map((item, index) => {
        // Extract all ledger entries for this voucher
        const allLedgerEntries: Array<{
          ledgerName: string;
          debitAmt: number;
          creditAmt: number;
        }> = [];

        // Check if the item has ledger entries array - handle Tally's ALLLEDGERENTRIES structure
        if (item.ALLLEDGERENTRIES && Array.isArray(item.ALLLEDGERENTRIES)) {
          item.ALLLEDGERENTRIES.forEach((entry: any) => {
            allLedgerEntries.push({
              ledgerName: entry.LEDGERNAME || entry.ledger_name || entry.name || 'Unknown',
              debitAmt: parseFloat(entry.DEBITAMT || entry.debit_amt || '0'),
              creditAmt: parseFloat(entry.CREDITAMT || entry.credit_amt || '0'),
            });
          });
        } else if (item.ledger_entries && Array.isArray(item.ledger_entries)) {
          item.ledger_entries.forEach((entry: any) => {
            allLedgerEntries.push({
              ledgerName: entry.ledger_name || entry.LEDGERNAME || entry.name || 'Unknown',
              debitAmt: parseFloat(entry.debit_amt || entry.DEBITAMT || '0'),
              creditAmt: parseFloat(entry.credit_amt || entry.CREDITAMT || '0'),
            });
          });
        } else if (item.ledgers && Array.isArray(item.ledgers)) {
          item.ledgers.forEach((entry: any) => {
            allLedgerEntries.push({
              ledgerName: entry.ledger_name || entry.LEDGERNAME || entry.name || 'Unknown',
              debitAmt: parseFloat(entry.debit_amt || entry.DEBITAMT || '0'),
              creditAmt: parseFloat(entry.credit_amt || entry.CREDITAMT || '0'),
            });
          });
        } else if (item.entries && Array.isArray(item.entries)) {
          item.entries.forEach((entry: any) => {
            allLedgerEntries.push({
              ledgerName: entry.ledger_name || entry.LEDGERNAME || entry.name || 'Unknown',
              debitAmt: parseFloat(entry.debit_amt || entry.DEBITAMT || '0'),
              creditAmt: parseFloat(entry.credit_amt || entry.CREDITAMT || '0'),
            });
          });
        }

        // Find the opposite ledger
        const selectedLedgerDebit = parseFloat(item.debit || item.debit_amount || item.DEBITAMT || '0');
        const selectedLedgerCredit = parseFloat(item.credit || item.credit_amount || item.CREDITAMT || '0');
        
        let oppositeLedgerName = 'Unknown';
        
        if (allLedgerEntries.length > 0) {
          
          if (selectedLedgerDebit > 0) {
            // Selected ledger has debit, find ledger with highest credit amount
            const creditLedgers = allLedgerEntries.filter(entry => entry.creditAmt > 0);
            if (creditLedgers.length > 0) {
              const highestCreditLedger = creditLedgers.reduce((max, current) => 
                current.creditAmt > max.creditAmt ? current : max
              );
              oppositeLedgerName = highestCreditLedger.ledgerName;
            } else {
              oppositeLedgerName = 'Unknown';
            }
          } else if (selectedLedgerCredit > 0) {
            // Selected ledger has credit, find ledger with highest debit amount
            const debitLedgers = allLedgerEntries.filter(entry => entry.debitAmt > 0);
            if (debitLedgers.length > 0) {
              const highestDebitLedger = debitLedgers.reduce((max, current) => 
                current.debitAmt > max.debitAmt ? current : max
              );
              oppositeLedgerName = highestDebitLedger.ledgerName;
            } else {
              oppositeLedgerName = 'Unknown';
            }
          }
        } else {
          // Fallback: if no detailed ledger entries, try to extract from other fields
          if (item.particulars || item.PARTICULARS) {
            oppositeLedgerName = item.particulars || item.PARTICULARS || 'Unknown';
          }
        }

        return {
          id: item.id || item.voucher_id || item.STERID || item.MASTERID || index.toString(),
          description: oppositeLedgerName, // Show opposite ledger name instead of description
          date: item.date || item.voucher_date || item.VCHDATE || item.DATE || 'Unknown',
          reference: item.reference || item.voucher_no || item.voucher_type || `${item.VCHTYPE} #${item.VCHNO}` || 'Unknown',
          debit: selectedLedgerDebit,
          credit: selectedLedgerCredit,
          balance: parseFloat(item.balance || item.running_balance || '0'),
          allLedgerEntries: allLedgerEntries,
          // Store raw data for detail view without changing the interface
          rawData: item,
        };
      });
      
      // Calculate running balance for each entry
      let runningBalance = openingBalance;
      const entriesWithRunningBalance = entries.map(entry => {
        runningBalance += (entry.debit || 0) - (entry.credit || 0);
        return {
          ...entry,
          runningBalance
        };
      });

      // Calculate totals
      const totalDebit = entries.reduce((sum, entry) => sum + entry.debit, 0);
      const totalCredit = entries.reduce((sum, entry) => sum + entry.credit, 0);
      
      // Handle opening balance from the nested structure
      let openingBalance = 0;
      if (summaryData.opening_balance) {
        if (typeof summaryData.opening_balance === 'object') {
          // Handle nested structure like {"CREDITAMT": 0, "DEBITAMT": 0}
          const debitAmt = parseFloat(summaryData.opening_balance.DEBITAMT || '0');
          const creditAmt = parseFloat(summaryData.opening_balance.CREDITAMT || '0');
          openingBalance = debitAmt - creditAmt; // Debit - Credit = Opening Balance
        } else {
          openingBalance = parseFloat(summaryData.opening_balance || '0');
        }
      }
      
      // Handle closing balance from the nested structure if available
      let closingBalance = 0;
      if (summaryData.closing_balance) {
        if (typeof summaryData.closing_balance === 'object') {
          // Handle nested structure like {"CREDITAMT": 0, "DEBITAMT": 11664}
          const debitAmt = parseFloat(summaryData.closing_balance.DEBITAMT || '0');
          const creditAmt = parseFloat(summaryData.closing_balance.CREDITAMT || '0');
          closingBalance = debitAmt - creditAmt; // Debit - Credit = Closing Balance
        } else {
          closingBalance = parseFloat(summaryData.closing_balance || '0');
        }
      } else {
        // Calculate closing balance as opening + debit - credit if not provided
        closingBalance = openingBalance + totalDebit - totalCredit;
      }
      
      const report: LedgerVoucherData = {
        ledgerName: selectedLedger?.name || '',
        entries: entriesWithRunningBalance,
        openingBalance,
        totalDebit,
        totalCredit,
        closingBalance,
      };
      
      return report;
    } catch (error) {
      return {
        ledgerName: selectedLedger?.name || '',
        entries: [],
        openingBalance: 0,
        totalDebit: 0,
        totalCredit: 0,
        closingBalance: 0,
      };
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const formatAmount = (amount: number): string => {
    if (amount === 0) return '₹0.00';
    return `₹${amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // renderLedgerItem function removed - now using TallyDataList component

  const renderVoucherEntry = ({ item }: { item: LedgerVoucherEntry }) => (
    <TouchableOpacity 
      style={styles.voucherEntry}
      onPress={() => handleVoucherPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.entryHeader}>
        <Text style={styles.entryDescription}>{item.description}</Text>
        <Text style={styles.entryAmount}>
          {item.debit > 0 ? `${formatAmount(item.debit)} Dr.` : `${formatAmount(item.credit)} Cr.`}
        </Text>
      </View>
      <View style={styles.entryDetails}>
        <Text style={styles.entryDateRef}>{item.date} | {item.reference}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        {selectedLedger 
          ? 'No voucher entries found for the selected period'
          : 'Please select a ledger to view voucher entries'
        }
      </Text>
    </View>
  );

    if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <StandardHeader
          title="Ledger Vouchers"
          showMenuButton={true}
          onMenuPress={handleMenuPress}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      {/* Overlay to close dropdown when tapping outside */}
      {showThreeDotsMenu && (
        <TouchableOpacity 
          style={styles.overlay}
          activeOpacity={1}
          onPress={closeThreeDotsMenu}
        />
      )}
      
      <StandardHeader
        title="Ledger Vouchers"
        showMenuButton={true}
        onMenuPress={handleMenuPress}
        rightComponent={<ThreeDotsMenu />}
      />

            {/* Ledger Selection */}
      <View style={styles.ledgerSelectionContainer}>
                  <TouchableOpacity
          style={styles.ledgerSelector}
          onPress={() => setShowLedgerModal(true)}
        >
         <Text style={styles.ledgerSelectorIcon}>🔍</Text>
         <Text style={styles.ledgerSelectorText}>
           {selectedLedger ? selectedLedger.name : 'Select Ledger'}
         </Text>
         <Text style={styles.ledgerSelectorArrow}>▼</Text>
       </TouchableOpacity>
      </View>

      {/* Period Selector */}
      <PeriodSelector
        onPeriodChange={handlePeriodChange}
        initialStartDate={startDate}
        initialEndDate={endDate}
      />


      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => {
            loadLedgers();
            if (selectedLedger) {
              loadLedgerVoucherReport();
            }
          }}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Report Content */}
      {selectedLedger && (
        <View style={styles.reportContainer}>
          {loadingReport ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading report...</Text>
            </View>
          ) : reportData ? (
            <>
              <FlatList
                data={reportData.entries}
                renderItem={renderVoucherEntry}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={renderEmptyComponent}
                showsVerticalScrollIndicator={false}
              />

              {/* Fixed Grand Total Section */}
              <View style={styles.fixedGrandTotalContainer}>
                <TouchableOpacity 
                  style={styles.grandTotalHeader}
                  onPress={() => {
                    setIsGrandTotalCollapsed(!isGrandTotalCollapsed);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.grandTotalTitle}>GRAND TOTAL</Text>
                  <Text style={styles.grandTotalArrow}>
                    {isGrandTotalCollapsed ? '▼' : '▲'}
                  </Text>
                </TouchableOpacity>
                
                {!isGrandTotalCollapsed && (
                  <View style={styles.grandTotalDetails}>
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>Opening Bal (Debit)</Text>
                      <Text style={styles.totalValue} numberOfLines={1}>
                        {reportData.openingBalance > 0 ? formatAmount(reportData.openingBalance) : '-'}
                      </Text>
                    </View>
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>Debit</Text>
                      <Text style={styles.totalValue} numberOfLines={1}>
                        {reportData.totalDebit > 0 ? formatAmount(reportData.totalDebit) : '-'}
                      </Text>
                    </View>
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>Credit</Text>
                      <Text style={styles.totalValue} numberOfLines={1}>
                        {reportData.totalCredit > 0 ? formatAmount(reportData.totalCredit) : '-'}
                      </Text>
                    </View>
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>Closing Bal (Debit)</Text>
                      <Text style={styles.totalValue} numberOfLines={1}>
                        {formatAmount(Math.abs(reportData.closingBalance))}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </>
          ) : null}
        </View>
      )}

            {/* Reports Menu */}
      <ReportsMenu
        showMenu={showMenu}
        onClose={closeMenu}
        onNavigation={handleNavigation}
      />

      {/* Ledger Selection Modal */}
      <Modal
        visible={showLedgerModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLedgerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Ledger</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowLedgerModal(false)}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            <LightweightList
              data={ledgers}
              onItemSelect={handleLedgerSelect}
              loading={loadingLedgers}
              searchPlaceholder="Search ledgers..."
              searchFields={['name']}
              renderItem={(item, onPress) => <LedgerRenderer item={item} onPress={onPress} />}
              emptyMessage="No ledgers found"
              loadingMessage="Loading ledgers..."
            />
          </View>
        </View>
      </Modal>

      {/* Voucher Detail Modal */}
      <VoucherDetailModal
        visible={showVoucherModal}
        voucher={selectedVoucher}
        onClose={closeVoucherModal}
        companyName={companyName}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  ledgerSelectionContainer: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 0,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  printButton: {
    backgroundColor: '#007AFF',
  },
  whatsappButton: {
    backgroundColor: '#25D366',
  },
  saveButton: {
    backgroundColor: '#28a745',
  },
  actionButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  ledgerSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderWidth: 0,
  },
  ledgerSelectorIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  ledgerSelectorText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  ledgerSelectorArrow: {
    fontSize: 12,
    color: '#666',
  },
  errorContainer: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    margin: 20,
  },
  errorText: {
    color: '#721c24',
    fontSize: 14,
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  reportContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  listContainer: {
    padding: 0,
    paddingBottom: 120, // Add bottom padding to account for fixed grand total
    flexGrow: 1, // Allow content to expand
  },
  voucherEntry: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 0,
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  entryDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  entryAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  entryDetails: {
    marginTop: 5,
  },
  entryDateRef: {
    fontSize: 12,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  grandTotalContainer: {
    backgroundColor: '#ffffff',
    marginTop: 0,
    marginBottom: 0,
    borderRadius: 0,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    // Ensure it doesn't overlap with navigation bar
    position: 'relative',
  },
  fixedGrandTotalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 2,
    borderTopColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
    zIndex: 1000,
  },
  grandTotalHeader: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  grandTotalTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  grandTotalArrow: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  grandTotalDetails: {
    backgroundColor: '#ffffff',
    padding: 0,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginBottom: 0,
    minHeight: 16,
    width: '100%',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  totalLabel: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'left',
    lineHeight: 16,
  },
  totalValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    lineHeight: 16,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 0,
    minHeight: 18,
    width: '100%',
    backgroundColor: '#007AFF',
    borderBottomWidth: 0,
  },
  grandTotalLabel: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
    flex: 1,
    textAlign: 'left',
    lineHeight: 18,
  },
  grandTotalValue: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    lineHeight: 18,
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
  // Modal body and flatlist styles removed - now using LightweightList component
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
    width: '100%',
    height: '100%',
  },
  invoiceHeader: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  invoiceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  invoiceInfo: {
    marginTop: 5,
  },
  invoiceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  companySection: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  companyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  companyAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  companyGstin: {
    fontSize: 14,
    color: '#666',
  },
  customerSection: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  customerAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  customerGstin: {
    fontSize: 14,
    color: '#666',
  },
  itemsSection: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#ffffff',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },

  summarySection: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  additionalSection: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  additionalText: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
  },
  
  // Modal header styles
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
    flex: 1,
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  
  // Table header styles
  tableHeaderContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 15,
    marginHorizontal: 5,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  headerItemNameRow: {
    marginBottom: 8,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  headerItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#495057',
    textAlign: 'center',
  },
  headerDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 20,
  },
  headerDetailsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerDetailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginRight: 15,
  },
  headerDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    textAlign: 'right',
    flex: 1,
  },

  // New item layout styles
  itemContainer: {
    marginBottom: 15,
    paddingBottom: 15,
    paddingTop: 10,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fafafa',
    borderRadius: 8,
    marginHorizontal: 5,
  },
  itemNameRow: {
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    lineHeight: 20,
  },
  itemDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 20,
  },
  itemDetailsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemDetailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    marginRight: 15,
  },
  itemDetailValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    textAlign: 'right',
    flex: 1,
  },

  // Three dots menu styles
  threeDotsMenuContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  threeDotsButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  threeDotsIcon: {
    fontSize: 20,
    color: '#333333',
    fontWeight: 'bold',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 45,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingVertical: 8,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
    flex: 1,
  },
  dropdownItemIcon: {
    fontSize: 18,
    marginLeft: 8,
  },
  dropdownItemDisabled: {
    opacity: 0.5,
  },
  dropdownItemTextDisabled: {
    color: '#999999',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },

  // Receipt Voucher Styles
  companyHeader: {
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#2c3e50',
    marginBottom: 20,
  },
  companyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  companyAddress: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 16,
  },
  receiptTitleContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  receiptTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  voucherDetailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  voucherDetailText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  receiptTableContainer: {
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 8,
    marginBottom: 20,
    overflow: 'hidden',
  },
  receiptTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#34495e',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  receiptTableHeaderText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
  receiptTableRow: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: 'white',
  },
  receiptTableParticulars: {
    flex: 0.6,
    paddingRight: 10,
  },
  receiptTableAccountName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  againstRefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginLeft: 20,
    marginBottom: 4,
  },
  againstRefText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  againstRefAmount: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    textAlign: 'right',
    minWidth: 100,
  },
  firstLedgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  firstLedgerContent: {
    flex: 1,
  },
  firstLedgerAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    textAlign: 'right',
    minWidth: 100,
    marginLeft: 20,
  },
  receiptTableAmount: {
    flex: 0.4,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    textAlign: 'right',
    minWidth: 100,
  },
  paymentMethodContainer: {
    marginVertical: 15,
  },
  paymentMethodText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  amountInWordsContainer: {
    marginVertical: 15,
  },
  amountInWordsText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  totalAmountContainer: {
    alignItems: 'flex-end',
    marginVertical: 15,
  },
  totalAmountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  signatureContainer: {
    alignItems: 'flex-end',
    marginTop: 30,
  },
  signatureText: {
    fontSize: 14,
    color: '#666',
  },
  ledgerTableContainer: {
    marginVertical: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  ledgerTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  ledgerTableHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  ledgerTableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  ledgerTableParticulars: {
    flex: 0.6,
  },
  ledgerTableAccountName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  ledgerTableAmount: {
    flex: 0.4,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    textAlign: 'right',
  },

});
