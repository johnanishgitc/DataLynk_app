import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

interface DataPoint {
  month: string;
  value: number;
}

interface StockGroupData {
  stockGroup: string;
  data: DataPoint[];
  color: string;
}

interface StockGroupTrendChartProps {
  data: StockGroupData[];
  title: string;
  scaleFactor?: number;
}

export function StockGroupTrendChart({ data, title, scaleFactor = 1 }: StockGroupTrendChartProps) {
  const renderMiniLineChart = (stockGroupData: StockGroupData) => {
    if (!stockGroupData.data || stockGroupData.data.length === 0) {
      return <Text style={styles.noDataText}>No data</Text>;
    }

    const values = stockGroupData.data.map(d => d.value);
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const range = maxValue - minValue || 1; // Avoid division by zero

    const chartHeight = 60;
    const chartWidth = 200;
    const pointSpacing = chartWidth / Math.max(stockGroupData.data.length - 1, 1);

    // Generate SVG-like path using View components
    const points = stockGroupData.data.map((point, index) => {
      const x = index * pointSpacing;
      const normalizedValue = (point.value - minValue) / range;
      const y = chartHeight - (normalizedValue * chartHeight);
      return { x, y, value: point.value };
    });

    return (
      <View style={styles.miniChartContainer}>
        <View style={[styles.chartArea, { height: chartHeight, width: chartWidth }]}>
          {/* Grid lines */}
          <View style={[styles.gridLine, { top: 0 }]} />
          <View style={[styles.gridLine, { top: chartHeight / 2 }]} />
          <View style={[styles.gridLine, { top: chartHeight }]} />

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
                  styles.lineSegment,
                  {
                    left: point.x,
                    top: point.y,
                    width: length,
                    backgroundColor: stockGroupData.color,
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
                styles.dataPoint,
                {
                  left: point.x - 3,
                  top: point.y - 3,
                  backgroundColor: stockGroupData.color,
                },
              ]}
            />
          ))}
        </View>
        
        {/* Min/Max values */}
        <View style={styles.chartLabels}>
          <Text style={styles.chartLabelText}>
            ₹{(minValue / scaleFactor).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </Text>
          <Text style={styles.chartLabelText}>
            ₹{(maxValue / scaleFactor).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </Text>
        </View>
      </View>
    );
  };

  const getScaleSuffix = () => {
    switch (scaleFactor) {
      case 10: return ' (x10)';
      case 100: return ' (x100)';
      case 1000: return ' (K)';
      case 100000: return ' (L)';
      case 10000000: return ' (Cr)';
      default: return '';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}{getScaleSuffix()}</Text>
      </View>
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {data.map((stockGroupData, index) => (
          <View key={index} style={styles.stockGroupRow}>
            <View style={styles.stockGroupInfo}>
              <Text style={styles.stockGroupName} numberOfLines={1}>
                {stockGroupData.stockGroup}
              </Text>
              <Text style={styles.stockGroupTotal}>
                Total: ₹{(stockGroupData.data.reduce((sum, d) => sum + d.value, 0) / scaleFactor).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </Text>
            </View>
            {renderMiniLineChart(stockGroupData)}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  scrollView: {
    maxHeight: 400,
  },
  stockGroupRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  stockGroupInfo: {
    flex: 1,
    marginRight: 16,
  },
  stockGroupName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  stockGroupTotal: {
    fontSize: 12,
    color: '#6b7280',
  },
  miniChartContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chartArea: {
    position: 'relative',
    backgroundColor: '#f9fafb',
    borderRadius: 4,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  lineSegment: {
    position: 'absolute',
    height: 2,
    transformOrigin: 'left center',
  },
  dataPoint: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'white',
  },
  noDataText: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  chartLabels: {
    marginLeft: 8,
    justifyContent: 'space-between',
    height: 60,
  },
  chartLabelText: {
    fontSize: 10,
    color: '#6b7280',
  },
});

