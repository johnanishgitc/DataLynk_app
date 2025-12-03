import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface MetricCardProps {
  title: string;
  value: string;
  icon: string;
  subtitle?: string;
  color?: string;
  onPress?: () => void;
}

export function MetricCard({ title, value, icon, subtitle, color = 'blue', onPress }: MetricCardProps) {
  const colorStyles = {
    blue: { bg: '#dbeafe', text: '#1d4ed8' },
    green: { bg: '#dcfce7', text: '#16a34a' },
    orange: { bg: '#fed7aa', text: '#ea580c' },
    purple: { bg: '#e9d5ff', text: '#9333ea' },
  };

  const currentColor = colorStyles[color as keyof typeof colorStyles] || colorStyles.blue;

  const content = (
    <View style={styles.content}>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.value}>{value}</Text>
        {subtitle && (
          <Text style={styles.subtitle}>{subtitle}</Text>
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity 
        style={[styles.container, { backgroundColor: currentColor.bg }]} 
        onPress={onPress}
        activeOpacity={0.7}
      >
        {content}
        <Text style={styles.tapHint}>Tap to view details</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: currentColor.bg }]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flex: 1,
    minWidth: 150,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  iconContainer: {
    marginLeft: 12,
  },
  icon: {
    fontSize: 20,
  },
  tapHint: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 8,
    fontStyle: 'italic',
  },
});