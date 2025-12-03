/**
 * Mock Data Generator for SummaryReport Testing
 * 
 * Generates realistic transaction data for testing and demonstration purposes.
 */

import { Txn } from '../components/reports/SummaryReport';

export interface MockDataOptions {
  count?: number;
  dateRange?: {
    start: Date;
    end: Date;
  };
  customers?: string[];
  stockItems?: string[];
  qtyRange?: {
    min: number;
    max: number;
  };
  rateRange?: {
    min: number;
    max: number;
  };
}

const defaultCustomers = [
  'Acme Corporation',
  'Beta Industries',
  'Gamma Solutions',
  'Delta Enterprises',
  'Epsilon Systems',
  'Zeta Technologies',
  'Eta Services',
  'Theta Consulting',
  'Iota Solutions',
  'Kappa Industries',
];

const defaultStockItems = [
  'Laptop Computer',
  'Desktop Monitor',
  'Wireless Mouse',
  'Keyboard',
  'USB Cable',
  'Power Adapter',
  'Network Switch',
  'Router',
  'Hard Drive',
  'Memory Stick',
  'Printer',
  'Scanner',
  'Tablet',
  'Smartphone',
  'Headphones',
  'Speaker',
  'Camera',
  'Tripod',
  'Software License',
  'Cloud Storage',
];

/**
 * Generates a random date between start and end dates
 */
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

/**
 * Generates a random integer between min and max (inclusive)
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generates a random decimal between min and max
 */
function randomDecimal(min: number, max: number, decimals = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

/**
 * Generates mock transaction data
 */
export function generateMockTransactions(options: MockDataOptions = {}): Txn[] {
  const {
    count = 1000,
    dateRange = {
      start: new Date(2023, 0, 1),
      end: new Date(2023, 11, 31),
    },
    customers = defaultCustomers,
    stockItems = defaultStockItems,
    qtyRange = { min: 1, max: 100 },
    rateRange = { min: 10, max: 1000 },
  } = options;

  const transactions: Txn[] = [];

  for (let i = 0; i < count; i++) {
    const date = randomDate(dateRange.start, dateRange.end);
    const customer = customers[randomInt(0, customers.length - 1)];
    const stockitem = stockItems[randomInt(0, stockItems.length - 1)];
    const qty = randomInt(qtyRange.min, qtyRange.max);
    const rate = randomDecimal(rateRange.min, rateRange.max);
    const amount = qty * rate;

    transactions.push({
      date: date.toISOString(),
      customer,
      stockitem,
      qty,
      rate,
      amount,
    });
  }

  return transactions;
}

/**
 * Generates a small dataset for quick testing
 */
export function generateSmallDataset(): Txn[] {
  return generateMockTransactions({
    count: 50,
    dateRange: {
      start: new Date(2023, 5, 1), // June 1, 2023
      end: new Date(2023, 5, 30), // June 30, 2023
    },
    customers: ['Customer A', 'Customer B', 'Customer C'],
    stockItems: ['Item 1', 'Item 2', 'Item 3'],
    qtyRange: { min: 1, max: 20 },
    rateRange: { min: 50, max: 500 },
  });
}

/**
 * Generates a large dataset for performance testing
 */
export function generateLargeDataset(): Txn[] {
  return generateMockTransactions({
    count: 50000,
    dateRange: {
      start: new Date(2023, 0, 1), // January 1, 2023
      end: new Date(2023, 11, 31), // December 31, 2023
    },
    customers: defaultCustomers,
    stockItems: defaultStockItems,
    qtyRange: { min: 1, max: 1000 },
    rateRange: { min: 1, max: 10000 },
  });
}

/**
 * Generates a dataset with specific patterns for testing
 */
export function generatePatternedDataset(): Txn[] {
  const transactions: Txn[] = [];
  const customers = ['Customer A', 'Customer B', 'Customer C'];
  const stockItems = ['Item 1', 'Item 2', 'Item 3'];
  const dates = [
    '2023-06-15T10:00:00Z',
    '2023-06-15T11:00:00Z',
    '2023-06-16T10:00:00Z',
    '2023-06-16T11:00:00Z',
    '2023-07-15T10:00:00Z',
  ];

  // Create predictable patterns for testing
  customers.forEach((customer, customerIndex) => {
    stockItems.forEach((stockitem, itemIndex) => {
      dates.forEach((date, dateIndex) => {
        const qty = (customerIndex + 1) * (itemIndex + 1);
        const rate = 100 + (dateIndex * 10);
        const amount = qty * rate;

        transactions.push({
          date,
          customer,
          stockitem,
          qty,
          rate,
          amount,
        });
      });
    });
  });

  return transactions;
}

/**
 * Generates a dataset with edge cases for testing
 */
export function generateEdgeCaseDataset(): Txn[] {
  return [
    // Zero quantity
    {
      date: '2023-06-15T10:00:00Z',
      customer: 'Customer A',
      stockitem: 'Item 1',
      qty: 0,
      rate: 100,
      amount: 0,
    },
    // Zero rate
    {
      date: '2023-06-15T11:00:00Z',
      customer: 'Customer B',
      stockitem: 'Item 2',
      qty: 10,
      rate: 0,
      amount: 0,
    },
    // Very large numbers
    {
      date: '2023-06-16T10:00:00Z',
      customer: 'Customer C',
      stockitem: 'Item 3',
      qty: 1000000,
      rate: 1000000,
      amount: 1000000000000,
    },
    // Very small numbers
    {
      date: '2023-06-16T11:00:00Z',
      customer: 'Customer D',
      stockitem: 'Item 4',
      qty: 1,
      rate: 0.01,
      amount: 0.01,
    },
    // Negative values (if allowed)
    {
      date: '2023-06-17T10:00:00Z',
      customer: 'Customer E',
      stockitem: 'Item 5',
      qty: -5,
      rate: 100,
      amount: -500,
    },
  ];
}

/**
 * Generates a dataset with specific date patterns for testing date bucketing
 */
export function generateDatePatternDataset(): Txn[] {
  const transactions: Txn[] = [];
  const baseDate = new Date(2023, 5, 15); // June 15, 2023

  // Generate transactions for each day of the week
  for (let i = 0; i < 7; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i);
    
    transactions.push({
      date: date.toISOString(),
      customer: `Customer ${i + 1}`,
      stockitem: `Item ${i + 1}`,
      qty: 10 + i,
      rate: 100 + (i * 10),
      amount: (10 + i) * (100 + (i * 10)),
    });
  }

  // Generate transactions for each month
  for (let month = 0; month < 12; month++) {
    const date = new Date(2023, month, 15);
    
    transactions.push({
      date: date.toISOString(),
      customer: `Monthly Customer ${month + 1}`,
      stockitem: `Monthly Item ${month + 1}`,
      qty: 20 + month,
      rate: 200 + (month * 20),
      amount: (20 + month) * (200 + (month * 20)),
    });
  }

  return transactions;
}





