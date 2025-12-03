/**
 * Date Bucketing Utilities
 * 
 * Provides functions to group dates by various granularities (day, week, month, quarter, year)
 * for use in summary reports and analytics.
 */

import {
  parseISO,
  format,
  startOfWeek,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  endOfWeek,
  endOfMonth,
  endOfQuarter,
  endOfYear,
  isSameDay,
  isSameWeek,
  isSameMonth,
  isSameQuarter,
  isSameYear,
} from 'date-fns';

export type Granularity = 'day' | 'week' | 'month' | 'quarter' | 'year';

/**
 * Converts a date string to a bucket key based on the specified granularity
 * @param dateString - ISO date string
 * @param granularity - The granularity level for bucketing
 * @returns Bucket key string
 */
export function toBucket(dateString: string, granularity: Granularity): string {
  const dt = parseISO(dateString);
  
  switch (granularity) {
    case 'day':
      return format(dt, 'yyyy-MM-dd');
    case 'week':
      return format(startOfWeek(dt, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    case 'month':
      return format(startOfMonth(dt), 'yyyy-MM-01');
    case 'quarter':
      return format(startOfQuarter(dt), 'yyyy-QQ');
    case 'year':
      return format(startOfYear(dt), 'yyyy');
    default:
      throw new Error(`Unsupported granularity: ${granularity}`);
  }
}

/**
 * Formats a bucket key for display based on granularity
 * @param bucketKey - The bucket key from toBucket
 * @param granularity - The granularity level
 * @returns Formatted display string
 */
export function formatBucket(bucketKey: string, granularity: Granularity): string {
  const dt = parseISO(bucketKey);
  
  switch (granularity) {
    case 'day':
      return format(dt, 'MMM dd, yyyy');
    case 'week':
      const weekStart = startOfWeek(dt, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(dt, { weekStartsOn: 1 });
      return `${format(weekStart, 'MMM dd')} - ${format(weekEnd, 'MMM dd, yyyy')}`;
    case 'month':
      return format(dt, 'MMM yyyy');
    case 'quarter':
      return format(dt, 'QQQ yyyy');
    case 'year':
      return format(dt, 'yyyy');
    default:
      throw new Error(`Unsupported granularity: ${granularity}`);
  }
}

/**
 * Gets the start and end dates for a bucket
 * @param bucketKey - The bucket key
 * @param granularity - The granularity level
 * @returns Object with start and end dates
 */
export function getBucketRange(bucketKey: string, granularity: Granularity): { start: Date; end: Date } {
  const dt = parseISO(bucketKey);
  
  switch (granularity) {
    case 'day':
      return { start: dt, end: dt };
    case 'week':
      return {
        start: startOfWeek(dt, { weekStartsOn: 1 }),
        end: endOfWeek(dt, { weekStartsOn: 1 }),
      };
    case 'month':
      return {
        start: startOfMonth(dt),
        end: endOfMonth(dt),
      };
    case 'quarter':
      return {
        start: startOfQuarter(dt),
        end: endOfQuarter(dt),
      };
    case 'year':
      return {
        start: startOfYear(dt),
        end: endOfYear(dt),
      };
    default:
      throw new Error(`Unsupported granularity: ${granularity}`);
  }
}

/**
 * Checks if two dates belong to the same bucket
 * @param date1 - First date string
 * @param date2 - Second date string
 * @param granularity - The granularity level
 * @returns True if dates are in the same bucket
 */
export function isSameBucket(date1: string, date2: string, granularity: Granularity): boolean {
  const dt1 = parseISO(date1);
  const dt2 = parseISO(date2);
  
  switch (granularity) {
    case 'day':
      return isSameDay(dt1, dt2);
    case 'week':
      return isSameWeek(dt1, dt2, { weekStartsOn: 1 });
    case 'month':
      return isSameMonth(dt1, dt2);
    case 'quarter':
      return isSameQuarter(dt1, dt2);
    case 'year':
      return isSameYear(dt1, dt2);
    default:
      throw new Error(`Unsupported granularity: ${granularity}`);
  }
}

/**
 * Gets all bucket keys for a date range
 * @param startDate - Start date string
 * @param endDate - End date string
 * @param granularity - The granularity level
 * @returns Array of bucket keys
 */
export function getBucketsInRange(startDate: string, endDate: string, granularity: Granularity): string[] {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const buckets: string[] = [];
  
  let current = start;
  
  while (current <= end) {
    buckets.push(toBucket(current.toISOString(), granularity));
    
    // Move to next bucket
    switch (granularity) {
      case 'day':
        current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
        break;
      case 'week':
        current = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
        break;
      case 'quarter':
        current = new Date(current.getFullYear(), current.getMonth() + 3, 1);
        break;
      case 'year':
        current = new Date(current.getFullYear() + 1, 0, 1);
        break;
    }
  }
  
  return buckets;
}

/**
 * Groups an array of objects by date bucket
 * @param items - Array of objects with date property
 * @param dateKey - Key name for the date property
 * @param granularity - The granularity level
 * @returns Object with bucket keys as keys and grouped items as values
 */
export function groupByDateBucket<T extends Record<string, any>>(
  items: T[],
  dateKey: keyof T,
  granularity: Granularity
): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  
  items.forEach(item => {
    const dateValue = item[dateKey];
    if (typeof dateValue === 'string') {
      const bucket = toBucket(dateValue, granularity);
      if (!groups[bucket]) {
        groups[bucket] = [];
      }
      groups[bucket].push(item);
    }
  });
  
  return groups;
}





