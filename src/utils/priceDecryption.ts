// Encryption key for Tally price obfuscation
const OBFUSCATION_KEY = "TYGpnfpnVrGSBfv7yEdIzRO4ug7Q6YoT";

// Base64 decode function for React Native
function base64Decode(base64String: string): string {
  try {
    // React Native: Try to use atob if available
    if (typeof global !== 'undefined' && global.atob) {
      return global.atob(base64String);
    }
    
    // Web environment: try window.atob
    if (typeof window !== 'undefined' && window.atob) {
      return window.atob(base64String);
    }
    
    // Fallback: Manual base64 decoding (always works)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    let i = 0;
    let len = base64String.length;
    
    while (i < len) {
      let encoded1 = chars.indexOf(base64String.charAt(i++));
      let encoded2 = chars.indexOf(base64String.charAt(i++));
      let encoded3 = chars.indexOf(base64String.charAt(i++));
      let encoded4 = chars.indexOf(base64String.charAt(i++));
      
      let decoded1 = (encoded1 << 2) | (encoded2 >> 4);
      let decoded2 = ((encoded2 & 15) << 4) | (encoded3 >> 2);
      let decoded3 = ((encoded3 & 3) << 6) | encoded4;
      
      result += String.fromCharCode(decoded1);
      if (encoded3 !== 64) result += String.fromCharCode(decoded2);
      if (encoded4 !== 64) result += String.fromCharCode(decoded3);
    }
    
    return result;
  } catch (error) {
    return '';
  }
}

// Main decryption function for Tally obfuscated prices
export function deobfuscateValue(obfuscatedValue: string): number {
  try {
    // Input validation
    if (!obfuscatedValue || typeof obfuscatedValue !== 'string') {
      return 0;
    }
    
    // 1. Base64 decode
    const obfuscated = base64Decode(obfuscatedValue);
    
    if (!obfuscated) {
      return 0;
    }
    
    // 2. XOR with encryption key
    let deobfuscated = '';
    for (let i = 0; i < obfuscated.length; i++) {
      const charCode = obfuscated.charCodeAt(i);
      const keyChar = OBFUSCATION_KEY.charCodeAt(i % OBFUSCATION_KEY.length);
      const deobfuscatedChar = charCode ^ keyChar;
      deobfuscated += String.fromCharCode(deobfuscatedChar);
    }
    
    // 3. Convert back to number
    const result = parseFloat(deobfuscated);
    
    // Validate the result
    if (isNaN(result) || result < 0) {
      return 0;
    }
    
    // Round to 2 decimal places for currency
    return Math.round(result * 100) / 100;
  } catch (error) {
    return 0;
  }
}

// Helper function to decrypt price fields in stock item data
export function decryptStockItemPrices(stockItem: any): any {
  try {
    const decrypted = { ...stockItem };
    let decryptionCount = 0;
    
    // Decrypt standard price fields
    if (stockItem.STDPRICE) {
      const originalPrice = stockItem.STDPRICE;
      decrypted.STDPRICE = deobfuscateValue(stockItem.STDPRICE);
      if (decrypted.STDPRICE > 0) {
        decryptionCount++;
      }
    }
    
    if (stockItem.LASTPRICE) {
      const originalPrice = stockItem.LASTPRICE;
      decrypted.LASTPRICE = deobfuscateValue(stockItem.LASTPRICE);
      if (decrypted.LASTPRICE > 0) {
        decryptionCount++;
      }
    }
    
    if (stockItem.RATE) {
      const originalPrice = stockItem.RATE;
      decrypted.RATE = deobfuscateValue(stockItem.RATE);
      if (decrypted.RATE > 0) {
        decryptionCount++;
      }
    }
    
    // Decrypt price levels if they exist
    if (stockItem.PRICELEVELS && Array.isArray(stockItem.PRICELEVELS)) {
      decrypted.PRICELEVELS = stockItem.PRICELEVELS.map((priceLevel: any) => {
        if (priceLevel.RATE) {
          const originalPrice = priceLevel.RATE;
          const decryptedRate = deobfuscateValue(priceLevel.RATE);
          if (decryptedRate > 0) {
            decryptionCount++;
          }
          return {
            ...priceLevel,
            RATE: decryptedRate
          };
        }
        return priceLevel;
      });
    }
    
    return decrypted;
  } catch (error) {
    return stockItem; // Return original if decryption fails
  }
}

// Helper function to decrypt multiple stock items
export function decryptStockItemsPrices(stockItems: any[]): any[] {
  return stockItems.map(item => decryptStockItemPrices(item));
}

// Test function to verify decryption works with sample data
export function testDecryptionWithSampleData() {
  const sampleData = {
    "NAME": "100 Ml Pet Jar Buffalo Ghee-GRB",
    "BASEUNITS": "cases",
    "CLOSINGSTOCK": -15,
    "IGST": 0,
    "STDPRICE": "ZWt3",
    "LASTPRICE": "bWk=",
    "PRICELEVELS": [
      {
        "PLNAME": "RETAIL",
        "RATE": "ZWl3"
      },
      {
        "PLNAME": "DEALER",
        "RATE": "bWk="
      },
      {
        "PLNAME": "DISTRIBUTOR",
        "RATE": "bGk="
      }
    ]
  };

  console.log('🧪 Testing price decryption with sample data...');
  console.log('Original data:', JSON.stringify(sampleData, null, 2));
  
  const decrypted = decryptStockItemPrices(sampleData);
  
  console.log('Decrypted data:', JSON.stringify(decrypted, null, 2));
  
  return decrypted;
}


