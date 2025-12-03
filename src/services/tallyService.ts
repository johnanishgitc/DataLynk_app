import { apiService } from './api';
import { getOrderDetailsXmlRequest } from '../utils/tallyXmlRequests';

export interface OrderListItem {
  masterId: number;
  date: string;
  reference: string;
  partyLedgerName: string;
  amount: number;
}

export interface OrderDetailItem {
  stockItemName: string;
  quantity: number;
  rate: number;
  amount: number;
  unit: string;
  orderedQty?: number;
  billedQty?: number;
  pendingQty?: number;
  pendingValue?: number;
}

export interface OrderDetails {
  masterId: number;
  reference: string;
  date: string;
  partyLedgerName: string;
  totalAmount: number;
  items: OrderDetailItem[];
}

// Enhanced interface to store both summary and details
export interface OrderDataWithItems {
  summary: OrderListItem[];
  details: Map<number, OrderDetails>; // MasterID -> OrderDetails
}

export interface TallyOrderListResponse {
  resultType: string;
  rowDesc: Array<{
    name: string;
    alias: string;
    type: string;
    length: number;
    precision: number;
    nullable: string;
  }>;
  resultData: Array<{
    masterId: number;
    date: string;
    reference: string;
    partyLedgerName: string;
    amount: number;
  }>;
}

export const tallyService = {
  /**
   * Get order list from Tally using XML request with item details
   */
  async getOrderList(companyName?: string, tallylocId?: string, guid?: string, startDate?: Date, endDate?: Date): Promise<OrderDataWithItems> {
    try {
      if (companyName && tallylocId && guid) {
        // Call the real API with company context
        const response = await apiService.getOrderListFromTally(tallylocId, companyName, guid, startDate, endDate);
        
        if (response.success && response.data) {
          // Parse the XML response and return real data with both summary and details
          const result = this.parseOrderListResponse(response.data);
          return result;
        } else {
                console.error('🔍 API call failed:', response.message);
      // Fall back to mock data if API fails
    }
  } else {
    // Missing company context
  }
  
  // Return mock data as fallback
  return this.getMockOrderDataWithItems();
} catch (error) {
  console.error('🔍 Error fetching order list from Tally:', error);
  // Return mock data on error
  return this.getMockOrderDataWithItems();
}
  },

  /**
   * Get specific order details from Tally using the new XML request
   */
  async getOrderDetails(customerName: string, orderNo: string, companyName?: string, tallylocId?: string, guid?: string): Promise<OrderDetails | null> {
    try {
      if (companyName && tallylocId && guid) {
        const xmlRequest = getOrderDetailsXmlRequest(customerName, orderNo, companyName);
        
        // Call the API with the new XML request
        const response = await apiService.getOrderDetailsFromTallyWithXml(tallylocId, companyName, guid, xmlRequest);
        
        if (response.success && response.data) {
          // Parse the new response format
          return this.parseOrderDetailsResponse(response.data, customerName, orderNo);
        } else {
          console.error('🔍 API call failed for order details:', response.message);
        }
      } else {
        // Missing company context
      }
      
      return null;
    } catch (error) {
      console.error('🔍 Error fetching order details from Tally:', error);
      return null;
    }
  },

  /**
   * Parse the XML response from Tally to extract both order summary and item details
   * Based on the actual Tally SQL response format with <EXPORTDATARESPONSE> and <COL> elements
   */
  parseOrderListResponse(xmlResponse: string): OrderDataWithItems {
    try {
      
      // Parse the XML response from Tally to extract both summary and item details
      const summaryMap = new Map<number, OrderListItem>();
      const detailsMap = new Map<number, OrderDetails>();
      
      // Look for the EXPORTDATARESPONSE structure (actual Tally SQL format)
      const exportDataResponseMatch = xmlResponse.match(/<EXPORTDATARESPONSE[^>]*>(.*?)<\/EXPORTDATARESPONSE>/s);
      
      if (exportDataResponseMatch) {

        const exportDataResponse = exportDataResponseMatch[1];
        
        // Look for RESULTDATA section
        const resultDataMatch = exportDataResponse.match(/<RESULTDATA>(.*?)<\/RESULTDATA>/s);
        
        if (resultDataMatch) {
          const resultData = resultDataMatch[1];

          
          // Parse each ROW in the RESULTDATA
          const rowMatches = resultData.match(/<ROW>(.*?)<\/ROW>/gs);
          
          if (rowMatches) {

            
            rowMatches.forEach((row, index) => {
              try {
                // Extract COL values from each row (they come in order: MasterId, Date, OrderNo, Customer, ItemName, Qty, Rate, Amount)
                const colMatches = row.match(/<COL>(.*?)<\/COL>/g);
                
                if (colMatches && colMatches.length >= 8) {
                  // Parse each column value (remove <COL> tags)
                  const values = colMatches.map(col => col.replace(/<\/?COL>/g, ''));
                  
                  const masterId = parseInt(values[0]) || 0;
                  const date = values[1] || '';
                  const orderNo = values[2] || '';
                  const customer = values[3] || '';
                  const itemName = values[4] || '';
                  const qty = parseFloat(values[5]) || 0;
                  const rate = parseFloat(values[6]) || 0;
                  const amount = Math.abs(parseFloat(values[7])) || 0; // Use absolute value as Tally shows negative amounts
                  
                  if (masterId > 0 && customer) {
                    // For summary view, itemName might be empty, so we'll use a placeholder
                    const displayItemName = itemName || 'Order Summary';
                    this.processParsedRow(masterId, date, orderNo, customer, displayItemName, qty, rate, amount, summaryMap, detailsMap);
                  } else {
                    console.log('🔍 Skipping invalid row', index, ':', { masterId, customer, itemName });
                  }
                } else {
                  console.log('🔍 Row', index, 'has insufficient columns:', colMatches?.length || 0);
                }
              } catch (rowError) {
                console.error('🔍 Error parsing row', index, ':', rowError);
              }
            });
          }
        }
      } else {

        
        // Fallback: Look for any ROW elements
        const rowMatches = xmlResponse.match(/<ROW>(.*?)<\/ROW>/gs);
        if (rowMatches) {

          
          rowMatches.forEach((row, index) => {
            try {
              const colMatches = row.match(/<COL>(.*?)<\/COL>/g);
              
              if (colMatches && colMatches.length >= 8) {
                const values = colMatches.map(col => col.replace(/<\/?COL>/g, ''));
                
                const masterId = parseInt(values[0]) || 0;
                const date = values[1] || '';
                const orderNo = values[2] || '';
                const customer = values[3] || '';
                const itemName = values[4] || '';
                const qty = parseFloat(values[5]) || 0;
                const rate = parseFloat(values[6]) || 0;
                const amount = Math.abs(parseFloat(values[7])) || 0;
                
                if (masterId > 0 && customer) {
                  // For summary view, itemName might be empty, so we'll use a placeholder
                  const displayItemName = itemName || 'Order Summary';
                  this.processParsedRow(masterId, date, orderNo, customer, displayItemName, qty, rate, amount, summaryMap, detailsMap);
                }
              }
            } catch (rowError) {
              console.error('🔍 Error parsing fallback row', index, ':', rowError);
            }
          });
        }
      }
      
      const summary = Array.from(summaryMap.values());
      
      if (summary.length === 0) {
        // Return empty data instead of mock data
        return {
          summary: [],
          details: new Map(),
        };
      }
      
      return {
        summary,
        details: detailsMap,
      };
    } catch (error) {
      console.error('Error parsing order list response:', error);
      return {
        summary: [],
        details: new Map(),
      };
    }
  },



  /**
   * Parse the XML response from Tally to extract order details for a specific order
   * Based on the new XML request format for individual order details
   */
  parseOrderDetailsResponse(xmlResponse: string, customerName: string, orderNo: string): OrderDetails | null {
    try {
      console.log('🔍 Parsing order details response for customer:', customerName, 'order:', orderNo);
      
      // Look for the EXPORTDATARESPONSE structure
      const exportDataResponseMatch = xmlResponse.match(/<EXPORTDATARESPONSE[^>]*>(.*?)<\/EXPORTDATARESPONSE>/s);
      
      if (exportDataResponseMatch) {
        const exportDataResponse = exportDataResponseMatch[1];
        
        // Look for RESULTDATA section
        const resultDataMatch = exportDataResponse.match(/<RESULTDATA>(.*?)<\/RESULTDATA>/s);
        
        if (resultDataMatch) {
          const resultData = resultDataMatch[1];
          
          // Parse each ROW in the RESULTDATA
          const rowMatches = resultData.match(/<ROW>(.*?)<\/ROW>/gs);
          
          if (rowMatches && rowMatches.length > 0) {
            const items: OrderDetailItem[] = [];
            let totalAmount = 0;
            let orderDate = '';
            
            rowMatches.forEach((row, index) => {
              try {
                // Extract COL values from each row
                const colMatches = row.match(/<COL>(.*?)<\/COL>/g);
                
                if (colMatches && colMatches.length >= 8) {
                  // Parse each column value (remove <COL> tags)
                  const values = colMatches.map(col => col.replace(/<\/?COL>/g, ''));
                  
                  const orderNoFromResponse = values[0] || '';
                  const date = values[1] || '';
                  const stockItem = values[2] || '';
                  const customer = values[3] || '';
                  const orderQty = parseFloat(values[4]) || 0;
                  const billedQty = parseFloat(values[5]) || 0;
                  const pendingQty = parseFloat(values[6]) || 0;
                  const pendingValue = parseFloat(values[7]) || 0;
                  
                  // Set order date from first row
                  if (index === 0) {
                    orderDate = this.formatTallyDate(date);
                  }
                  
                                     if (stockItem && orderQty > 0) {
                     items.push({
                       stockItemName: stockItem,
                       quantity: orderQty,
                       rate: pendingValue / pendingQty || 0,
                       amount: pendingValue,
                       unit: 'Nos', // Default unit
                       orderedQty: orderQty,
                       billedQty: billedQty,
                       pendingQty: pendingQty,
                       pendingValue: pendingValue
                     });
                     
                     totalAmount += pendingValue;
                   }
                }
              } catch (rowError) {
                console.error('🔍 Error parsing order detail row', index, ':', rowError);
              }
            });
            
            if (items.length > 0) {
              return {
                masterId: parseInt(orderNo) || 0,
                reference: orderNo,
                date: orderDate,
                partyLedgerName: customerName,
                totalAmount,
                items
              };
            }
          }
        }
      }
      
      console.log('🔍 No valid order details found in response');
      return null;
    } catch (error) {
      console.error('🔍 Error parsing order details response:', error);
      return null;
    }
  },

  /**
   * Get mock order details for testing
   */
  getMockOrderDetails(masterId: number): OrderDetails {
    const mockItems: OrderDetailItem[] = [
      {
        stockItemName: 'Sample Item 1',
        quantity: 10,
        rate: 100.00,
        amount: 1000.00,
        unit: 'Nos',
        orderedQty: 10,
        billedQty: 8,
        pendingQty: 2,
        pendingValue: 200.00
      },
      {
        stockItemName: 'Sample Item 2',
        quantity: 5,
        rate: 200.00,
        amount: 1000.00,
        unit: 'Nos',
        orderedQty: 5,
        billedQty: 3,
        pendingQty: 2,
        pendingValue: 400.00
      }
    ];

    return {
      masterId,
      reference: masterId.toString(),
      date: new Date().toISOString().split('T')[0],
      partyLedgerName: 'Sample Customer',
      totalAmount: 2000.00,
      items: mockItems
    };
  },

  /**
   * Process a parsed row and update summary and details maps
   */
  processParsedRow(
    masterId: number,
    date: string,
    orderNo: string,
    customer: string,
    itemName: string,
    qty: number,
    rate: number,
    amount: number,
    summaryMap: Map<number, OrderListItem>,
    detailsMap: Map<number, OrderDetails>
  ): void {
    // Convert Tally date format (YYYYMMDD) to readable format
    const formattedDate = this.formatTallyDate(date);
    
    // Use the exact order number from Tally, or masterId as fallback
    const reference = orderNo || masterId.toString();
    
    // Create or update summary
    if (!summaryMap.has(masterId)) {
      summaryMap.set(masterId, {
        masterId,
        date: formattedDate,
        reference: reference,
        partyLedgerName: customer,
        amount: 0, // Will be calculated from items
      });
    }
    
    // Add amount to summary
    const summary = summaryMap.get(masterId)!;
    summary.amount += amount;
    
    // Create or update details
    if (!detailsMap.has(masterId)) {
      detailsMap.set(masterId, {
        masterId,
        reference: reference,
        date: formattedDate,
        partyLedgerName: customer,
        totalAmount: 0,
        items: [],
      });
    }
    
    // Add item to details
    const details = detailsMap.get(masterId)!;
    details.totalAmount += amount;
    details.items.push({
      stockItemName: itemName,
      quantity: qty,
      rate: rate,
      amount: amount,
      unit: 'Nos', // Default unit
    });
  },

  /**
   * Convert Tally date format (YYYYMMDD) to readable format (DD-MMM-YY)
   */
  formatTallyDate(tallyDate: string): string {
    try {
      if (!tallyDate || tallyDate.length !== 8) return tallyDate;
      
      const year = tallyDate.substring(0, 4);
      const month = tallyDate.substring(4, 6);
      const day = tallyDate.substring(6, 8);
      
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: '2-digit',
      });
    } catch {
      return tallyDate;
    }
  },

  /**
   * Get mock order data with both summary and details for testing
   */
  getMockOrderDataWithItems(): OrderDataWithItems {
    const mockSummary: OrderListItem[] = [
      { masterId: 1, date: '2025-04-01', reference: '1', partyLedgerName: 'Praveen', amount: 2000.00 },
      { masterId: 2, date: '2025-08-23', reference: '2', partyLedgerName: 'Jeeva', amount: 1500.00 },
      { masterId: 3, date: '2025-08-23', reference: '3', partyLedgerName: 'Rohith', amount: 3000.00 },
    ];

    const mockDetails = new Map<number, OrderDetails>();
         mockDetails.set(1, {
       masterId: 1,
       reference: '1',
       date: '2025-04-01',
       partyLedgerName: 'Praveen',
       totalAmount: 2000.00,
       items: [
         { stockItemName: 'Sample Item 1', quantity: 10, rate: 100.00, amount: 1000.00, unit: 'Nos', orderedQty: 10, billedQty: 8, pendingQty: 2, pendingValue: 200.00 },
         { stockItemName: 'Sample Item 2', quantity: 5, rate: 200.00, amount: 1000.00, unit: 'Nos', orderedQty: 5, billedQty: 3, pendingQty: 2, pendingValue: 400.00 },
       ]
     });
     mockDetails.set(2, {
       masterId: 2,
       reference: '2',
       date: '2025-08-23',
       partyLedgerName: 'Jeeva',
       totalAmount: 1500.00,
       items: [
         { stockItemName: 'Sample Item 3', quantity: 3, rate: 500.00, amount: 1500.00, unit: 'Nos', orderedQty: 3, billedQty: 2, pendingQty: 1, pendingValue: 500.00 },
       ]
     });
     mockDetails.set(3, {
       masterId: 3,
       reference: '3',
       date: '2025-08-23',
       partyLedgerName: 'Rohith',
       totalAmount: 3000.00,
       items: [
         { stockItemName: 'Sample Item 4', quantity: 2, rate: 1500.00, amount: 3000.00, unit: 'Nos', orderedQty: 2, billedQty: 1, pendingQty: 1, pendingValue: 1500.00 },
       ]
     });

    return {
      summary: mockSummary,
      details: mockDetails,
    };
  },
};
