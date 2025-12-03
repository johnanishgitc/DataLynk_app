import { StockItem, Customer } from '../types/order';

export interface PriceLevel {
  levelName: string;
  rate: number;
}

export interface PriceListResult {
  item: StockItem;
  basePrice: number;
  customerPrice: number;
  priceLevel: string | null;
  priceLevelRate: number | null;
  finalPrice: number;
}

/**
 * Get the appropriate price for an item based on customer's price level
 */
export function getCustomerPriceForItem(
  item: StockItem, 
  customer: Customer | null, 
  usePriceLevels: boolean = true
): PriceListResult {
  let basePrice = item.rate || 0;
  let customerPrice = basePrice;
  let priceLevel: string | null = null;
  let priceLevelRate: number | null = null;
  let finalPrice = basePrice;

  // If price levels are enabled and customer has a price level
  if (usePriceLevels && customer?.priceLevel && item.priceLevels && item.priceLevels.length > 0) {
    // Find matching price level (case-insensitive)
    const matchingPriceLevel = item.priceLevels.find(pl =>
      pl.levelName.toLowerCase() === customer.priceLevel?.toLowerCase()
    );

    if (matchingPriceLevel && matchingPriceLevel.rate > 0) {
      priceLevel = matchingPriceLevel.levelName;
      priceLevelRate = matchingPriceLevel.rate;
      customerPrice = matchingPriceLevel.rate;
      finalPrice = matchingPriceLevel.rate;
    }
  } else if (!usePriceLevels) {
    // Price levels disabled, using base price
  } else if (!customer?.priceLevel) {
    // Customer has no price level, using base price
  } else if (!item.priceLevels || item.priceLevels.length === 0) {
    // Item has no price levels, using base price
  }

  return {
    item,
    basePrice,
    customerPrice,
    priceLevel,
    priceLevelRate,
    finalPrice
  };
}

/**
 * Get price list for all items for a specific customer
 */
export function getPriceListForCustomer(
  items: StockItem[], 
  customer: Customer | null, 
  usePriceLevels: boolean = true
): PriceListResult[] {
  return items.map(item => getCustomerPriceForItem(item, customer, usePriceLevels));
}

/**
 * Get price list summary showing price level coverage
 */
export function getPriceListSummary(
  items: StockItem[], 
  customer: Customer | null, 
  usePriceLevels: boolean = true
): {
  totalItems: number;
  itemsWithPriceLevels: number;
  itemsWithMatchingPriceLevel: number;
  priceLevelCoverage: number;
  customerPriceLevel: string | null;
  availablePriceLevels: string[];
} {
  const priceList = getPriceListForCustomer(items, customer, usePriceLevels);
  
  const totalItems = items.length;
  const itemsWithPriceLevels = items.filter(item => item.priceLevels && item.priceLevels.length > 0).length;
  const itemsWithMatchingPriceLevel = priceList.filter(result => result.priceLevel !== null).length;
  const priceLevelCoverage = totalItems > 0 ? (itemsWithMatchingPriceLevel / totalItems) * 100 : 0;
  
  // Get all unique price levels from items
  const allPriceLevels = new Set<string>();
  items.forEach(item => {
    if (item.priceLevels) {
      item.priceLevels.forEach(pl => allPriceLevels.add(pl.levelName));
    }
  });

  return {
    totalItems,
    itemsWithPriceLevels,
    itemsWithMatchingPriceLevel,
    priceLevelCoverage,
    customerPriceLevel: customer?.priceLevel || null,
    availablePriceLevels: Array.from(allPriceLevels)
  };
}

/**
 * Validate price level data integrity
 */
export function validatePriceLevelData(items: StockItem[]): {
  isValid: boolean;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check for items without price levels
  const itemsWithoutPriceLevels = items.filter(item => !item.priceLevels || item.priceLevels.length === 0);
  if (itemsWithoutPriceLevels.length > 0) {
    issues.push(`${itemsWithoutPriceLevels.length} items have no price levels defined`);
    recommendations.push('Ensure all items have price levels configured in Tally');
  }

  // Check for price levels with zero or negative rates
  const itemsWithInvalidRates = items.filter(item => 
    item.priceLevels && item.priceLevels.some(pl => pl.rate <= 0)
  );
  if (itemsWithInvalidRates.length > 0) {
    issues.push(`${itemsWithInvalidRates.length} items have invalid price level rates (≤ 0)`);
    recommendations.push('Review and fix price level rates in Tally');
  }

  // Check for inconsistent price level names
  const allPriceLevels = new Set<string>();
  items.forEach(item => {
    if (item.priceLevels) {
      item.priceLevels.forEach(pl => allPriceLevels.add(pl.levelName));
    }
  });
  
  if (allPriceLevels.size === 0) {
    issues.push('No price levels found in any items');
    recommendations.push('Enable price levels in Tally configuration');
  } else if (allPriceLevels.size < 3) {
    recommendations.push('Consider adding more price levels for better customer segmentation');
  }

  return {
    isValid: issues.length === 0,
    issues,
    recommendations
  };
}


