import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface TrendData {
  month: string;
  value: number;
}

interface BarChartProps {
  data: { label: string; value: number; color?: string; trendData?: TrendData[] }[];
  title: string;
  valuePrefix?: string;
  onBarClick?: (label: string) => void;
  onBackClick?: () => void;
  showBackButton?: boolean;
  showTrends?: boolean;
}

export function BarChart({ data, title, valuePrefix = '₹', onBarClick, onBackClick, showBackButton, showTrends = false }: BarChartProps) {
  const maxValue = Math.max(...data.map(d => d.value));

  const renderMiniTrendChart = (trendData?: TrendData[]) => {
    if (!trendData || trendData.length === 0 || !showTrends) return null;

    const values = trendData.map(d => d.value);
    const maxTrendValue = Math.max(...values);
    const minTrendValue = Math.min(...values);
    const range = maxTrendValue - minTrendValue || 1;

    const chartHeight = 30;
    const chartWidth = 80;
    const pointSpacing = chartWidth / Math.max(trendData.length - 1, 1);

    const points = trendData.map((point, index) => {
      const x = index * pointSpacing;
      const normalizedValue = (point.value - minTrendValue) / range;
      const y = chartHeight - (normalizedValue * chartHeight);
      return { x, y };
    });

    return (
      <View style={styles.miniChartContainer}>
        <View style={[styles.miniChart, { height: chartHeight, width: chartWidth }]}>
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
                  styles.miniLineSegment,
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
                styles.miniDataPoint,
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {showBackButton && onBackClick && (
          <TouchableOpacity
            onPress={onBackClick}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.chart}>
        {data.map((item) => (
          <TouchableOpacity
            key={item.label}
            onPress={() => onBarClick?.(item.label)}
            style={[
              styles.barItem,
              onBarClick && styles.barItemClickable
            ]}
          >
            <View style={styles.barHeader}>
              <View style={styles.barLabelContainer}>
                <Text style={styles.barLabel} numberOfLines={2} ellipsizeMode="tail">{item.label}</Text>
                {renderMiniTrendChart(item.trendData)}
              </View>
              <Text style={styles.barValue}>
                {valuePrefix}{item.value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.barBackground}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${(item.value / maxValue) * 100}%`,
                    backgroundColor: item.color || '#3b82f6',
                  }
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
  container: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
  },
  backButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  chart: {
    gap: 10,
  },
  barItem: {
    marginBottom: 4,
  },
  barItemClickable: {
    padding: 6,
    borderRadius: 6,
  },
  barHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  barLabelContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  barLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
    lineHeight: 16,
    marginRight: 8,
  },
  barValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    flexShrink: 0,
  },
  barBackground: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  miniChartContainer: {
    marginLeft: 8,
  },
  miniChart: {
    position: 'relative',
    backgroundColor: '#f9fafb',
    borderRadius: 4,
  },
  miniLineSegment: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#8b5cf6',
    transformOrigin: 'left center',
  },
  miniDataPoint: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#8b5cf6',
  },
});
