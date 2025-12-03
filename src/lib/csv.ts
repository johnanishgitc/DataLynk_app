/**
 * CSV Export Utilities
 * 
 * Provides functions to export data to CSV format with proper formatting
 * and escaping for use in summary reports.
 */

export interface CSVExportOptions {
  filename?: string;
  includeHeaders?: boolean;
  delimiter?: string;
  quoteChar?: string;
  escapeChar?: string;
}

/**
 * Escapes a value for CSV format
 * @param value - The value to escape
 * @param delimiter - CSV delimiter (default: ',')
 * @param quoteChar - Quote character (default: '"')
 * @param escapeChar - Escape character (default: '"')
 * @returns Escaped value
 */
export function escapeCSVValue(
  value: any,
  delimiter = ',',
  quoteChar = '"',
  escapeChar = '"'
): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value);
  
  // If the value contains delimiter, quote, newline, or carriage return, wrap in quotes
  if (stringValue.includes(delimiter) || 
      stringValue.includes(quoteChar) || 
      stringValue.includes('\n') || 
      stringValue.includes('\r')) {
    // Escape any existing quotes by doubling them
    const escapedValue = stringValue.replace(new RegExp(escapeChar, 'g'), escapeChar + escapeChar);
    return quoteChar + escapedValue + quoteChar;
  }
  
  return stringValue;
}

/**
 * Converts an array of objects to CSV format
 * @param data - Array of objects to convert
 * @param headers - Optional array of header names (uses object keys if not provided)
 * @param options - Export options
 * @returns CSV string
 */
export function arrayToCSV(
  data: Record<string, any>[],
  headers?: string[],
  options: CSVExportOptions = {}
): string {
  const {
    includeHeaders = true,
    delimiter = ',',
    quoteChar = '"',
    escapeChar = '"'
  } = options;
  
  if (data.length === 0) {
    return '';
  }
  
  // Get headers from first object if not provided
  const csvHeaders = headers || Object.keys(data[0]);
  
  let csv = '';
  
  // Add headers if requested
  if (includeHeaders) {
    csv += csvHeaders.map(header => escapeCSVValue(header, delimiter, quoteChar, escapeChar)).join(delimiter) + '\n';
  }
  
  // Add data rows
  data.forEach(row => {
    const values = csvHeaders.map(header => escapeCSVValue(row[header], delimiter, quoteChar, escapeChar));
    csv += values.join(delimiter) + '\n';
  });
  
  return csv;
}

/**
 * Formats a number for CSV export
 * @param value - Number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted number string
 */
export function formatNumberForCSV(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '';
  }
  
  return Number(value).toFixed(decimals);
}

/**
 * Formats a date for CSV export
 * @param date - Date string or Date object
 * @param format - Date format (default: 'yyyy-MM-dd')
 * @returns Formatted date string
 */
export function formatDateForCSV(date: string | Date, format = 'yyyy-MM-dd'): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return '';
  }
  
  // Simple date formatting for CSV
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Creates a CSV download link (for web environments)
 * @param csvContent - CSV content string
 * @param filename - Filename for download
 * @returns Blob URL for download
 */
export function createCSVDownloadLink(csvContent: string, filename = 'export.csv'): string {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  return URL.createObjectURL(blob);
}

/**
 * Downloads CSV content (for web environments)
 * @param csvContent - CSV content string
 * @param filename - Filename for download
 */
export function downloadCSV(csvContent: string, filename = 'export.csv'): void {
  const link = document.createElement('a');
  const url = createCSVDownloadLink(csvContent, filename);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the blob URL
  URL.revokeObjectURL(url);
}

/**
 * Exports table data to CSV with proper formatting
 * @param tableData - Array of table rows
 * @param columns - Array of column definitions
 * @param options - Export options
 * @returns CSV string
 */
export function exportTableToCSV(
  tableData: any[],
  columns: Array<{ key: string; header: string; formatter?: (value: any) => string }>,
  options: CSVExportOptions = {}
): string {
  const headers = columns.map(col => col.header);
  const data = tableData.map(row => {
    const csvRow: Record<string, any> = {};
    columns.forEach(col => {
      const value = row[col.key];
      csvRow[col.key] = col.formatter ? col.formatter(value) : value;
    });
    return csvRow;
  });
  
  return arrayToCSV(data, headers, options);
}

/**
 * Utility to format currency for CSV export
 * @param value - Currency value
 * @param currency - Currency symbol (default: '₹')
 * @param decimals - Decimal places (default: 2)
 * @returns Formatted currency string
 */
export function formatCurrencyForCSV(
  value: number | null | undefined,
  currency = '₹',
  decimals = 2
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '';
  }
  
  return `${currency}${Number(value).toFixed(decimals)}`;
}

/**
 * Utility to format percentage for CSV export
 * @param value - Percentage value (0-100)
 * @param decimals - Decimal places (default: 2)
 * @returns Formatted percentage string
 */
export function formatPercentageForCSV(
  value: number | null | undefined,
  decimals = 2
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '';
  }
  
  return `${Number(value).toFixed(decimals)}%`;
}





