/**
 * Unit Tests for Date Bucketing Utilities
 */

import {
  toBucket,
  formatBucket,
  getBucketRange,
  isSameBucket,
  getBucketsInRange,
  groupByDateBucket,
  Granularity,
} from '../dateBucket';

describe('dateBucket utilities', () => {
  const testDate = '2023-06-15T10:30:00Z'; // Thursday, June 15, 2023
  const testDate2 = '2023-06-16T14:45:00Z'; // Friday, June 16, 2023

  describe('toBucket', () => {
    it('should bucket by day', () => {
      expect(toBucket(testDate, 'day')).toBe('2023-06-15');
    });

    it('should bucket by week (Monday start)', () => {
      // June 15, 2023 is a Thursday, so week starts on June 12 (Monday)
      expect(toBucket(testDate, 'week')).toBe('2023-06-12');
    });

    it('should bucket by month', () => {
      expect(toBucket(testDate, 'month')).toBe('2023-06-01');
    });

    it('should bucket by quarter', () => {
      // June is Q2, so quarter starts April 1
      expect(toBucket(testDate, 'quarter')).toBe('2023-Q2');
    });

    it('should bucket by year', () => {
      expect(toBucket(testDate, 'year')).toBe('2023');
    });
  });

  describe('formatBucket', () => {
    it('should format day bucket', () => {
      expect(formatBucket('2023-06-15', 'day')).toBe('Jun 15, 2023');
    });

    it('should format week bucket', () => {
      expect(formatBucket('2023-06-12', 'week')).toBe('Jun 12 - Jun 18, 2023');
    });

    it('should format month bucket', () => {
      expect(formatBucket('2023-06-01', 'month')).toBe('Jun 2023');
    });

    it('should format quarter bucket', () => {
      expect(formatBucket('2023-Q2', 'quarter')).toBe('Q2 2023');
    });

    it('should format year bucket', () => {
      expect(formatBucket('2023', 'year')).toBe('2023');
    });
  });

  describe('getBucketRange', () => {
    it('should get day range', () => {
      const range = getBucketRange('2023-06-15', 'day');
      expect(range.start.toISOString()).toBe('2023-06-15T00:00:00.000Z');
      expect(range.end.toISOString()).toBe('2023-06-15T00:00:00.000Z');
    });

    it('should get week range', () => {
      const range = getBucketRange('2023-06-12', 'week');
      expect(range.start.toISOString()).toBe('2023-06-12T00:00:00.000Z');
      expect(range.end.toISOString()).toBe('2023-06-18T23:59:59.999Z');
    });

    it('should get month range', () => {
      const range = getBucketRange('2023-06-01', 'month');
      expect(range.start.toISOString()).toBe('2023-06-01T00:00:00.000Z');
      expect(range.end.toISOString()).toBe('2023-06-30T23:59:59.999Z');
    });
  });

  describe('isSameBucket', () => {
    it('should identify same day bucket', () => {
      expect(isSameBucket(testDate, testDate, 'day')).toBe(true);
      expect(isSameBucket(testDate, testDate2, 'day')).toBe(false);
    });

    it('should identify same week bucket', () => {
      expect(isSameBucket(testDate, testDate2, 'week')).toBe(true);
    });

    it('should identify same month bucket', () => {
      expect(isSameBucket(testDate, testDate2, 'month')).toBe(true);
    });

    it('should identify same quarter bucket', () => {
      expect(isSameBucket(testDate, testDate2, 'quarter')).toBe(true);
    });

    it('should identify same year bucket', () => {
      expect(isSameBucket(testDate, testDate2, 'year')).toBe(true);
    });
  });

  describe('getBucketsInRange', () => {
    it('should get day buckets in range', () => {
      const buckets = getBucketsInRange('2023-06-15', '2023-06-17', 'day');
      expect(buckets).toEqual(['2023-06-15', '2023-06-16', '2023-06-17']);
    });

    it('should get week buckets in range', () => {
      const buckets = getBucketsInRange('2023-06-12', '2023-06-25', 'week');
      expect(buckets).toEqual(['2023-06-12', '2023-06-19']);
    });

    it('should get month buckets in range', () => {
      const buckets = getBucketsInRange('2023-06-01', '2023-08-01', 'month');
      expect(buckets).toEqual(['2023-06-01', '2023-07-01', '2023-08-01']);
    });
  });

  describe('groupByDateBucket', () => {
    const testData = [
      { id: 1, date: '2023-06-15', value: 100 },
      { id: 2, date: '2023-06-15', value: 200 },
      { id: 3, date: '2023-06-16', value: 300 },
      { id: 4, date: '2023-06-17', value: 400 },
    ];

    it('should group by day', () => {
      const grouped = groupByDateBucket(testData, 'date', 'day');
      expect(grouped['2023-06-15']).toHaveLength(2);
      expect(grouped['2023-06-16']).toHaveLength(1);
      expect(grouped['2023-06-17']).toHaveLength(1);
    });

    it('should group by week', () => {
      const grouped = groupByDateBucket(testData, 'date', 'week');
      const weekBucket = Object.keys(grouped)[0];
      expect(grouped[weekBucket]).toHaveLength(4);
    });

    it('should group by month', () => {
      const grouped = groupByDateBucket(testData, 'date', 'month');
      const monthBucket = Object.keys(grouped)[0];
      expect(grouped[monthBucket]).toHaveLength(4);
    });
  });

  describe('edge cases', () => {
    it('should handle invalid dates gracefully', () => {
      expect(() => toBucket('invalid-date', 'day')).toThrow();
    });

    it('should handle empty arrays', () => {
      const grouped = groupByDateBucket([], 'date', 'day');
      expect(Object.keys(grouped)).toHaveLength(0);
    });

    it('should handle single item arrays', () => {
      const data = [{ id: 1, date: testDate, value: 100 }];
      const grouped = groupByDateBucket(data, 'date', 'day');
      expect(Object.keys(grouped)).toHaveLength(1);
      expect(grouped['2023-06-15']).toHaveLength(1);
    });
  });

  describe('performance tests', () => {
    it('should handle large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        date: new Date(2023, 0, 1 + i).toISOString(),
        value: Math.random() * 1000,
      }));

      const start = performance.now();
      const grouped = groupByDateBucket(largeDataset, 'date', 'month');
      const end = performance.now();

      expect(end - start).toBeLessThan(1000); // Should complete in under 1 second
      expect(Object.keys(grouped).length).toBeGreaterThan(0);
    });
  });
});





