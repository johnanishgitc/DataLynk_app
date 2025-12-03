import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, FlatList } from 'react-native';
import { BarChart } from './BarChart';
import { MetricCard } from './MetricCard';
import { AnalyticsFilters, Periodicity } from './AnalyticsFilters';
import { TopItemsChart } from './TopItemsChart';
import { LineChart } from './LineChart';
import { StockItem } from '../../context/MasterDataContext';

// Sales data entry interface
interface SalesDataEntry {
  id: string;
  date: string;
  invoiceNumber: string;
  customer: string;
  itemName: string;
  stockGroup: string;
  pinCode: string;
  quantity: number;
  rate: number;
  amount: number;
  profit: number;
  masterId?: string;
}

interface SalesAnalyticsProps {
  salesData: SalesDataEntry[];
  summaryData?: {
    totalRevenue: number;
    totalProfit: number;
    totalOrders: number;
    totalQuantity: number;
    uniqueCustomers: number;
    uniqueItems: number;
    avgOrderValue: number;
    avgProfitValue: number;
    monthlyTrend: Array<{ month: string; sales: number; profit: number }>;
    stockGroupData: Array<{ group: string; sales: number; profit: number }>;
    pinCodeData: Array<{ pinCode: string; sales: number; profit: number }>;
    topCustomers: Array<{ customer: string; sales: number; profit: number; orders: number }>;
    topItems: Array<{ item: string; sales: number; profit: number; quantity: number }>;
  };
  onClose: () => void;
  onDateRangeChange?: (startDate: string, endDate: string) => void;
  currentDataDateRange?: { start: Date; end: Date };
  initialDateRange?: { start: Date; end: Date };
  onPeriodSelect?: () => void;
  onConfigSelect?: () => void;
  stockItems?: StockItem[];
  filters?: {
    selectedStockGroup: string;
    selectedPinCode: string;
    selectedCustomer: string;
    selectedItem: string;
    periodicity: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    scaleFactor: number;
    avgSalesDays: number;
    enabledCards: {
      stockGroupChart: boolean;
      pinCodeChart: boolean;
      customersChart: boolean;
      monthlySales: boolean;
      topItems: boolean;
    };
  };
}

// Component definition
export function SalesAnalytics({ salesData, summaryData, onClose, onDateRangeChange, currentDataDateRange, initialDateRange, onPeriodSelect, onConfigSelect, filters, stockItems = [] }: SalesAnalyticsProps) {
  // SalesAnalytics component initialized
  
  // Get default date range: start of current month to today
  const getDefaultDateRange = () => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    return {
      start: formatDate(startOfMonth),
      end: formatDate(today),
    };
  };

  // Use initial date range if provided, otherwise use default
  const getInitialDateRange = () => {
    if (initialDateRange) {
      const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      return {
        start: formatDate(initialDateRange.start),
        end: formatDate(initialDateRange.end),
      };
    }
    return getDefaultDateRange();
  };

  // Use external filters if provided, otherwise use internal state
  const [internalFilters, setInternalFilters] = useState({
    selectedStockGroup: 'all',
    selectedPinCode: 'all',
    selectedCustomer: 'all',
    selectedItem: 'all',
    periodicity: 'monthly' as Periodicity,
    scaleFactor: 1,
    avgSalesDays: 30,
    enabledCards: {
      stockGroupChart: true,
      pinCodeChart: false,
      customersChart: true,
      monthlySales: true,
      topItems: true,
    },
  });

  // For drilldown, we always use internal state
  const [drilldownFilters, setDrilldownFilters] = useState({
    selectedStockGroup: 'all',
    selectedPinCode: 'all',
    selectedCustomer: 'all',
    selectedItem: 'all',
  });

  // Combine external filters with drilldown filters
  const effectiveFilters = filters ? {
    ...filters,
    ...drilldownFilters,
  } : internalFilters;
  const [showFilters, setShowFilters] = useState(false);
  const [showCustomerDrilldown, setShowCustomerDrilldown] = useState(false);
  const [showItemDrilldown, setShowItemDrilldown] = useState(false);
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);
  const [selectedEntityName, setSelectedEntityName] = useState<string>('');
  const [selectedEntityType, setSelectedEntityType] = useState<'customer' | 'item'>('customer');
  
  // Individual chart metric type toggles
  const [trendChartMetric, setTrendChartMetric] = useState<'sales' | 'profit'>('sales');
  const [stockGroupChartMetric, setStockGroupChartMetric] = useState<'sales' | 'profit'>('sales');
  const [pinCodeChartMetric, setPinCodeChartMetric] = useState<'sales' | 'profit'>('sales');
  const [customerChartMetric, setCustomerChartMetric] = useState<'sales' | 'profit'>('sales');
  const [itemChartMetric, setItemChartMetric] = useState<'sales' | 'profit'>('sales');
  
  // Sort states for drilldown lists
  const [customerSortBy, setCustomerSortBy] = useState<'sales' | 'sales-desc' | 'profit' | 'profit-desc' | 'profitPercent' | 'profitPercent-desc'>('sales-desc');
  const [itemSortBy, setItemSortBy] = useState<'sales' | 'sales-desc' | 'profit' | 'profit-desc' | 'profitPercent' | 'profitPercent-desc'>('sales-desc');

  // Helper function to format currency with scale factor
  const formatCurrency = (value: number) => {
    const scaledValue = value / effectiveFilters.scaleFactor;
    return `₹${scaledValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Helper function to get scale suffix
  const getScaleSuffix = () => {
    switch (effectiveFilters.scaleFactor) {
      case 10: return ' (x10)';
      case 100: return ' (x100)';
      case 1000: return ' (K)';
      case 100000: return ' (L)';
      case 10000000: return ' (Cr)';
      default: return '';
    }
  };

  // Helper function to get the appropriate metric value based on metricType
  const getMetricValue = (sale: SalesDataEntry, metricType?: 'sales' | 'profit') => {
    const metric = metricType || effectiveFilters.metricType;
    return metric === 'sales' ? sale.amount : sale.profit;
  };

  // Helper function to scale chart data
  const scaleChartData = (data: { label: string; value: number; color?: string; trendData?: any }[]) => {
    return data.map(item => {
      const scaled: any = {
        ...item,
        value: item.value / effectiveFilters.scaleFactor,
      };
      
      // Only include trendData if it exists and has items
      if (item.trendData && Array.isArray(item.trendData) && item.trendData.length > 0) {
        scaled.trendData = item.trendData.map((trend: any) => ({
          ...trend,
          value: trend.value / effectiveFilters.scaleFactor,
        }));
      }
      
      return scaled;
    });
  };

  const filteredSales = useMemo(() => {
    // Filtering process started
    
    // Helper function to parse DD-Mmm-YY format to Date object
    const parseSaleDate = (dateStr: string): Date | null => {
      try {
        // Date parsing
        
        // Handle YYYY-MM-DD format (e.g., "2025-08-01")
        if (dateStr.includes('-') && dateStr.length === 10) {
          const parts = dateStr.split('-');
          if (parts.length === 3) {
            const year = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1; // JavaScript months are 0-based
            const day = parseInt(parts[2]);
            return new Date(year, month, day);
          }
        }
        
        // Fallback to DD-Mmm-YY format (e.g., "01-Jan-25")
        const parts = dateStr.split('-');
        if (parts.length !== 3) return null;
        
        const day = parseInt(parts[0]);
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthIndex = monthNames.indexOf(parts[1]);
        if (monthIndex === -1) return null;
        
        // Convert 2-digit year to 4-digit (assuming 20xx for years 00-99)
        const year = 2000 + parseInt(parts[2]);
        
        const date = new Date(year, monthIndex, day);
        date.setHours(0, 0, 0, 0);
        return date;
      } catch {
        return null;
      }
    };

    return salesData.filter((sale) => {
      // Date filtering - use currentDataDateRange if available
      let dateMatch = true;
      if (currentDataDateRange) {
        const saleDate = parseSaleDate(sale.date);
        
        if (saleDate) {
          const startDate = currentDataDateRange.start;
          startDate.setHours(0, 0, 0, 0);
          if (saleDate < startDate) {
            dateMatch = false;
          }
          
          if (dateMatch) {
            const endDate = currentDataDateRange.end;
            endDate.setHours(23, 59, 59, 999);
            if (saleDate > endDate) {
              dateMatch = false;
            }
          }
        } else {
          // If we can't parse the date, exclude it from filtered results when date filter is active
          dateMatch = false;
        }
      }
      
      const stockGroupMatch = effectiveFilters.selectedStockGroup === 'all' || sale.stockGroup === effectiveFilters.selectedStockGroup;
      const pinCodeMatch = effectiveFilters.selectedPinCode === 'all' || sale.pinCode === effectiveFilters.selectedPinCode;
      const customerMatch = effectiveFilters.selectedCustomer === 'all' || sale.customer === effectiveFilters.selectedCustomer;
      const itemMatch = effectiveFilters.selectedItem === 'all' || sale.itemName === effectiveFilters.selectedItem;
      
      return dateMatch && stockGroupMatch && pinCodeMatch && customerMatch && itemMatch;
    });
    
    // Filtering completed
    
    return filteredSales;
  }, [salesData, effectiveFilters, currentDataDateRange]);

  const metrics = useMemo(() => {
    // Metrics calculation
    
    // Use summary data if available and no filters applied
    if (summaryData && !hasActiveFilters) {
      return {
        totalRevenue: summaryData.totalRevenue,
        totalProfit: summaryData.totalProfit,
        totalOrders: summaryData.totalOrders,
        totalQuantity: summaryData.totalQuantity,
        uniqueCustomers: summaryData.uniqueCustomers,
        uniqueItems: summaryData.uniqueItems,
        avgOrderValue: summaryData.avgOrderValue,
        avgProfitValue: summaryData.avgProfitValue,
      };
    }
    
    // Calculate from filtered sales data
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.amount, 0);
    const totalProfit = filteredSales.reduce((sum, sale) => sum + sale.profit, 0);
    const totalOrders = filteredSales.length;
    const totalQuantity = filteredSales.reduce((sum, sale) => sum + sale.quantity, 0);
    const uniqueCustomers = new Set(filteredSales.map((s) => s.customer)).size;
    const uniqueItems = new Set(filteredSales.map((s) => s.itemName)).size;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const avgProfitValue = totalOrders > 0 ? totalProfit / totalOrders : 0;
    return { totalRevenue, totalProfit, totalOrders, totalQuantity, uniqueCustomers, uniqueItems, avgOrderValue, avgProfitValue };
  }, [filteredSales, summaryData, hasActiveFilters]);

  const { totalRevenue, totalProfit, totalOrders, totalQuantity, uniqueCustomers, uniqueItems, avgOrderValue, avgProfitValue } = metrics;

  // Stock group month-wise trend data (must be defined before stockGroupChartData)
  const stockGroupTrendData = useMemo(() => {
    // Helper to parse date and get month key
    const getMonthKey = (dateStr: string): { key: string; display: string } => {
      // Handle YYYY-MM-DD format (e.g., "2025-04-01")
      if (dateStr.includes('-') && dateStr.length === 10) {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1; // JavaScript months are 0-based
          const day = parseInt(parts[2]);
          
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                             'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const shortYear = year.toString().slice(-2);
          
          const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
          return { key: monthKey, display: `${monthNames[month]}-${shortYear}` };
        }
      }
      
      // Fallback to DD-Mmm-YY format (e.g., "01-Jan-25")
      const parts = dateStr.split('-');
      if (parts.length !== 3) return { key: dateStr, display: dateStr };
      
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIndex = monthNames.indexOf(parts[1]);
      const year = 2000 + parseInt(parts[2]);
      const shortYear = parts[2];
      
      if (monthIndex === -1) return { key: dateStr, display: dateStr };
      
      const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
      return { key: monthKey, display: `${monthNames[monthIndex]}-${shortYear}` };
    };

    // Group sales by stock group and month
    const stockGroupMonthData = new Map<string, Map<string, { display: string; value: number }>>();
    
    filteredSales.forEach(sale => {
      const stockGroup = sale.stockGroup || 'Unknown';
      const { key, display } = getMonthKey(sale.date);
      
      if (!stockGroupMonthData.has(stockGroup)) {
        stockGroupMonthData.set(stockGroup, new Map());
      }
      
      const monthMap = stockGroupMonthData.get(stockGroup)!;
      const existing = monthMap.get(key);
      
      if (existing) {
        existing.value += getMetricValue(sale);
      } else {
        monthMap.set(key, { display, value: getMetricValue(sale) });
      }
    });

    // Define colors for stock groups
    const stockGroupColors: Record<string, string> = {
      'Brake Linings': '#3b82f6',
      'Rane Products': '#10b981',
      'Sofi Parts': '#f59e0b',
      'Gabriel Parts': '#ef4444',
      'Unknown': '#6b7280',
    };

    // Convert to array format and sort by total value
    const result = Array.from(stockGroupMonthData.entries())
      .map(([stockGroup, monthMap]) => {
        const data = Array.from(monthMap.entries())
          .map(([key, monthData]) => ({
            month: monthData.display,
            value: monthData.value,
            sortKey: key,
          }))
          .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
        
        const totalValue = data.reduce((sum, d) => sum + d.value, 0);
        
        return {
          stockGroup,
          data,
          color: stockGroupColors[stockGroup] || '#6b7280',
          totalValue,
        };
      })
      .filter(sg => sg.data.length > 0) // Only include stock groups with data
      .sort((a, b) => b.totalValue - a.totalValue); // Sort by total value descending

    return result;
  }, [filteredSales]);

  const stockGroupChartData = useMemo(() => {
    const categoryData = filteredSales.reduce(
      (acc, sale) => {
        const category = sale.stockGroup;
        acc[category] = (acc[category] || 0) + getMetricValue(sale, stockGroupChartMetric);
        return acc;
      },
      {} as Record<string, number>
    );

    const categoryColors: Record<string, string> = {
      'Brake Linings': '#3b82f6',
      'Rane Products': '#10b981',
      'Sofi Parts': '#f59e0b',
      'Gabriel Parts': '#ef4444',
      'Other': '#6b7280',
    };

    // Create a map of stock group trends (only if stockGroupTrendData is available)
    const trendMap = stockGroupTrendData ? new Map(
      stockGroupTrendData.map(sg => [sg.stockGroup, sg.data])
    ) : new Map();

    return Object.entries(categoryData)
      .map(([label, value]) => ({
        label,
        value,
        color: categoryColors[label] || '#6b7280',
        trendData: trendMap.get(label),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredSales, stockGroupTrendData, stockGroupChartMetric]);

  const pinCodeChartData = useMemo(() => {
    const pinCodeData = filteredSales.reduce(
      (acc, sale) => {
        const pinCode = sale.pinCode;
        acc[pinCode] = (acc[pinCode] || 0) + getMetricValue(sale, pinCodeChartMetric);
        return acc;
      },
      {} as Record<string, number>
    );

    return Object.entries(pinCodeData)
      .map(([label, value]) => ({
        label,
        value,
        color: '#0ea5e9',
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredSales, pinCodeChartMetric]);

  const topCustomersData = useMemo(() => {
    const customerData = filteredSales.reduce(
      (acc, sale) => {
        const customer = sale.customer;
        acc[customer] = (acc[customer] || 0) + getMetricValue(sale, customerChartMetric);
        return acc;
      },
      {} as Record<string, number>
    );

    return Object.entries(customerData)
      .map(([label, value]) => ({
        label,
        value,
        color: '#8b5cf6',
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredSales, customerChartMetric]);

  const monthlySalesData = useMemo(() => {
    // Helper function to get period key and display label based on periodicity
    const getPeriodData = (dateStr: string, periodicity: Periodicity): { key: string; display: string; date: Date } => {
      // Handle YYYY-MM-DD format (e.g., "2025-04-01")
      if (dateStr.includes('-') && dateStr.length === 10) {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1; // JavaScript months are 0-based
          const day = parseInt(parts[2]);
          const date = new Date(year, month, day);
          
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                             'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const monthName = monthNames[month];
          const shortYear = year.toString().slice(-2);
          
          switch (periodicity) {
            case 'daily':
              const sortKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              return { key: sortKey, display: `${day}-${monthName}-${shortYear}`, date };
            
            case 'weekly':
              // Get week number and week start date (Monday)
              const onejan = new Date(year, 0, 1);
              const weekNum = Math.ceil((((date.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
              const weekKey = `${year}-W${String(weekNum).padStart(2, '0')}`;
              return { key: weekKey, display: '', date };
            
            case 'monthly':
              const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
              return { key: monthKey, display: `${monthName}-${shortYear}`, date };
            
            case 'quarterly':
              const quarter = Math.floor(month / 3) + 1;
              const qKey = `${year}-Q${quarter}`;
              return { key: qKey, display: `Q${quarter}-${shortYear}`, date };
            
            case 'yearly':
              return { key: `${year}`, display: `${year}`, date };
            
            default:
              const defKey = `${year}-${String(month + 1).padStart(2, '0')}`;
              return { key: defKey, display: `${monthName}-${shortYear}`, date };
          }
        }
      }
      
      // Fallback to DD-Mmm-YY format (e.g., "01-Jan-25")
      const parts = dateStr.split('-');
      if (parts.length !== 3) return { key: dateStr, display: dateStr, date: new Date() };
      
      const day = parseInt(parts[0]);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIndex = monthNames.indexOf(parts[1]);
      const year = 2000 + parseInt(parts[2]);
      const shortYear = parts[2]; // YY format
      
      if (monthIndex === -1) return { key: dateStr, display: dateStr, date: new Date() };
      
      const date = new Date(year, monthIndex, day);
      const monthName = monthNames[monthIndex];
      
      // Use the same logic as the YYYY-MM-DD format
      switch (periodicity) {
        case 'daily':
          const sortKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          return { key: sortKey, display: `${day}-${monthName}-${shortYear}`, date };
        
        case 'weekly':
          // Get week number and week start date (Monday)
          const onejan = new Date(year, 0, 1);
          const weekNum = Math.ceil((((date.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
          const weekKey = `${year}-W${String(weekNum).padStart(2, '0')}`;
          return { key: weekKey, display: '', date };
        
        case 'monthly':
          const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
          return { key: monthKey, display: `${monthName}-${shortYear}`, date };
        
        case 'quarterly':
          const quarter = Math.floor(monthIndex / 3) + 1;
          const qKey = `${year}-Q${quarter}`;
          return { key: qKey, display: `Q${quarter}-${shortYear}`, date };
        
        case 'yearly':
          return { key: `${year}`, display: `${year}`, date };
        
        default:
          const defKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
          return { key: defKey, display: `${monthName}-${shortYear}`, date };
      }
    };

    // Helper to format date as d-Mmm
    const formatDateShort = (date: Date): string => {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${date.getDate()}-${monthNames[date.getMonth()]}`;
    };

    // First pass: aggregate by key and track dates for weekly periods
    const periodDataByKey = new Map<string, { display: string; amount: number; dates: Date[] }>();
    
    filteredSales.forEach(sale => {
      const { key, display, date } = getPeriodData(sale.date, effectiveFilters.periodicity);
      const existing = periodDataByKey.get(key);
      if (existing) {
        existing.amount += getMetricValue(sale, trendChartMetric);
        if (effectiveFilters.periodicity === 'weekly') {
          existing.dates.push(date);
        }
      } else {
        periodDataByKey.set(key, { 
          display, 
          amount: getMetricValue(sale, trendChartMetric),
          dates: effectiveFilters.periodicity === 'weekly' ? [date] : []
        });
      }
    });

    // For weekly periods, compute the date range display
    if (effectiveFilters.periodicity === 'weekly') {
      periodDataByKey.forEach((value, key) => {
        if (value.dates.length > 0) {
          // Sort dates to find first and last
          value.dates.sort((a, b) => a.getTime() - b.getTime());
          const firstDate = value.dates[0];
          const lastDate = value.dates[value.dates.length - 1];
          
          // Format as "d-Mmm to d-Mmm"
          value.display = `${formatDateShort(firstDate)} to ${formatDateShort(lastDate)}`;
        }
      });
    }

    // Convert to array and sort by key
    return Array.from(periodDataByKey.entries())
      .map(([key, data]) => ({
        label: data.display,
        value: data.amount,
        color: '#8b5cf6',
        sortKey: key,
      }))
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [filteredSales, effectiveFilters.periodicity, trendChartMetric]);

  // Create a map of item names to closing balances
  const itemClosingBalanceMap = useMemo(() => {
    const map = new Map<string, number>();
    stockItems.forEach(item => {
      map.set(item.name, item.availableQty);
    });
    return map;
  }, [stockItems]);

  const topItemsData = useMemo(() => {
    const itemData = filteredSales.reduce(
      (acc, sale) => {
        const item = sale.itemName;
        if (!acc[item]) {
          acc[item] = { amount: 0, quantity: 0 };
        }
        acc[item].amount += getMetricValue(sale, itemChartMetric);
        acc[item].quantity += sale.quantity;
        return acc;
      },
      {} as Record<string, { amount: number; quantity: number }>
    );

    const itemColors: Record<string, string> = {
      'Brake Linings': '#3b82f6',
      'Rane Products': '#10b981',
      'Sofi Parts': '#f59e0b',
      'Gabriel Parts': '#ef4444',
      'Other': '#6b7280',
    };

    return Object.entries(itemData)
      .map(([label, data]) => {
        const closingBalance = itemClosingBalanceMap.get(label) || 0;
        const avgSalesDays = effectiveFilters.avgSalesDays || 30;
        const avgDailySales = data.quantity / avgSalesDays;
        const daysOfStock = avgDailySales > 0 ? closingBalance / avgDailySales : 0;

        return {
          label,
          value: data.amount,
          quantity: data.quantity,
          closingBalance,
          daysOfStock: Math.round(daysOfStock),
          color: itemColors[label] || '#6b7280',
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredSales, itemClosingBalanceMap, effectiveFilters.avgSalesDays, itemChartMetric]);

  const allStockGroups = ['all', ...Array.from(new Set(salesData.map((s) => s.stockGroup)))];
  const allPinCodes = ['all', ...Array.from(new Set(salesData.map((s) => s.pinCode)))];
  const allItems = ['all', ...Array.from(new Set(salesData.map((s) => s.itemName)))];
  const allCustomers = ['all', ...Array.from(new Set(salesData.map((s) => s.customer)))];

  // Customer list with total revenue for drilldown
  const customerListData = useMemo(() => {
    // Helper to parse date and get month key
    const getMonthKey = (dateStr: string): { key: string; display: string } => {
      const parts = dateStr.split('-');
      if (parts.length !== 3) return { key: dateStr, display: dateStr };
      
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIndex = monthNames.indexOf(parts[1]);
      const year = 2000 + parseInt(parts[2]);
      const shortYear = parts[2];
      
      if (monthIndex === -1) return { key: dateStr, display: dateStr };
      
      const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
      return { key: monthKey, display: `${monthNames[monthIndex]}-${shortYear}` };
    };

    // Group sales by customer
    const customerData = new Map<string, { revenue: number; profit: number; orderCount: number; quantity: number; monthData: Map<string, { display: string; value: number }> }>();
    
    filteredSales.forEach(sale => {
      const customer = sale.customer;
      const { key, display } = getMonthKey(sale.date);
      
      if (!customerData.has(customer)) {
        customerData.set(customer, { revenue: 0, profit: 0, orderCount: 0, quantity: 0, monthData: new Map() });
      }
      
      const custData = customerData.get(customer)!;
      custData.revenue += sale.amount;
      custData.profit += sale.profit;
      custData.orderCount += 1;
      custData.quantity += sale.quantity;
      
      // Aggregate by month
      const existing = custData.monthData.get(key);
      if (existing) {
        existing.value += getMetricValue(sale);
      } else {
        custData.monthData.set(key, { display, value: getMetricValue(sale) });
      }
    });

    return Array.from(customerData.entries())
      .map(([name, data]) => {
        // Convert month data to array
        const trendData = Array.from(data.monthData.entries())
          .map(([key, monthData]) => ({
            month: monthData.display,
            value: monthData.value,
            sortKey: key,
          }))
          .sort((a, b) => a.sortKey.localeCompare(b.sortKey));

        const profitPercent = data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0;
        
        return {
          name,
          revenue: data.revenue,
          profit: data.profit,
          profitPercent,
          orderCount: data.orderCount,
          quantity: data.quantity,
          trendData,
        };
      })
      .sort((a, b) => {
        switch (customerSortBy) {
          case 'sales':
            return a.revenue - b.revenue;
          case 'sales-desc':
            return b.revenue - a.revenue;
          case 'profit':
            return a.profit - b.profit;
          case 'profit-desc':
            return b.profit - a.profit;
          case 'profitPercent':
            return a.profitPercent - b.profitPercent;
          case 'profitPercent-desc':
            return b.profitPercent - a.profitPercent;
          default:
            return b.revenue - a.revenue;
        }
      });
  }, [filteredSales, customerSortBy]);

  // Pre-calculate customer totals for drilldown summary
  const customerTotals = useMemo(() => {
    return customerListData.reduce(
      (acc, c) => ({
        totalRevenue: acc.totalRevenue + c.revenue,
        totalProfit: acc.totalProfit + c.profit,
      }),
      { totalRevenue: 0, totalProfit: 0 }
    );
  }, [customerListData]);

  // Item list with total revenue for drilldown
  const itemListData = useMemo(() => {
    // Helper to parse date and get month key
    const getMonthKey = (dateStr: string): { key: string; display: string } => {
      const parts = dateStr.split('-');
      if (parts.length !== 3) return { key: dateStr, display: dateStr };
      
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIndex = monthNames.indexOf(parts[1]);
      const year = 2000 + parseInt(parts[2]);
      const shortYear = parts[2];
      
      if (monthIndex === -1) return { key: dateStr, display: dateStr };
      
      const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
      return { key: monthKey, display: `${monthNames[monthIndex]}-${shortYear}` };
    };

    // Group sales by item
    const itemData = new Map<string, { revenue: number; profit: number; orderCount: number; quantity: number; monthData: Map<string, { display: string; value: number }> }>();
    
    filteredSales.forEach(sale => {
      const item = sale.itemName;
      const { key, display } = getMonthKey(sale.date);
      
      if (!itemData.has(item)) {
        itemData.set(item, { revenue: 0, profit: 0, orderCount: 0, quantity: 0, monthData: new Map() });
      }
      
      const itemDataEntry = itemData.get(item)!;
      itemDataEntry.revenue += sale.amount;
      itemDataEntry.profit += sale.profit;
      itemDataEntry.orderCount += 1;
      itemDataEntry.quantity += sale.quantity;
      
      // Aggregate by month
      const existing = itemDataEntry.monthData.get(key);
      if (existing) {
        existing.value += getMetricValue(sale);
      } else {
        itemDataEntry.monthData.set(key, { display, value: getMetricValue(sale) });
      }
    });

    return Array.from(itemData.entries())
      .map(([name, data]) => {
        // Convert month data to array
        const trendData = Array.from(data.monthData.entries())
          .map(([key, monthData]) => ({
            month: monthData.display,
            value: monthData.value,
            sortKey: key,
          }))
          .sort((a, b) => a.sortKey.localeCompare(b.sortKey));

        const closingBalance = itemClosingBalanceMap.get(name) || 0;
        const avgSalesDays = effectiveFilters.avgSalesDays || 30;
        const avgDailySales = data.quantity / avgSalesDays;
        const daysOfStock = avgDailySales > 0 ? closingBalance / avgDailySales : 0;
        const profitPercent = data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0;

        return {
          name,
          revenue: data.revenue,
          profit: data.profit,
          profitPercent,
          orderCount: data.orderCount,
          quantity: data.quantity,
          closingBalance,
          daysOfStock: Math.round(daysOfStock),
          trendData,
        };
      })
      .sort((a, b) => {
        switch (itemSortBy) {
          case 'sales':
            return a.revenue - b.revenue;
          case 'sales-desc':
            return b.revenue - a.revenue;
          case 'profit':
            return a.profit - b.profit;
          case 'profit-desc':
            return b.profit - a.profit;
          case 'profitPercent':
            return a.profitPercent - b.profitPercent;
          case 'profitPercent-desc':
            return b.profitPercent - a.profitPercent;
          default:
            return b.revenue - a.revenue;
        }
      });
  }, [filteredSales, itemClosingBalanceMap, effectiveFilters.avgSalesDays, itemSortBy]);

  // Pre-calculate item totals for drilldown summary
  const itemTotals = useMemo(() => {
    return itemListData.reduce(
      (acc, i) => ({
        totalRevenue: acc.totalRevenue + i.revenue,
        totalProfit: acc.totalProfit + i.profit,
      }),
      { totalRevenue: 0, totalProfit: 0 }
    );
  }, [itemListData]);

  // Get invoice details for selected customer or item
  const invoiceDetailsData = useMemo(() => {
    if (!selectedEntityName) return [];
    
    const invoices = filteredSales.filter(sale => 
      selectedEntityType === 'customer' 
        ? sale.customer === selectedEntityName 
        : sale.itemName === selectedEntityName
    );

    // Group by invoice number
    const invoiceMap = invoices.reduce((acc, sale) => {
      const key = `${sale.invoiceNumber}-${sale.date}`;
      if (!acc[key]) {
        acc[key] = {
          invoiceNumber: sale.invoiceNumber,
          date: sale.date,
          customer: sale.customer,
          totalAmount: 0,
          items: [],
        };
      }
      acc[key].totalAmount += getMetricValue(sale);
      acc[key].items.push({
        itemName: sale.itemName,
        quantity: sale.quantity,
        rate: sale.rate,
        amount: getMetricValue(sale),
      });
      return acc;
    }, {} as Record<string, { invoiceNumber: string; date: string; customer: string; totalAmount: number; items: { itemName: string; quantity: number; rate: number; amount: number }[] }>);

    return Object.values(invoiceMap)
      .sort((a, b) => {
        // Sort by date (newest first)
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      });
  }, [filteredSales, selectedEntityName, selectedEntityType]);

  // Handler to open invoice details
  const handleCustomerClick = (customerName: string) => {
    setSelectedEntityName(customerName);
    setSelectedEntityType('customer');
    setShowInvoiceDetails(true);
  };

  const handleItemClick = (itemName: string) => {
    setSelectedEntityName(itemName);
    setSelectedEntityType('item');
    setShowInvoiceDetails(true);
  };

  // Render mini trend chart for drilldown lists
  // Render metric toggle button
  const renderMetricToggle = (currentMetric: 'sales' | 'profit', onToggle: (metric: 'sales' | 'profit') => void) => {
    return (
      <View style={styles.metricToggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, currentMetric === 'sales' && styles.toggleButtonActive]}
          onPress={() => onToggle('sales')}
        >
          <Text style={[styles.toggleButtonText, currentMetric === 'sales' && styles.toggleButtonTextActive]}>
            Sales
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, currentMetric === 'profit' && styles.toggleButtonActive]}
          onPress={() => onToggle('profit')}
        >
          <Text style={[styles.toggleButtonText, currentMetric === 'profit' && styles.toggleButtonTextActive]}>
            Profit
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderMiniTrendLine = (trendData?: { month: string; value: number }[]) => {
    if (!trendData || trendData.length === 0) return null;

    const values = trendData.map(d => d.value / effectiveFilters.scaleFactor);
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const range = maxValue - minValue || 1;

    const chartHeight = 30;
    const chartWidth = 60;
    const pointSpacing = chartWidth / Math.max(trendData.length - 1, 1);

    const points = values.map((value, index) => {
      const x = index * pointSpacing;
      const normalizedValue = (value - minValue) / range;
      const y = chartHeight - (normalizedValue * chartHeight);
      return { x, y };
    });

    return (
      <View style={styles.miniTrendContainer}>
        <View style={[styles.miniTrendChart, { height: chartHeight, width: chartWidth }]}>
          {/* Line segments */}
          {points.map((point, index) => {
            if (index === points.length - 1) return null;
            const nextPoint = points[index + 1];
            
            const length = Math.sqrt(
              Math.pow(nextPoint.x - point.x, 2) + 
              Math.pow(nextPoint.y - point.y, 2)
            );
            const angle = Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x) * (180 / Math.PI);
            
            return (
              <View
                key={index}
                style={[
                  styles.miniTrendLine,
                  {
                    left: point.x,
                    top: point.y,
                    width: length,
                    transform: [{ rotate: `${angle}deg` }],
                  },
                ]}
              />
            );
          })}

          {/* Data points */}
          {points.map((point, index) => (
            <View
              key={`point-${index}`}
              style={[
                styles.miniTrendPoint,
                {
                  left: point.x - 2,
                  top: point.y - 2,
                },
              ]}
            />
          ))}
        </View>
      </View>
    );
  };

  const hasActiveFilters = (() => {
    const defaultDateRange = getDefaultDateRange();
    return (
      effectiveFilters.selectedStockGroup !== 'all' ||
      effectiveFilters.selectedPinCode !== 'all' ||
      effectiveFilters.selectedCustomer !== 'all' ||
      effectiveFilters.selectedItem !== 'all' ||
      effectiveFilters.periodicity !== 'monthly' ||
      effectiveFilters.scaleFactor !== 1 ||
      effectiveFilters.avgSalesDays !== 30 ||
      effectiveFilters.metricType !== 'sales' ||
      !effectiveFilters.enabledCards.stockGroupChart ||
      !effectiveFilters.enabledCards.pinCodeChart ||
      !effectiveFilters.enabledCards.customersChart ||
      !effectiveFilters.enabledCards.monthlySales ||
      !effectiveFilters.enabledCards.topItems
    );
  })();

  const handleApplyFilters = (newFilters: typeof effectiveFilters) => {
    // When using external filters, only update drilldown filters
    if (filters) {
      setDrilldownFilters({
        selectedStockGroup: newFilters.selectedStockGroup,
        selectedPinCode: newFilters.selectedPinCode,
        selectedCustomer: newFilters.selectedCustomer,
        selectedItem: newFilters.selectedItem,
      });
    } else {
      // When using internal filters, update everything
      setInternalFilters(newFilters);
    }
  };

  // Format date range for display
  const formatDateRange = () => {
    if (currentDataDateRange) {
      const startDate = currentDataDateRange.start;
      const endDate = currentDataDateRange.end;
      
      const formatDate = (date: Date) => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const year = date.getFullYear().toString().slice(-2);
        return `${day}-${month}-${year}`;
      };
      
      return `${formatDate(startDate)} to ${formatDate(endDate)}`;
    }
    return 'Select Date Range';
  };

  return (
    <ScrollView style={styles.container}>
      {/* Period Display */}
      <View style={styles.periodContainer}>
        <Text style={styles.periodText}>📅 Period: {formatDateRange()}</Text>
      </View>

      <View style={styles.metricsContainer}>
        <MetricCard
          title={`Total ${effectiveFilters.metricType === 'sales' ? 'Revenue' : 'Profit'}${getScaleSuffix()}`}
          value={formatCurrency(effectiveFilters.metricType === 'sales' ? totalRevenue : totalProfit)}
          icon={effectiveFilters.metricType === 'sales' ? '💰' : '💎'}
          color={effectiveFilters.metricType === 'sales' ? 'blue' : 'orange'}
        />
        <MetricCard
          title={`Total ${effectiveFilters.metricType === 'sales' ? 'Profit' : 'Revenue'}${getScaleSuffix()}`}
          value={formatCurrency(effectiveFilters.metricType === 'sales' ? totalProfit : totalRevenue)}
          icon={effectiveFilters.metricType === 'sales' ? '💎' : '💰'}
          color={effectiveFilters.metricType === 'sales' ? 'orange' : 'blue'}
        />
        <MetricCard
          title="Unique Customers"
          value={uniqueCustomers.toLocaleString('en-IN')}
          icon="👥"
          color="purple"
          onPress={() => setShowCustomerDrilldown(true)}
        />
        <MetricCard
          title="Unique Items"
          value={uniqueItems.toLocaleString('en-IN')}
          icon="🏷️"
          color="teal"
          onPress={() => setShowItemDrilldown(true)}
        />
        <MetricCard
          title={`Avg ${effectiveFilters.metricType === 'sales' ? 'Invoice Value' : 'Profit per Invoice'}${getScaleSuffix()}`}
          value={formatCurrency(effectiveFilters.metricType === 'sales' ? avgOrderValue : avgProfitValue)}
          icon="📈"
          color="green"
        />
      </View>

      <View style={styles.chartsContainer}>
        {/* Period Sales Trend - Moved to top as line chart */}
        {effectiveFilters.enabledCards.monthlySales && (
          <View>
            {renderMetricToggle(trendChartMetric, setTrendChartMetric)}
            <LineChart
              data={scaleChartData(monthlySalesData)}
              title={`${effectiveFilters.periodicity.charAt(0).toUpperCase() + effectiveFilters.periodicity.slice(1)} ${trendChartMetric === 'sales' ? 'Sales' : 'Profit'} Trend${getScaleSuffix()}`}
              valuePrefix="₹"
              onBarClick={() => {}}
              showBackButton={false}
            />
          </View>
        )}

        {effectiveFilters.enabledCards.stockGroupChart && (
          <View>
            {renderMetricToggle(stockGroupChartMetric, setStockGroupChartMetric)}
            <BarChart
              data={scaleChartData(stockGroupChartData)}
              title={`${stockGroupChartMetric === 'sales' ? 'Sales' : 'Profit'} by Stock Group${getScaleSuffix()}`}
              valuePrefix="₹"
              onBarClick={(stockGroup) => {
                setDrilldownFilters({ ...drilldownFilters, selectedStockGroup: stockGroup });
              }}
              onBackClick={() => setDrilldownFilters({ ...drilldownFilters, selectedStockGroup: 'all' })}
              showBackButton={effectiveFilters.selectedStockGroup !== 'all'}
              showTrends={true}
            />
          </View>
        )}
        
        {effectiveFilters.enabledCards.pinCodeChart && (
          <View>
            {renderMetricToggle(pinCodeChartMetric, setPinCodeChartMetric)}
            <BarChart
              data={scaleChartData(pinCodeChartData)}
              title={`${pinCodeChartMetric === 'sales' ? 'Sales' : 'Profit'} by Pin Code${getScaleSuffix()}`}
              valuePrefix="₹"
              onBarClick={(pinCode) => {
                setDrilldownFilters({ ...drilldownFilters, selectedPinCode: pinCode });
              }}
              onBackClick={() => setDrilldownFilters({ ...drilldownFilters, selectedPinCode: 'all' })}
              showBackButton={effectiveFilters.selectedPinCode !== 'all'}
            />
          </View>
        )}
        
        {effectiveFilters.enabledCards.customersChart && (
          <View>
            {renderMetricToggle(customerChartMetric, setCustomerChartMetric)}
            <BarChart
              data={scaleChartData(topCustomersData)}
              title={`Top 10 Customers by ${customerChartMetric === 'sales' ? 'Revenue' : 'Profit'}${getScaleSuffix()}`}
              valuePrefix="₹"
              onBarClick={(customer) => {
                setDrilldownFilters({ ...drilldownFilters, selectedCustomer: customer });
              }}
              onBackClick={() => setDrilldownFilters({ ...drilldownFilters, selectedCustomer: 'all' })}
              showBackButton={effectiveFilters.selectedCustomer !== 'all'}
            />
          </View>
        )}

        {effectiveFilters.enabledCards.topItems && (
          <View>
            {renderMetricToggle(itemChartMetric, setItemChartMetric)}
            <TopItemsChart
              data={topItemsData}
              title={`Top 10 Items by ${itemChartMetric === 'sales' ? 'Sales Value' : 'Profit'}${getScaleSuffix()}`}
              scaleFactor={effectiveFilters.scaleFactor}
              onBarClick={() => {}}
              showBackButton={false}
            />
          </View>
        )}

      </View>

      <AnalyticsFilters
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        onApplyFilters={handleApplyFilters}
        currentFilters={effectiveFilters}
        allStockGroups={allStockGroups}
        allPinCodes={allPinCodes}
        allItems={allItems}
        allCustomers={allCustomers}
      />

      {/* Customer Drilldown Modal */}
      <Modal
        visible={showCustomerDrilldown}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCustomerDrilldown(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Customer Revenue Report</Text>
            <TouchableOpacity 
              onPress={() => setShowCustomerDrilldown(false)}
              style={styles.closeModalButton}
            >
              <Text style={styles.closeModalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.drilldownSummary}>
            <View style={styles.summaryRow}>
              <Text style={styles.drilldownSummaryText}>
                Total Customers: {customerListData.length}
              </Text>
              <Text style={styles.drilldownSummaryText}>
                Sales{getScaleSuffix()}: {formatCurrency(customerTotals.totalRevenue)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.drilldownSummaryText}>
                Profit{getScaleSuffix()}: {formatCurrency(customerTotals.totalProfit)}
              </Text>
              <View style={styles.sortContainer}>
                <Text style={styles.sortLabel}>Sort by:</Text>
                <TouchableOpacity 
                  style={styles.sortButton}
                  onPress={() => setCustomerSortBy(customerSortBy === 'sales' ? 'sales-desc' : 'sales')}
                >
                  <Text style={[styles.sortButtonText, customerSortBy.includes('sales') && styles.sortButtonActive]}>
                    Sales {customerSortBy === 'sales' ? '↑' : customerSortBy === 'sales-desc' ? '↓' : ''}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.sortButton}
                  onPress={() => setCustomerSortBy(customerSortBy === 'profit' ? 'profit-desc' : 'profit')}
                >
                  <Text style={[styles.sortButtonText, customerSortBy.includes('profit') && styles.sortButtonActive]}>
                    Profit {customerSortBy === 'profit' ? '↑' : customerSortBy === 'profit-desc' ? '↓' : ''}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.sortButton}
                  onPress={() => setCustomerSortBy(customerSortBy === 'profitPercent' ? 'profitPercent-desc' : 'profitPercent')}
                >
                  <Text style={[styles.sortButtonText, customerSortBy.includes('profitPercent') && styles.sortButtonActive]}>
                    % {customerSortBy === 'profitPercent' ? '↑' : customerSortBy === 'profitPercent-desc' ? '↓' : ''}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <FlatList
            data={customerListData}
            keyExtractor={(item, index) => `${item.name}-${index}`}
            getItemLayout={(data, index) => ({
              length: 100, // minHeight of customerRow
              offset: 112 * index, // 100 + 12 marginBottom
              index,
            })}
            renderItem={({ item, index }) => (
              <TouchableOpacity 
                style={styles.customerRow}
                onPress={() => handleCustomerClick(item.name)}
              >
                {/* Rank Badge */}
                <View style={styles.rankContainer}>
                  <Text style={styles.rankNumber}>{index + 1}</Text>
                </View>
                
                {/* Main Content */}
                <View style={styles.mainContent}>
                  {/* Name and Stats Row */}
                  <View style={styles.nameRow}>
                    <Text style={styles.entityName}>{item.name}</Text>
                    <Text style={styles.statsText}>
                      {item.orderCount} Lines • {item.quantity.toLocaleString('en-IN')} Qty
                    </Text>
                  </View>
                  
                  {/* Financial Data Row */}
                  <View style={styles.financialRow}>
                    <View style={styles.financialColumn}>
                      <Text style={styles.financialLabel}>SALES</Text>
                      <Text style={styles.salesAmount}>{formatCurrency(item.revenue)}</Text>
                    </View>
                    <View style={styles.financialColumn}>
                      <Text style={styles.financialLabel}>PROFIT</Text>
                      <Text style={styles.profitAmount}>{formatCurrency(item.profit)}</Text>
                    </View>
                    <View style={styles.financialColumn}>
                      <Text style={styles.financialLabel}>%</Text>
                      <Text style={styles.profitPercent}>{item.profitPercent.toFixed(1)}%</Text>
                    </View>
                    <Text style={styles.arrowIcon}>→</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.customerListContent}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            initialNumToRender={15}
            windowSize={5}
          />
        </View>
      </Modal>

      {/* Item Drilldown Modal */}
      <Modal
        visible={showItemDrilldown}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowItemDrilldown(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Item Revenue Report</Text>
            <TouchableOpacity 
              onPress={() => setShowItemDrilldown(false)}
              style={styles.closeModalButton}
            >
              <Text style={styles.closeModalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.drilldownSummary}>
            <View style={styles.summaryRow}>
              <Text style={styles.drilldownSummaryText}>
                Total Items: {itemListData.length}
              </Text>
              <Text style={styles.drilldownSummaryText}>
                Sales{getScaleSuffix()}: {formatCurrency(itemTotals.totalRevenue)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.drilldownSummaryText}>
                Profit{getScaleSuffix()}: {formatCurrency(itemTotals.totalProfit)}
              </Text>
              <View style={styles.sortContainer}>
                <Text style={styles.sortLabel}>Sort by:</Text>
                <TouchableOpacity 
                  style={styles.sortButton}
                  onPress={() => setItemSortBy(itemSortBy === 'sales' ? 'sales-desc' : 'sales')}
                >
                  <Text style={[styles.sortButtonText, itemSortBy.includes('sales') && styles.sortButtonActive]}>
                    Sales {itemSortBy === 'sales' ? '↑' : itemSortBy === 'sales-desc' ? '↓' : ''}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.sortButton}
                  onPress={() => setItemSortBy(itemSortBy === 'profit' ? 'profit-desc' : 'profit')}
                >
                  <Text style={[styles.sortButtonText, itemSortBy.includes('profit') && styles.sortButtonActive]}>
                    Profit {itemSortBy === 'profit' ? '↑' : itemSortBy === 'profit-desc' ? '↓' : ''}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.sortButton}
                  onPress={() => setItemSortBy(itemSortBy === 'profitPercent' ? 'profitPercent-desc' : 'profitPercent')}
                >
                  <Text style={[styles.sortButtonText, itemSortBy.includes('profitPercent') && styles.sortButtonActive]}>
                    % {itemSortBy === 'profitPercent' ? '↑' : itemSortBy === 'profitPercent-desc' ? '↓' : ''}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <FlatList
            data={itemListData}
            keyExtractor={(item, index) => `${item.name}-${index}`}
            getItemLayout={(data, index) => ({
              length: 100, // minHeight of customerRow
              offset: 112 * index, // 100 + 12 marginBottom
              index,
            })}
            renderItem={({ item, index }) => (
              <TouchableOpacity 
                style={styles.customerRow}
                onPress={() => handleItemClick(item.name)}
              >
                {/* Rank Badge */}
                <View style={styles.rankContainer}>
                  <Text style={styles.rankNumber}>{index + 1}</Text>
                </View>
                
                {/* Main Content */}
                <View style={styles.mainContent}>
                  {/* Name and Stats Row */}
                  <View style={styles.nameRow}>
                    <Text style={styles.entityName}>{item.name}</Text>
                    <View style={styles.statsContainer}>
                      <Text style={styles.statsText}>
                        {item.orderCount} Lines • {item.quantity.toLocaleString('en-IN')} Qty
                      </Text>
                      {item.closingBalance !== undefined && item.closingBalance > 0 && (
                        <Text style={styles.balanceText}>
                          Bal: {item.closingBalance.toLocaleString('en-IN')}
                        </Text>
                      )}
                      {item.daysOfStock !== undefined && item.daysOfStock >= 0 && (
                        <Text style={[
                          styles.daysOfStockText,
                          item.daysOfStock < 7 && styles.daysOfStockLow,
                          item.daysOfStock >= 7 && item.daysOfStock < 15 && styles.daysOfStockMedium,
                          item.daysOfStock >= 15 && styles.daysOfStockHigh,
                        ]}>
                          {item.daysOfStock}d
                        </Text>
                      )}
                    </View>
                  </View>
                  
                  {/* Financial Data Row */}
                  <View style={styles.financialRow}>
                    <View style={styles.financialColumn}>
                      <Text style={styles.financialLabel}>SALES</Text>
                      <Text style={styles.salesAmount}>{formatCurrency(item.revenue)}</Text>
                    </View>
                    <View style={styles.financialColumn}>
                      <Text style={styles.financialLabel}>PROFIT</Text>
                      <Text style={styles.profitAmount}>{formatCurrency(item.profit)}</Text>
                    </View>
                    <View style={styles.financialColumn}>
                      <Text style={styles.financialLabel}>%</Text>
                      <Text style={styles.profitPercent}>{item.profitPercent.toFixed(1)}%</Text>
                    </View>
                    <Text style={styles.arrowIcon}>→</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.customerListContent}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            initialNumToRender={15}
            windowSize={5}
          />
        </View>
      </Modal>

      {/* Invoice Details Modal */}
      <Modal
        visible={showInvoiceDetails}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowInvoiceDetails(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setShowInvoiceDetails(false)}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {selectedEntityType === 'customer' ? 'Customer Invoices' : 'Item Invoices'}
            </Text>
            <View style={{ width: 60 }} />
          </View>
          
          <View style={styles.drilldownSummary}>
            <Text style={styles.drilldownSummaryText}>
              {selectedEntityType === 'customer' ? 'Customer' : 'Item'}: {selectedEntityName}
            </Text>
            <Text style={styles.drilldownSummaryText}>
              Total Invoices: {invoiceDetailsData.length}
            </Text>
          </View>

          <FlatList
            data={invoiceDetailsData}
            keyExtractor={(item, index) => `${item.invoiceNumber}-${index}`}
            renderItem={({ item }) => (
              <View style={styles.invoiceCard}>
                <View style={styles.invoiceHeader}>
                  <View style={styles.invoiceHeaderLeft}>
                    <Text style={styles.invoiceNumber}>📄 {item.invoiceNumber}</Text>
                    <Text style={styles.invoiceDate}>{item.date}</Text>
                  </View>
                  <Text style={styles.invoiceTotal}>
                    {formatCurrency(item.totalAmount)}
                  </Text>
                </View>
                {selectedEntityType === 'customer' && (
                  <Text style={styles.invoiceCustomer}>Customer: {item.customer}</Text>
                )}
                <View style={styles.invoiceItems}>
                  {item.items.map((lineItem, idx) => (
                    <View key={idx} style={styles.invoiceLineItem}>
                      <Text style={styles.lineItemName} numberOfLines={1}>
                        {lineItem.itemName}
                      </Text>
                      <View style={styles.lineItemDetails}>
                        <Text style={styles.lineItemQty}>
                          {lineItem.quantity.toLocaleString('en-IN')} × ₹{lineItem.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Text>
                        <Text style={styles.lineItemAmount}>
                          {formatCurrency(lineItem.amount)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
            contentContainerStyle={styles.invoiceListContent}
          />
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  periodContainer: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  chartsContainer: {
    padding: 16,
    gap: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  closeModalButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#4b5563',
    borderRadius: 6,
  },
  closeModalButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
  },
  drilldownSummary: {
    backgroundColor: '#3b82f6',
    padding: 12,
    marginBottom: 16,
    borderRadius: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  drilldownSummaryText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sortLabel: {
    color: 'white',
    fontSize: 11,
    fontWeight: '500',
    marginRight: 4,
  },
  sortButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  sortButtonText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '500',
  },
  sortButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    fontWeight: '600',
  },
  customerListContent: {
    padding: 16,
  },
  customerRow: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minHeight: 100,
  },
  rankContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6b7280',
  },
  mainContent: {
    flex: 1,
  },
  nameRow: {
    marginBottom: 12,
  },
  entityName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  statsText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  balanceText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  daysOfStockText: {
    fontSize: 12,
    fontWeight: '600',
  },
  daysOfStockLow: {
    color: '#dc2626',
  },
  daysOfStockMedium: {
    color: '#f59e0b',
  },
  daysOfStockHigh: {
    color: '#059669',
  },
  financialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  financialColumn: {
    alignItems: 'center',
    flex: 1,
  },
  financialLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  salesAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
    lineHeight: 18,
  },
  profitAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ea580c',
    lineHeight: 18,
  },
  profitPercent: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ea580c',
    lineHeight: 18,
  },
  arrowIcon: {
    fontSize: 18,
    color: '#3b82f6',
    fontWeight: '700',
    marginLeft: 8,
  },
  invoiceCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  invoiceHeaderLeft: {
    flex: 1,
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  invoiceDate: {
    fontSize: 13,
    color: '#6b7280',
  },
  invoiceTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
  },
  invoiceCustomer: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 12,
  },
  invoiceItems: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
    gap: 8,
  },
  invoiceLineItem: {
    gap: 4,
  },
  lineItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  lineItemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lineItemQty: {
    fontSize: 13,
    color: '#6b7280',
  },
  lineItemAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  invoiceListContent: {
    padding: 16,
  },
  miniTrendContainer: {
    marginLeft: 8,
  },
  miniTrendChart: {
    position: 'relative',
    backgroundColor: '#f9fafb',
    borderRadius: 4,
  },
  miniTrendLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#8b5cf6',
    transformOrigin: 'left center',
  },
  miniTrendPoint: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#8b5cf6',
  },
  metricToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 4,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    marginHorizontal: 2,
  },
  toggleButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  toggleButtonTextActive: {
    color: '#111827',
    fontWeight: '600',
  },
});