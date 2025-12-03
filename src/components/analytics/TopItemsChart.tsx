import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface TopItemsData {
  label: string;
  value: number;
  quantity: number;
  closingBalance?: number;
  daysOfStock?: number;
  color?: string;
}

interface TopItemsChartProps {
  data: TopItemsData[];
  title: string;
  scaleFactor?: number;
  onBarClick?: (label: string) => void;
  onBackClick?: () => void;
  showBackButton?: boolean;
}

export function TopItemsChart({ data, title, scaleFactor = 1, onBarClick, onBackClick, showBackButton }: TopItemsChartProps) {
  const maxValue = Math.max(...data.map((item) => item.value));

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {showBackButton && onBackClick && (
          <TouchableOpacity onPress={onBackClick} style={styles.backButton}>
            <Text style={styles.backButtonIcon}>←</Text>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.barContainer}>
        {data.map((item) => (
          <TouchableOpacity
            key={item.label}
            onPress={() => onBarClick?.(item.label)}
            style={onBarClick ? styles.barItemTouchable : styles.barItem}
            disabled={!onBarClick}
          >
            <View style={styles.barItemContent}>
              <Text style={styles.barLabel} numberOfLines={2} ellipsizeMode="tail">{item.label}</Text>
              <View style={styles.barValueContainer}>
                <Text style={styles.barValue}>
                  ₹{(item.value / scaleFactor).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
                <View style={styles.quantityRow}>
                  <Text style={styles.barQuantity}>
                    Qty: {item.quantity.toLocaleString('en-IN')}
                  </Text>
                  {item.closingBalance !== undefined && (
                    <>
                      <Text style={styles.quantitySeparator}>•</Text>
                      <Text style={styles.barClosingBalance}>
                        Bal: {item.closingBalance.toLocaleString('en-IN')}
                      </Text>
                    </>
                  )}
                  {item.daysOfStock !== undefined && item.daysOfStock >= 0 && (
                    <>
                      <Text style={styles.quantitySeparator}>•</Text>
                      <Text style={[
                        styles.daysOfStock,
                        item.daysOfStock < 7 && styles.daysOfStockLow,
                        item.daysOfStock >= 7 && item.daysOfStock < 15 && styles.daysOfStockMedium,
                        item.daysOfStock >= 15 && styles.daysOfStockHigh,
                      ]}>
                        {item.daysOfStock}d
                      </Text>
                    </>
                  )}
                </View>
              </View>
            </View>
            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${(item.value / maxValue) * 100}%`, backgroundColor: item.color || '#3b82f6' },
                ]}
              />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
  },
  backButtonIcon: {
    fontSize: 14,
    marginRight: 4,
    color: '#374151',
  },
  backButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  barContainer: {
    gap: 12,
  },
  barItem: {
    paddingVertical: 8,
  },
  barItemTouchable: {
    paddingVertical: 8,
  },
  barItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  barLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
    marginRight: 12,
    maxWidth: '60%',
  },
  barValueContainer: {
    alignItems: 'flex-end',
  },
  barValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  barQuantity: {
    fontSize: 11,
    color: '#6b7280',
  },
  quantitySeparator: {
    fontSize: 11,
    color: '#d1d5db',
    marginHorizontal: 6,
  },
  barClosingBalance: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '500',
  },
  daysOfStock: {
    fontSize: 11,
    fontWeight: '600',
  },
  daysOfStockLow: {
    color: '#dc2626', // Red - critical (< 7 days)
  },
  daysOfStockMedium: {
    color: '#f59e0b', // Orange - warning (7-14 days)
  },
  daysOfStockHigh: {
    color: '#059669', // Green - healthy (>= 15 days)
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});
