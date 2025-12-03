import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

interface LineChartData {
  label: string;
  value: number;
  color?: string;
}

interface LineChartProps {
  data: LineChartData[];
  title: string;
  valuePrefix?: string;
  onBarClick?: (label: string) => void;
  onBackClick?: () => void;
  showBackButton?: boolean;
}

export function LineChart({ data, title, valuePrefix = '₹', onBarClick, onBackClick, showBackButton }: LineChartProps) {
  if (!data || data.length === 0) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
        </View>
        <Text style={styles.noDataText}>No data available</Text>
      </View>
    );
  }

  const maxValue = Math.max(...data.map((item) => item.value));
  const minValue = Math.min(...data.map((item) => item.value));
  const valueRange = maxValue - minValue || 1;

  const chartHeight = 120;
  
  // Calculate width to fit 12 periods on screen
  // Assume screen width ~360-400px, minus Y-axis (60px) and padding (32px) = ~270-310px available
  // For 12 periods: ~22-26px per period
  const availableWidth = 270; // Conservative estimate for most phones
  const periodsToFit = 12;
  const minSpacing = availableWidth / (periodsToFit - 1);
  
  // If we have more than 12 periods, make it scrollable
  // If less than 12, use the full available width
  const pointSpacing = data.length > periodsToFit 
    ? minSpacing 
    : availableWidth / Math.max(data.length - 1, 1);
  
  const chartWidth = pointSpacing * Math.max(data.length - 1, 1);

  // Calculate points for the line
  const points = data.map((item, index) => {
    const x = index * pointSpacing;
    const normalizedValue = (item.value - minValue) / valueRange;
    const y = chartHeight - (normalizedValue * chartHeight);
    return { x, y, value: item.value, label: item.label };
  });

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
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.scrollContainer}
      >
        <View style={styles.chartContainer}>
          {/* Y-axis labels */}
          <View style={styles.yAxisLabels}>
            <Text style={styles.yAxisLabel}>
              {valuePrefix}{(maxValue).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
            <Text style={styles.yAxisLabel}>
              {valuePrefix}{((maxValue + minValue) / 2).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
            <Text style={styles.yAxisLabel}>
              {valuePrefix}{(minValue).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
          </View>

          <View style={styles.chartAreaContainer}>
            {/* Grid lines */}
            <View style={styles.chartArea}>
              <View style={[styles.gridLine, { top: 0 }]} />
              <View style={[styles.gridLine, { top: chartHeight / 2 }]} />
              <View style={[styles.gridLine, { top: chartHeight }]} />

              {/* Line segments */}
              <View style={[styles.lineChart, { width: chartWidth, height: chartHeight }]}>
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
                        left: point.x - 4,
                        top: point.y - 4,
                      },
                    ]}
                  />
                ))}
              </View>
            </View>

            {/* X-axis labels */}
            <View style={[styles.xAxisLabels, { width: chartWidth }]}>
              {data.map((item, index) => (
                <Text 
                  key={index} 
                  style={[
                    styles.xAxisLabel,
                    { left: index * pointSpacing }
                  ]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    marginBottom: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
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
    fontSize: 16,
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
  noDataText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 20,
  },
  scrollContainer: {
    marginHorizontal: -8,
  },
  chartContainer: {
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  yAxisLabels: {
    width: 60,
    height: 120,
    justifyContent: 'space-between',
    paddingRight: 8,
  },
  yAxisLabel: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'right',
  },
  chartAreaContainer: {
    flex: 1,
  },
  chartArea: {
    position: 'relative',
    height: 120,
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
  lineChart: {
    position: 'relative',
  },
  lineSegment: {
    position: 'absolute',
    height: 3,
    backgroundColor: '#8b5cf6',
    transformOrigin: 'left center',
  },
  dataPoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8b5cf6',
    borderWidth: 2,
    borderColor: 'white',
  },
  xAxisLabels: {
    position: 'relative',
    height: 40,
    marginTop: 8,
  },
  xAxisLabel: {
    position: 'absolute',
    fontSize: 10,
    color: '#374151',
    textAlign: 'center',
    width: 60,
    marginLeft: -30,
    fontWeight: '500',
  },
});


