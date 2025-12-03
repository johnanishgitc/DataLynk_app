import { decryptStockItemPrices } from './priceDecryption';

export interface TallyItem {
  name: string;
  availableQty: number;
  rate?: number;
  igst?: number;
}

export interface TallyItemWithPriceLevels {
  name: string;
  availableQty: number;
  standardPrice?: number;
  lastPrice?: number;
  igst?: number;
  priceLevels: Array<{
    levelName: string;
    rate: number;
  }>;
}

export interface TallyCustomer {
  name: string;
  contact: string;
  phone: string;
  mobile: string;
  email: string;
  address: string;
  gstin: string;
  priceLevel?: string;
  // GST and Address related fields
  stateName?: string;
  country?: string;
  gstType?: string;
  mailingName?: string;
  pincode?: string;
}

export interface TallyVoucherType {
  name: string;
}

export interface TallyResponse {
  success: boolean;
  message: string;
  data: TallyItem[];
}

// Helper function to decode XML entities for display
export const decodeXmlEntities = (text: string): string => {
  if (!text) return '';
  

  
  // First, try to handle potential character encoding issues
  let processedText = text;
  
  // Specific fix for the known problematic item name
  processedText = processedText.replace(
    /1W SOFT CLOSING 110\* H\/O CLIP ON HINGE \(SET OF 2\) \? 8 CRANK \(HIHG5051\)/g,
    '1W SOFT CLOSING 110* H/O CLIP ON HINGE (SET OF 2) – 8 CRANK (HIHG5051)'
  );
  
  // Handle common character encoding issues where dashes might appear as "?"
  // This could happen if the text was encoded in a different charset
  processedText = processedText
    .replace(/\?/g, (match, offset, string) => {
      // Check if this "?" is likely a dash that got mangled
      const context = string.substring(Math.max(0, offset - 10), offset + 10);
      
      // If it's in a context that suggests it should be a dash, replace it
      if (context.includes('HINGE') || context.includes('CRANK') || context.includes('SET OF 2') || 
          context.includes('SOFT CLOSING') || context.includes('CLIP ON')) {
        return '-';
      }
      return match;
    });
  
  let decoded = processedText
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    // Handle dash characters that might be encoded
    .replace(/&#45;/g, '-')
    .replace(/&#x2D;/g, '-')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    // Handle other common XML entities
    .replace(/&#8211;/g, '–')  // en dash
    .replace(/&#8212;/g, '—')  // em dash
    .replace(/&#x2013;/g, '–') // en dash hex
    .replace(/&#x2014;/g, '—'); // em dash hex
  

  
  return decoded;
};

// Parse Tally XML response for items
export const parseTallyItemsResponse = (xmlResponse: string): TallyItem[] => {
  try {
    const items: TallyItem[] = [];
    
    // Extract STOCKITEM elements (new XML structure)
    const stockitemMatches = xmlResponse.match(/<STOCKITEM>(.*?)<\/STOCKITEM>/gs);
    
    if (stockitemMatches) {
      stockitemMatches.forEach((stockitem) => {
        // Extract item details
        const nameMatch = stockitem.match(/<NAME>(.*?)<\/NAME>/);
        const closingStockMatch = stockitem.match(/<CLOSINGSTOCK>(.*?)<\/CLOSINGSTOCK>/);
        const stdPriceMatch = stockitem.match(/<STDPRICE>(.*?)<\/STDPRICE>/);
        const igstMatch = stockitem.match(/<IGST>(.*?)<\/IGST>/);
        
        if (nameMatch) {
          const name = decodeXmlEntities(nameMatch[1].trim());
          const availableQty = closingStockMatch ? parseFloat(closingStockMatch[1].trim()) || 0 : 0;
          const rate = stdPriceMatch ? parseFloat(stdPriceMatch[1].trim()) || 0 : 0;
          const igst = igstMatch ? parseFloat(igstMatch[1].trim()) || 0 : 0;
          
          if (name && name !== 'StockItem' && name !== '') {
            // If rate is 0, try to extract it from the item name
            let finalRate = rate;
            if (rate === 0 && name.includes('Rs.')) {
              const rateMatch = name.match(/Rs\.(\d+(?:\.\d+)?)/);
              if (rateMatch) {
                finalRate = parseFloat(rateMatch[1]) || 0;
              }
            }
            
            items.push({
              name,
              availableQty,
              rate: finalRate,
              igst,
            });
          }
        }
      });
    } else {
      // Fallback to old COL-based structure if new structure not found
      const rowMatches = xmlResponse.match(/<ROW>(.*?)<\/ROW>/gs);
      
      if (rowMatches) {
        rowMatches.forEach((row, index) => {
          const colMatches = row.match(/<COL.*?>(.*?)<\/COL>/g);
          
          if (colMatches && colMatches.length >= 3) {
            const nameMatch = colMatches[0].match(/<COL.*?>(.*?)<\/COL>/);
            const qtyMatch = colMatches[1].match(/<COL.*?>(.*?)<\/COL>/);
            const rateMatch = colMatches[2].match(/<COL.*?>(.*?)<\/COL>/);
            
            if (nameMatch && qtyMatch && rateMatch) {
              const name = decodeXmlEntities(nameMatch[1].trim());
              const qtyText = decodeXmlEntities(qtyMatch[1].trim());
              const rateText = decodeXmlEntities(rateMatch[1].trim());
              const availableQty = parseFloat(qtyText) || 0;
              const rate = parseFloat(rateText) || 0;
              
              if (name && name !== 'StockItem' && name !== '') {
                let finalRate = rate;
                if (rate === 0 && name.includes('Rs.')) {
                  const rateMatch = name.match(/Rs\.(\d+(?:\.\d+)?)/);
                  if (rateMatch) {
                    finalRate = parseFloat(rateMatch[1]) || 0;
                  }
                }
                
                items.push({
                  name,
                  availableQty,
                  rate: finalRate,
                });
              }
            }
          }
        });
      }
    }
    
    return items;
  } catch (error) {
    console.error('🌐 Error parsing Tally XML response:', error);
    return [];
  }
};

// Convert Tally items to StockItem format
export const convertTallyItemsToStockItems = (tallyItems: TallyItem[]) => {
  return tallyItems.map((item, index) => ({
    id: (index + 1).toString(),
    name: item.name,
    availableQty: item.availableQty,
    rate: item.rate || 0, // Use actual rate from Tally, fallback to 0 if not available
    igst: item.igst || 0, // Use IGST from Tally, fallback to 0 if not available
  }));
};

// Parse Tally XML response for customers
export const parseTallyCustomersResponse = (xmlResponse: string): TallyCustomer[] => {
     try {
    
    const customers: TallyCustomer[] = [];
    
         // First try to find the new format with specific tag names
     const customerNameMatches = xmlResponse.match(/<CustomerName>(.*?)<\/CustomerName>/g);
     const contactMatches = xmlResponse.match(/<Contact>(.*?)<\/Contact>/g);
     const phoneMatches = xmlResponse.match(/<Phone>(.*?)<\/Phone>/g);
     const mobileMatches = xmlResponse.match(/<Mobile>(.*?)<\/Mobile>/g);
     const emailMatches = xmlResponse.match(/<Email>(.*?)<\/Email>/g);
     const addressMatches = xmlResponse.match(/<Address>(.*?)<\/Address>/g);
     const gstinMatches = xmlResponse.match(/<GSTIN>(.*?)<\/GSTIN>/g);
     const priceLevelMatches = xmlResponse.match(/<PriceLevel>(.*?)<\/PriceLevel>/g);
    
         if (customerNameMatches && customerNameMatches.length > 0) {
      
      // New format with specific tags
      for (let i = 0; i < customerNameMatches.length; i++) {
                 const customerName = decodeXmlEntities(customerNameMatches[i].replace(/<CustomerName>|<\/CustomerName>/g, '').trim());
         const contact = contactMatches && contactMatches[i] ? decodeXmlEntities(contactMatches[i].replace(/<Contact>|<\/Contact>/g, '').trim()) : '';
         const phone = phoneMatches && phoneMatches[i] ? decodeXmlEntities(phoneMatches[i].replace(/<Phone>|<\/Phone>/g, '').trim()) : '';
         const mobile = mobileMatches && mobileMatches[i] ? decodeXmlEntities(mobileMatches[i].replace(/<Mobile>|<\/Mobile>/g, '').trim()) : '';
         const email = emailMatches && emailMatches[i] ? decodeXmlEntities(emailMatches[i].replace(/<Email>|<\/Email>/g, '').trim()) : '';
         const address = addressMatches && addressMatches[i] ? decodeXmlEntities(addressMatches[i].replace(/<Address>|<\/Address>/g, '').trim()) : '';
         const gstin = gstinMatches && gstinMatches[i] ? decodeXmlEntities(gstinMatches[i].replace(/<GSTIN>|<\/GSTIN>/g, '').trim()) : '';
         const priceLevel = priceLevelMatches && priceLevelMatches[i] ? decodeXmlEntities(priceLevelMatches[i].replace(/<PriceLevel>|<\/PriceLevel>/g, '').trim()) : '';
         
         
        
        if (customerName && customerName !== 'CustomerName') {
          customers.push({
            name: customerName,
            contact: contact || '',
            phone: phone || '',
            mobile: mobile || '',
            email: email || '',
            address: address || '',
            gstin: gstin || '',
            priceLevel: priceLevel || ''
          });
        }
      }
    } else {
      // Fallback to COL tags (old format)
      const rowMatches = xmlResponse.match(/<ROW>(.*?)<\/ROW>/gs);
      
      if (rowMatches) {
        rowMatches.forEach((row, rowIndex) => {
          const colMatches = row.match(/<COL.*?>(.*?)<\/COL>/g);
          if (colMatches && colMatches.length >= 12) { // Need at least 12 columns for price level
            const nameMatch = colMatches[0].match(/<COL.*?>(.*?)<\/COL>/);
            const contactMatch = colMatches[2].match(/<COL.*?>(.*?)<\/COL>/); // Contact is 3rd column
            const phoneMatch = colMatches[3].match(/<COL.*?>(.*?)<\/COL>/);   // Phone is 4th column
            const mobileMatch = colMatches[4].match(/<COL.*?>(.*?)<\/COL>/);  // Mobile is 5th column
            const addressMatch = colMatches[5].match(/<COL.*?>(.*?)<\/COL>/); // Address is 6th column
            const pincodeMatch = colMatches[6].match(/<COL.*?>(.*?)<\/COL>/); // Pincode is 7th column
            const stateMatch = colMatches[7].match(/<COL.*?>(.*?)<\/COL>/);   // State is 8th column
            const countryMatch = colMatches[8].match(/<COL.*?>(.*?)<\/COL>/); // Country is 9th column
            const emailMatch = colMatches[9].match(/<COL.*?>(.*?)<\/COL>/);   // Email is 10th column
            const emailCCMatch = colMatches[10].match(/<COL.*?>(.*?)<\/COL>/); // EmailCC is 11th column
            const priceLevelMatch = colMatches[11].match(/<COL.*?>(.*?)<\/COL>/); // PriceLevel is 12th column
            const gstinMatch = colMatches[12].match(/<COL.*?>(.*?)<\/COL>/);   // GSTIN is 13th column
            const gstRegTypeMatch = colMatches[13].match(/<COL.*?>(.*?)<\/COL>/); // GST Reg Type is 14th column
            
            if (nameMatch) {
              const customerName = decodeXmlEntities(nameMatch[1].trim());
              const contact = contactMatch ? decodeXmlEntities(contactMatch[1].trim()) : '';
              const phone = phoneMatch ? decodeXmlEntities(phoneMatch[1].trim()) : '';
              const mobile = mobileMatch ? decodeXmlEntities(mobileMatch[1].trim()) : '';
              const email = emailMatch ? decodeXmlEntities(emailMatch[1].trim()) : '';
              const address = addressMatch ? decodeXmlEntities(addressMatch[1].trim()) : '';
              const gstin = gstinMatch ? decodeXmlEntities(gstinMatch[1].trim()) : '';
              const priceLevel = priceLevelMatch ? decodeXmlEntities(priceLevelMatch[1].trim()) : '';
              
              if (customerName && customerName !== 'Customer' && customerName !== 'CustomerName') {
                customers.push({
                  name: customerName,
                  contact: contact || '',
                  phone: phone || '',
                  mobile: mobile || '',
                  email: email || '',
                  address: address || '',
                  gstin: gstin || '',
                  priceLevel: priceLevel || ''
                });
              }
            }
          }
        });
      }
    }
    
         return customers;
  } catch (error) {
    console.error('🌐 Error parsing Tally Customer XML response:', error);
    return [];
  }
};

 // Convert Tally customers to Customer format
 export const convertTallyCustomersToCustomers = (tallyCustomers: TallyCustomer[]) => {
   const convertedCustomers = tallyCustomers.map((customer, index) => ({
    id: (index + 1).toString(),
    name: customer.name,
    phone: customer.phone || '',
    mobile: customer.mobile || '',
    email: customer.email || '',
    address: customer.address || '',
    gstin: customer.gstin || '',
    contact: customer.contact || '',
    priceLevel: customer.priceLevel || '',
    // GST and Address related fields
    stateName: customer.stateName || '',
    country: customer.country || '',
    gstType: customer.gstType || '',
    mailingName: customer.mailingName || customer.name,
    pincode: customer.pincode || ''
   }));
   return convertedCustomers;
 };

// Parse Tally JSON response for customers with addresses
export const parseTallyCustomersWithAddressesResponse = (jsonResponse: any): TallyCustomer[] => {
  try {
    const customers: TallyCustomer[] = [];
    
    if (jsonResponse && jsonResponse.ledgers && Array.isArray(jsonResponse.ledgers)) {
      let processedCount = 0;
      
      jsonResponse.ledgers.forEach((ledger: any) => {
        if (ledger.NAME && ledger.NAME.trim()) {
          // Parse address components - split by | and convert to line breaks
          let fullAddress = '';
          if (ledger.ADDRESS) {
            // Split by |, trim each line, and join with newlines
            fullAddress = ledger.ADDRESS
              .split('|')
              .map(line => line.trim())
              .filter(line => line.length > 0) // Remove empty lines after trimming
              .join('\n');
          }
          // Note: PINCODE, STATENAME, and COUNTRY are stored separately, not in address
          
          customers.push({
            name: ledger.NAME.trim(),
            contact: '', // Let user enter manually
            phone: '', // Not available in this API
            mobile: '', // Not available in this API
            email: ledger.EMAIL || '',
            address: fullAddress,
            gstin: ledger.GSTNO || '',
            priceLevel: ledger.PRICELEVEL || '',
            // GST and Address related fields
            stateName: ledger.STATENAME || '',
            country: ledger.COUNTRY || '',
            gstType: ledger.GSTTYPE || '',
            mailingName: ledger.MAILINGNAME || ledger.NAME.trim(),
            pincode: ledger.PINCODE || ''
          });
          processedCount++;
        }
      });
      
    }
    
    return customers;
  } catch (error) {
    console.error('🌐 Error parsing Tally Customers with Addresses JSON response:', error);
    return [];
  }
};

// Parse Tally XML response for items with price levels
export const parseTallyItemsWithPriceLevelsResponse = (xmlResponse: string): TallyItemWithPriceLevels[] => {
  try {
    const items: TallyItemWithPriceLevels[] = [];
    
    // Extract STOCKITEM elements
    const stockitemMatches = xmlResponse.match(/<STOCKITEM>(.*?)<\/STOCKITEM>/gs);
    
    if (stockitemMatches) {
      stockitemMatches.forEach((stockitem, index) => {
        // Extract item details
        const nameMatch = stockitem.match(/<NAME>(.*?)<\/NAME>/);
        const closingStockMatch = stockitem.match(/<CLOSINGSTOCK>(.*?)<\/CLOSINGSTOCK>/);
        const stdPriceMatch = stockitem.match(/<STDPRICE>(.*?)<\/STDPRICE>/);
        const lastPriceMatch = stockitem.match(/<LASTPRICE>(.*?)<\/LASTPRICE>/);
        const igstMatch = stockitem.match(/<IGST>(.*?)<\/IGST>/);
        
        if (nameMatch) {
          const name = decodeXmlEntities(nameMatch[1].trim());
          const availableQty = closingStockMatch ? parseFloat(closingStockMatch[1].trim()) || 0 : 0;
          const standardPrice = stdPriceMatch ? parseFloat(stdPriceMatch[1].trim()) || 0 : 0;
          const lastPrice = lastPriceMatch ? parseFloat(lastPriceMatch[1].trim()) || 0 : 0;
          const igst = igstMatch ? parseFloat(igstMatch[1].trim()) || 0 : 0;
          
          // Extract price levels
          const priceLevels: Array<{ levelName: string; rate: number }> = [];
          const priceLevelMatches = stockitem.match(/<PRICELEVELS>(.*?)<\/PRICELEVELS>/gs);
          
          if (priceLevelMatches) {
            priceLevelMatches.forEach((priceLevel) => {
              const plNameMatch = priceLevel.match(/<PLNAME>(.*?)<\/PLNAME>/);
              const rateMatch = priceLevel.match(/<RATE>(.*?)<\/RATE>/);
              
              if (plNameMatch && rateMatch) {
                const levelName = decodeXmlEntities(plNameMatch[1].trim());
                const rate = parseFloat(rateMatch[1].trim()) || 0;
                
                if (rate > 0) {
                  priceLevels.push({
                    levelName,
                    rate
                  });
                }
              }
            });
          }
          
          items.push({
            name,
            availableQty,
            standardPrice,
            lastPrice,
            igst,
            priceLevels
          });
        }
      });
    }
    
    return items;
  } catch (error) {
    console.error('🌐 Error parsing Tally Items with Price Levels XML response:', error);
    return [];
  }
};

// Convert Tally items with price levels to StockItem format
export const convertTallyItemsWithPriceLevelsToStockItems = (tallyItems: TallyItemWithPriceLevels[]) => {
  const convertedItems = tallyItems.map((item, index) => ({
    id: (index + 1).toString(),
    name: item.name,
    availableQty: item.availableQty,
    rate: item.standardPrice || 0,
    igst: item.igst || 0,
    priceLevels: item.priceLevels
  }));
  return convertedItems;
};

// Parse Tally JSON response for stock items
export const parseTallyStockItemsResponse = (jsonResponse: any): StockItem[] => {
  try {
    const items: StockItem[] = [];
    
    // Check for different possible response structures
    let stockItemsArray = null;
    
    if (jsonResponse && jsonResponse.stockItems && Array.isArray(jsonResponse.stockItems)) {
      stockItemsArray = jsonResponse.stockItems;
    } else if (jsonResponse && jsonResponse.stockitems && Array.isArray(jsonResponse.stockitems)) {
      stockItemsArray = jsonResponse.stockitems;
    } else if (jsonResponse && jsonResponse.items && Array.isArray(jsonResponse.items)) {
      stockItemsArray = jsonResponse.items;
    } else if (jsonResponse && Array.isArray(jsonResponse)) {
      stockItemsArray = jsonResponse;
    } else {
      return [];
    }
    
    let processedCount = 0;
    
    stockItemsArray.forEach((item: any, index: number) => {
      // Check for different possible field names
      const itemName = item.NAME || item.name || item.Name || item.StockItemName || item.STOCKITEMNAME;
      const closingStock = item.CLOSINGSTOCK || item.closingstock || item.ClosingStock || item.AVAILABLESTOCK || item.availableqty;
      const igst = item.IGST || item.igst || item.Igst || 0;
      
      // Decrypt the obfuscated price fields
      const decryptedItem = decryptStockItemPrices(item);
      
      // Use decrypted prices
      const stdPrice = decryptedItem.STDPRICE || 0;
      const lastPrice = decryptedItem.LASTPRICE || 0;
      
      // Process price levels if they exist
      const priceLevels: Array<{ levelName: string; rate: number }> = [];
      if (decryptedItem.PRICELEVELS && Array.isArray(decryptedItem.PRICELEVELS)) {
        decryptedItem.PRICELEVELS.forEach((priceLevel: any) => {
          if (priceLevel.PLNAME && priceLevel.RATE) {
            priceLevels.push({
              levelName: priceLevel.PLNAME,
              rate: priceLevel.RATE
            });
          }
        });
      }
      
      if (itemName && itemName.trim()) {
        items.push({
          id: (index + 1).toString(),
          name: itemName.trim(),
          availableQty: closingStock ? parseFloat(closingStock) || 0 : 0,
          rate: stdPrice,
          igst: parseFloat(igst) || 0,
          closingStock: closingStock ? parseFloat(closingStock) || 0 : 0,
          priceLevels
        });
        processedCount++;
      }
    });
    
    return items;
  } catch (error) {
    console.error('🌐 Error parsing Tally Stock Items JSON response:', error);
    return [];
  }
};

// Parse voucher types response from Tally
export const parseVoucherTypesResponse = (xmlResponse: string): TallyVoucherType[] => {
  try {
    const voucherTypes: TallyVoucherType[] = [];
    
    // Parse the XML response structure: <ROW><COL>VoucherTypeName</COL></ROW>
    const rowRegex = /<ROW>\s*<COL>([^<]+)<\/COL>\s*<\/ROW>/gi;
    let match;
    
    while ((match = rowRegex.exec(xmlResponse)) !== null) {
      const name = match[1].trim();
      if (name) {
        voucherTypes.push({ name });
      }
    }
    
    return voucherTypes;
  } catch (error) {
    console.error('Error parsing voucher types response:', error);
    return [];
  }
};

// Convert Tally voucher types to app voucher types
export const convertTallyVoucherTypesToVoucherTypes = (tallyVoucherTypes: TallyVoucherType[]): Array<{ id: string; name: string }> => {
  return tallyVoucherTypes.map((voucherType, index) => ({
    id: `voucher-type-${index}`,
    name: voucherType.name
  }));
};
